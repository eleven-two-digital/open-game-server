# Feature Specification: Standardize Resource and Endpoint Naming

**Feature Branch**: none created (spec directory: `001-standardize-resource-naming`)

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "quero padronizar a nomenclatura dos recursos, endpoints, etc"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find one canonical name for every concept (Priority: P1)

A spec author or reviewer needs to name a new resource, endpoint, field, event, or header, or look up the name of an existing concept, and gets exactly one answer from the glossary and the naming rules.

**Why this priority**: Every other story depends on a single source of truth. Without it, the drift already present in the drafts keeps growing.

**Independent Test**: Give a reviewer five concepts from the mapping table (for example, the Discovery server, the masked token, the lease TTL). Each lookup returns one name and one rule, without asking anyone.

**Acceptance Scenarios**:

1. **Given** a concept with several names in the current drafts (the Discovery server is called "DNS", "Proxy", "DNS de Salas", and "Discovery/Proxy"), **When** the author looks it up in the glossary, **Then** exactly one canonical term is returned, along with the retired names.
2. **Given** a new endpoint is being drafted, **When** the author applies the naming rules, **Then** the path, version prefix, and operation name follow the rules without further input.

---

### User Story 2 - Client developers see one name per concept (Priority: P2)

A game client or SDK developer reading the published docs sees the same path, field name, enum value, and event name on every page where a concept appears.

**Why this priority**: Inconsistent names cause integration bugs and support questions. It is derived from the P1 work, so it comes second.

**Independent Test**: Search the published docs and current drafts for retired names; zero matches. Every path that appears on more than one page has the same spelling on every page.

**Acceptance Scenarios**:

1. **Given** the room registration endpoint appears in the Discovery overview, the room registration page, and the components page, **When** the developer compares them, **Then** the path is identical in all three.
2. **Given** a room status value appears in listing responses, heartbeat examples, and webhook events, **When** the developer compares them, **Then** the spelling and casing are identical.

---

### User Story 3 - Reviewers check drafts against the convention (Priority: P3)

A reviewer runs the naming checklist over a draft and gets a pass/fail result per identifier class (paths, fields, enum values, event names, headers, rule IDs). Each failure comes with its canonical replacement.

**Why this priority**: Keeps the convention enforced after this feature is done. It depends on P1 existing.

**Independent Test**: Run the checklist over the current drafts. Each non-conforming identifier is listed with its canonical replacement from the mapping table.

**Acceptance Scenarios**:

1. **Given** a draft with a unit-less duration field `ttl`, **When** the reviewer runs the checklist, **Then** the field is flagged and `ttl_ms` is proposed.

---

### Edge Cases

- Two identifiers share a noun but differ in operation (for example, `/v1/events` as the SSE stream and `/v1/events/subscribe` as the subscription endpoint). Resolved as `/v1/events` for SSE and `/v1/admin/events` for admin injection; the separate subscription resource is retired.
- The same concept has two different designs across documents (for example, the `DRAIN` status set through heartbeat in the PRD, and `POST /v1/dns/drain` in the docs). Resolved as a status-change event (`room.status_changed` with `new_status: "drain"`).
- Prose language differs by folder: PRD drafts are in Portuguese, docs are in English. Prose may keep its language; identifiers must be English.
- Historical records (`prd/review-20260902-1.md`) describe past drafts and must not be rewritten.
- Abbreviations already in the drafts (`pos`, `anim`, `id`, `ttl`) are resolved by FR-013 and FR-006.

## Requirements *(mandatory)*

### Functional Requirements

**Naming rules**

- **FR-001**: Every concept MUST have exactly one canonical name, as listed in the glossary (Key Entities). Retired names MUST NOT appear in current drafts or published docs, except in the mapping table itself.
- **FR-002**: All identifiers (URL paths, JSON field names, query parameters, HTTP headers, enum values, event names, reason codes, rule IDs) MUST be written in ASCII English. Prose MAY keep the language of its folder.
- **FR-003**: URL path segments MUST be lowercase, with words separated by hyphens. No underscores, uppercase letters, or camelCase in paths. Segments that name a resource or state are nouns (`rooms`, `state`, `schema`). A lowercase verb is allowed only as the final segment of a named, non-CRUD operation (`resolve`, `register`, `heartbeat`, `unregister`, `drain`, `handshake`).
- **FR-004**: Every versioned endpoint MUST carry the `/v1/` prefix (or the current major version). Admin endpoints live under `/v1/admin/`. The only exception is `/.well-known/` discovery documents.
- **FR-005**: JSON field names, query parameters, and tag keys MUST be lowercase snake_case (`game_mode`, `lease_ttl_seconds`, `masked_token`).
- **FR-006**: A field that carries a duration MUST include its unit as a suffix (`_ms`, `_seconds`). A field that carries a point in time MUST use the `_at` suffix; its value format is fixed in the plan (default: ISO 8601, UTC).
- **FR-007**: Enumerated values (room status, match phase, security profile, transports, auth modes, admin actions, codecs) MUST be lowercase snake_case. Machine-readable reason codes (for example `LEASE_TTL_TIMEOUT`) MUST be UPPER_SNAKE_CASE. These are the only two casing conventions for values.
- **FR-008**: Event names MUST follow `<domain>.<past_tense_event>` with lowercase, dot-separated segments (`room.registered`, `room.status_changed`, `match.started`). Events defined by a specific game MUST use the `custom.` prefix.
- **FR-009**: "Discovery" is the only name for the component. "DNS", "Proxy", "DNS de Salas", and "Discovery/Proxy" MUST NOT name the component in identifiers, prose, or headers. `dns` in paths, keys, and headers is replaced by `discovery`.
- **FR-010**: Each entity has one identifier: `room_id` (stable internal ID), `masked_token` (public token that stands in for a room's address), `player_id`, `session_id`, `admin_session_id`. Free-text labels such as "Room ID: 101" are replaced by the `room_id` field.
- **FR-011**: A field that appears in more than one place MUST keep the same name everywhere. Nested keys are allowed only inside the well-known documents (`auth.mode`, `security.profile`). Everywhere else, the flat full name applies (`auth_mode`, `security_profile`).
- **FR-012**: Rule IDs MUST follow `RN-<DISC|ROOM>-NN` with a two-digit sequence number.
- **FR-013**: Field names MUST use full words. The only accepted abbreviations are `id`, `url`, and `ttl` (the last one with a unit suffix under FR-006).
- **FR-014**: Credential names keep their canonical forms: "Signed Join Ticket" (field `join_ticket`), "Signed Admin Ticket" (field `admin_ticket`), "Platform Ticket" (header `X-Platform-Ticket`), and the Bearer JWT. `join_ticket` MUST appear only in responses that issue it, never as a request input. The old `POST /v1/handshake-verify` path is retired.
- **FR-015**: Each stream transport MUST have one path: WebSocket `/v1/ws`, SSE `/v1/events`, HTTP state `/v1/state`, input `/v1/input`. The path `/v1/stream` is retired.
- **FR-016**: Custom HTTP headers keep their existing `X-` prefix and use Title-Case with hyphens. The component segment follows FR-009 (`X-DNS-Signature` becomes `X-Discovery-Signature`).
- **FR-017**: Each rename in the mapping table MUST be applied to every document in scope in the same change, so no document is left using the old name.
- **FR-018**: Identifiers covered by an Open Decision MUST NOT be renamed until that decision is recorded.

### Key Entities

Canonical glossary. Each row is one concept.

| Canonical term | Identifier form | Prose (PT / EN) | Retired names |
| :--- | :--- | :--- | :--- |
| Discovery | `discovery` | Servidor Discovery / Discovery server | DNS, DNS de Salas, Proxy, Discovery/Proxy, `game-dns`, `dns_register`, `X-DNS-Signature` |
| Room | `room`, `room_id` | Sala / Room | Instância de Sala, Room instance, `room_token`, `masked_id`, `masked_room_token` |
| Masked token | `masked_token` | token mascarado / masked token | `room_token`, `masked_id`, `masked_room_token` |
| Game client | `client`, `client_public_key` | Cliente do Jogo / Game client | Cliente (alone, when ambiguous) |
| Player | `player`, `player_id` | Jogador / Player | `id` inside player lists |
| Identity provider | (prose only) | Provedor de Identidade / Identity Provider (IdP) | — |
| Admin | `admin`, `/v1/admin/` | Administrador / Admin | — |
| Signed Join Ticket | `join_ticket` | Signed Join Ticket | `join_ticket` as request input |
| Signed Admin Ticket | `admin_ticket` | Signed Admin Ticket | — |
| Lease | `lease_ttl_seconds` | Lease / Lease | — |
| Room status | `status`: `active`, `drain`, `playing` | Status da sala / Room status | `ACTIVE`, `DRAIN`, `PLAYING` |
| Match phase | `phase`: `in_progress` | Fase da partida / Match phase | `IN_PROGRESS` |

### Current-to-Canonical Name Mapping

Section references point to the current drafts in `prd/` and `docs/docs/`.

| Current name (where it appears) | Canonical name | Rule |
| :--- | :--- | :--- |
| `/.well-known/game-dns` (discovery.md §2.8, §4.1) | `/.well-known/game-discovery` | FR-009 |
| `/v1/dns/register`, `/v1/dns/heartbeat`, `/v1/dns/unregister` (discovery.md §4.2; desejo.md) | `/v1/discovery/register`, `/v1/discovery/heartbeat`, `/v1/discovery/unregister` | FR-003, FR-009 |
| `/v1/dns/drain` (docs: discovery/overview, room-registration) | Open Decision 1 | FR-018 |
| `dns_register` key (well-known endpoints map) | `discovery_register` | FR-005, FR-009 |
| `X-DNS-Signature` header (discovery.md §2.10) | `X-Discovery-Signature` | FR-016 |
| Resolve request body: `masked_room_token`, `join_ticket` (discovery.md Fase 4) | Body: `masked_token`, `room_password?` (no `join_ticket`) | FR-010, FR-014 |
| `room_token`, `masked_id` (discovery.md §2.5) | `masked_token` | FR-010 |
| "Room ID: 101" label (discovery.md §1.1 diagram) | `room_id` | FR-010 |
| `ttl` in `$.server`, `$.me`, `$.others` (room-protocol.md §4.2) | `ttl_ms` | FR-006 |
| `timestamp` in webhook payloads (discovery.md §2.10) | `occurred_at` | FR-006 |
| `lease_ttl_seconds` | unchanged | FR-006 |
| `phase: "IN_PROGRESS"` (room-protocol.md §4.2) | `phase: "in_progress"` | FR-007 |
| Room status `ACTIVE`, `DRAIN` | `active`, `drain` | FR-007 |
| Room status `PLAYING` (discovery.md §2.10) | `playing` (see Open Decision 4) | FR-007 |
| `reason: "LEASE_TTL_TIMEOUT"` | unchanged (reason code) | FR-007 |
| `auth.mode` (well-known) and `auth_mode` (RN-DISC-07) | unchanged; both forms are allowed by FR-011 | FR-011 |
| `security.profile` (room well-known) and `security_profile` (room listing) | unchanged; both forms are allowed by FR-011 | FR-011 |
| `pos`, `anim`, `id` in `$.others.players` (room-protocol.md §4.2) | `position`, `animation`, `player_id` | FR-013, FR-010 |
| `/v1/stream` (discovery.md §4.3; docs: ticket-resolution) | Per transport: `/v1/ws`, `/v1/events`, `/v1/state` | FR-015 |
| `POST /handshake`, `GET /schema` without prefix (desejo.md) | `/v1/handshake`, `/v1/schema` | FR-004 |
| `POST /v1/handshake-verify` (docs: end-to-end-flow) | Open Decision 3 | FR-018 |
| Event `custom.achievement_unlocked`, `custom.boss_spawned` | unchanged | FR-008 |
| "DNS" / "Proxy" as component name (all drafts and docs) | "Discovery" | FR-009 |

### Open Decisions

Naming alone cannot settle these. Each one blocks renaming the identifiers it covers (FR-018) until it is recorded in the plan.

1. **Drain**: The PRD sets `DRAIN` through the heartbeat lease (discovery.md §2.1). The docs add a separate `POST /v1/discovery/drain`. Decide whether drain is an operation or a status change.
2. **Events path**: `GET /v1/events` (SSE stream), `/v1/events/subscribe` (subscription), and `POST /v1/admin/events` (injection) share a noun but differ in operation. Decide whether subscriptions get their own resource.
3. **Handshake verify**: `POST /v1/handshake-verify` (docs only) has no counterpart in the PRDs. Retire it or specify it.
4. **Playing vs in_progress**: The room status `playing` (webhook example) and the match phase `in_progress` (state example) may be two separate concepts or one. Confirm both exist.
5. **Admin state vs room state**: `POST /v1/admin/state` (command) and `GET /v1/state` (read) share a noun. Confirm the overlap is acceptable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero retired names from the mapping table remain in current drafts and published docs, verified by a text search over the "Current name" column.
- **SC-002**: 100% of endpoint paths in the drafts conform to FR-003 and FR-004, verified by reviewer checklist with zero open discrepancies.
- **SC-003**: Every term in the glossary has exactly one identifier form, and every concept in prose maps to a glossary entry, verified by reviewer checklist with zero unmapped terms.
- **SC-004**: No identifier is renamed while its Open Decision is unresolved (FR-018), verified by comparing the renamed list against the Open Decisions list.
- **SC-005**: A reviewer applies the correct rule to 10 randomly chosen identifiers from the drafts with full agreement with the rule the author applied.

## Assumptions

- **Scope**: The current `prd/` drafts (updated in place) and the `docs/docs/` pages are in scope. `prd/review-20260902-1.md` is a historical record and is not rewritten.
- **No external consumers yet**: The project has no implementation or deployed rooms (see CLAUDE.md), so renames are free. They must land before the first implementation starts.
- **Canonical component name**: "Discovery" is the name CLAUDE.md, `prd/architecture.md`, and the title of `prd/discovery.md` already use, so it is the default. Retiring "DNS" is the most visible change; it is recorded here so it can be redirected.
- **Language split**: Identifiers are English. Prose stays Portuguese in `prd/` and English in `docs/`. This spec is written in English to match the spec-kit templates.
- **Renaming `ttl` to `ttl_ms`** changes the wording of RN-ROOM-03 but keeps the mandatory `_id` and TTL fields.
- **Operations are out of scope**: This spec governs names only. Whether an endpoint exists (for example, drain or subscribe) is decided in the plan, through the Open Decisions.
- **Documentation only**: No code, tests, or CI changes are part of this feature.
