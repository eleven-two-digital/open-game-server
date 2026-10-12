// SPDX-License-Identifier: Apache-2.0

import type { PlayerRole } from "@aimduck/shared";
import { AIMDUCK_TUNING } from "../game/tuning.js";
import { sweptCircleCollisionTime, sweptRectangleCollisionTime } from "./collisions.js";

export type ArenaPosition = { x: number; y: number };
export type ArenaInput = {
  move_x: number;
  move_y: number;
  throw: boolean;
  aim_x: number;
  aim_y: number;
};

export type ArenaPlayerInput = {
  playerId: string;
  role: PlayerRole;
  position: ArenaPosition;
};

export type ArenaTuning = {
  movementSpeed: number;
  projectileSpeed: number;
  gravity: number;
  projectileRadius: number;
  playerRadius: number;
  throwCooldownMs: number;
  arenaWidth: number;
  arenaHeight: number;
  safeZoneX: number;
  cover: ReadonlyArray<{ x: number; y: number; width: number; height: number }>;
};

export type ArenaEvent =
  | { type: "duck.crossed"; playerId: string }
  | { type: "duck.hit"; playerId: string }
  | { type: "rock.thrown"; playerId: string };

type SimulatedPlayer = ArenaPlayerInput & {
  outcome: "running" | "crossed" | "hit";
  input: ArenaInput;
  throwRequested: boolean;
  lastThrowAt: number;
};

type Projectile = {
  ownerId: string;
  position: ArenaPosition;
  velocity: ArenaPosition;
};

const NO_INPUT: ArenaInput = {
  move_x: 0,
  move_y: 0,
  throw: false,
  aim_x: 0.75,
  aim_y: 0.5,
};

const defaultTuning: ArenaTuning = {
  movementSpeed: AIMDUCK_TUNING.movementSpeed,
  projectileSpeed: AIMDUCK_TUNING.projectileSpeed,
  gravity: AIMDUCK_TUNING.gravity,
  projectileRadius: AIMDUCK_TUNING.projectileRadius,
  playerRadius: AIMDUCK_TUNING.playerRadius,
  throwCooldownMs: AIMDUCK_TUNING.throwCooldownMs,
  arenaWidth: AIMDUCK_TUNING.arenaWidth,
  arenaHeight: AIMDUCK_TUNING.arenaHeight,
  safeZoneX: 940,
  cover: AIMDUCK_TUNING.cover,
};

export class ArenaSimulation {
  private readonly players = new Map<string, SimulatedPlayer>();
  private readonly projectiles: Projectile[] = [];
  private readonly tuning: ArenaTuning;
  private elapsedMs = 0;

  constructor(players: ArenaPlayerInput[], tuning: Partial<ArenaTuning> = {}) {
    this.tuning = { ...defaultTuning, ...tuning };
    for (const player of players) {
      if (this.players.has(player.playerId)) {
        throw new Error("Arena player IDs must be unique.");
      }
      this.players.set(player.playerId, {
        ...player,
        position: { ...player.position },
        outcome: "running",
        input: { ...NO_INPUT },
        throwRequested: false,
        lastThrowAt: Number.NEGATIVE_INFINITY,
      });
    }
  }

  setInput(playerId: string, input: ArenaInput): void {
    const player = this.players.get(playerId);
    if (player === undefined) {
      throw new Error("Player does not belong to this arena.");
    }
    validateInput(input);
    if (input.throw && !player.input.throw) {
      player.throwRequested = true;
    }
    player.input = { ...input };
  }

  step(elapsedMs: number): ArenaEvent[] {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new RangeError("Simulation elapsed time must be finite and non-negative.");
    }
    const deltaSeconds = Math.min(elapsedMs, 100) / 1_000;
    this.elapsedMs += deltaSeconds * 1_000;
    const events: ArenaEvent[] = [];
    const previousPositions = new Map(
      [...this.players].map(([playerId, player]) => [playerId, { ...player.position }]),
    );

    for (const player of this.players.values()) {
      if (player.role === "duck" && player.outcome === "running") {
        this.moveDuck(player, deltaSeconds, events);
      } else if (
        player.role === "shooter" &&
        player.throwRequested &&
        this.elapsedMs - player.lastThrowAt >= this.tuning.throwCooldownMs &&
        this.projectiles.length === 0
      ) {
        this.throwRock(player, events);
      }
      if (player.role === "shooter") {
        player.throwRequested = false;
      }
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      if (projectile === undefined) {
        continue;
      }
      const previous = { ...projectile.position };
      const next = {
        x: previous.x + projectile.velocity.x * deltaSeconds,
        y:
          previous.y +
          projectile.velocity.y * deltaSeconds +
          0.5 * this.tuning.gravity * deltaSeconds * deltaSeconds,
      };
      projectile.velocity.y += this.tuning.gravity * deltaSeconds;
      projectile.position = next;

      const coverHit = this.tuning.cover
        .map((cover) =>
          sweptRectangleCollisionTime(previous, next, {
            x: cover.x - this.tuning.projectileRadius,
            y: cover.y - this.tuning.projectileRadius,
            width: cover.width + this.tuning.projectileRadius * 2,
            height: cover.height + this.tuning.projectileRadius * 2,
          }),
        )
        .filter((time): time is number => time !== null)
        .reduce<number | null>((nearest, time) => Math.min(nearest ?? 1, time), null);
      const duckHit = this.findDuckHit(projectile, previous, next, previousPositions);

      if (duckHit !== null && (coverHit === null || duckHit.time < coverHit)) {
        const duck = this.players.get(duckHit.playerId);
        if (duck !== undefined && duck.outcome === "running") {
          duck.outcome = "hit";
          events.push({ type: "duck.hit", playerId: duck.playerId });
        }
        this.projectiles.splice(index, 1);
      } else if (
        coverHit !== null ||
        next.x < 0 ||
        next.x > this.tuning.arenaWidth ||
        next.y > this.tuning.arenaHeight ||
        next.y < 0
      ) {
        this.projectiles.splice(index, 1);
      }
    }

    return events;
  }

  getPlayer(
    playerId: string,
  ): (ArenaPlayerInput & { outcome: SimulatedPlayer["outcome"] }) | undefined {
    const player = this.players.get(playerId);
    return player === undefined
      ? undefined
      : {
          playerId: player.playerId,
          role: player.role,
          position: { ...player.position },
          outcome: player.outcome,
        };
  }

  getProjectiles(): Array<{ ownerId: string; position: ArenaPosition }> {
    return this.projectiles.map((projectile) => ({
      ownerId: projectile.ownerId,
      position: { ...projectile.position },
    }));
  }

  private moveDuck(player: SimulatedPlayer, deltaSeconds: number, events: ArenaEvent[]): void {
    let x = player.input.move_x;
    let y = player.input.move_y;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    player.position.x = clamp(
      player.position.x + x * this.tuning.movementSpeed * deltaSeconds,
      0,
      this.tuning.arenaWidth,
    );
    player.position.y = clamp(
      player.position.y + y * this.tuning.movementSpeed * deltaSeconds,
      0,
      this.tuning.arenaHeight,
    );
    if (player.position.x >= this.tuning.safeZoneX) {
      player.outcome = "crossed";
      events.push({ type: "duck.crossed", playerId: player.playerId });
    }
  }

  private throwRock(player: SimulatedPlayer, events: ArenaEvent[]): void {
    const target = {
      x: player.input.aim_x * this.tuning.arenaWidth,
      y: player.input.aim_y * this.tuning.arenaHeight,
    };
    const directionX = target.x - player.position.x;
    const directionY = target.y - player.position.y;
    const magnitude = Math.hypot(directionX, directionY);
    if (magnitude === 0) {
      return;
    }
    this.projectiles.push({
      ownerId: player.playerId,
      position: { ...player.position },
      velocity: {
        x: (directionX / magnitude) * this.tuning.projectileSpeed,
        y: (directionY / magnitude) * this.tuning.projectileSpeed,
      },
    });
    player.lastThrowAt = this.elapsedMs;
    events.push({ type: "rock.thrown", playerId: player.playerId });
  }

  private findDuckHit(
    projectile: Projectile,
    previousRock: ArenaPosition,
    nextRock: ArenaPosition,
    previousPositions: Map<string, ArenaPosition>,
  ): { playerId: string; time: number } | null {
    let nearest: { playerId: string; time: number } | null = null;
    for (const player of this.players.values()) {
      if (player.role !== "duck" || player.outcome !== "running") {
        continue;
      }
      const previousDuck = previousPositions.get(player.playerId) ?? player.position;
      const relativeStart = {
        x: previousRock.x - previousDuck.x,
        y: previousRock.y - previousDuck.y,
      };
      const relativeEnd = {
        x: nextRock.x - player.position.x,
        y: nextRock.y - player.position.y,
      };
      const time = sweptCircleCollisionTime(
        relativeStart,
        relativeEnd,
        this.tuning.projectileRadius + this.tuning.playerRadius,
      );
      if (time !== null && (nearest === null || time < nearest.time)) {
        nearest = { playerId: player.playerId, time };
      }
    }
    return nearest;
  }
}

function validateInput(input: ArenaInput): void {
  const bounded = [input.move_x, input.move_y, input.aim_x, input.aim_y];
  if (
    bounded.some((value) => !Number.isFinite(value)) ||
    input.move_x < -1 ||
    input.move_x > 1 ||
    input.move_y < -1 ||
    input.move_y > 1 ||
    input.aim_x < 0 ||
    input.aim_x > 1 ||
    input.aim_y < 0 ||
    input.aim_y > 1 ||
    typeof input.throw !== "boolean"
  ) {
    throw new RangeError("Player input is outside the allowed bounds.");
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
