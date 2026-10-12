// SPDX-License-Identifier: Apache-2.0

import type { GameSnapshot } from "@aimduck/shared/messages";
import { LobbySeatCard } from "../../components/design-system/aimduck/index.js";

type LobbyProps = {
  game: GameSnapshot;
  playerId: string;
  onReady(ready: boolean): void;
};

export function Lobby({ game, playerId, onReady }: LobbyProps) {
  const ownSeat = game.seats.find((seat) => seat.playerId === playerId);
  const ready = ownSeat?.ready ?? false;

  return (
    <section className="game-panel" aria-labelledby="lobby-title">
      <p className="eyebrow">Aimduck · GameRoom lobby</p>
      <h2 id="lobby-title">Waiting for eight players</h2>
      <p>
        Take a seat, mark yourself ready, and wait for everyone. The room starts one complete
        eight-round match when all seats are ready.
      </p>
      <ol className="seat-grid" aria-label="Lobby seats">
        {game.seats.map((seat) => (
          <li key={seat.seatNumber}>
            <LobbySeatCard seat={seat} isSelf={seat.playerId === playerId} />
          </li>
        ))}
      </ol>
      <div className="button-row">
        <button
          type="button"
          onClick={() => onReady(!ready)}
          disabled={ownSeat?.connected !== true}
        >
          {ready ? "Cancel ready" : "Mark me ready"}
        </button>
        <span role="status">
          {game.seats.filter((seat) => seat.connected && seat.ready).length} of 8 players ready
        </span>
      </div>
    </section>
  );
}
