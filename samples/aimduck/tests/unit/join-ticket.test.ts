// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { createJoinTicketService } from "../../services/discovery/src/resolution/join-ticket.js";

describe("player- and room-bound join tickets", () => {
  it("verifies the ticket signature, room, player, and expiry", async () => {
    let now = 10_000;
    const ticket = createJoinTicketService(Buffer.alloc(32, 4), {
      now: () => now,
      ttlMs: 300_000,
      createId: () => "ticket-1",
    });
    const issued = ticket.issue({ playerId: "player-1", roomId: "aimduck-room-1" });

    expect(
      ticket.verify(issued.ticket, { playerId: "player-1", roomId: "aimduck-room-1" }),
    ).toMatchObject({ ticketId: "ticket-1", expiresAt: 310_000 });
    expect(() =>
      ticket.verify(issued.ticket, { playerId: "player-2", roomId: "aimduck-room-1" }),
    ).toThrow("Ticket identity does not match.");
    expect(() =>
      ticket.verify(issued.ticket, { playerId: "player-1", roomId: "other-room" }),
    ).toThrow("Ticket room does not match.");

    now = 310_001;
    expect(() =>
      ticket.verify(issued.ticket, { playerId: "player-1", roomId: "aimduck-room-1" }),
    ).toThrow("Ticket has expired.");
  });

  it("rejects modified signatures and secrets are isolated per room", () => {
    const firstRoom = createJoinTicketService(Buffer.alloc(32, 1), {
      now: () => 10_000,
      ttlMs: 300_000,
      createId: () => "ticket-1",
    });
    const secondRoom = createJoinTicketService(Buffer.alloc(32, 2), {
      now: () => 10_000,
      ttlMs: 300_000,
      createId: () => "ticket-1",
    });
    const issued = firstRoom.issue({ playerId: "player-1", roomId: "aimduck-room-1" });
    const [payload, signature] = issued.ticket.split(".");

    const alteredSignature =
      signature === undefined
        ? "x"
        : `${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`;

    expect(() =>
      firstRoom.verify(`${payload}.${alteredSignature}`, {
        playerId: "player-1",
        roomId: "aimduck-room-1",
      }),
    ).toThrow("Invalid ticket signature.");
    expect(() =>
      secondRoom.verify(issued.ticket, { playerId: "player-1", roomId: "aimduck-room-1" }),
    ).toThrow("Invalid ticket signature.");
  });
});
