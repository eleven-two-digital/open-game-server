// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  createEphemeralKeyPair,
  createAeadChannel,
  deriveSessionKeys,
  type HandshakeTranscript,
} from "../../packages/shared/src/crypto/session-keys.js";

function transcript(clientPublicKey: string, roomPublicKey: string): HandshakeTranscript {
  return {
    roomId: "aimduck-room-1",
    playerId: "player-1",
    ticketId: "ticket-1",
    clientNonce: "MDEyMzQ1Njc4OWFiY2RlZg",
    roomNonce: "ZmVkY2JhOTg3NjU0MzIxMA",
    clientPublicKey,
    roomPublicKey,
    protocolVersion: 1,
  };
}

describe("ECDH handshake session keys", () => {
  it("derives matching directional keys from both ECDH peers", async () => {
    const client = await createEphemeralKeyPair();
    const room = await createEphemeralKeyPair();
    const context = transcript(client.publicKey, room.publicKey);
    const clientKeys = await deriveSessionKeys(client.privateKey, room.publicKey, context);
    const roomKeys = await deriveSessionKeys(room.privateKey, client.publicKey, context);

    expect(clientKeys.clientToRoom).toEqual(roomKeys.clientToRoom);
    expect(clientKeys.roomToClient).toEqual(roomKeys.roomToClient);
    expect(clientKeys.clientToRoom).not.toEqual(clientKeys.roomToClient);
  });

  it("binds derived keys to identity and handshake nonces", async () => {
    const client = await createEphemeralKeyPair();
    const room = await createEphemeralKeyPair();
    const context = transcript(client.publicKey, room.publicKey);
    const first = await deriveSessionKeys(client.privateKey, room.publicKey, context);
    const changed = await deriveSessionKeys(client.privateKey, room.publicKey, {
      ...context,
      playerId: "player-2",
    });

    expect(first.clientToRoom).not.toEqual(changed.clientToRoom);
    await expect(
      deriveSessionKeys(client.privateKey, "not-a-public-key", context),
    ).rejects.toThrow();
  });

  it("encrypts frames with unique ordered nonces and rejects replay", async () => {
    const sender = await createAeadChannel(new Uint8Array(32).fill(9), "session-1", "client");
    const receiver = await createAeadChannel(new Uint8Array(32).fill(9), "session-1", "client");
    const first = await sender.seal(new TextEncoder().encode("ready"));
    const second = await sender.seal(new TextEncoder().encode("input"));

    expect(first.nonce).not.toBe(second.nonce);
    expect(new TextDecoder().decode(await receiver.open(first))).toBe("ready");
    await expect(receiver.open(first)).rejects.toThrow("Invalid frame sequence.");
    expect(new TextDecoder().decode(await receiver.open(second))).toBe("input");
  });
});
