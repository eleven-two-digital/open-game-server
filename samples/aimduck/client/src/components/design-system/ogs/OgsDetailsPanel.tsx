// SPDX-License-Identifier: Apache-2.0

import { Card } from "../primitives/index.js";

export function OgsDetailsPanel({
  playerId,
  roomId,
  connectionState,
}: {
  playerId: string;
  roomId: string;
  connectionState: "connected" | "disconnected";
}) {
  return (
    <details className="ogs-details">
      <summary>OGS entities and safe connection details</summary>
      <Card aria-label="Open Game Server connection details">
        <dl>
          <dt>PlayerIdentity</dt>
          <dd>{playerId}</dd>
          <dt>RoomInstance reference</dt>
          <dd>{roomId}</dd>
          <dt>RoomConnection</dt>
          <dd>{connectionState} · WebSocket · TLS · ECDH · AES-256-GCM · protocol v1</dd>
          <dt>RoomInstance operational state</dt>
          <dd>
            Owned by Discovery and shown in the room listing; not inferred from the Aimduck match
            phase.
          </dd>
          <dt>Aimduck match phase</dt>
          <dd>Owned by GameRoom and shown separately from Discovery operational state.</dd>
        </dl>
      </Card>
    </details>
  );
}
