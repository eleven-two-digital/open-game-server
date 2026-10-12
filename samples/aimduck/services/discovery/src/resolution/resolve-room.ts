// SPDX-License-Identifier: Apache-2.0

import type { RoomRegistry } from "../catalog/room-registry.js";
import type { ReservedRoom } from "../catalog/room-registry.js";

export type IssuedRoomTicket = {
  ticket: string;
  expiresAt: number;
};

export async function resolveRoom(
  registry: RoomRegistry,
  input: { maskedToken: string; playerId: string; ticketTtlMs: number },
  issueTicket: (room: ReservedRoom, playerId: string) => Promise<IssuedRoomTicket>,
): Promise<{
  roomId: string;
  host: string;
  port: number;
  ticket: string;
  expiresAt: number;
}> {
  const room = registry.reserve(input.maskedToken, input.playerId, input.ticketTtlMs);
  try {
    const ticket = await issueTicket(room, input.playerId);
    return {
      roomId: room.roomId,
      host: room.host,
      port: room.port,
      ticket: ticket.ticket,
      expiresAt: ticket.expiresAt,
    };
  } catch (error) {
    registry.releaseReservation(room.roomId, input.playerId);
    throw error;
  }
}
