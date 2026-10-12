// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from "react";
import type { PlayerSession } from "@aimduck/shared";
import type { ClientMessage, GameSnapshot, ServerMessage } from "@aimduck/shared/messages";
import type { EncryptedRoomConnection } from "../admission/room-connection.js";
import { ArenaView } from "../../game/ArenaView.js";
import type { ArenaInput } from "../../game/scenes/ArenaScene.js";
import {
  getArenaSnapshot,
  getGameSnapshot,
  getPlayerSnapshot,
  getServerTick,
  getVisiblePlayerSnapshots,
} from "../../game/game-state.js";
import { GamePhaseBadge, ScoreRow } from "../../components/design-system/aimduck/index.js";
import { OgsDetailsPanel } from "../../components/design-system/ogs/OgsDetailsPanel.js";
import { RoomConnectionSummary } from "../../components/design-system/ogs/index.js";
import { Lobby } from "../lobby/Lobby.js";

type MatchViewProps = {
  playerId: string;
  roomId: string;
  connection: EncryptedRoomConnection;
  isConnected: boolean;
  message: ServerMessage | null;
  eventHistory: Array<{ sequence: number; type: string; receivedAt: number }>;
  onLeave(): void;
};

export function MatchView({
  playerId,
  roomId,
  connection,
  isConnected,
  message,
  eventHistory,
  onLeave,
}: MatchViewProps) {
  const [now, setNow] = useState(Date.now());
  const [sendError, setSendError] = useState<string | null>(null);
  const sequence = useRef(0);
  const game: GameSnapshot | null = message === null ? null : getGameSnapshot(message);
  const player: PlayerSession | null =
    message === null ? null : getPlayerSnapshot(message, playerId);
  const sessions = message === null ? [] : getVisiblePlayerSnapshots(message);
  const arena = message === null ? { players: [], projectiles: [] } : getArenaSnapshot(message);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  async function sendReady(ready: boolean): Promise<void> {
    sequence.current += 1;
    const message: ClientMessage = {
      version: 1,
      type: "player.ready",
      sequence: sequence.current,
      payload: { ready },
    };
    await connection.send(message);
  }

  async function sendInput(input: ArenaInput): Promise<void> {
    sequence.current += 1;
    const message: ClientMessage = {
      version: 1,
      type: "player.input",
      sequence: sequence.current,
      payload: input,
    };
    await connection.send(message);
  }

  function reportSendError(error: unknown): void {
    setSendError(
      error instanceof Error ? error.message : "The room did not accept the latest game action.",
    );
  }

  if (game === null || player === null) {
    return (
      <section className="game-panel" aria-live="polite">
        <p role="status">Waiting for the room's authoritative game state…</p>
        <button type="button" className="button-secondary" onClick={onLeave}>
          Leave room
        </button>
      </section>
    );
  }
  if (game.phase === "lobby") {
    return (
      <>
        <RoomConnectionSummary roomId={roomId} connected={isConnected} />
        <OgsDetailsPanel
          playerId={playerId}
          roomId={roomId}
          connectionState={isConnected ? "connected" : "disconnected"}
        />
        <Lobby
          game={game}
          playerId={playerId}
          onReady={(ready) => void sendReady(ready).catch(reportSendError)}
        />
        <button type="button" className="button-secondary" onClick={onLeave}>
          Leave room
        </button>
      </>
    );
  }

  const round = game.round;
  const shooter = round?.shooterId === playerId;
  const remainingMs =
    round?.phase === "countdown" && round.countdownEndsAt !== null
      ? Math.max(0, round.countdownEndsAt - now)
      : round?.phase === "active" && round.deadline !== null
        ? Math.max(0, round.deadline - now)
        : round?.intermissionEndsAt !== null && round?.intermissionEndsAt !== undefined
          ? Math.max(0, round.intermissionEndsAt - now)
          : null;
  return (
    <section className="game-panel" aria-labelledby="match-title">
      <header className="match-heading">
        <div>
          <p className="eyebrow">Aimduck · MatchRound {round?.number ?? "—"} of 8</p>
          <h2 id="match-title">
            {game.phase === "complete"
              ? "Match complete"
              : round?.phase === "countdown"
                ? "Get ready"
                : round?.phase === "results"
                  ? "Round results"
                  : shooter
                    ? "You are the Shooter"
                    : "You are a Duck"}
          </h2>
          <p role="status">
            {game.phase === "complete"
              ? game.scoreboard.winners.length === 1
                ? `${sessions.find((session) => session.playerId === game.scoreboard.winners[0])?.displayName ?? "Winner"} wins.`
                : `Tie between ${game.scoreboard.winners.length} players.`
              : round?.phase === "countdown"
                ? `Roles are assigned. Round starts in ${Math.ceil((remainingMs ?? 0) / 1_000)} seconds.`
                : round?.phase === "results"
                  ? `Next round in ${Math.ceil((remainingMs ?? 0) / 1_000)} seconds.`
                  : `Time remaining: ${Math.ceil((remainingMs ?? 0) / 1_000)} seconds.`}
          </p>
        </div>
        <GamePhaseBadge phase={game.phase} />
        <span className="status-badge status-active">
          {game.phase === "complete" ? "Game complete" : (round?.phase ?? "Waiting")}
        </span>
      </header>
      <RoomConnectionSummary roomId={roomId} connected={isConnected} />
      <OgsDetailsPanel
        playerId={playerId}
        roomId={roomId}
        connectionState={isConnected ? "connected" : "disconnected"}
      />
      {!isConnected && (
        <p role="alert">
          The room connection closed. Match state may continue in the room; leave or reconnect with
          a fresh room resolution.
        </p>
      )}

      {round?.phase === "active" && (
        <>
          {sendError !== null && <p role="alert">{sendError}</p>}
          <p id="arena-controls" className="control-hint">
            {shooter
              ? "Aim with the pointer or arrow keys. Click or press Space to throw one rock."
              : "Move with WASD or arrow keys. Reach the green safe zone on the right."}
            {" Click or Tab to focus the arena controls."}
          </p>
          <ArenaView
            playerId={playerId}
            role={shooter ? "shooter" : "duck"}
            arena={arena}
            serverTick={message === null ? 0 : getServerTick(message)}
            onInput={(input) => void sendInput(input).catch(reportSendError)}
          />
        </>
      )}

      <div className="match-columns">
        <section aria-labelledby="scoreboard-title">
          <h3 id="scoreboard-title">Scoreboard</h3>
          <ol className="scoreboard" aria-live="polite">
            {rankedSessions(game, sessions).map((session) => (
              <ScoreRow
                key={session.playerId}
                player={session}
                score={game.scoreboard.scores[session.playerId] ?? 0}
                isSelf={session.playerId === playerId}
              />
            ))}
          </ol>
        </section>
        {round !== null && (
          <section aria-labelledby="round-title">
            <h3 id="round-title">Round outcomes</h3>
            <ul className="outcome-list">
              {Object.entries(round.duckOutcomes).map(([duckId, outcome]) => (
                <li key={duckId}>
                  {sessions.find((session) => session.playerId === duckId)?.displayName ?? duckId}:{" "}
                  {outcome}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <section className="event-log" aria-labelledby="event-log-title">
        <h3 id="event-log-title">Match event log</h3>
        <ol aria-live="polite">
          {eventHistory.length === 0 ? (
            <li>Events will appear here as the room resolves them.</li>
          ) : (
            [...eventHistory].reverse().map(({ sequence, type, receivedAt }) => (
              <li key={sequence}>
                {eventLabel(type)} · {new Date(receivedAt).toLocaleTimeString()}
              </li>
            ))
          )}
        </ol>
      </section>
      <button type="button" className="button-secondary" onClick={onLeave}>
        Leave room
      </button>
    </section>
  );
}

function rankedSessions(game: GameSnapshot, sessions: PlayerSession[]): PlayerSession[] {
  return [...sessions].sort(
    (left, right) =>
      (game.scoreboard.scores[right.playerId] ?? 0) -
        (game.scoreboard.scores[left.playerId] ?? 0) || left.seatNumber - right.seatNumber,
  );
}

function eventLabel(type: string): string {
  if (type === "duck.hit") {
    return "Duck hit";
  }
  if (type === "duck.crossed") {
    return "Duck crossed safely";
  }
  if (type === "rock.thrown") {
    return "Shooter threw a rock";
  }
  return type;
}
