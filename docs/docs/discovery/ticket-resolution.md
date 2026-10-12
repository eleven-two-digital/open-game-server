---
sidebar_position: 4
---

# Ticket Resolution and Join Tickets

After the client chooses a room from the listing, it must **resolve** the room's real address and obtain a **join ticket** (a signed credential).

## Resolution Request

```
POST /v1/rooms/resolve
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "masked_token": "tok_room_1234"
}
```

**Headers:**
- `Authorization: Bearer <JWT>`: the player's JWT

**Body:**
- `masked_token`: the opaque room-selection token returned by the listing

## Validation in Discovery

1. Extracts and validates the JWT (same process as `GET /v1/rooms`)
2. Checks that the room `room_id` exists and is active
3. Checks that the room is not "full" or in the frozen `"drain"` state
4. Extracts the `player_id` from the JWT
5. Generates a signed join ticket

## Join Ticket

A **join ticket** is a signed token containing:

```
{
  "room_id": "room-1234",
  "masked_token": "tok_room_1234",
  "player_id": "player-xyz",
  "player_name": "johndoe",
  "player_avatar": "https://...",
  "issued_at": "2026-10-11T12:00:00Z",
  "expires_at": "2026-10-11T12:05:00Z",
  "ttl_seconds": 300,
  "signature": "HMAC-SHA256(body + secret)"
}
```

**Fields:**
- `room_id`: the room ID (the client already knows it, but it is confirmed in the ticket)
- `player_id`: the player ID (taken from the JWT)
- `player_name`, `player_avatar`: optional player data
- `issued_at`, `expires_at`: issuance and expiration timestamps
- `ttl_seconds`: lifetime in seconds (300 = 5 minutes)
- `signature`: HMAC-SHA256 signed with the key shared between Discovery and the room

**Properties:**
- Cannot be forged (requires the HMAC secret shared between Discovery and the room)
- Expires after its TTL (prevents indefinite reuse)
- Bound to the player (`player_id`)
- Bound to the room (`room_id`)

## Response (Address Revealed)

```json
{
  "status": "resolved",
  "masked_token": "tok_room_1234",
  "host": "192.168.1.100",
  "port": 9000,
  "protocol": "wss",
  "path": "/v1/ws",
  "join_ticket": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "ttl_seconds": 300,
  "server_time": "2026-10-11T12:00:00Z"
}
```

**Fields:**
- `host`: the room's IP (now revealed)
- `port`: the room's port
- `protocol`: "wss" (WebSocket Secure), "https", or "http"
- `path`: the path to connect to (for example, `/v1/ws`)
- `join_ticket`: the base64 signed token to present to the room
- `ttl_seconds`: how long the ticket is valid

## Resolution Errors

| Code | Reason | Action |
|------|--------|--------|
| `401 Unauthorized` | Invalid JWT | Renew the JWT with the IdP |
| `404 Not Found` | Room does not exist | Refresh the listing |
| `410 Gone` | Room was removed | Refresh the listing |
| `409 Conflict` | Room is full | Choose another room |
| `429 Too Many Requests` | Rate limit | Wait before retrying |

## Next Client Steps

After receiving the response:

1. **Store the ticket** in memory (do not persist it)
2. **Connect** to `wss://host:port/path`
3. **Present** the join ticket and JWT in the initial handshake
4. **The room validates** the ticket:
   - Checks the signature (HMAC)
   - Checks the TTL (not expired)
   - Checks the player_id (matches the JWT)

If everything is valid, the room starts the ECDH handshake and the game begins.

## Security: Why a Join Ticket?

The join ticket prevents these attacks:

✅ **Forgery**: HMAC-signed, so the client cannot create a fake ticket
✅ **Replay**: the TTL expires after 5 minutes
✅ **Fixation**: the ticket is bound to a specific player_id
✅ **Transfer**: the token cannot be used by another player

Without a ticket, a client could:
- Connect directly to the room without going through Discovery
- Forge identity claims
- Bypass access validation

---

Next: [mTLS Authentication](mtls-authentication)
