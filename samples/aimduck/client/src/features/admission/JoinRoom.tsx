// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import type { DiscoveryListing } from "@aimduck/shared";
import type { ServerMessage } from "@aimduck/shared/messages";
import { discoveryClient, type DiscoveryClient } from "../discovery/discovery-client.js";
import { connectToRoom, type EncryptedRoomConnection } from "./room-connection.js";
import { mapAdmissionFailure } from "./admission-errors.js";

type JoinRoomProps = {
  room: DiscoveryListing;
  accessToken: string;
  onConnected(connection: EncryptedRoomConnection, roomId: string): void;
  onMessage?(message: ServerMessage): void;
  onCancel(): void;
  client?: DiscoveryClient;
};

export function JoinRoom({
  room,
  accessToken,
  onConnected,
  onMessage,
  onCancel,
  client = discoveryClient,
}: JoinRoomProps) {
  const [stage, setStage] = useState("Resolving room through Discovery…");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ReturnType<typeof mapAdmissionFailure> | null>(null);

  async function join(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      setStage("Resolving the selected room and requesting a short-lived ticket…");
      const resolution = await client.resolveRoom(accessToken, room.maskedToken);
      setStage("Establishing the room's encrypted player session…");
      const connection = await connectToRoom(resolution, accessToken, onMessage ?? (() => {}));
      onConnected(connection, resolution.roomId);
    } catch (error) {
      setFailure(mapAdmissionFailure(error));
      setStage("Admission did not complete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="join-card" aria-labelledby="join-room-title">
      <p className="eyebrow">OGS · RoomResolution → RoomConnection</p>
      <h2 id="join-room-title">Join {room.displayName}</h2>
      <p>{stage}</p>
      {failure !== null && (
        <div className="notice notice-error" role="alert">
          <strong>{failure.title}</strong>
          <span>{failure.guidance}</span>
        </div>
      )}
      <div className="button-row">
        <button type="button" onClick={() => void join()} disabled={busy}>
          {busy ? "Connecting…" : failure?.retryable ? "Try again" : "Resolve and connect"}
        </button>
        <button type="button" className="button-secondary" onClick={onCancel} disabled={busy}>
          Back to rooms
        </button>
      </div>
    </section>
  );
}
