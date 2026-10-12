// SPDX-License-Identifier: Apache-2.0

import type { DiscoveryListing } from "@aimduck/shared";
import type { RoomRegistry } from "./room-registry.js";

export function listRooms(registry: RoomRegistry, gameMode?: string): DiscoveryListing[] {
  return registry.list(gameMode);
}
