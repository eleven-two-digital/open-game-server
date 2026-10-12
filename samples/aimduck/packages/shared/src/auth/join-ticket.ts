// SPDX-License-Identifier: Apache-2.0

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Clock } from "../index.js";
import { TicketVerificationError } from "../errors.js";

export type JoinTicketClaims = {
  ticketId: string;
  roomId: string;
  playerId: string;
  issuedAt: number;
  expiresAt: number;
};

export type JoinTicketService = {
  issue(input: { playerId: string; roomId: string }): { ticket: string; expiresAt: number };
  verify(token: string, expected: { playerId: string; roomId: string }): JoinTicketClaims;
};

export function createJoinTicketService(
  secret: Uint8Array,
  options: { now: Clock["now"]; ttlMs: number; createId?: () => string },
): JoinTicketService {
  if (secret.byteLength < 32) {
    throw new RangeError("Join-ticket secret must contain at least 256 bits.");
  }
  if (!Number.isSafeInteger(options.ttlMs) || options.ttlMs < 1 || options.ttlMs > 300_000) {
    throw new RangeError("Join-ticket lifetime must be between one millisecond and five minutes.");
  }
  const key = Buffer.from(secret);

  function signature(encodedClaims: string): Buffer {
    return createHmac("sha256", key).update(encodedClaims, "ascii").digest();
  }

  return {
    issue({ playerId, roomId }) {
      if (!playerId || !roomId) {
        throw new TypeError("Join tickets require a player ID and room ID.");
      }
      const issuedAt = options.now();
      const claims: JoinTicketClaims = {
        ticketId: options.createId?.() ?? randomUUID(),
        roomId,
        playerId,
        issuedAt,
        expiresAt: issuedAt + options.ttlMs,
      };
      const encodedClaims = Buffer.from(JSON.stringify(claims)).toString("base64url");
      return {
        ticket: `${encodedClaims}.${signature(encodedClaims).toString("base64url")}`,
        expiresAt: claims.expiresAt,
      };
    },
    verify(token, expected) {
      const parts = token.split(".");
      const encodedClaims = parts[0];
      const encodedSignature = parts[1];
      if (
        parts.length !== 2 ||
        encodedClaims === undefined ||
        encodedSignature === undefined ||
        !/^[A-Za-z0-9_-]+$/.test(encodedClaims) ||
        !/^[A-Za-z0-9_-]+$/.test(encodedSignature)
      ) {
        throw new TicketVerificationError("invalid_ticket", "Invalid join ticket.");
      }

      const providedSignature = Buffer.from(encodedSignature, "base64url");
      const expectedSignature = signature(encodedClaims);
      if (
        providedSignature.byteLength !== expectedSignature.byteLength ||
        !timingSafeEqual(providedSignature, expectedSignature)
      ) {
        throw new TicketVerificationError("invalid_ticket", "Invalid ticket signature.");
      }

      let claims: unknown;
      try {
        claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8"));
      } catch (error) {
        throw new TicketVerificationError("invalid_ticket", "Invalid join ticket claims.", {
          cause: error,
        });
      }
      if (!isJoinTicketClaims(claims)) {
        throw new TicketVerificationError("invalid_ticket", "Invalid join ticket claims.");
      }
      if (claims.expiresAt <= options.now()) {
        throw new TicketVerificationError("ticket_expired", "Ticket has expired.");
      }
      if (claims.playerId !== expected.playerId) {
        throw new TicketVerificationError("identity_mismatch", "Ticket identity does not match.");
      }
      if (claims.roomId !== expected.roomId) {
        throw new TicketVerificationError("room_mismatch", "Ticket room does not match.");
      }
      return claims;
    },
  };
}

function isJoinTicketClaims(value: unknown): value is JoinTicketClaims {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const claims = value as Record<string, unknown>;
  return (
    typeof claims.ticketId === "string" &&
    claims.ticketId.length > 0 &&
    typeof claims.roomId === "string" &&
    typeof claims.playerId === "string" &&
    Number.isSafeInteger(claims.issuedAt) &&
    Number.isSafeInteger(claims.expiresAt)
  );
}
