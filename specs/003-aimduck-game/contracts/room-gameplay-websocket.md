# Sample Contract: Room Handshake and Gameplay WebSocket

This is the explicit local Aimduck profile for the room boundary. It follows the OGS requirements for ticket admission, direct room connection, ECDH-derived session keys, and AEAD protection. It does not claim that the summarized public handshake page alone defines a complete interoperable wire protocol.

## Admission and session establishment

1. The client resolves a room through Discovery and stores the returned `join_ticket` only in memory.
2. The client sends `POST https://<resolved-host>:<resolved-port>/v1/handshake` with its bearer identity token, join ticket, and a fresh ephemeral ECDH public key. TLS authenticates the room endpoint.
3. The room verifies ticket signature, expiry, `room_id`, `player_id`, token identity, and capacity before admission.
4. The room returns a single-use `session_id`, its fresh ephemeral ECDH public key, server nonce, supported cipher, and protocol version.
5. Both peers derive directional AES-256-GCM session keys with HKDF-SHA-256 from the ECDH secret. The handshake transcript includes both public keys, nonces, room/player IDs, ticket ID, and protocol version.
6. The client opens the advertised WebSocket endpoint `wss://<resolved-host>:<resolved-port>/v1/ws` with the established `session_id`. All application frames after handshake are AEAD protected with unique nonces and authenticated sequence numbers.
7. The room validates the WebSocket Origin and binds the socket to the authenticated session.

The implementation MUST reject expired/replayed tickets, mismatched identities, invalid origin, malformed keys/nonces, repeated AEAD nonces, and invalid sequence numbers. It MUST close the session rather than silently downgrade to an unencrypted gameplay stream.

## Encrypted gameplay messages

After decryption, each frame is a JSON object with a `type`, monotonically increasing client `sequence`, and typed `payload`. The transport envelope carries the nonce and ciphertext; plaintext is never sent after handshake.

### Client to room

```json
{
  "type": "player.ready",
  "sequence": 1,
  "payload": {
    "ready": true
  }
}
```

```json
{
  "type": "player.input",
  "sequence": 2,
  "payload": {
    "move_x": -1,
    "move_y": 0,
    "throw": true,
    "aim_x": 0.75,
    "aim_y": 0.25
  }
}
```

The server validates ownership, finite numeric values, movement/aim bounds, and input rate. There is no client message for hit, crossing, score, role assignment, or round completion.

Movement input is normalized to `-1..1`; the room applies the player's speed and world bounds. Aim coordinates are normalized to the arena (`0..1`) and are used only by the Shooter. `throw` is an edge-triggered request; the server enforces the configured cooldown and single-projectile limit. The initial tuning target is one 35-second active round followed by a 4-second result/intermission interval. A Duck unresolved at the deadline is neither hit nor crossed and receives no point.

### Room to clients

- `room.snapshot`: current `$.server`, the player's `$.me`, and `$.others` state.
- `lobby.updated`: seat occupancy/readiness and game-room phase.
- `match.started`: initial round and role assignment.
- `round.updated`: authoritative positions, active projectiles, and outcomes.
- `round.completed`: final outcomes and score changes for the round.
- `match.completed`: final scoreboard and winner/tie result.
- `room.error`: typed, non-secret failure reason and whether a client may retry.

Unknown optional fields are ignored. Unknown required protocol versions or message types are rejected with an explicit protocol error.
