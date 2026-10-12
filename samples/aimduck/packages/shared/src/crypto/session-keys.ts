// SPDX-License-Identifier: Apache-2.0

export type HandshakeTranscript = {
  roomId: string;
  playerId: string;
  ticketId: string;
  clientNonce: string;
  roomNonce: string;
  clientPublicKey: string;
  roomPublicKey: string;
  protocolVersion: 1;
};

export type DirectionalSessionKeys = {
  clientToRoom: Uint8Array;
  roomToClient: Uint8Array;
};

export type EphemeralKeyPair = {
  privateKey: CryptoKey;
  publicKey: string;
};

export type AeadEnvelope = {
  sequence: number;
  nonce: string;
  ciphertext: string;
};

export async function createEphemeralKeyPair(): Promise<EphemeralKeyPair> {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const publicKey = await crypto.subtle.exportKey("raw", pair.publicKey);
  return { privateKey: pair.privateKey, publicKey: encodeBase64Url(new Uint8Array(publicKey)) };
}

export async function deriveSessionKeys(
  privateKey: CryptoKey,
  peerPublicKey: string,
  transcript: HandshakeTranscript,
): Promise<DirectionalSessionKeys> {
  const peerKeyBytes = decodeBase64Url(peerPublicKey);
  if (peerKeyBytes.byteLength !== 65 || peerKeyBytes[0] !== 4) {
    throw new TypeError("ECDH public key must be a raw P-256 uncompressed point.");
  }
  const publicKey = await crypto.subtle.importKey(
    "raw",
    peerKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );
  const salt = concatBytes(
    decodeBase64Url(transcript.clientNonce),
    decodeBase64Url(transcript.roomNonce),
  );
  if (salt.byteLength < 32) {
    throw new TypeError("Handshake nonces must provide at least 256 bits of salt.");
  }

  const info = new TextEncoder().encode(
    JSON.stringify({
      protocolVersion: transcript.protocolVersion,
      roomId: transcript.roomId,
      playerId: transcript.playerId,
      ticketId: transcript.ticketId,
      clientNonce: transcript.clientNonce,
      roomNonce: transcript.roomNonce,
      clientPublicKey: transcript.clientPublicKey,
      roomPublicKey: transcript.roomPublicKey,
      cipher: "AES-256-GCM",
      kdf: "HKDF-SHA-256",
    }),
  );
  const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  const keyMaterial = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, hkdfKey, 512),
  );
  return {
    clientToRoom: keyMaterial.slice(0, 32),
    roomToClient: keyMaterial.slice(32),
  };
}

export async function createAeadChannel(
  rawKey: Uint8Array,
  sessionId: string,
  direction: "client" | "room",
): Promise<{
  seal(plaintext: Uint8Array): Promise<AeadEnvelope>;
  open(envelope: AeadEnvelope): Promise<Uint8Array>;
}> {
  if (rawKey.byteLength !== 32) {
    throw new RangeError("AES-256-GCM session keys must contain exactly 32 bytes.");
  }
  if (!sessionId) {
    throw new TypeError("An AEAD channel requires a session ID.");
  }
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
  let outboundSequence = 0;
  let inboundSequence = 0;

  return {
    async seal(plaintext) {
      if (outboundSequence >= Number.MAX_SAFE_INTEGER) {
        throw new RangeError("AEAD sequence space is exhausted.");
      }
      const sequence = ++outboundSequence;
      const nonce = sequenceNonce(sequence);
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: nonce,
          additionalData: associatedData(sessionId, direction, sequence),
          tagLength: 128,
        },
        key,
        plaintext,
      );
      return {
        sequence,
        nonce: encodeBase64Url(nonce),
        ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
      };
    },
    async open(envelope) {
      if (!Number.isSafeInteger(envelope.sequence) || envelope.sequence <= inboundSequence) {
        throw new RangeError("Invalid frame sequence.");
      }
      const nonce = decodeBase64Url(envelope.nonce);
      const expectedNonce = sequenceNonce(envelope.sequence);
      if (!bytesEqual(nonce, expectedNonce)) {
        throw new TypeError("Frame nonce does not match its sequence.");
      }
      const plaintext = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: nonce,
          additionalData: associatedData(sessionId, direction, envelope.sequence),
          tagLength: 128,
        },
        key,
        decodeBase64Url(envelope.ciphertext),
      );
      inboundSequence = envelope.sequence;
      return new Uint8Array(plaintext);
    },
  };
}

function sequenceNonce(sequence: number): Uint8Array {
  const nonce = new Uint8Array(12);
  new DataView(nonce.buffer).setBigUint64(4, BigInt(sequence), false);
  return nonce;
}

function associatedData(
  sessionId: string,
  direction: "client" | "room",
  sequence: number,
): Uint8Array {
  return new TextEncoder().encode(`${sessionId}\0${direction}\0${sequence}`);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new TypeError("Value is not valid base64url.");
  }
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function concatBytes(first: Uint8Array, second: Uint8Array): Uint8Array {
  const result = new Uint8Array(first.byteLength + second.byteLength);
  result.set(first);
  result.set(second, first.byteLength);
  return result;
}

function bytesEqual(first: Uint8Array, second: Uint8Array): boolean {
  if (first.byteLength !== second.byteLength) {
    return false;
  }
  return first.every((value, index) => value === second[index]);
}
