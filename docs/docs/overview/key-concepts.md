---
sidebar_position: 2
---

# Key Concepts

## Reactive State Sync

A room's state is organized in three layers:

- **`$.server`**: global state, visible to all players
- **`$.me`**: data for the current player
- **`$.others`**: data for the other players

Every root-level attribute MUST contain:
- **`_id`**: a hash or version of the state (identifies changes)
- **`ttl_ms`**: time-to-live (when it expires, the client reprocesses the attribute)

The client only recalculates when `_id` changes or `ttl_ms` expires, which reduces processing and transmission.

## Multi-Transport

Communication between client and room can use:

- **WebSockets**: a persistent, real-time, bidirectional connection
- **SSE (Server-Sent Events)**: one-way streaming from server to client
- **HTTP REST**: synchronous requests for stateless operations

These transports can coexist in the same room, which allows fallbacks and adaptation to different network profiles.

## Well-Known Discovery

Each room exposes a standard endpoint:

```
GET /.well-known/game-room
```

It returns metadata about the room: capabilities, available routes, supported protocols, and specification version.

## Admin API

Trusted agents (Game Masters, bots, moderators) can:

- **Pause, resume, or end** the room
- **Kick or ban** abusive players
- **Inject dynamic events** into the match (for example, spawning enemies or distributing items)

Authentication uses a token issued by the IdP or by Discovery.

## Dynamic Encryption

An ECDH handshake between client and room establishes a unique, derived, ephemeral session key:

```
AES-256-GCM  or  ChaCha20 + Poly1305
```

Each client-room session has its own key, which defeats replay attacks and token reuse.
