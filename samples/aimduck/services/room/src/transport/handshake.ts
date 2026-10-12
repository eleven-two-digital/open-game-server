// SPDX-License-Identifier: Apache-2.0

import { randomBytes, randomUUID } from "node:crypto";
import { createEphemeralKeyPair, type EphemeralKeyPair } from "@aimduck/shared/crypto/session-keys";
import { TicketVerificationError } from "@aimduck/shared/errors";
import { InvalidIdentityTokenError } from "@aimduck/shared/auth/jwt-verifier";

export type RoomIdentity = {
  playerId: string;
  displayName: string;
};

export type VerifiedRoomTicket = {
  ticketId: string;
  playerId: string;
  roomId: string;
  expiresAt: number;
};

export type RoomHandshakeRequest = {
  authorization: string;
  joinTicket: string;
  clientPublicKey: string;
  clientNonce: string;
};

export type PendingRoomSession = {
  sessionId: string;
  playerId: string;
  displayName: string;
  roomId: string;
  ticketId: string;
  expiresAt: number;
  clientPublicKey: string;
  clientNonce: string;
  serverNonce: string;
  keyPair: EphemeralKeyPair;
};

export class RoomAdmissionError extends Error {
  constructor(
    readonly code:
      | "unauthorized"
      | "invalid_ticket"
      | "ticket_expired"
      | "identity_mismatch"
      | "room_full"
      | "ticket_replayed"
      | "invalid_public_key",
    message: string,
  ) {
    super(message);
    this.name = "RoomAdmissionError";
  }
}

export class InvalidRoomIdentityError extends Error {
  constructor() {
    super("Identity token is invalid or expired.");
    this.name = "InvalidRoomIdentityError";
  }
}

export function createRoomAdmission(options: {
  roomId: string;
  verifyIdentity(token: string): Promise<RoomIdentity>;
  verifyTicket(token: string, expected: { playerId: string; roomId: string }): VerifiedRoomTicket;
  reserveSeat(identity: RoomIdentity): boolean;
  createSessionId?: () => string;
  createKeyPair?: () => Promise<EphemeralKeyPair>;
  createNonce?: () => string;
  now(): number;
  sessionTtlMs?: number;
}): {
  handshake(request: RoomHandshakeRequest): Promise<{
    sessionId: string;
    sessionExpiresAt: number;
    playerId: string;
    ticketId: string;
    serverPublicKey: string;
    serverNonce: string;
    cipher: "AES-256-GCM";
    protocolVersion: 1;
  }>;
  consumeSession(sessionId: string): PendingRoomSession | null;
} {
  const usedTicketIds = new Set<string>();
  const sessions = new Map<string, PendingRoomSession>();
  const consumedSessions = new Set<string>();
  const sessionTtlMs = options.sessionTtlMs ?? 30_000;

  return {
    async handshake(request) {
      const bearer = /^Bearer ([^\s]+)$/.exec(request.authorization);
      if (bearer?.[1] === undefined || request.joinTicket.length === 0) {
        throw new RoomAdmissionError(
          "unauthorized",
          "A valid identity token and join ticket are required.",
        );
      }
      let identity: RoomIdentity;
      try {
        identity = await options.verifyIdentity(bearer[1]);
      } catch (error) {
        if (
          error instanceof InvalidIdentityTokenError ||
          error instanceof InvalidRoomIdentityError
        ) {
          throw new RoomAdmissionError("unauthorized", "Identity token is invalid or expired.");
        }
        throw error;
      }

      let ticket: VerifiedRoomTicket;
      try {
        ticket = options.verifyTicket(request.joinTicket, {
          playerId: identity.playerId,
          roomId: options.roomId,
        });
      } catch (error) {
        if (error instanceof TicketVerificationError) {
          const code =
            error.code === "ticket_expired"
              ? "ticket_expired"
              : error.code === "identity_mismatch" || error.code === "room_mismatch"
                ? "identity_mismatch"
                : "invalid_ticket";
          throw new RoomAdmissionError(code, error.message);
        }
        throw error;
      }
      if (ticket.expiresAt <= options.now()) {
        throw new RoomAdmissionError("ticket_expired", "Join ticket has expired.");
      }
      if (ticket.roomId !== options.roomId || ticket.playerId !== identity.playerId) {
        throw new RoomAdmissionError(
          "identity_mismatch",
          "Join ticket does not match this player and room.",
        );
      }
      validateNonce(request.clientNonce);
      try {
        await importClientPublicKey(request.clientPublicKey);
      } catch (error) {
        if (error instanceof TypeError || isDataError(error)) {
          throw new RoomAdmissionError("invalid_public_key", "Client ECDH public key is invalid.");
        }
        throw error;
      }
      const keyPair = await (options.createKeyPair ?? createEphemeralKeyPair)();
      const serverNonce = (options.createNonce ?? (() => randomBytes(32).toString("base64url")))();
      const sessionId = (options.createSessionId ?? randomUUID)();
      const sessionExpiresAt = options.now() + sessionTtlMs;

      if (usedTicketIds.has(ticket.ticketId)) {
        throw new RoomAdmissionError("ticket_replayed", "Ticket has already been used.");
      }
      if (!options.reserveSeat(identity)) {
        throw new RoomAdmissionError("room_full", "Room has no available seats.");
      }
      usedTicketIds.add(ticket.ticketId);
      sessions.set(sessionId, {
        sessionId,
        playerId: identity.playerId,
        displayName: identity.displayName,
        roomId: options.roomId,
        ticketId: ticket.ticketId,
        expiresAt: sessionExpiresAt,
        clientPublicKey: request.clientPublicKey,
        clientNonce: request.clientNonce,
        serverNonce,
        keyPair,
      });

      return {
        sessionId,
        sessionExpiresAt,
        playerId: identity.playerId,
        ticketId: ticket.ticketId,
        serverPublicKey: keyPair.publicKey,
        serverNonce,
        cipher: "AES-256-GCM",
        protocolVersion: 1,
      };
    },
    consumeSession(sessionId) {
      if (consumedSessions.has(sessionId)) {
        return null;
      }
      const session = sessions.get(sessionId);
      sessions.delete(sessionId);
      if (session === undefined || session.expiresAt <= options.now()) {
        return null;
      }
      consumedSessions.add(sessionId);
      return session;
    },
  };
}

function validateNonce(nonce: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(nonce) || nonce.length % 4 === 1) {
    throw new RoomAdmissionError("invalid_public_key", "Client handshake nonce is invalid.");
  }
  const base64 = nonce.replaceAll("-", "+").replaceAll("_", "/");
  const bytes = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  if (bytes.length < 32) {
    throw new RoomAdmissionError(
      "invalid_public_key",
      "Client handshake nonce must contain 256 bits.",
    );
  }
}

function isDataError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "DataError";
}

async function importClientPublicKey(encoded: string): Promise<CryptoKey> {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new TypeError("Client public key is malformed.");
  }
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytes.byteLength !== 65 || bytes[0] !== 4) {
    throw new TypeError("Client public key must be an uncompressed P-256 point.");
  }
  return crypto.subtle.importKey("raw", bytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
}
