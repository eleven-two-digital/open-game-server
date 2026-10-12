// SPDX-License-Identifier: Apache-2.0

import type { ArenaSnapshot } from "../game-state.js";

type SnapshotFrame = {
  tick: number;
  receivedAt: number;
  arena: ArenaSnapshot;
};

export class SnapshotInterpolator {
  private previous: SnapshotFrame | null = null;
  private current: SnapshotFrame | null = null;

  push(tick: number, arena: ArenaSnapshot, receivedAt: number): boolean {
    if (!Number.isSafeInteger(tick) || tick < 0 || !Number.isFinite(receivedAt)) {
      return false;
    }
    if (this.current !== null && tick <= this.current.tick) {
      return false;
    }
    this.previous = this.current;
    this.current = { tick, receivedAt, arena: cloneArena(arena) };
    return true;
  }

  sample(renderAt: number): ArenaSnapshot {
    const current = this.current;
    if (current === null) {
      return { players: [], projectiles: [] };
    }
    const previous = this.previous;
    if (
      previous === null ||
      renderAt <= previous.receivedAt ||
      renderAt >= current.receivedAt ||
      current.receivedAt <= previous.receivedAt
    ) {
      return cloneArena(current.arena);
    }
    const alpha = (renderAt - previous.receivedAt) / (current.receivedAt - previous.receivedAt);
    return interpolateArena(previous.arena, current.arena, alpha);
  }
}

function cloneArena(arena: ArenaSnapshot): ArenaSnapshot {
  return {
    players: arena.players.map((player) =>
      player === null ? null : { ...player, position: { ...player.position } },
    ),
    projectiles: arena.projectiles.map((projectile) => ({
      ...projectile,
      position: { ...projectile.position },
    })),
  };
}

function interpolateArena(
  previous: ArenaSnapshot,
  current: ArenaSnapshot,
  alpha: number,
): ArenaSnapshot {
  const priorPlayers = new Map(
    previous.players.filter((player) => player !== null).map((player) => [player.playerId, player]),
  );
  const players = current.players.map((player) => {
    if (player === null) {
      return null;
    }
    const prior = priorPlayers.get(player.playerId);
    if (prior === undefined || prior.outcome !== player.outcome) {
      return { ...player, position: { ...player.position } };
    }
    return {
      ...player,
      position: {
        x: lerp(prior.position.x, player.position.x, alpha),
        y: lerp(prior.position.y, player.position.y, alpha),
      },
    };
  });
  const priorProjectiles = new Map(
    previous.projectiles.map((projectile, index) => [`${projectile.ownerId}:${index}`, projectile]),
  );
  const projectiles = current.projectiles.map((projectile, index) => {
    const prior = priorProjectiles.get(`${projectile.ownerId}:${index}`);
    return {
      ...projectile,
      position:
        prior === undefined
          ? { ...projectile.position }
          : {
              x: lerp(prior.position.x, projectile.position.x, alpha),
              y: lerp(prior.position.y, projectile.position.y, alpha),
            },
    };
  });
  return { players, projectiles };
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}
