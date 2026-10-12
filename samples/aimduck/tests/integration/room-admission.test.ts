// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createEphemeralKeyPair } from "../../packages/shared/src/crypto/session-keys.js";
import { createRoomAdmission } from "../../services/room/src/transport/handshake.js";

describe("room admission", () => {
  it("admits a valid ticket once and returns a single-use session", async () => {
    const clientKeyPair = await createEphemeralKeyPair();
    const admission = createRoomAdmission({
      roomId: "aimduck-room-1",
      verifyIdentity: vi.fn().mockResolvedValue({
        playerId: "player-1",
        displayName: "Player One",
      }),
      verifyTicket: vi.fn().mockReturnValue({
        ticketId: "ticket-1",
        playerId: "player-1",
        roomId: "aimduck-room-1",
        expiresAt: 20_000,
      }),
      reserveSeat: () => true,
      createSessionId: () => "session-1",
      now: () => 10_000,
    });
    const request = {
      authorization: "Bearer valid-token",
      joinTicket: "valid-ticket",
      clientPublicKey: clientKeyPair.publicKey,
      clientNonce: randomBytes(32).toString("base64url"),
    };

    await expect(admission.handshake(request)).resolves.toMatchObject({
      sessionId: "session-1",
      playerId: "player-1",
    });
    await expect(admission.handshake(request)).rejects.toThrow("Ticket has already been used.");
    expect(admission.consumeSession("session-1")).toMatchObject({ playerId: "player-1" });
    expect(admission.consumeSession("session-1")).toBeNull();
  });

  it("rejects an expired ticket before reserving a seat", async () => {
    const clientKeyPair = await createEphemeralKeyPair();
    const reserveSeat = vi.fn().mockReturnValue(true);
    const admission = createRoomAdmission({
      roomId: "aimduck-room-1",
      verifyIdentity: vi.fn().mockResolvedValue({ playerId: "player-1", displayName: "P1" }),
      verifyTicket: vi.fn().mockReturnValue({
        ticketId: "ticket-1",
        playerId: "player-1",
        roomId: "aimduck-room-1",
        expiresAt: 1,
      }),
      reserveSeat,
      createSessionId: vi.fn(),
      now: () => 10_000,
    });

    await expect(
      admission.handshake({
        authorization: "Bearer valid-token",
        joinTicket: "expired-ticket",
        clientPublicKey: clientKeyPair.publicKey,
        clientNonce: randomBytes(32).toString("base64url"),
      }),
    ).rejects.toMatchObject({ code: "ticket_expired" });
    expect(reserveSeat).not.toHaveBeenCalled();
  });

  it("rejects mismatched identity and a full room without creating a session", async () => {
    const clientKeyPair = await createEphemeralKeyPair();
    const identityMismatch = createRoomAdmission({
      roomId: "aimduck-room-1",
      verifyIdentity: vi.fn().mockResolvedValue({ playerId: "player-1", displayName: "P1" }),
      verifyTicket: vi.fn().mockReturnValue({
        ticketId: "ticket-1",
        playerId: "player-2",
        roomId: "aimduck-room-1",
        expiresAt: 20_000,
      }),
      reserveSeat: vi.fn().mockReturnValue(true),
      createSessionId: vi.fn(),
      now: () => 10_000,
    });
    const request = {
      authorization: "Bearer valid-token",
      joinTicket: "mismatched-ticket",
      clientPublicKey: clientKeyPair.publicKey,
      clientNonce: randomBytes(32).toString("base64url"),
    };

    await expect(identityMismatch.handshake(request)).rejects.toMatchObject({
      code: "identity_mismatch",
    });

    const fullRoom = createRoomAdmission({
      roomId: "aimduck-room-1",
      verifyIdentity: vi.fn().mockResolvedValue({ playerId: "player-1", displayName: "P1" }),
      verifyTicket: vi.fn().mockReturnValue({
        ticketId: "ticket-2",
        playerId: "player-1",
        roomId: "aimduck-room-1",
        expiresAt: 20_000,
      }),
      reserveSeat: vi.fn().mockReturnValue(false),
      createSessionId: vi.fn(),
      now: () => 10_000,
    });

    await expect(
      fullRoom.handshake({ ...request, joinTicket: "full-room-ticket" }),
    ).rejects.toMatchObject({ code: "room_full" });
  });
});
