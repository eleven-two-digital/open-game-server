// SPDX-License-Identifier: Apache-2.0

import {
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from "oidc-client-ts";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const inMemoryUserStore = new WebStorageStateStore({ store: new MemoryStorage() });
const redirectStateStore = new WebStorageStateStore({ store: window.sessionStorage });
const settings: UserManagerSettings = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8180/realms/aimduck",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "aimduck-browser",
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile",
  automaticSilentRenew: false,
  loadUserInfo: true,
  userStore: inMemoryUserStore,
  stateStore: redirectStateStore,
};

const userManager = new UserManager(settings);

export type SignedInPlayer = {
  playerId: string;
  displayName: string;
  accessToken: string;
  expiresAt: number;
};

export async function signIn(): Promise<void> {
  await userManager.signinRedirect();
}

export async function completeSignIn(): Promise<SignedInPlayer> {
  const user = await userManager.signinRedirectCallback();
  return mapUser(user);
}

export async function getSignedInPlayer(): Promise<SignedInPlayer | null> {
  const user = await userManager.getUser();
  return user === null || user.expired ? null : mapUser(user);
}

export async function signOut(): Promise<void> {
  await userManager.removeUser();
  await userManager.signoutRedirect();
}

function mapUser(user: User): SignedInPlayer {
  const playerId =
    typeof user.profile.player_id === "string" && user.profile.player_id.length > 0
      ? user.profile.player_id
      : user.profile.sub;
  if (typeof playerId !== "string" || playerId.length === 0) {
    throw new Error("The identity provider returned no stable player identifier.");
  }
  const name = user.profile.name ?? user.profile.preferred_username;
  return {
    playerId,
    displayName: typeof name === "string" && name.length > 0 ? name : playerId,
    accessToken: user.access_token,
    expiresAt: (user.expires_at ?? 0) * 1_000,
  };
}
