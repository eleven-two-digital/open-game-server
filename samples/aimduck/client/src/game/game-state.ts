// SPDX-License-Identifier: Apache-2.0

import type { PlayerSession } from "@aimduck/shared";
import type { ArenaSnapshot, GameSnapshot, ServerMessage } from "@aimduck/shared/messages";

export type { ArenaSnapshot } from "@aimduck/shared/messages";

export function getGameSnapshot(message: ServerMessage): GameSnapshot | null {
  return message.type === "room.error" ? null : message.payload.game;
}

export function getVisiblePlayerSnapshots(message: ServerMessage): PlayerSession[] {
  if (message.type === "room.error") {
    return [];
  }
  return message.payload.me === null
    ? message.payload.others
    : [message.payload.me, ...message.payload.others];
}

export function getPlayerSnapshot(message: ServerMessage, playerId: string): PlayerSession | null {
  if (message.type === "room.error") {
    return null;
  }
  if (message.payload.me?.playerId === playerId) {
    return message.payload.me;
  }
  return message.payload.others.find((player) => player.playerId === playerId) ?? null;
}

export function getArenaSnapshot(message: ServerMessage): ArenaSnapshot {
  return message.type === "room.error" ? { players: [], projectiles: [] } : message.payload.arena;
}

export function getServerTick(message: ServerMessage): number {
  return message.type === "room.error" ? 0 : message.payload.server.tick;
}
