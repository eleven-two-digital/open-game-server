---
sidebar_position: 2
---

# Ecosystem Components

## 1. Identity Provider (IdP)

**Role:** Authenticate the player's identity and issue cryptographic credentials.

**Responsibilities:**
- Validate player credentials (password, social login, platform-specific)
- Issue a JWT (JSON Web Token) with the player's identity and additional claims
- Publish a JWKS (JSON Web Key Set) for stateless validation

**Example providers:**
- OAuth2 (Google, GitHub, Facebook)
- OIDC (OpenID Connect)
- Platform-specific (Steam, Epic, PlayStation Network)
- Custom (implemented by the game owner)

**Protocol:**
```
HTTPS → Returns: JWT + Refresh Token
```

---

## 2. Discovery Server

**Role:** Central aggregator of rooms, address masker, and join ticket issuer.

**Responsibilities:**
- Register new room instances (self-registration via mTLS)
- Maintain an up-to-date catalog of active rooms
- Mask real room addresses in search and listings
- Filter rooms by tags, language, and game mode
- Issue signed join tickets for clients
- Validate client JWTs against the IdP's JWKS

**Security:**
- **mTLS with rooms**: X.509 certificate authentication
- **JWT/JWKS with clients**: stateless identity validation
- **Heartbeat/Lease**: rooms send heartbeats to renew their registration

**Main endpoints:**
- `POST /v1/discovery/register`: room registration
- `GET /v1/rooms`: masked listing
- `POST /v1/rooms/resolve`: resolution with join ticket

---

## 3. Room Instance (Room Container)

**Role:** Run the match simulation and synchronize state with clients.

**Responsibilities:**
- Execute game logic (input validation, physics simulation, and so on)
- Synchronize reactive state (`$.server`, `$.me`, `$.others`) with clients
- Maintain smart caching with `_id` and `ttl_ms`
- Authenticate clients through a join ticket plus the ECDH handshake
- Support multiple transports (HTTP, WebSockets, SSE)
- Self-register with Discovery on startup
- Periodically renew its heartbeat with Discovery

**Security:**
- **ECDH key exchange**: derive a unique session key per client
- **AES-256-GCM or ChaCha20**: encrypt payloads per client
- **Ticket validation**: verify the join ticket issued by Discovery

**Well-known endpoint:**
```
GET /.well-known/game-room
```

Returns capabilities, routes, protocols, and version.

---

## 4. Game Client

**Role:** Connect to the server, synchronize state, and capture player input.

**Responsibilities:**
- Obtain a JWT from the IdP
- Query Discovery to find rooms
- Choose a room and obtain a join ticket and address
- Perform the ECDH handshake with the room
- Send player inputs (movement, actions, and so on)
- Receive and process state updates
- Render the synchronized state in the game engine

**Security:**
- Derive the session key through ECDH
- Validate every received message
- Never cache credentials for long periods

**Supported transports:**
- WebSockets (bidirectional, persistent)
- SSE (one-way streaming)
- HTTP REST (synchronous requests)

---

## Interaction Between Components

```
 Client                          IdP                     Discovery              Room
   │                             │                       │                       │
   ├─────── Auth Request ───────>│                       │                       │
   │<────── Returns JWT ──────────┤                       │                       │
   │                             │                       │                       │
   │                             │    Auto-Register ─────>│                       │
   │                             │    (mTLS, Heartbeat)   │                       │
   │                             │                       │                       │
   ├─ List Rooms + Bearer JWT ──────────────────────────>│                       │
   │<─────── Masked Rooms ──────────────────────────────┤                       │
   │                             │                       │                       │
   ├─ Resolve + Join Ticket Req ──────────────────────────>│                       │
   │<─ Host/Port + Signed Ticket ──────────────────────┤                       │
   │                             │                       │                       │
   ├─ Handshake ECDH ──────────────────────────────────────────────────────────>│
   │<─ ECDH Response ─────────────────────────────────────────────────────────┤
   │                             │                       │                       │
   │<═════ Encrypted State Loop (WS/SSE/HTTP) ═══════════════════════════════>│
   │                             │                       │                       │
```

Continue to [Security](security) to see the protection mechanisms at each layer.
