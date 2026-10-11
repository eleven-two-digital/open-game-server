---
sidebar_position: 3
---

# Room Listing

The `GET /v1/rooms` endpoint lets clients discover available rooms, with filters and address masking.

## Request

```
GET /v1/rooms?game_mode=race&language=en-US&region=us-east&limit=50
Authorization: Bearer <JWT>
```

**Headers:**
- `Authorization: Bearer <JWT>`: the player's JWT (required)

**Query parameters:**
- `game_mode`: filter by game type (for example, "race", "puzzle", "shooter")
- `language`: filter by language (for example, "pt-BR", "en-US")
- `region`: filter by region (for example, "us-east", "eu-west")
- `difficulty`: filter by difficulty (for example, "easy", "hard")
- `tags[key]`: filter by custom tags (for example, `?tags[competitive]=true`)
- `limit`: maximum number of rooms returned (default: 50, max: 1000)
- `offset`: pagination offset (default: 0)

## Request Validation

Discovery:

1. Extracts the JWT from the `Authorization: Bearer` header
2. Fetches the IdP's JWKS (cached)
3. Validates the JWT signature
4. Checks expiration
5. Extracts the `player_id` claim
6. Processes the query filters

If the JWT is invalid:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired JWT"
}
```

## Response (Masked Rooms)

```json
{
  "rooms": [
    {
      "id": "room-1234",
      "name": "Fast Track #1",
      "game_mode": "race",
      "current_players": 5,
      "max_players": 8,
      "latency_ms": 45,
      "language": "pt-BR",
      "region": "us-east",
      "tags": {
        "difficulty": "hard",
        "competitive": true
      },
      "state": "active",
      "estimated_start_time": "2026-10-11T12:05:00Z"
    },
    {
      "id": "room-5678",
      "name": "Casual Lobbies",
      "game_mode": "race",
      "current_players": 2,
      "max_players": 8,
      "latency_ms": 120,
      "language": "pt-BR",
      "region": "eu-west",
      "tags": {
        "difficulty": "easy",
        "competitive": false
      },
      "state": "draining",
      "drain_reason": "planned_maintenance"
    }
  ],
  "total": 2,
  "limit": 50,
  "offset": 0,
  "server_time": "2026-10-11T12:00:00Z"
}
```

## What Is Masked?

**Not included in the response:**
- `host`: the room's IP (for example, `192.168.1.100`)
- `port`: the room's port (for example, `9000`)
- `certificate`: the room's certificate
- `public_key_ecdh`: the room's ECDH public key

**Why?**
- Prevents **direct connection** without going through Discovery
- Forces identity validation through JWT → join ticket
- Enables rate limiting and access analysis

## Returned Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique room ID (opaque to the client) |
| `name` | string | Human-readable name for the UI |
| `game_mode` | string | Game type ("race", "puzzle", and so on) |
| `current_players` | number | Players currently connected |
| `max_players` | number | Player limit |
| `latency_ms` | number | Estimated latency from the room to Discovery |
| `language` | string | Supported language |
| `region` | string | Geographic region |
| `tags` | object | Custom room metadata |
| `state` | string | State ("active", "draining", "full") |
| `estimated_start_time` | string | When the match starts (ISO 8601) |

## Applied Filters

Discovery filters by:

1. **Player capacity**
   - Checks `current_players < max_players` (full rooms are hidden by default)
   - Rooms in "draining" are marked but still returned

2. **Custom tags**
   - `game_mode`, `language`, and `region` match exactly (case-insensitive)
   - Custom tags support equality (`=`) or regex

3. **Rate limits**
   - A client may list at most 10 times per minute
   - If exceeded: `429 Too Many Requests`

## Pagination

When there are many rooms, use offset and limit:

```
GET /v1/rooms?offset=0&limit=50
GET /v1/rooms?offset=50&limit=50
```

The response includes:
```json
{
  "total": 234,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

## Client-Side Caching

Recommendation:
- Cache the listing for **5-10 seconds**
- Refetch if the user asks to refresh
- Do not refetch automatically every second (to save bandwidth)

Example:
```javascript
if (lastFetch < now - 5000) {
  rooms = await GET('/v1/rooms?...');
  lastFetch = now;
}
```

---

Next: [Ticket Resolution](ticket-resolution)
