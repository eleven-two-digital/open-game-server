// SPDX-License-Identifier: Apache-2.0

import type { GameRoomPhase, LobbySeat, PlayerRole, PlayerSession } from "@aimduck/shared";
import { Badge, Card } from "../primitives/index.js";

export function GamePhaseBadge({ phase }: { phase: GameRoomPhase }) {
  return (
    <Badge tone={phase === "complete" ? "success" : "info"}>Aimduck match phase: {phase}</Badge>
  );
}

export function LobbySeatCard({ seat, isSelf }: { seat: LobbySeat; isSelf: boolean }) {
  const status =
    seat.playerId === null
      ? "Open seat"
      : !seat.connected
        ? "Reserved · reconnecting"
        : seat.ready
          ? "Connected · ready"
          : "Connected · not ready";
  return (
    <Card className="seat-card" aria-label={`LobbySeat ${seat.seatNumber + 1}`}>
      <span className="entity-label">Aimduck · LobbySeat</span>
      <span className="seat-number">Seat {seat.seatNumber + 1}</span>
      <strong>{seat.displayName ?? "Waiting for a player"}</strong>
      <span className="seat-status">{status}</span>
      {isSelf && <span className="entity-label">Your Aimduck PlayerSession</span>}
      {seat.reservationDeadline !== null && <Badge tone="warning">Seat reservation active</Badge>}
    </Card>
  );
}

export function RoleBadge({ role }: { role: PlayerRole | null }) {
  return (
    <Badge tone={role === "shooter" ? "warning" : "info"}>
      Role: {role === null ? "waiting" : role}
    </Badge>
  );
}

export function ScoreRow({
  player,
  score,
  isSelf,
}: {
  player: PlayerSession;
  score: number;
  isSelf: boolean;
}) {
  return (
    <li className={isSelf ? "is-self" : ""}>
      <span>{player.displayName}</span>
      <strong>{score} points</strong>
      <RoleBadge role={player.role} />
    </li>
  );
}
