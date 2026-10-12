// SPDX-License-Identifier: Apache-2.0

import { DiscoveryApiError } from "../discovery/discovery-client.js";
import { RoomConnectionError } from "./room-connection.js";

export type AdmissionFailure = {
  title: string;
  guidance: string;
  retryable: boolean;
};

const failures: Record<string, AdmissionFailure> = {
  invalid_ticket: {
    title: "The room rejected the entry ticket.",
    guidance: "Refresh the room list and resolve the room again.",
    retryable: true,
  },
  ticket_expired: {
    title: "The entry ticket expired.",
    guidance: "Resolve the room again to receive a fresh ticket.",
    retryable: true,
  },
  identity_mismatch: {
    title: "This ticket belongs to a different player or room.",
    guidance: "Return to Discovery and resolve the room while signed in as this player.",
    retryable: false,
  },
  room_full: {
    title: "The room filled before admission completed.",
    guidance: "Choose another room or refresh the list.",
    retryable: true,
  },
  room_unavailable: {
    title: "The selected room is no longer available.",
    guidance: "Refresh the room list and choose an active room.",
    retryable: true,
  },
  unauthorized: {
    title: "Your identity session is no longer valid.",
    guidance: "Sign in again, then resolve the room.",
    retryable: false,
  },
  network_unavailable: {
    title: "The local services could not be reached.",
    guidance: "Check Docker Compose health and trust the local development CA.",
    retryable: true,
  },
  connection_failed: {
    title: "A secure room connection could not be opened.",
    guidance: "Trust the local development CA and try resolving the room again.",
    retryable: true,
  },
  connection_timeout: {
    title: "The room did not respond in time.",
    guidance: "Check that the room is healthy, then try again.",
    retryable: true,
  },
};

export function mapAdmissionFailure(error: unknown): AdmissionFailure {
  if (error instanceof DiscoveryApiError || error instanceof RoomConnectionError) {
    return (
      failures[error.code] ?? {
        title: error.message,
        guidance: error.retryable
          ? "Check the room status and try again."
          : "Return to the room list or sign in again.",
        retryable: error.retryable,
      }
    );
  }
  return {
    title: "Room admission could not be completed.",
    guidance:
      "Return to Discovery and try again. If this continues, inspect the local service health.",
    retryable: true,
  };
}
