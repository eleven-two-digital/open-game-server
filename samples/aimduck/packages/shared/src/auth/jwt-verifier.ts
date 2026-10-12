// SPDX-License-Identifier: Apache-2.0

import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import type { PlayerIdentity } from "../index.js";

export type JwtVerifierOptions = {
  issuer: string;
  audience: string;
  jwksUri: string;
  cacheMaxAgeMs?: number;
  cooldownMs?: number;
  timeoutMs?: number;
};

export class InvalidIdentityTokenError extends Error {
  constructor(message = "Identity token is invalid or expired.", options?: ErrorOptions) {
    super(message, options);
    this.name = "InvalidIdentityTokenError";
  }
}

export class IdentityProviderUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Identity provider keys could not be loaded.", { cause });
    this.name = "IdentityProviderUnavailableError";
  }
}

export function createIdentityTokenVerifier(
  options: JwtVerifierOptions,
): (token: string) => Promise<PlayerIdentity> {
  const jwks = createRemoteJWKSet(new URL(options.jwksUri), {
    cacheMaxAge: options.cacheMaxAgeMs ?? 300_000,
    cooldownDuration: options.cooldownMs ?? 30_000,
    timeoutDuration: options.timeoutMs ?? 5_000,
  });

  return async (token) => {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, jwks, {
        issuer: options.issuer,
        audience: options.audience,
      }));
    } catch (error) {
      if (
        error instanceof errors.JWTExpired ||
        error instanceof errors.JWTClaimValidationFailed ||
        error instanceof errors.JWTInvalid ||
        error instanceof errors.JWSSignatureVerificationFailed ||
        error instanceof errors.JWKSNoMatchingKey
      ) {
        throw new InvalidIdentityTokenError(undefined, { cause: error });
      }
      throw new IdentityProviderUnavailableError(error);
    }

    const playerId =
      typeof payload.sub === "string" && payload.sub.length > 0
        ? payload.sub
        : typeof payload.player_id === "string" && payload.player_id.length > 0
          ? payload.player_id
          : null;
    if (playerId === null || typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      throw new InvalidIdentityTokenError(
        "Identity token must include a stable player identifier and expiry.",
      );
    }

    const displayName =
      typeof payload.name === "string" && payload.name.length > 0
        ? payload.name
        : typeof payload.preferred_username === "string" && payload.preferred_username.length > 0
          ? payload.preferred_username
          : playerId;

    return {
      playerId,
      displayName,
      issuer: options.issuer,
      expiresAt: payload.exp * 1000,
    };
  };
}
