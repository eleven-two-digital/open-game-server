// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState } from "react";
import type { DiscoveryListing } from "@aimduck/shared";
import { DiscoveryApiError, type DiscoveryClient } from "./discovery-client.js";
import { DiscoveryRoomCard } from "../../components/design-system/ogs/index.js";

type RoomBrowserProps = {
  client: DiscoveryClient;
  accessToken: string;
  onSelect(room: DiscoveryListing): void;
};

export function RoomBrowser({ client, accessToken, onSelect }: RoomBrowserProps) {
  const [rooms, setRooms] = useState<DiscoveryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DiscoveryApiError | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const listing = await client.listRooms(accessToken, signal);
        setRooms(listing);
        setUpdatedAt(Date.now());
      } catch (caught) {
        if (caught instanceof DiscoveryApiError) {
          setError(caught);
        } else if (caught instanceof Error && caught.name === "AbortError") {
          return;
        } else {
          setError(
            new DiscoveryApiError(
              "discovery_unavailable",
              "Discovery returned an unexpected response.",
              true,
            ),
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken, client],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return (
    <section aria-labelledby="room-browser-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">OGS · DiscoveryListing</p>
          <h2 id="room-browser-title">Choose a room</h2>
          <p className="muted">Addresses stay hidden until you resolve a room.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh rooms"}
        </button>
      </div>

      {error !== null && (
        <div className="notice notice-error" role="alert">
          <strong>
            {rooms.length > 0
              ? "Showing the last available listing."
              : "Rooms could not be loaded."}
          </strong>
          <span>{error.message}</span>
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            Try again
          </button>
        </div>
      )}

      {updatedAt !== null && (
        <p className="muted status-line" role="status">
          Discovery catalog refreshed at {new Date(updatedAt).toLocaleTimeString()}.
        </p>
      )}

      {loading && rooms.length === 0 && <p role="status">Loading available rooms…</p>}
      {!loading && error === null && rooms.length === 0 && (
        <div className="empty-state">
          <h3>No Aimduck rooms are available</h3>
          <p>Wait for a room instance to register, then refresh this list.</p>
        </div>
      )}

      <ul className="room-list">
        {rooms.map((room) => {
          const full = room.currentPlayers >= room.maxPlayers;
          const unavailable = room.state !== "active";
          return (
            <li key={room.maskedToken}>
              <DiscoveryRoomCard
                room={room}
                onResolve={() => onSelect(room)}
                disabled={full || unavailable || loading}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
