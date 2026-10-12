// SPDX-License-Identifier: Apache-2.0

import type { Scoreboard as ScoreboardState } from "@aimduck/shared";

export class Scoreboard {
  private readonly scores: Record<string, number>;
  private winners: string[] = [];

  constructor(playerIds: string[]) {
    if (playerIds.length === 0 || new Set(playerIds).size !== playerIds.length) {
      throw new RangeError("A scoreboard requires unique player IDs.");
    }
    this.scores = Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));
  }

  awardHit(shooterId: string): void {
    this.award(shooterId, 3);
  }

  awardCrossing(playerId: string): void {
    this.award(playerId, 1);
  }

  snapshot(): ScoreboardState {
    return { scores: { ...this.scores }, winners: [...this.winners] };
  }

  finalize(): ScoreboardState {
    const highestScore = Math.max(...Object.values(this.scores));
    this.winners = Object.entries(this.scores)
      .filter(([, score]) => score === highestScore)
      .map(([playerId]) => playerId);
    return this.snapshot();
  }

  private award(playerId: string, points: number): void {
    const score = this.scores[playerId];
    if (score === undefined) {
      throw new RangeError("Player is not part of this scoreboard.");
    }
    this.scores[playerId] = score + points;
  }
}
