// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import realm from "../../../infra/keycloak/realm-import/aimduck-realm.json";

describe("local OIDC realm", () => {
  it("defines every requested default scope and loopback callback", () => {
    const client = realm.clients.find((entry) => entry.clientId === "aimduck-browser");
    expect(client).toBeDefined();
    if (client === undefined) {
      return;
    }

    const scopeNames = new Set(realm.clientScopes.map((scope) => scope.name));
    expect(client.defaultClientScopes).toEqual(
      expect.arrayContaining(["web-origins", "profile", "aimduck-identity", "aimduck-audience"]),
    );
    expect(client.defaultClientScopes.every((scope) => scopeNames.has(scope))).toBe(true);
    expect(client.redirectUris).toEqual(
      expect.arrayContaining([
        "http://localhost:5173/auth/callback",
        "http://127.0.0.1:5173/auth/callback",
      ]),
    );
    expect(client.publicClient).toBe(true);
    expect(client.attributes["pkce.code.challenge.method"]).toBe("S256");

    const playerIds = realm.users.map((user) => user.attributes?.player_id?.[0]);
    expect(playerIds).toHaveLength(8);
    expect(new Set(playerIds).size).toBe(8);
    expect(playerIds.every((playerId) => typeof playerId === "string" && playerId.length > 0)).toBe(
      true,
    );
  });
});
