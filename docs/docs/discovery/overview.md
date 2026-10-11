---
sidebar_position: 1
---

# Discovery Server

The **Discovery Server** (also called the "Discovery") is the central component that aggregates and masks multiplayer rooms.

## Main Responsibilities

1. **Catalog aggregation**: keep an up-to-date registry of all active rooms
2. **Address masking**: hide real IPs and ports during listing
3. **Join ticket issuance**: generate signed credentials so clients can join rooms
4. **mTLS authentication**: validate the identity of registered rooms
5. **JWT validation**: validate client identity against the IdP's JWKS
6. **Filtering and search**: let clients filter rooms by tags (game mode, language, region, and so on)

## High-Level Architecture

```
┌─────────────────────────────────┐
│  Discovery Server         │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────────┐  │
│  │  Room Registry           │  │
│  │  ├─ room-1 (active)      │  │
│  │  ├─ room-2 (active)      │  │
│  │  └─ room-3 (draining)    │  │
│  └──────────────────────────┘  │
│           ↑       ↓             │
│    [mTLS] │       │ [mTLS]      │
│           │       │             │
│  ┌──────────────────────────┐  │
│  │  Room Heartbeat Listener │  │
│  │  • Auto-renew lease      │  │
│  │  • Detect stale rooms    │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  Client Request Handler  │  │
│  │  • Validate JWT/JWKS     │  │
│  │  • List (masked)         │  │
│  │  • Resolve (unmask)      │  │
│  │  • Apply filters         │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

## Room Lifecycle

```
1. Startup
   └─> The room reads the Discovery endpoint from its config
       └─> Generates an X.509 certificate

2. Self-registration (mTLS)
   └─> POST /v1/discovery/register
       ├─ X.509 certificate
       ├─ Public ECDH key
       ├─ Metadata (max_players, game_mode, tags)
       └─> Discovery validates the certificate and stores the room

3. Periodic heartbeat (every 30s)
   └─> POST /v1/discovery/heartbeat
       ├─ room_id, occurred_at
       ├─ Current players, state
       └─> Discovery renews the lease

4. Drain mode (before shutdown)
   └─> POST /v1/discovery/drain
       ├─ Signals that the room no longer accepts new clients
       ├─ Clients receive a signal to migrate
       └─> Discovery marks the room as "draining"

5. Deregistration
   └─> Heartbeat timeout (180 seconds)
       └─> Discovery removes the room from the catalog
```

## Main Endpoints

### Client-facing (HTTPS + JWT)

- **`GET /v1/rooms`**: list masked rooms with filters
- **`POST /v1/rooms/resolve`**: resolve the chosen room and issue a join ticket

### Room-facing (HTTPS + mTLS)

- **`POST /v1/discovery/register`**: self-registration of a new room
- **`POST /v1/discovery/heartbeat`**: renew the lease and report state
- **`POST /v1/discovery/drain`**: signal the end of the room's life

## Discovery Flow

```
Client (with JWT)

    ├─ GET /v1/rooms?game_mode=race&language=pt-BR
    │
    └─> Discovery
        ├─ Validates JWT (IdP JWKS)
        ├─ Filters rooms by query parameters
        ├─ Masks real addresses
        └─ Returns: [{id, name, game_mode, current_players, max_players, latency_ms, tags}]

    ├─ POST /v1/rooms/resolve (masked_token: "tok_room_1")
    │
    └─> Discovery
        ├─ Validates JWT (again)
        ├─ Issues a signed join ticket
        │  {
        │    "masked_token": "tok_room_1",
        │    "player_id": "player-xyz",
        │    "ttl_seconds": 300,
        │    "signature": "HMAC-SHA256(...)"
        │  }
        └─ Returns: {host, port, protocol, join_ticket, ttl_ms}

    └─> The client connects directly to the room with the join_ticket
```

Continue with [Room Registration](room-registration), [Room Listing](room-listing), and [Ticket Resolution](ticket-resolution).
