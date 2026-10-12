// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from "react";
import type { DiscoveryListing } from "@aimduck/shared";
import type { ServerMessage } from "@aimduck/shared/messages";
import { JoinRoom } from "./features/admission/JoinRoom.js";
import type { EncryptedRoomConnection } from "./features/admission/room-connection.js";
import { MatchView } from "./features/match/MatchView.js";
import { IdentitySummary } from "./components/design-system/ogs/index.js";
import { discoveryClient } from "./features/discovery/discovery-client.js";
import { RoomBrowser } from "./features/discovery/RoomBrowser.js";
import {
  completeSignIn,
  getSignedInPlayer,
  signIn,
  signOut,
  type SignedInPlayer,
} from "./features/identity/oidc-client.js";

export function App() {
  const [player, setPlayer] = useState<SignedInPlayer | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<DiscoveryListing | null>(null);
  const [connection, setConnection] = useState<EncryptedRoomConnection | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const [eventHistory, setEventHistory] = useState<
    Array<{ sequence: number; type: string; receivedAt: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const lastServerSequence = useRef(-1);

  useEffect(() => {
    let active = true;
    async function restoreIdentity(): Promise<void> {
      try {
        if (window.location.pathname === "/auth/callback") {
          const signedIn = await completeSignIn();
          window.history.replaceState({}, document.title, "/");
          if (active) {
            setPlayer(signedIn);
          }
        } else {
          const signedIn = await getSignedInPlayer();
          if (active) {
            setPlayer(signedIn);
          }
        }
      } catch {
        if (active) {
          setIdentityError(
            "Sign-in could not be completed. Check the local identity provider and try again.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void restoreIdentity();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => connection?.close();
  }, [connection]);

  useEffect(() => {
    if (connection === null) {
      return;
    }
    const handleClose = () => setConnectionOpen(false);
    connection.socket.addEventListener("close", handleClose);
    return () => connection.socket.removeEventListener("close", handleClose);
  }, [connection]);

  function handleRoomMessage(message: ServerMessage): void {
    if (message.sequence <= lastServerSequence.current) {
      return;
    }
    lastServerSequence.current = message.sequence;
    setLastMessage(message);
    if (message.type !== "round.updated") {
      return;
    }
    const event = message.payload.event;
    if (event !== undefined) {
      setEventHistory((previous) =>
        [
          ...previous,
          {
            sequence: message.sequence,
            type: event.type,
            receivedAt: Date.now(),
          },
        ].slice(-12),
      );
    }
  }

  function handleConnected(nextConnection: EncryptedRoomConnection, nextRoomId: string): void {
    lastServerSequence.current = -1;
    setLastMessage(null);
    setEventHistory([]);
    setConnectionOpen(true);
    setConnection(nextConnection);
    setRoomId(nextRoomId);
    setSelectedRoom(null);
  }

  function leaveRoom(): void {
    connection?.close();
    setConnection(null);
    setConnectionOpen(false);
    setRoomId(null);
    setLastMessage(null);
    setEventHistory([]);
  }

  if (loading) {
    return (
      <main className="page-shell">
        <p role="status">Restoring player identity…</p>
      </main>
    );
  }

  if (player === null) {
    return (
      <main className="page-shell">
        <header className="hero">
          <p className="eyebrow">Open Game Server · playable reference sample</p>
          <h1>Aimduck</h1>
          <p>Join a room, take a role, and play an authoritative multiplayer match.</p>
        </header>
        {identityError !== null && (
          <div className="notice notice-error" role="alert">
            {identityError}
          </div>
        )}
        <button
          type="button"
          onClick={() =>
            void signIn().catch(() =>
              setIdentityError("Sign-in could not start. Check the local identity provider."),
            )
          }
        >
          Sign in with the local demo identity
        </button>
        <p className="muted">The local Keycloak users and credentials are for this sample only.</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Open Game Server · Aimduck sample</p>
          <h1>Aimduck</h1>
        </div>
        <div className="identity-pill">
          <IdentitySummary playerId={player.playerId} displayName={player.displayName} />
          <button
            type="button"
            className="button-secondary"
            onClick={() =>
              void signOut().catch(() =>
                setIdentityError("Sign-out could not be completed. Please retry."),
              )
            }
          >
            Sign out
          </button>
        </div>
      </header>
      {identityError !== null && (
        <div className="notice notice-error" role="alert">
          {identityError}
        </div>
      )}

      {connection === null && selectedRoom === null && (
        <RoomBrowser
          client={discoveryClient}
          accessToken={player.accessToken}
          onSelect={setSelectedRoom}
        />
      )}
      {connection === null && selectedRoom !== null && (
        <JoinRoom
          room={selectedRoom}
          accessToken={player.accessToken}
          onConnected={handleConnected}
          onMessage={handleRoomMessage}
          onCancel={() => setSelectedRoom(null)}
        />
      )}
      {connection !== null && (
        <MatchView
          playerId={player.playerId}
          roomId={roomId ?? ""}
          connection={connection}
          isConnected={connectionOpen}
          message={lastMessage}
          eventHistory={eventHistory}
          onLeave={leaveRoom}
        />
      )}
    </main>
  );
}
