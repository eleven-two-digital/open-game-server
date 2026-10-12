// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  GamePhaseBadge,
  LobbySeatCard,
} from "../../../client/src/components/design-system/aimduck/index.js";
import {
  DiscoveryRoomCard,
  IdentitySummary,
  RoomConnectionSummary,
} from "../../../client/src/components/design-system/ogs/index.js";
import { OgsDetailsPanel } from "../../../client/src/components/design-system/ogs/OgsDetailsPanel.js";

describe("OGS entity design system", () => {
  it("keeps a DiscoveryListing masked while showing operational state and capacity", () => {
    const markup = renderToStaticMarkup(
      <DiscoveryRoomCard
        room={{
          maskedToken: "opaque-token",
          displayName: "Aimduck room-1",
          currentPlayers: 3,
          maxPlayers: 8,
          state: "active",
          tags: ["aimduck"],
        }}
        onResolve={() => {}}
        disabled={false}
      />,
    );

    expect(markup).toContain("masked DiscoveryListing");
    expect(markup).toContain("RoomInstance operational state: active");
    expect(markup).toContain("3 of 8 seats occupied");
    expect(markup).not.toContain("localhost");
    expect(markup).not.toContain("opaque-token");
  });

  it("gives identity, seat readiness, and connection states accessible names", () => {
    const identity = renderToStaticMarkup(
      <IdentitySummary playerId="player-1" displayName="Duck One" />,
    );
    const seat = renderToStaticMarkup(
      <LobbySeatCard
        seat={{
          seatNumber: 0,
          playerId: "player-1",
          displayName: "Duck One",
          ready: true,
          connected: true,
          reservationDeadline: null,
        }}
        isSelf
      />,
    );
    const connection = renderToStaticMarkup(<RoomConnectionSummary roomId="room-1" connected />);
    const ogsDetails = renderToStaticMarkup(
      <OgsDetailsPanel playerId="player-1" roomId="room-1" connectionState="connected" />,
    );
    const gamePhase = renderToStaticMarkup(<GamePhaseBadge phase="in_progress" />);

    expect(identity).toContain('aria-label="PlayerIdentity"');
    expect(seat).toContain('aria-label="LobbySeat 1"');
    expect(seat).toContain("Aimduck · LobbySeat");
    expect(seat).toContain("Connected · ready");
    expect(seat).toContain("Your Aimduck PlayerSession");
    expect(connection).toContain('aria-label="RoomConnection"');
    expect(connection).toContain("Admission/transport · RoomConnection");
    expect(connection).toContain("Connection: connected");
    expect(ogsDetails).toContain("RoomInstance operational state");
    expect(ogsDetails).toContain("not inferred from the Aimduck match phase");
    expect(gamePhase).toContain("Aimduck match phase: in_progress");
  });
});
