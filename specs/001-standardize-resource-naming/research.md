# Research: Standardize Resource and Endpoint Naming

**Feature**: `001-standardize-resource-naming` | **Date**: 2026-10-11

This file resolves the points the spec left to the plan (FR-006 value format, unit suffixes) and records the drift found by measuring `prd/` and `docs/docs/`. No `[NEEDS CLARIFICATION]` markers exist in the spec; the five Open Decisions are handled in R6.

## R1. Value format for `_at` fields

**Decision**: ISO 8601 in UTC, `Z` suffix, second precision (`2026-10-11T12:00:30Z`).

**Rationale**: FR-006 defers the format to the plan with ISO 8601 UTC as the default. `docs/docs/discovery/room-registration.md` already uses this form, and `issued_at` / `expires_at` in `docs/docs/discovery/ticket-resolution.md` do too. The PRD's Unix integers (`prd/discovery.md` §2.10, `"timestamp": 1788387600`) are the outlier.

**Alternatives considered**:
- Unix seconds as an integer: compact, but a field named `*_at` holding an integer reads wrongly and breaks FR-006's intent.
- Unix milliseconds: finer than any event needs; no benefit here.

**Impact**: `timestamp` → `occurred_at` in `prd/discovery.md` (three payloads, lines 209, 222, 234); the same rename in `docs/docs/discovery/overview.md`, `room-registration.md`, `ticket-resolution.md`, and `docs/docs/architecture/end-to-end-flow.md`.

## R2. Unit suffixes follow the unit each value actually uses

**Decision**:
- State-node durations (`$.server`, `$.me`, `$.others`): `ttl_ms`. Values (100, 5000, 60000) are milliseconds in both PRD and docs.
- Lease: `lease_ttl_seconds` (unchanged, already correct).
- Signed Join Ticket duration: `ttl_seconds`. The value 300 matches the five-minute window between `issued_at` and `expires_at`.

**Rationale**: The spec's single row (`ttl` → `ttl_ms`) covers state nodes only. Join tickets use seconds. One suffix for both would make at least one example wrong.

**Alternatives considered**: Remove `ttl` from tickets, since `expires_at` already states the expiry. Rejected for this feature: the resolve response in the docs returns it, and removing a field is a separate design change.

**Impact**: `docs/docs/architecture/security.md` line 93 and `docs/docs/discovery/ticket-resolution.md` lines 47 and 77 (`ttl` → `ttl_seconds`). `docs/docs/architecture/end-to-end-flow.md` lines 74, 143, 149 are state or ticket examples; each must be checked against its context when renamed.

## R3. Clients identify rooms by `masked_token` only

**Decision**: Any client-facing request or response identifies a room by `masked_token`. `room_id` appears only in registration, admin, and webhook payloads, where the caller is trusted infrastructure.

**Rationale**: Constitution Principle V forbids exposing real room addresses in listings. `room_id` is the stable internal identifier (FR-010). The docs' resolve request takes `room_id` as input (`docs/docs/discovery/ticket-resolution.md` lines 17, 25, 30, 41), which contradicts the spec's resolve body rule (`masked_token`, no `join_ticket`). Room listing items in `docs/docs/discovery/room-listing.md` (lines 53, 69) use `"id": "room-1234"`, which is the same internal identifier under a generic name.

**Alternatives considered**: Keep `room_id` as client input. Rejected: it exposes the internal identifier and lets clients skip the masked listing.

**Impact**:
- `ticket-resolution.md`: `room_id` → `masked_token` in the resolve request.
- `room-listing.md`: `id` → `masked_token`.
- `end-to-end-flow.md` line 41: `id` → `masked_token` in the listing box.
- `mtls-authentication.md` line 89: `id: room-1234` is certificate-identity configuration → `room_id`.

**Note**: This goes beyond naming. It changes which identifier clients send. It is recorded here for confirmation (see plan, Decisions for Confirmation).

## R4. Well-known endpoint keys end in `_endpoint`

**Decision**: Keys in the `endpoints` map of the well-known documents use the suffix `_endpoint`: `discovery_register_endpoint`, `handshake_endpoint`, `subscription_endpoint`.

**Rationale**: `prd/room-protocol.md` already uses `handshake_endpoint`, `subscription_endpoint`, and `/v1/admin/handshake` (as `handshake_endpoint`, line 50). `prd/discovery.md` line 163 uses `dns_register` with no suffix, so it is the only key that breaks the pattern.

**Override**: This amends the spec's mapping row, which says `dns_register` → `discovery_register`. The spec row should be updated to `discovery_register_endpoint` when the spec is next edited.

## R5. Event names are past tense; status changes go through `room.status_changed`

**Decision**: Event names keep the `<domain>.<past_tense_event>` shape (FR-008). `room.drain` (docs) is not past tense and is covered by Open Decision 1, so it stays frozen (R6). If Open Decision 1 resolves to a status change, the event is `room.status_changed` with `new_status: "drain"`, which is the shape the PRD already uses.

Other events are unchanged: `room.registered`, `room.status_changed`, `room.expired`, `match.started`, `match.cancelled`, `match.round_ended`, `player.eliminated`, and `custom.*` events.

## R6. Freeze map (FR-018)

Identifiers covered by an Open Decision are not renamed until the decision is recorded.

| Open Decision | Identifiers frozen | Identifiers renamed by this feature |
| :--- | :--- | :--- |
| 1. Drain | `/v1/dns/drain` (and its `/v1/discovery/drain` form), the `DRAIN` / `drain` status value, the `room.drain` event | `ACTIVE` → `active`; `/v1/dns/*` for the other operations |
| 2. Events path | `/v1/events/subscribe`, `POST /v1/admin/events` | `/v1/stream` → `/v1/events` for SSE only |
| 3. Handshake verify | `POST /v1/handshake-verify` | none |
| 4. Playing vs in_progress | `PLAYING` / `playing` status value | `IN_PROGRESS` → `in_progress` (match phase, not in the decision) |
| 5. Admin vs room state | none: `/v1/admin/state` and `/v1/state` already follow the rules | none |

Notes:
- `/v1/events` as the SSE stream is renamed, not frozen. Open Decision 2 is about subscriptions and admin injection, not the SSE path.
- Open Decision 5 freezes nothing because both paths are already canonical. The decision is only whether the shared noun is acceptable.

## R7. Mapping additions found while planning

These rows are not in the spec's mapping table. They are recorded here for the spec's next revision.

| Current | Canonical | Source |
| :--- | :--- | :--- |
| Join ticket `ttl` | `ttl_seconds` | R2; `ticket-resolution.md` 47, 77; `security.md` 93 |
| Resolve request `room_id` | `masked_token` | R3; `ticket-resolution.md` 17, 25, 30, 41 |
| Listing item `id` | `masked_token` | R3; `room-listing.md` 53, 69; `end-to-end-flow.md` 41 |
| Certificate identity `id` | `room_id` | R3; `mtls-authentication.md` 89 |
| Join response `"path": "/v1/stream"` | `"path": "/v1/ws"` | FR-015; `ticket-resolution.md` 75 |
| `timestamp` (integer) in webhooks | `occurred_at` (ISO 8601 UTC string) | R1; `discovery.md` 209, 222, 234 |
| `dns_register` well-known key | `discovery_register_endpoint` | R4; supersedes the spec row `discovery_register` |
| `room.drain` event | frozen; becomes `room.status_changed` if Open Decision 1 resolves to status | R5, R6 |
| Animation values `RUN`, `IDLE` in state examples | `run`, `idle` | FR-007 (all values lowercase); game-defined values remain the game's choice |
| `"api_versions"` already present in discovery.md line 152 | no change | Already canonical |

## Sources read

- `prd/discovery.md`, `prd/room-protocol.md`, `prd/desejo.md`, `prd/architecture.md`
- `docs/docs/` (grep across all pages for retired identifiers)
- `CLAUDE.md`, `.specify/memory/constitution.md`, `.github/workflows/docs.yml`, `.claude/skills/`, `.specify/templates/`
