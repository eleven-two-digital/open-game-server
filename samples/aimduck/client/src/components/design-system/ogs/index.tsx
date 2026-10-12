// SPDX-License-Identifier: Apache-2.0

import type { DiscoveryListing } from "@aimduck/shared";
import { Badge, Button, Card } from "../primitives/index.js";

export function IdentitySummary({
  playerId,
  displayName,
}: {
  playerId: string;
  displayName: string;
}) {
  return (
    <section className="identity-summary" aria-label="PlayerIdentity">
      <span className="eyebrow">OGS · PlayerIdentity</span>
      <strong>{displayName}</strong>
      <span className="muted">{playerId}</span>
    </section>
  );
}

export function DiscoveryRoomCard({
  room,
  onResolve,
  disabled,
}: {
  room: DiscoveryListing;
  onResolve(): void;
  disabled: boolean;
}) {
  const tone = room.state === "active" ? "success" : "warning";
  return (
    <Card className="room-card" aria-label="DiscoveryListing">
      <div>
        <p className="eyebrow">OGS · masked DiscoveryListing</p>
        <h3>{room.displayName}</h3>
        <p>
          {room.currentPlayers} of {room.maxPlayers} seats occupied
        </p>
        <Badge tone={tone}>RoomInstance operational state: {room.state}</Badge>
      </div>
      <Button type="button" onClick={onResolve} disabled={disabled}>
        {room.currentPlayers >= room.maxPlayers
          ? "Room full"
          : room.state !== "active"
            ? "Unavailable"
            : "Resolve and join"}
      </Button>
    </Card>
  );
}

export function RoomConnectionSummary({
  roomId,
  connected,
}: {
  roomId: string;
  connected: boolean;
}) {
  return (
    <Card aria-label="RoomConnection">
      <p className="eyebrow">Admission/transport · RoomConnection</p>
      <h3>{roomId}</h3>
      <Badge tone={connected ? "success" : "danger"}>
        Connection: {connected ? "connected" : "disconnected"}
      </Badge>
      <p className="muted">Transport: WebSocket over TLS · protocol v1</p>
    </Card>
  );
}
