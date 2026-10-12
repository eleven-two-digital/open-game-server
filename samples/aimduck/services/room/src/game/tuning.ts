// SPDX-License-Identifier: Apache-2.0

export const AIMDUCK_TUNING = {
  seatCount: 8,
  roundCount: 8,
  roundDeadlineMs: 35_000,
  resultIntervalMs: 4_000,
  roleCountdownMs: 3_000,
  lobbyReservationMs: 30_000,
  simulationHz: 30,
  snapshotHz: 15,
  inputRateHz: 30,
  movementSpeed: 210,
  projectileSpeed: 650,
  gravity: 480,
  projectileRadius: 9,
  playerRadius: 20,
  throwCooldownMs: 750,
  arenaWidth: 1_000,
  arenaHeight: 600,
  cover: [
    { x: 370, y: 310, width: 100, height: 115 },
    { x: 700, y: 190, width: 115, height: 100 },
  ],
} as const;

export type AimduckTuning = {
  roundDeadlineMs: number;
  resultIntervalMs: number;
  roleCountdownMs: number;
  lobbyReservationMs: number;
};

export const DEFAULT_GAME_TUNING: AimduckTuning = {
  roundDeadlineMs: AIMDUCK_TUNING.roundDeadlineMs,
  resultIntervalMs: AIMDUCK_TUNING.resultIntervalMs,
  roleCountdownMs: AIMDUCK_TUNING.roleCountdownMs,
  lobbyReservationMs: AIMDUCK_TUNING.lobbyReservationMs,
};
