// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from "node:crypto";
import type { Clock, DiscoveryListing, RoomOperationalState } from "@aimduck/shared";

export type RoomRegistration = {
  roomId: string;
  displayName: string;
  host: string;
  port: number;
  capacity: 8;
  currentPlayers: number;
  tags: string[];
  ticketSecret: Uint8Array;
};

/** Discovery's OGS-owned registration and lease state; never returned as a public listing. */
type RoomInstance = RoomRegistration & {
  maskedToken: string;
  state: RoomOperationalState;
  leaseExpiresAt: number;
  reservations: Map<string, number>;
};

export type ReservedRoom = {
  roomId: string;
  host: string;
  port: number;
  ticketSecret: Uint8Array;
};

export class RoomRegistryError extends Error {
  constructor(
    readonly code: "room_not_found" | "room_unavailable" | "room_full",
    message: string,
  ) {
    super(message);
    this.name = "RoomRegistryError";
  }
}

export class RoomRegistry {
  private readonly rooms = new Map<string, RoomInstance>();
  private readonly byMaskedToken = new Map<string, string>();

  constructor(
    private readonly clock: Clock,
    private readonly leaseTtlMs: number,
  ) {
    if (!Number.isSafeInteger(leaseTtlMs) || leaseTtlMs < 5_000) {
      throw new RangeError("Discovery lease TTL must be at least five seconds.");
    }
  }

  register(input: RoomRegistration): { maskedToken: string } {
    validateRegistration(input);
    this.purgeExpired();

    const existing = this.rooms.get(input.roomId);
    const maskedToken = existing?.maskedToken ?? randomBytes(24).toString("base64url");
    if (existing === undefined) {
      this.byMaskedToken.set(maskedToken, input.roomId);
    }

    this.rooms.set(input.roomId, {
      ...input,
      tags: [...input.tags],
      ticketSecret: Uint8Array.from(input.ticketSecret),
      maskedToken,
      state: "active",
      leaseExpiresAt: this.clock.now() + this.leaseTtlMs,
      reservations: existing?.reservations ?? new Map(),
    });

    return { maskedToken };
  }

  heartbeat(
    roomId: string,
    currentPlayers: number,
    state: RoomOperationalState = "active",
    connectedPlayerIds?: string[],
  ): void {
    this.purgeExpired();
    const room = this.rooms.get(roomId);
    if (room === undefined) {
      throw new RoomRegistryError("room_not_found", "Room registration is not active.");
    }
    if (!Number.isInteger(currentPlayers) || currentPlayers < 0 || currentPlayers > room.capacity) {
      throw new RangeError("Room occupancy must be between zero and capacity.");
    }
    if (connectedPlayerIds !== undefined) {
      if (
        connectedPlayerIds.length !== currentPlayers ||
        new Set(connectedPlayerIds).size !== connectedPlayerIds.length
      ) {
        throw new RangeError("Heartbeat player IDs must match the reported occupancy.");
      }
      for (const playerId of connectedPlayerIds) {
        room.reservations.delete(playerId);
      }
    }
    room.currentPlayers = currentPlayers;
    room.state = state;
    room.leaseExpiresAt = this.clock.now() + this.leaseTtlMs;
  }

  unregister(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room !== undefined) {
      this.rooms.delete(roomId);
      this.byMaskedToken.delete(room.maskedToken);
    }
  }

  list(gameMode?: string): DiscoveryListing[] {
    this.purgeExpired();
    return [...this.rooms.values()]
      .filter((room) => gameMode === undefined || room.tags.includes(gameMode))
      .map((room) => ({
        maskedToken: room.maskedToken,
        displayName: room.displayName,
        currentPlayers: room.currentPlayers,
        maxPlayers: room.capacity,
        state: room.state,
        tags: [...room.tags],
      }));
  }

  reserve(maskedToken: string, playerId: string, reservationTtlMs: number): ReservedRoom {
    this.purgeExpired();
    const roomId = this.byMaskedToken.get(maskedToken);
    const room = roomId === undefined ? undefined : this.rooms.get(roomId);
    if (room === undefined) {
      throw new RoomRegistryError("room_not_found", "Room is no longer available.");
    }
    if (room.state !== "active") {
      throw new RoomRegistryError("room_unavailable", "Room is not accepting new players.");
    }
    if (!Number.isSafeInteger(reservationTtlMs) || reservationTtlMs < 1) {
      throw new RangeError("Reservation lifetime must be a positive safe integer.");
    }

    const priorReservation = room.reservations.get(playerId);
    if (
      priorReservation === undefined &&
      room.currentPlayers + room.reservations.size >= room.capacity
    ) {
      throw new RoomRegistryError("room_full", "Room is full.");
    }

    room.reservations.set(playerId, this.clock.now() + reservationTtlMs);
    return {
      roomId: room.roomId,
      host: room.host,
      port: room.port,
      ticketSecret: Uint8Array.from(room.ticketSecret),
    };
  }

  releaseReservation(roomId: string, playerId: string): void {
    this.rooms.get(roomId)?.reservations.delete(playerId);
  }

  markDraining(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room !== undefined) {
      room.state = "drain";
    }
  }

  private purgeExpired(): void {
    const now = this.clock.now();
    for (const room of this.rooms.values()) {
      for (const [playerId, expiresAt] of room.reservations) {
        if (expiresAt <= now) {
          room.reservations.delete(playerId);
        }
      }
      if (room.leaseExpiresAt <= now) {
        this.unregister(room.roomId);
      }
    }
  }
}

function validateRegistration(input: RoomRegistration): void {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(input.roomId)) {
    throw new TypeError("Room ID is invalid.");
  }
  if (input.capacity !== 8) {
    throw new RangeError("Aimduck rooms must have exactly eight seats.");
  }
  if (
    !Number.isInteger(input.currentPlayers) ||
    input.currentPlayers < 0 ||
    input.currentPlayers > input.capacity
  ) {
    throw new RangeError("Room occupancy must be between zero and capacity.");
  }
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65_535) {
    throw new RangeError("Room port must be between 1 and 65535.");
  }
  if (input.ticketSecret.byteLength < 32) {
    throw new RangeError("Room ticket secret must contain at least 256 bits.");
  }
}
