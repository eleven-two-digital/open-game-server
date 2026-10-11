---
sidebar_position: 4
---

# End-to-End Flow

This is the complete flow for a player, from authentication to state synchronization inside a room.

## 1. Authentication

```
Client                               IdP
  │                                  │
  ├─────── POST /auth ──────────────>│
  │       (credentials)              │
  │                                  │
  │<───── 200 OK + JWT ──────────────┤
  │       (access_token, refresh)    │
  │                                  │
```

**What happens:**
- The client presents credentials (username/password, social login, and so on)
- The IdP validates them and issues a JWT with the player's claims (id, username, email, and so on)
- The client stores the JWT in memory or in secure storage

---

## 2. Room Discovery

```
Client                               Discovery
  │                                  │
  ├─ GET /v1/rooms ─────────────────>│
  │   (Bearer: JWT)                  │
  │   (Query: ?game_mode=race)       │
  │                                  │
  │<─ 200 OK (JSON Array) ───────────┤
  │  [                               │
  │    {                             │
  │      "id": "room-1",             │
  │      "name": "Fast Track #1",    │
  │      "current_players": 3,       │
  │      "max_players": 8,           │
  │      "latency_ms": 45            │
  │    },                            │
  │    ...                           │
  │  ]                               │
```

**What happens:**
1. The client sends a GET request with a Bearer JWT.
2. Discovery validates the JWT against the IdP's JWKS.
3. Discovery filters rooms by query parameters (game_mode, language, and so on).
4. Discovery returns **masked rooms** (real addresses hidden, only IDs exposed).

---

## 3. Resolution and Join Ticket

```
Client                               Discovery
  │                                  │
  ├─ POST /v1/rooms/resolve ────────>│
  │   (Bearer: JWT)                  │
  │   (room_id: "room-1")            │
  │                                  │
  │<─ 200 OK ────────────────────────┤
  │  {                               │
  │    "host": "192.168.1.100",      │
  │    "port": 9000,                 │
  │    "protocol": "wss",            │
  │    "join_ticket": "base64(...)", │
  │    "ttl": 300                    │
  │  }                               │
```

**What happens:**
1. The client chooses a room and sends a POST request.
2. Discovery validates the JWT again and checks that the room exists.
3. Discovery issues a **signed join ticket** with:
   - Room ID
   - Player ID (taken from the JWT)
   - TTL (300 seconds)
   - HMAC signature
4. Discovery returns the room's real address and the ticket.

---

## 4. ECDH Handshake

```
Client                               Room
  │                                  │
  ├─ WebSocket Connect ─────────────>│
  │   (join_ticket, JWT)             │
  │                                  │
  ├─ POST /v1/handshake ────────────>│
  │   (join_ticket)                  │
  │   (client_public_key: ECDH)      │
  │                                  │
  │<─ 200 OK (Challenge) ────────────┤
  │   (room_public_key: ECDH)        │
  │   (nonce)                        │
  │                                  │
  │ ── (Derive Shared Secret) ──────>│
  │<── (Derive Shared Secret) ───────│
  │                                  │
  ├─ POST /v1/handshake-verify ─────>│
  │   (challenge_signature)          │
  │   (encrypted with session key)   │
  │                                  │
  │<─ 200 OK (Welcome) ──────────────┤
  │   (schema, player_info)          │
  │   (encrypted with session key)   │
  │                                  │
```

**What happens:**
1. The client connects over WebSocket and sends the join ticket and JWT.
2. The room validates:
   - The ticket's TTL
   - The ticket's signature
   - The player's JWT
3. The room and the client exchange ECDH public keys.
4. Both sides derive the **shared secret** independently and identically.
5. A KDF (Key Derivation Function) produces the **session key** from the shared secret.
6. The handshake is verified with a cryptographic challenge.
7. Handshake complete: the session is established.

---

## 5. Reactive State Sync

```
Room                                 Client
  │                                  │
  ├─ (Initial state) ───────────────>│
  │  {                               │
  │    "server": {                   │
  │      "game_state": "racing",     │
  │      "_id": "abc123",            │
  │      "ttl": 60000                │
  │    },                            │
  │    "me": {                       │
  │      "position": {x, y, z},      │
  │      "speed": 45,                │
  │      "_id": "xyz789",            │
  │      "ttl": 100                  │
  │    },                            │
  │    "others": [...]               │
  │  }                               │
  │                                  │
  │ (Encrypted with session key)     │
  │                                  │
```

**What happens:**
1. The client receives state in three dictionaries:
   - `$.server`: global state
   - `$.me`: player data
   - `$.others`: opponent data
2. Every root-level attribute has `_id` and `ttl`.
3. The client processes only changes (differences in `_id`).
4. The client reprocesses an attribute when its `ttl` expires.

---

## 6. Input Loop

```
Client                               Room
  │                                  │
  ├─ Send: "move forward" ──────────>│
  │  (Encrypted, timestamp)          │
  │                                  │
  ├─ Send: "turn left" ─────────────>│
  │  (Encrypted, timestamp)          │
  │                                  │
  │<─ State Update ──────────────────┤
  │  ($.others[].position updated)   │
  │  (_id changed, client reprocesses)│
  │                                  │
  │<─ State Update ──────────────────┤
  │  ($.server.race_time changed)    │
  │  (client updates the timer)      │
  │                                  │
```

**What happens:**
1. The client sends inputs (movement, actions), encrypted.
2. The room validates and applies the inputs.
3. The room simulates the state and produces updates.
4. The room sends updates with updated `_id` and `ttl`.
5. The client receives them, checks `_id`, and reprocesses only what changed.
6. The loop continues until the match ends.

---

## 7. Admin Intervention (Optional)

```
Admin Bot                            Room
  │                                  │
  ├─ POST /v1/admin/handshake ──────>│
  │   (admin_token)                  │
  │                                  │
  │<─ 200 OK ────────────────────────┤
  │   (Session established)          │
  │                                  │
  ├─ DELETE /v1/admin/players/xyz ──>│
  │   (Kick player xyz)              │
  │                                  │
  │<─ 200 OK ────────────────────────┤
  │                                  │
```

**What happens:**
- The admin sends operations (kick, pause, inject events).
- The room validates the admin token (a JWT with `admin_scope`).
- The room executes the operation and notifies all affected clients.

---

## Security Summary at Each Step

| Step | Protection |
|------|------------|
| **Authentication** | JWT signed by the IdP |
| **Discovery** | JWT validated against JWKS |
| **Resolution** | Signed join ticket + TTL |
| **Handshake** | ECDH + challenge-response |
| **State sync** | AES-256-GCM / ChaCha20 |
| **Admin** | Admin token (JWT with scope) |

Each step ensures that only authorized players and administrators can join or control the room.

Continue to the detailed specifications:
- [Discovery Server](../discovery/overview)
- [Room Protocol](../room-protocol/overview)
- [Admin API](../admin/overview)
