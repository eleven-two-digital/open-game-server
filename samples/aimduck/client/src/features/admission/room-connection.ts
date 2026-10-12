// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import type { RoomResolution } from "@aimduck/shared";
import {
  createAeadChannel,
  createEphemeralKeyPair,
  deriveSessionKeys,
  type AeadEnvelope,
} from "@aimduck/shared/crypto/session-keys";
import { serverMessageSchema, type ClientMessage } from "@aimduck/shared/messages";

const handshakeResponseSchema = z.object({
  status: z.literal("admitted"),
  session_id: z.string().min(1),
  session_expires_at: z.number().int(),
  player_id: z.string().min(1),
  ticket_id: z.string().min(1),
  server_public_key: z.string().min(1),
  server_nonce: z.string().min(1),
  cipher: z.literal("AES-256-GCM"),
  protocol_version: z.literal(1),
});

const handshakeErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
  }),
});
const envelopeSchema = z
  .object({
    sequence: z.number().int().positive().safe(),
    nonce: z.string().min(1).max(32),
    ciphertext: z.string().min(1).max(90_000),
  })
  .strict();

export class RoomConnectionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "RoomConnectionError";
  }
}

/** Client-side admission/transport connection; not a game-domain PlayerSession. */
export type RoomConnection = {
  socket: WebSocket;
  send(message: ClientMessage): Promise<void>;
  close(): void;
};

export type EncryptedRoomConnection = RoomConnection;

export async function connectToRoom(
  resolution: RoomResolution,
  accessToken: string,
  onMessage: (message: z.infer<typeof serverMessageSchema>) => void,
): Promise<EncryptedRoomConnection> {
  const roomUrl = new URL(`https://${resolution.host}:${resolution.port}`);
  if (roomUrl.hostname !== resolution.host || resolution.protocol !== "wss") {
    throw new RoomConnectionError(
      "invalid_resolution",
      "Discovery returned an invalid room address.",
      false,
    );
  }
  const clientKeyPair = await createEphemeralKeyPair();
  const clientNonce = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const response = await fetch(new URL("/v1/handshake", roomUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      join_ticket: resolution.joinTicket,
      client_public_key: clientKeyPair.publicKey,
      client_nonce: clientNonce,
    }),
  });
  if (!response.ok) {
    const rawError: unknown = await response.json();
    const parsedError = handshakeErrorSchema.safeParse(rawError);
    if (parsedError.success) {
      throw new RoomConnectionError(
        parsedError.data.error.code,
        parsedError.data.error.message,
        parsedError.data.error.retryable ?? response.status >= 500,
      );
    }
    throw new RoomConnectionError(
      "handshake_rejected",
      `Room rejected admission (HTTP ${response.status}).`,
      response.status >= 500,
    );
  }
  const rawHandshake: unknown = await response.json();
  const handshake = handshakeResponseSchema.safeParse(rawHandshake);
  if (!handshake.success) {
    throw new RoomConnectionError(
      "invalid_handshake",
      "Room returned an invalid secure-handshake response.",
      false,
    );
  }

  const transcript = {
    roomId: resolution.roomId,
    playerId: handshake.data.player_id,
    ticketId: handshake.data.ticket_id,
    clientNonce,
    roomNonce: handshake.data.server_nonce,
    clientPublicKey: clientKeyPair.publicKey,
    roomPublicKey: handshake.data.server_public_key,
    protocolVersion: 1 as const,
  };
  const keys = await deriveSessionKeys(
    clientKeyPair.privateKey,
    handshake.data.server_public_key,
    transcript,
  );
  const outgoing = await createAeadChannel(keys.clientToRoom, handshake.data.session_id, "client");
  const incoming = await createAeadChannel(keys.roomToClient, handshake.data.session_id, "room");
  const socket = await openSocket(roomUrl, resolution.path, handshake.data.session_id);

  let incomingChain = Promise.resolve();
  socket.addEventListener("message", (event) => {
    incomingChain = incomingChain.then(async () => {
      if (typeof event.data !== "string" || event.data.length > 128 * 1024) {
        throw new RoomConnectionError(
          "invalid_frame",
          "Room sent an invalid encrypted frame.",
          false,
        );
      }
      const rawEnvelope: unknown = JSON.parse(event.data);
      const envelope = parseEnvelope(rawEnvelope);
      const plaintext = await incoming.open(envelope);
      const message = serverMessageSchema.safeParse(
        JSON.parse(new TextDecoder().decode(plaintext)),
      );
      if (!message.success) {
        throw new RoomConnectionError(
          "invalid_message",
          "Room sent an invalid gameplay message.",
          false,
        );
      }
      onMessage(message.data);
    });
    void incomingChain.catch(() => socket.close(1008, "Invalid encrypted server frame."));
  });

  return {
    socket,
    async send(message) {
      if (socket.readyState !== WebSocket.OPEN) {
        throw new RoomConnectionError("not_connected", "Room connection is not open.", true);
      }
      const sealed = await outgoing.seal(new TextEncoder().encode(JSON.stringify(message)));
      socket.send(JSON.stringify(sealed));
    },
    close() {
      socket.close(1000, "Player left the room.");
    },
  };
}

function parseEnvelope(value: unknown): AeadEnvelope {
  const envelope = envelopeSchema.safeParse(value);
  if (!envelope.success) {
    throw new RoomConnectionError("invalid_frame", "Room sent an invalid encrypted frame.", false);
  }
  return envelope.data;
}

function openSocket(roomUrl: URL, path: string, sessionId: string): Promise<WebSocket> {
  const socketUrl = new URL(path, roomUrl);
  socketUrl.protocol = "wss:";
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(socketUrl, ["aimduck.v1", `ogs-session.${sessionId}`]);
    const timeout = window.setTimeout(() => {
      socket.close();
      reject(new RoomConnectionError("connection_timeout", "Room connection timed out.", true));
    }, 10_000);
    socket.addEventListener(
      "open",
      () => {
        window.clearTimeout(timeout);
        resolve(socket);
      },
      { once: true },
    );
    socket.addEventListener(
      "error",
      () => {
        window.clearTimeout(timeout);
        reject(
          new RoomConnectionError(
            "connection_failed",
            "Could not open a secure room connection. Check the local CA trust.",
            true,
          ),
        );
      },
      { once: true },
    );
  });
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
