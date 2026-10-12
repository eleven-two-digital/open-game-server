// SPDX-License-Identifier: Apache-2.0

import type * as https from "node:https";
import type { IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { z } from "zod";
import {
  createAeadChannel,
  deriveSessionKeys,
  type AeadEnvelope,
} from "@aimduck/shared/crypto/session-keys";
import {
  clientMessageSchema,
  serverMessageSchema,
  type ClientMessage,
  type ServerMessage,
} from "@aimduck/shared/messages";
import { log } from "@aimduck/shared/logging";
import type { PendingRoomSession } from "./handshake.js";

const envelopeSchema = z
  .object({
    sequence: z.number().int().positive().safe(),
    nonce: z.string().min(1).max(32),
    ciphertext: z.string().min(1).max(90_000),
  })
  .strict();

/** Server-only admission context; it must never be serialized into gameplay state. */
export type RoomSocketSession = {
  playerId: string;
  displayName: string;
  roomId: string;
  ticketId: string;
};

export type RoomWebSocketOptions = {
  server: https.Server;
  allowedOrigins: string[];
  consumeSession(sessionId: string): PendingRoomSession | null;
  onMessage(
    session: RoomSocketSession,
    message: ClientMessage,
    send: (message: ServerMessage) => Promise<void>,
  ): void | Promise<void>;
  onConnect?(
    session: RoomSocketSession,
    send: (message: ServerMessage) => Promise<void>,
  ): void | Promise<void>;
  onDisconnect?(session: RoomSocketSession): void;
};

export function attachRoomWebSocket(options: RoomWebSocketOptions): {
  close(): Promise<void>;
} {
  const webSockets = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
    handleProtocols(protocols) {
      return protocols.has("aimduck.v1") ? "aimduck.v1" : false;
    },
  });

  const handleUpgrade = (
    request: IncomingMessage,
    socket: import("node:stream").Duplex,
    head: Buffer,
  ) => {
    const origin = request.headers.origin;
    const requestedProtocols = (request.headers["sec-websocket-protocol"] ?? "")
      .split(",")
      .map((protocol) => protocol.trim());
    const sessionProtocol = requestedProtocols.find((protocol) =>
      protocol.startsWith("ogs-session."),
    );
    if (
      request.url !== "/v1/ws" ||
      origin === undefined ||
      !options.allowedOrigins.includes(origin) ||
      !requestedProtocols.includes("aimduck.v1") ||
      sessionProtocol === undefined
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const sessionId = sessionProtocol.slice("ogs-session.".length);
    const pending = options.consumeSession(sessionId);
    if (pending === null) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    webSockets.handleUpgrade(request, socket, head, (webSocket) => {
      webSockets.emit("connection", webSocket, request, pending);
    });
  };
  options.server.on("upgrade", handleUpgrade);

  webSockets.on(
    "connection",
    (webSocket: WebSocket, _request: IncomingMessage, pending: PendingRoomSession) => {
      void establishEncryptedConnection(webSocket, pending, options).catch((error: unknown) => {
        log("error", "room_websocket_session_setup_failed", {
          roomId: pending.roomId,
          playerId: pending.playerId,
          error: error instanceof Error ? error.name : "UnknownError",
        });
        webSocket.close(1011, "Unable to establish an encrypted room session.");
      });
    },
  );

  return {
    close() {
      options.server.off("upgrade", handleUpgrade);
      return new Promise<void>((resolve, reject) => {
        webSockets.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function establishEncryptedConnection(
  webSocket: WebSocket,
  pending: PendingRoomSession,
  options: RoomWebSocketOptions,
): Promise<void> {
  const transcript = {
    roomId: pending.roomId,
    playerId: pending.playerId,
    ticketId: pending.ticketId,
    clientNonce: pending.clientNonce,
    roomNonce: pending.serverNonce,
    clientPublicKey: pending.clientPublicKey,
    roomPublicKey: pending.keyPair.publicKey,
    protocolVersion: 1 as const,
  };
  const keys = await deriveSessionKeys(
    pending.keyPair.privateKey,
    pending.clientPublicKey,
    transcript,
  );
  const incoming = await createAeadChannel(keys.clientToRoom, pending.sessionId, "client");
  const outgoing = await createAeadChannel(keys.roomToClient, pending.sessionId, "room");
  const session: RoomSocketSession = {
    playerId: pending.playerId,
    displayName: pending.displayName,
    roomId: pending.roomId,
    ticketId: pending.ticketId,
  };
  const send = async (message: ServerMessage) => {
    if (webSocket.readyState !== webSocket.OPEN) {
      throw new Error("Room WebSocket is not open.");
    }
    const parsed = serverMessageSchema.parse(message);
    const sealed = await outgoing.seal(new TextEncoder().encode(JSON.stringify(parsed)));
    webSocket.send(JSON.stringify(sealed));
  };
  let connected = false;
  webSocket.on("close", () => {
    if (connected) {
      connected = false;
      options.onDisconnect?.(session);
    }
  });

  let incomingChain = Promise.resolve();
  webSocket.on("message", (data, isBinary) => {
    incomingChain = incomingChain.then(async () => {
      if (isBinary || !Buffer.isBuffer(data) || data.byteLength > 64 * 1024) {
        throw new TypeError("Only bounded encrypted text frames are accepted.");
      }
      const rawEnvelope: unknown = JSON.parse(data.toString("utf8"));
      const envelope = envelopeSchema.parse(rawEnvelope) as AeadEnvelope;
      const plaintext = await incoming.open(envelope);
      const decoded: unknown = JSON.parse(new TextDecoder().decode(plaintext));
      const message = clientMessageSchema.parse(decoded);
      await options.onMessage(session, message, send);
    });
    void incomingChain.catch((error: unknown) => {
      log("warn", "room_websocket_frame_rejected", {
        roomId: session.roomId,
        playerId: session.playerId,
        error: error instanceof Error ? error.name : "UnknownError",
      });
      webSocket.close(1008, "Invalid encrypted gameplay frame.");
    });
  });

  webSocket.on("error", (error) => {
    log("warn", "room_websocket_error", {
      roomId: session.roomId,
      playerId: session.playerId,
      error: error.name,
    });
  });

  await options.onConnect?.(session, send);
  connected = true;
  if (webSocket.readyState !== webSocket.OPEN) {
    connected = false;
    options.onDisconnect?.(session);
  }
}
