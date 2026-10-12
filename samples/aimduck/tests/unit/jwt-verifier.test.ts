// SPDX-License-Identifier: Apache-2.0

import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWK, type KeyLike } from "jose";
import { createJwtVerifier } from "../../services/discovery/src/auth/jwt-verifier.js";

describe("JWT/JWKS verification", () => {
  let server: Server;
  let jwks: { keys: JWK[] };
  let issuer: string;
  let jwksUri: string;
  let keyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let activeKid: string;

  beforeEach(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(jwks));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    issuer = `http://127.0.0.1:${address.port}/issuer`;
    jwksUri = `http://127.0.0.1:${address.port}/jwks`;
    keyPair = await generateKeyPair("RS256");
    activeKid = "key-1";
    jwks = {
      keys: [{ ...(await exportJWK(keyPair.publicKey)), kid: activeKid, alg: "RS256", use: "sig" }],
    };
  });

  afterEach(async () => {
    if (server.listening) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  async function token(
    privateKey: KeyLike,
    kid = activeKid,
    overrides: { issuer?: string; audience?: string; expiresAt?: number } = {},
  ) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ name: "Player One" })
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(overrides.issuer ?? issuer)
      .setAudience(overrides.audience ?? "aimduck-discovery")
      .setSubject("player-1")
      .setIssuedAt(now)
      .setExpirationTime(overrides.expiresAt ?? now + 60)
      .sign(privateKey);
  }

  it("validates signature, issuer, audience, and expiry", async () => {
    const verify = createJwtVerifier({ issuer, audience: "aimduck-discovery", jwksUri });
    const valid = await verify(await token(keyPair.privateKey));

    expect(valid).toMatchObject({ playerId: "player-1", displayName: "Player One" });
    await expect(
      verify(await token(keyPair.privateKey, activeKid, { issuer: "https://wrong.test" })),
    ).rejects.toThrow();
    await expect(
      verify(await token(keyPair.privateKey, activeKid, { audience: "wrong-audience" })),
    ).rejects.toThrow();
    await expect(
      verify(await token(keyPair.privateKey, activeKid, { expiresAt: 1 })),
    ).rejects.toThrow();
  });

  it("uses a signed player_id claim when the access token has no subject", async () => {
    const verify = createJwtVerifier({ issuer, audience: "aimduck-discovery", jwksUri });
    const now = Math.floor(Date.now() / 1_000);
    const identityToken = await new SignJWT({ player_id: "stable-player-id" })
      .setProtectedHeader({ alg: "RS256", kid: activeKid })
      .setIssuer(issuer)
      .setAudience("aimduck-discovery")
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(keyPair.privateKey);

    await expect(verify(identityToken)).resolves.toMatchObject({
      playerId: "stable-player-id",
    });
  });

  it("refreshes the remote JWKS for a newly rotated key ID", async () => {
    const verify = createJwtVerifier({
      issuer,
      audience: "aimduck-discovery",
      jwksUri,
      cacheMaxAgeMs: 0,
      cooldownMs: 0,
    });
    await verify(await token(keyPair.privateKey));

    const nextPair = await generateKeyPair("RS256");
    activeKid = "key-2";
    jwks = {
      keys: [
        { ...(await exportJWK(nextPair.publicKey)), kid: activeKid, alg: "RS256", use: "sig" },
      ],
    };

    await expect(verify(await token(nextPair.privateKey))).resolves.toMatchObject({
      playerId: "player-1",
    });
  });

  it("surfaces an unavailable JWKS endpoint rather than trusting unverified claims", async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    const verify = createJwtVerifier({
      issuer,
      audience: "aimduck-discovery",
      jwksUri,
      timeoutMs: 100,
    });

    await expect(verify(await token(keyPair.privateKey))).rejects.toThrow();
  });
});
