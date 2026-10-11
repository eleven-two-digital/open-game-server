# Data Model: Standardize Resource and Endpoint Naming

**Feature**: `001-standardize-resource-naming` | **Date**: 2026-10-11

This is the canonical field dictionary for the entities in the spec's glossary. It covers names, types, units, and formats. The spec defines the rules; this file applies them to each entity. Frozen identifiers (R6 in research.md) are marked **[frozen]**.

## Conventions applied

- Field names: lowercase `snake_case` (FR-005).
- Durations: unit suffix (`_ms`, `_seconds`) (FR-006).
- Instants: `_at`, ISO 8601 UTC with `Z` (R1).
- Enum values: lowercase `snake_case` (FR-007). Reason codes: `UPPER_SNAKE_CASE`.
- Each entity has one identifier (FR-010).

## Discovery

The component. It has no fields of its own; it is named in the well-known document and in the `X-Discovery-Signature` header.

| Attribute | Name | Type / format | Notes |
| :--- | :--- | :--- | :--- |
| Well-known document | `/.well-known/game-discovery` | JSON | Replaces `/.well-known/game-dns` |
| Spec version | `spec_version` | string (`2026.09.02-1`) | See Open Issues |
| API versions | `api_versions` | array of strings (`["v1"]`) | Already present |
| Endpoints map | `endpoints` | object, keys `<operation>_endpoint` | R4 |
| Register key | `discovery_register_endpoint` | string path | Replaces `dns_register` |
| Signature header | `X-Discovery-Signature` | `sha256=<hmac>` | Replaces `X-DNS-Signature` |

## Room

| Attribute | Name | Type / format | Notes |
| :--- | :--- | :--- | :--- |
| Internal identifier | `room_id` | string | Never a client input (R3) |
| Public identifier | `masked_token` | string (`tok_...`) | Used in every client-facing request and response |
| Lease duration | `lease_ttl_seconds` | integer | Unchanged |
| Region | `region` | string (`sa-east-1`) | |
| Tags | `tags` | object of lowercase `snake_case` keys | `game_mode`, `map` |
| Player counts | `current_players`, `max_players` | integer | |
| Status | `status` | enum: `active`, `drain` [frozen: `drain`], `playing` [frozen] | OD1, OD4 |
| Transports | `transports` | array enum: `websocket`, `sse`, `http` | |
| Codecs | `codecs` | array enum: `json`, `protobuf` | |
| Security profile | `security_profile` (listing) / `security.profile` (well-known) | enum: `strict_per_packet`, `optimistic_session` | FR-011 allows both forms |
| Address | `ping_host` | string | Only in listing items |

### Room listing item (`GET /v1/rooms`)

Fields: `masked_token`, `tags`, `region`, `ping_host`, `current_players`, `max_players`, `status`, `transports`, `codecs`, `security_profile`. Also `next_cursor` at the list level (pagination, from the PRD review).

### Room well-known document (`/.well-known/game-room`)

Keys: `spec_version`, `api_versions`, `auth.mode`, `security.profile`, `handshake_endpoint`, `subscription_endpoint` [frozen: OD2], `endpoints` (see Discovery).

## Client and player

| Attribute | Name | Type / format | Notes |
| :--- | :--- | :--- | :--- |
| Game client public key | `client_public_key` | string | Handshake input |
| Player identifier | `player_id` | string | Replaces `id` inside player lists |
| Player name | `player_name` | string | Ticket claim |
| Session identifier | `session_id` | string | |
| Admin session identifier | `admin_session_id` | string | |

### Player entries in `$.others.players`

| Name | Type | Replaces |
| :--- | :--- | :--- |
| `player_id` | string | `id` |
| `position` | array of numbers | `pos` |
| `animation` | string enum (lowercase, game-defined) | `anim` |

## Tickets

| Ticket | Field | Type / format | Direction |
| :--- | :--- | :--- | :--- |
| Signed Join Ticket | `join_ticket` | string (signed JWT) | Response only (FR-014) |
| Join ticket issued | `issued_at`, `expires_at` | ISO 8601 UTC | Response |
| Join ticket duration | `ttl_seconds` | integer (`300`) | Response (R2) |
| Signed Admin Ticket | `admin_ticket` | string (signed JWT) | Admin request input |
| Platform Ticket | header `X-Platform-Ticket` | string | Request header (unchanged) |
| Bearer JWT | `Authorization: Bearer <jwt>` | string | Request header (unchanged) |

Resolve request (`POST /v1/rooms/resolve`):
- `masked_token` (required)
- `room_password` (optional, private rooms)
- `join_ticket` must not appear here (FR-014)

Resolve response: `join_ticket`, `issued_at`, `expires_at`, `ttl_seconds`, `protocol`, `host`, `port`, `path` (`/v1/ws`), `player_id`, `player_name`.

## State tree

Root attributes of `$.server`, `$.me`, `$.others`:

| Name | Type / format | Notes |
| :--- | :--- | :--- |
| `_id` | string (hash or version) | Required on every root attribute |
| `ttl_ms` | integer (milliseconds) | Replaces `ttl` (R2) |

## Match and room status

| Concept | Name | Values | Notes |
| :--- | :--- | :--- | :--- |
| Match phase | `phase` | `in_progress`, others game-defined | Replaces `IN_PROGRESS` |
| Room status | `status` | `active`, `drain` [frozen], `playing` [frozen] | OD1, OD4 |

## Events

Common envelope:

| Field | Type / format | Notes |
| :--- | :--- | :--- |
| `event` | string (`<domain>.<past_tense_event>`) | FR-008 |
| `occurred_at` | string, ISO 8601 UTC | Replaces `timestamp` (R1) |

Event payloads:

| Event | Fields (besides the envelope) | Notes |
| :--- | :--- | :--- |
| `room.registered` | `room_id`, `masked_token`, `tags`, `region`, `max_players` | Admin/webhook only (R3) |
| `room.status_changed` | `room_id`, `old_status`, `new_status`, `current_players` | Values lowercase (FR-007) |
| `room.expired` | `room_id`, `reason` (`LEASE_TTL_TIMEOUT`) | Reason code UPPER_SNAKE |
| `room.drain` | — | [frozen: OD1] |
| `match.started`, `match.cancelled`, `match.round_ended`, `player.eliminated` | game/match fields | Unchanged |
| `custom.*` | game-defined | `custom.` prefix (FR-008) |

## Headers

| Header | Status |
| :--- | :--- |
| `X-Discovery-Signature` | Replaces `X-DNS-Signature` |
| `X-Platform-Ticket` | Unchanged |

## Open issues for the plan owner

- `spec_version` (`2026.09.02-1`) is a date string. Constitution Principle IV requires Semantic Versioning for the protocol version. The fix belongs in the PRD update, not in this naming feature.
- The `auth.mode` (well-known) and `auth_mode` (RN-DISC-07) forms are both allowed by FR-011. Confirm whether the listing also needs `auth_mode`.
