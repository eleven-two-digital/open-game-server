# Sample Contract: OGS Integration

This contract defines the Aimduck sample's use of the currently recorded OGS identifiers. It is not a general protocol amendment. Endpoint paths, header names, and identifiers must match the [canonical identifier contract](../../001-standardize-resource-naming/contracts/canonical-identifiers.md). Examples in other docs that conflict with it are corrected as part of the implementation review.

## Identity

- Browser signs in with OIDC Authorization Code + PKCE.
- Discovery accepts `Authorization: Bearer <access_token>` and validates signature through the configured issuer JWKS, issuer, audience, and expiry.
- Browser access token and `join_ticket` remain in memory only.
- Local demo identities and Keycloak configuration are development-only.

## Client-facing Discovery interface

### `GET /v1/rooms`

Requires the player bearer token. Query filters include `game_mode=aimduck`.

The response contains masked room entries and no real host, port, certificate, or room private key. The sample selection token is represented as `masked_token`; room cards may show display name, current/max players, tags, and operational state.

### `POST /v1/rooms/resolve`

Requires the player bearer token.

Request:

```json
{
  "masked_token": "opaque-selection-token"
}
```

Success response:

```json
{
  "status": "resolved",
  "room_id": "aimduck-room-1",
  "host": "localhost",
  "port": 9101,
  "protocol": "wss",
  "path": "/v1/ws",
  "join_ticket": "<short-lived-ticket>",
  "ttl_seconds": 300
}
```

Resolve rejects unknown, unavailable, draining, or full rooms. The host/port are browser-reachable host-published addresses, not Compose service names. `join_ticket` is bound to the authenticated `player_id` and resolved `room_id`, has a bounded lifetime, and is validated by the room before admission.

## Room registration and liveness

- A room registers at `POST /v1/discovery/register` and renews at `POST /v1/discovery/heartbeat` over mTLS.
- Discovery verifies the room certificate against the local development CA. The room verifies Discovery's certificate.
- Registration publishes the host-reachable `host`/`port`, capacity, supported WebSocket transport, game mode, and public metadata.
- Every Compose room has a distinct ID and port. Discovery removes a room after lease expiry or graceful drain.
- Per-room ticket verification material is isolated to that room and Discovery; no fleet-wide key is shared with all rooms.

## Local web policy

- The web client origin is explicitly configured as an allowed CORS origin for Discovery.
- Room WebSocket upgrades accept only the configured local web origin.
- Local host access is bound to loopback by default.
- TLS/WSS certificates are issued by the local development CA and cover `localhost`; the developer trusts that CA in the browser/OS before connecting.

