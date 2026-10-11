# Contract: Canonical Identifiers

**Feature**: `001-standardize-resource-naming` | **Date**: 2026-10-11

This is the reference list every draft and doc page must match. Status values:
- **canonical**: the name is final; it replaces the current name if one is listed.
- **renamed**: changes from the current name in the draft.
- **frozen**: an Open Decision covers it (FR-018). Keep the current name until the decision is recorded.

Method and body details for each endpoint are owned by the protocol specs (`prd/`, `docs/`). This contract fixes names and paths only.

## Endpoints: Discovery (infrastructure, mTLS)

| Path | Status | Replaces | Note |
| :--- | :--- | :--- | :--- |
| `/.well-known/game-discovery` | renamed | `/.well-known/game-dns` | |
| `/v1/discovery/register` | renamed | `/v1/dns/register` | |
| `/v1/discovery/heartbeat` | renamed | `/v1/dns/heartbeat` | |
| `/v1/discovery/unregister` | renamed | `/v1/dns/unregister` | |
| `/v1/discovery/drain` | frozen (OD1) | `/v1/dns/drain` | Keep `/v1/dns/drain` until OD1 is recorded |

## Endpoints: Clients (Bearer token)

| Path | Status | Replaces | Note |
| :--- | :--- | :--- | :--- |
| `/v1/rooms` | canonical | none | Listing |
| `/v1/rooms/resolve` | canonical | none | Body: `masked_token`, `room_password?`. No `join_ticket` input (FR-014) |

## Endpoints: Room (direct from client)

| Path | Status | Replaces | Note |
| :--- | :--- | :--- | :--- |
| `/.well-known/game-room` | canonical | none | |
| `/v1/handshake` | renamed | `/handshake` (desejo.md) | Gains `/v1/` prefix (FR-004) |
| `/v1/schema` | renamed | `/schema` (desejo.md) | Gains `/v1/` prefix (FR-004) |
| `/v1/handshake-verify` | frozen (OD3) | none | Docs only |
| `/v1/ws` | renamed | `/v1/stream` (WebSocket) | FR-015 |
| `/v1/events` | renamed | `/v1/stream` (SSE) | FR-015. Server-sent events |
| `/v1/events/subscribe` | frozen (OD2) | none | PRD well-known `subscription_endpoint` |
| `/v1/state` | canonical | none | HTTP state read |
| `/v1/input` | canonical | none | Input transport (FR-015) |

## Endpoints: Admin (under `/v1/admin/`)

| Path | Status | Replaces | Note |
| :--- | :--- | :--- | :--- |
| `/v1/admin/state` | canonical | none | Command. Shares noun with `/v1/state` (OD5: accepted) |
| `/v1/admin/handshake` | canonical | none | PRD `handshake_endpoint` (room-protocol.md line 50) |
| `/v1/admin/events` | frozen (OD2) | none | Event injection |

## Well-known keys

| Key | Status | Replaces |
| :--- | :--- | :--- |
| `spec_version` | canonical | none |
| `api_versions` | canonical | none |
| `endpoints` | canonical | none |
| `discovery_register_endpoint` | renamed | `dns_register` (R4) |
| `handshake_endpoint` | canonical | none |
| `subscription_endpoint` | frozen (OD2) | none |
| `auth.mode` | canonical | none (FR-011 nested form) |
| `security.profile` | canonical | none (FR-011 nested form) |

## Headers

| Header | Status | Replaces |
| :--- | :--- | :--- |
| `X-Discovery-Signature` | renamed | `X-DNS-Signature` |
| `X-Platform-Ticket` | canonical | none |
| `Authorization: Bearer` | canonical | none |

## Field names

| Name | Status | Replaces | Rule |
| :--- | :--- | :--- | :--- |
| `masked_token` | renamed | `masked_room_token`, `room_token`, `masked_id` | FR-010 |
| `room_id` | canonical | `Room ID: 101` label | FR-010 |
| `player_id` | renamed | `id` in player lists | FR-010 |
| `position` | renamed | `pos` | FR-013 |
| `animation` | renamed | `anim` | FR-013 |
| `ttl_ms` | renamed | `ttl` (state nodes) | FR-006 |
| `ttl_seconds` | renamed | `ttl` (join ticket) | FR-006, R2 |
| `lease_ttl_seconds` | canonical | none | FR-006 |
| `occurred_at` | renamed | `timestamp` | FR-006, R1 |
| `issued_at`, `expires_at` | canonical | none | FR-006 |
| `join_ticket` | canonical (response only) | none | FR-014 |
| `admin_ticket` | canonical | none | FR-014 |
| `client_public_key` | canonical | none | |

## Enum values

| Concept | Values | Status |
| :--- | :--- | :--- |
| Room status | `active` | renamed from `ACTIVE` |
| Room status | `drain` | frozen (OD1) — renamed from `DRAIN` only after OD1 |
| Room status | `playing` | frozen (OD4) — replaces `PLAYING` |
| Match phase | `in_progress` | renamed from `IN_PROGRESS` |
| Security profile | `strict_per_packet`, `optimistic_session` | canonical |
| Transports | `websocket`, `sse`, `http` | canonical |
| Codecs | `json`, `protobuf` | canonical |
| Reason code | `LEASE_TTL_TIMEOUT` | canonical (UPPER_SNAKE) |

## Event names

| Event | Status | Note |
| :--- | :--- | :--- |
| `room.registered` | canonical | |
| `room.status_changed` | canonical | Replaces the PRD's `room.drain` path when OD1 resolves to status |
| `room.expired` | canonical | |
| `room.drain` | frozen (OD1) | Not past tense (FR-008) |
| `match.started`, `match.cancelled`, `match.round_ended`, `player.eliminated` | canonical | |
| `custom.<name>` | canonical | Game-specific prefix (FR-008) |

## Rule IDs

Format: `RN-<DISC|ROOM>-NN` with two-digit sequence (FR-012). Existing IDs (`RN-DISC-01` to `RN-DISC-10`, `RN-ROOM-01` to `RN-ROOM-NN`) keep their numbers. `RN-ROOM-03` wording changes from `ttl` to `ttl_ms` (spec Assumptions).

## Open Decisions (summary)

| # | Subject | Plan position (proposed, not yet recorded) |
| :--- | :--- | :--- |
| OD1 | Drain as operation or status | Status change via heartbeat (PRD). Drop `/v1/discovery/drain`; use `room.status_changed` |
| OD2 | Events path and subscription | Treat SSE `/v1/events` as the subscription. Drop `/v1/events/subscribe` unless a non-SSE transport needs it. Keep `/v1/admin/events` |
| OD3 | Handshake verify | Retire. The PRD's handshake already validates the ticket |
| OD4 | `playing` vs `in_progress` | Remove `playing` from room status. Room status is `active` or `drain`; play-in-progress is the match phase |
| OD5 | Admin state vs room state | Accept the overlap. Paths differ by namespace (FR-004) |

These positions are proposals. They are not applied until the user records them (see plan.md, Open Decisions).
