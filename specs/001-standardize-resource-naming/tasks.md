# Tasks: Standardize Resource and Endpoint Naming

**Input**: Design documents from `/specs/001-standardize-resource-naming/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/canonical-identifiers.md, quickstart.md

**Tests**: Not requested. No test tasks are generated. Verification is the quickstart checks (T037 to T039, T047).

**Organization**: Tasks are grouped by user story (spec.md, US1 to US3). Phase 2 is the blocking set.

> **BLOCKED: constitution Principle II (PRD gate).** No PRD in `prd/` has a Viability section. Per plan.md, the rename work (Phase 4 onward) waits until T003 to T006 are done, and the Open Decision tasks (T032 to T035) wait until T008 is recorded. Tasks are generated now so the work is ready to start. Nothing has been executed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, or US3 (user story phases only)
- **Owner** (where not Claude): tasks that need a human decision or authorship
- Constraints from `data-model.md` are quoted verbatim in the task where they apply

## Path Conventions

- Specs: `specs/001-standardize-resource-naming/`
- Drafts: `prd/` (Portuguese prose; identifiers in English)
- Published docs: `docs/docs/` (English; must not reference `prd/`, `specs/`, or the harness)
- Harness: `CLAUDE.md`, `.specify/memory/constitution.md`, `.claude/skills/`, `.github/workflows/`, `.specify/templates/`

---

## Phase 1: Setup (Baseline)

**Purpose**: Record the starting state so the changes can be checked against it.

- [x] T001 Run quickstart.md checks 1 to 3 over `prd/architecture.md`, `prd/desejo.md`, `prd/discovery.md`, `prd/room-protocol.md`, `docs/docs/`, and `CLAUDE.md`. Save the list of matching files in the PR description (no file is committed).
- [x] T002 Confirm the docs site builds before any edit: `cd docs && npm run build` (`docs/package.json`). Record pass or fail in the PR description. If it fails, stop and report the error; do not start renames.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Gates and decisions that every later phase depends on. **No rename work starts until this phase is complete.**

**Owner: PRD authors and user for T003 to T008.** Claude does not write the viability conclusions or record the decisions.

- [x] T003 [P] Add a **Viability** section to `prd/discovery.md` with the five items from Principle II: technical viability (risks, unknowns, proof of concept when needed), security and privacy impact, compatibility impact (see T044), effort and complexity with rejected alternatives, and an explicit conclusion (**viable**, **viable with caveats**, or **not viable**). Owner: PRD author. Also a version/date header.
- [x] T004 [P] Add a **Viability** section to `prd/room-protocol.md` with the same five items. Owner: PRD author.
- [x] T005 [P] Add a **Viability** section to `prd/architecture.md` with the same five items. Owner: PRD author.
- [x] T006 [P] Add a **Viability** section to `prd/desejo.md` with the same five items. Owner: PRD author.
- [x] T007 Confirm plan.md Decisions for Confirmation 1 to 4 (R1 to R4: `masked_token` as the only client room identifier; `_endpoint` suffix on well-known keys; `ttl_seconds` for the join ticket; ISO 8601 UTC for `_at` fields) and record each as confirmed or redirected in `specs/001-standardize-resource-naming/plan.md`. Owner: user.
- [x] T008 Record the five Open Decisions in `specs/001-standardize-resource-naming/plan.md` and `specs/001-standardize-resource-naming/spec.md` (Open Decisions section): the chosen position for OD1 (drain), OD2 (events path), OD3 (handshake-verify), OD4 (playing vs in_progress), and OD5 (admin state). Until recorded, every identifier they cover stays frozen (FR-018). Owner: user.
- [x] T009 Revise `specs/001-standardize-resource-naming/spec.md` mapping table (Current-to-Canonical Name Mapping):
  - Change the `dns_register` row to `discovery_register_endpoint` (R4; `string path`).
  - Add the R7 rows from `research.md`: join ticket `ttl` → `ttl_seconds` (integer, seconds); resolve request `room_id` → `masked_token`; listing item `id` → `masked_token`; certificate identity `id` → `room_id`; join response `"path": "/v1/stream"` → `"path": "/v1/ws"`; webhook `timestamp` (integer) → `occurred_at` (string, ISO 8601 UTC); `room.drain` frozen (OD1); animation examples `RUN`, `IDLE` → `run`, `idle`.

---

## Phase 3: User Story 1 - Find one canonical name for every concept (Priority: P1) 🎯 MVP

**Goal**: The spec's glossary, mapping table, contract, and data model give exactly one name per concept.

**Independent Test**: Five concepts from the mapping table (Discovery server, masked token, lease TTL, join ticket, room status) each return one name and one rule (quickstart.md check 7).

- [x] T010 [US1] Reconcile `specs/001-standardize-resource-naming/contracts/canonical-identifiers.md` with the revised mapping table in `spec.md` (T009). Every `renamed` row in the contract has a mapping row in the spec, and every mapping row has a contract row. Include the join response path `/v1/ws` and `discovery_register_endpoint`.
- [x] T011 [US1] [P] Check that every field in `specs/001-standardize-resource-naming/data-model.md` uses one name from the spec glossary (Key Entities). Fix the data model where a name disagrees. Expected names: `room_id`, `masked_token`, `player_id`, `lease_ttl_seconds`, `join_ticket` (response only), `admin_ticket`. Constraint from data-model: "Each entity has one identifier (FR-010)."
- [x] T012 [US1] Add check 7 to `specs/001-standardize-resource-naming/quickstart.md`: five concept lookups from the mapping table, each with the expected single canonical name and its rule (FR number). Passing: each lookup returns one name without asking anyone.

**Checkpoint**: US1 is complete when the spec, contract, data model, and quickstart agree on every name. No file under `prd/` or `docs/` has changed yet.

---

## Phase 4: User Story 2 - Client developers see one name per concept (Priority: P2)

**Goal**: The drafts in `prd/` and the pages in `docs/docs/` use the canonical names. Frozen identifiers keep their current names (FR-018).

**Independent Test**: quickstart.md checks 1 and 2 pass after this phase, except for frozen identifiers. Every path that appears on more than one page has the same spelling everywhere.

### Drafts (`prd/`)

- [x] T013 [US2] Apply the spec mapping (including R7 rows) to `prd/discovery.md`. Run after T003 (same file). Specific changes:
  - `/.well-known/game-dns` → `/.well-known/game-discovery` (§2.8, §4.1).
  - `/v1/dns/register`, `/v1/dns/heartbeat`, `/v1/dns/unregister` → `/v1/discovery/...` (§4.2). Keep `/v1/dns/drain` (frozen, OD1).
  - `dns_register` → `discovery_register_endpoint` (string path).
  - `X-DNS-Signature` → `X-Discovery-Signature` (`sha256=<hmac>`), §2.10.
  - `room_token`, `masked_id`, `masked_room_token` → `masked_token` (string `tok_...`), §2.5.
  - Resolve body: `masked_token` (required), `room_password` (optional), no `join_ticket` (Fase 4).
  - Webhook `timestamp` (integer) → `occurred_at` (string, ISO 8601 UTC), §2.10 lines 209, 222, 234.
  - Join ticket `ttl` → `ttl_seconds` (integer, seconds).
  - `/v1/stream` → `/v1/ws` (WebSocket) or `/v1/events` (SSE), §4.3.
  - "Room ID: 101" label (§1.1) → `room_id`.
  - Status `ACTIVE` → `active`; `DRAIN` frozen (OD1); `PLAYING` frozen (OD4); `IN_PROGRESS` → `in_progress`.
  - "DNS", "Proxy", "Discovery/Proxy" as component name → "Discovery" (FR-009). Keep Portuguese prose.
  - Keep unchanged: `api_versions` (line 152), `lease_ttl_seconds`, `LEASE_TTL_TIMEOUT`.
- [x] T014 [US2] Apply the spec mapping to `prd/room-protocol.md`. Run after T004 (same file). Specific changes:
  - `ttl` in `$.server`, `$.me`, `$.others` → `ttl_ms` (integer, milliseconds), lines 160, 167, 175. Update RN-ROOM-03 wording.
  - `_id` stays required on every root attribute (`string (hash or version)`).
  - `pos` → `position` (array of numbers); `anim` → `animation` (string enum, lowercase, game-defined); `id` → `player_id` (string) inside player lists (lines 177, 178).
  - Animation example values `RUN`, `IDLE` → `run`, `idle`.
  - `IN_PROGRESS` → `in_progress` (match phase).
  - `/v1/stream` → per transport (`/v1/ws`, `/v1/events`, `/v1/state`).
  - `subscription_endpoint` (line 47): frozen (OD2). Keep as is.
  - `/v1/admin/handshake` (line 50) is canonical; key is `handshake_endpoint`.
  - DNS/Proxy prose → Discovery (FR-009).
- [x] T015 [US2] [P] Apply the spec mapping to `prd/architecture.md`. Run after T005 (same file). Change "DNS", "Proxy", and "Discovery/Proxy" in prose and Mermaid diagram labels to "Discovery" (FR-009). Keep the trust and security matrix unchanged (Principle V). Keep Portuguese prose.
- [x] T016 [US2] Apply the spec mapping to `prd/desejo.md`. Run after T006 (same file). Changes:
  - `POST /handshake` → `POST /v1/handshake`; `GET /schema` → `GET /v1/schema` (FR-004).
  - `/v1/dns/*` → `/v1/discovery/*` (drain frozen, OD1).
  - `/v1/stream` → per transport (FR-015).
  - Player-list `id` → `player_id`.
  - DNS prose → Discovery (FR-009). Keep Portuguese prose.

### Published docs (`docs/docs/`, English)

Each page below: apply the spec mapping. Keep English prose. Do not add references to `prd/`, `specs/`, `.specify/`, `.claude/`, `CLAUDE.md`, or the harness (constitution Licensing → Audience).

- [x] T017 [US2] [P] `docs/docs/discovery/overview.md`: `/v1/dns/register|heartbeat|unregister` → `/v1/discovery/...`; `/v1/dns/drain` frozen (OD1); `timestamp` → `occurred_at` (string, ISO 8601 UTC); DNS/Proxy prose → Discovery.
- [x] T018 [US2] [P] `docs/docs/discovery/room-registration.md`: `/v1/dns/...` → `/v1/discovery/...` (drain frozen, OD1); line 127 `timestamp` → `occurred_at` (string, ISO 8601 UTC); `ACTIVE` / `DRAIN` casing → `active` (`drain` frozen, OD1).
- [x] T019 [US2] [P] `docs/docs/discovery/ticket-resolution.md`: resolve request `room_id` (lines 17, 25, 30, 41) → `masked_token` (string `tok_...`); `join_ticket` never a request input (FR-014); `"ttl": 300` (lines 47, 77) → `ttl_seconds` (integer); `"path": "/v1/stream"` (line 75) → `"/v1/ws"`; DNS prose → Discovery.
- [x] T020 [US2] [P] `docs/docs/discovery/room-listing.md`: `"id": "room-1234"` (lines 53, 69) → `masked_token` (string `tok_...`); status casing → lowercase; `security_profile` unchanged.
- [x] T021 [US2] [P] `docs/docs/discovery/mtls-authentication.md`: line 89 `id: room-1234` (certificate identity, internal) → `room_id`; any `X-DNS-Signature` → `X-Discovery-Signature`; DNS prose → Discovery.
- [x] T022 [US2] [P] `docs/docs/architecture/end-to-end-flow.md`: listing box `id` (line 41) → `masked_token`; `ttl` (lines 74, 143, 149): state nodes → `ttl_ms` (integer, milliseconds), join ticket → `ttl_seconds` (integer, seconds), check each against its context; `/v1/handshake-verify` (line 109) frozen (OD3); `/v1/stream` → per transport; `timestamp` → `occurred_at`; DNS prose → Discovery.
- [x] T023 [US2] [P] `docs/docs/architecture/security.md`: `"ttl": 300` (line 93) on the join ticket claim set → `ttl_seconds` (integer, seconds).
- [x] T024 [US2] [P] `docs/docs/architecture/components.md`: DNS/Proxy prose → Discovery (FR-009).
- [x] T025 [US2] [P] `docs/docs/architecture/overview.md`: DNS/Proxy prose → Discovery (FR-009); any other retired name from T001.
- [x] T026 [US2] [P] `docs/docs/room-protocol/overview.md`: apply the mapping to the retired name found by T001 and any DNS/Proxy prose.
- [x] T027 [US2] [P] `docs/docs/room-protocol/caching-ttl-id.md`: `ttl` → `ttl_ms` (integer, milliseconds) on state root attributes; keep `_id` (string, hash or version) unchanged.
- [x] T028 [US2] [P] `docs/docs/overview/motivation.md`: DNS/Proxy prose → Discovery (FR-009); any retired name from T001.
- [x] T029 [US2] [P] `docs/docs/overview/key-concepts.md`: `room_token`, `masked_id` → `masked_token`; DNS/Proxy prose → Discovery.
- [x] T030 [US2] [P] `docs/docs/admin/dynamic-events.md`: apply the mapping to the retired name found by T001. Event names keep the `custom.` prefix. `POST /v1/admin/events` frozen (OD2).
- [x] T031 [US2] Sweep: re-run quickstart.md checks 1 and 2 over `docs/docs/`. Fix each remaining match in the file that owns it. This covers pages not listed above, such as `docs/docs/room-protocol/well-known.md`, `transports.md`, `schema-state.md`, `handshake-ecdh.md`, `docs/docs/implementation/*.md`, `docs/docs/admin/*.md`, and `docs/docs/intro.md`, if T001 flagged them. Run after T017 to T030 (no shared files).

### Open Decision follow-ups (blocked until T008 is recorded)

These apply the decision recorded in T008. If the decision is not recorded, leave the identifier frozen.

- [x] T032 [US2] **OD1, drain** (after T008): If drain is recorded as a status change (plan proposal): remove `/v1/discovery/drain` and `/v1/dns/drain` from `prd/discovery.md`, `docs/docs/discovery/overview.md`, and `docs/docs/discovery/room-registration.md`; use `room.status_changed` with `new_status: "drain"` (R5); `DRAIN` → `drain`. If drain is recorded as an operation: rename `/v1/dns/drain` → `/v1/discovery/drain` in those files, and give `room.drain` a past-tense name first (FR-008) in `contracts/canonical-identifiers.md`.
- [x] T033 [US2] **OD2, events** (after T008): If subscriptions are not a separate resource (plan proposal): remove `/v1/events/subscribe` and the `subscription_endpoint` key from `prd/room-protocol.md` (line 47) and `docs/docs/room-protocol/`; keep `/v1/events` (SSE) and `POST /v1/admin/events`. Update `contracts/canonical-identifiers.md`. Otherwise, rename nothing and record the outcome.
- [x] T034 [US2] **OD3, handshake-verify** (after T008): If retired (plan proposal): remove `POST /v1/handshake-verify` from `docs/docs/architecture/end-to-end-flow.md` (line 109); confirm no PRD mention; update the contract row.
- [x] T035 [US2] **OD4, playing** (after T008): If `playing` is removed from room status (plan proposal): remove `PLAYING` / `playing` from the status enum in `prd/discovery.md`, `specs/001-standardize-resource-naming/data-model.md` (`status` row), and any listing or webhook example in `docs/docs/`. The match phase stays `in_progress`. OD5 freezes nothing; no task.

**Checkpoint**: After T031 and the OD follow-ups, no retired name appears outside the frozen identifiers.

---

## Phase 5: User Story 3 - Reviewers check drafts against the convention (Priority: P3)

**Goal**: A reviewer runs the naming checklist and gets pass or fail per identifier class, with the canonical replacement for each failure.

**Independent Test**: The checklist runs over the current drafts. Each non-conforming identifier is listed with its canonical replacement from the mapping table.

- [x] T036 [US3] Add a pass/fail table to `specs/001-standardize-resource-naming/quickstart.md`, one row per identifier class: paths (FR-003, FR-004), JSON fields (FR-005, FR-006), query parameters and tag keys (FR-005), headers (FR-016), enum values (FR-007), event names (FR-008), reason codes (FR-007), rule IDs (FR-012). Columns: class, rule, pass criterion, canonical replacement example. Run after T012 (same file).
- [x] T037 [US3] Run quickstart.md checks 1 and 2 over `prd/architecture.md`, `prd/desejo.md`, `prd/discovery.md`, `prd/room-protocol.md`, and `docs/docs/`. Passing: only frozen identifiers remain (`/v1/dns/drain` or `/v1/discovery/drain`, `DRAIN`/`drain`, `PLAYING`/`playing`, `room.drain`, `/v1/events/subscribe`, `POST /v1/admin/events`, `POST /v1/handshake-verify`). Fix any other hit in the file that owns it.
- [x] T038 [US3] Run quickstart.md check 6: compare renamed identifiers against `specs/001-standardize-resource-naming/contracts/canonical-identifiers.md`. Passing: no frozen identifier appears in a renamed form (SC-004).
- [x] T039 [US3] Reviewer spot-check (quickstart.md check 5, SC-005). Owner: reviewer (not Claude). Pick 10 identifiers at random from the drafts; apply FR-001 to FR-018; compare with the author's name. Passing: at least 9 of 10 agree. Record each disagreement with the rule that decides it.

---

## Phase 6: Polish & Cross-Cutting Concerns (Principle VI review and completion gate)

**Purpose**: Harness coherence, licence, migration note, and the completion gate. The change is complete only when the review in T048 is recorded.

- [x] T040 [P] Update `CLAUDE.md`: line 31 "Discovery/Proxy Server" ("DNS of rooms") → "Discovery server"; line 44 "Discovery/Proxy" → "Discovery"; the status line that says the constitution is unfilled → ratified v1.0.0 (closes `TODO(CLAUDE.md)`). Run quickstart.md check 3 after.
- [x] T041 [P] Update `.specify/memory/constitution.md`: remove `TODO(prd-field-names)` from the Sync Impact Report once T013 to T031 land. Keep `TODO(LICENSE)` until T043 is done. Apply via the Governance amendment process (a PR with justification and an impact report; maintainer approval).
- [x] T042 [P] Verify the harness has no retired names: run quickstart.md check 1 over `.claude/skills/`, `.github/workflows/docs.yml`, and `.specify/templates/`. Expected: no change. Record the result in the PR.
- [x] T043 [P] Owner: maintainer. Add `LICENSE` at the repository root with the full Apache License 2.0 text (constitution Principle I; `TODO(LICENSE)`; completion gate). Pre-existing gap, not caused by this feature.
- [x] T044 Owner: PRD author. Add a migration note and a justification for the breaking renames to `prd/discovery.md` and `prd/room-protocol.md` (constitution Principle IV). Also record that `spec_version` (`2026.09.02-1`) is date-based, not Semantic Versioning. Run after T013 and T014 (same files).
- [x] T045 Audience check: search `docs/docs/` for `prd/`, `specs/`, `.specify`, `.claude`, `CLAUDE.md`, `TODO`, and "skill". Passing: no matches (constitution Licensing → Audience).
- [x] T046 Completion gate: run `cd docs && npm run build` after all docs changes (T017 to T031, T032 to T035). Passing: build succeeds (plan Technical Context; quickstart check 4).
- [x] T047 Run the full quickstart.md checks 1 to 7 and record the results in the PR description. Use the T012 and T036 tables. Passing: each check meets its stated criterion.
- [x] T048 Record the Documentation and Harness Review as complete in `specs/001-standardize-resource-naming/plan.md`: update the status of each row in the review table (CLAUDE.md, prd/*, docs/docs/, review-20260902-1.md excluded, harness, constitution). Run last.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. Start now.
- **Foundational (Phase 2)**: T003 to T006 are owned by PRD authors; T007 and T008 by the user. T009 depends on T007 and T008 (it needs the decisions it records). **Blocks all rename work.**
- **US1 (Phase 3)**: Depends on T009. Does not touch `prd/` or `docs/`.
- **US2 (Phase 4)**: Drafts depend on the gate (T003 to T006), and each draft edit comes after its own Viability section (same file). Docs tasks T017 to T030 are parallel. T031 runs after T017 to T030. OD follow-ups (T032 to T035) depend on T008 and run after T013 to T031 (they touch the same files).
- **US3 (Phase 5)**: T036 depends on T012. T037 to T039 depend on Phase 4 being complete.
- **Polish (Phase 6)**: T040 to T043 can run in parallel. T044 follows T013 and T014. T045 to T047 follow all docs and draft tasks. T048 runs last.

### Within Each User Story

- Drafts before the docs that promote them (`prd/` is the source; `docs/` is the published version).
- Mapping before verification.
- Open Decision follow-ups only after their decision is recorded (T008).

### Parallel Opportunities

- Phase 2: T003, T004, T005, T006 (four PRD owners in parallel).
- Phase 3: T011 in parallel with T010.
- Phase 4: T015 and T017 to T030 (each on a different file).
- Phase 6: T040, T041, T042, T043 in parallel.

---

## Parallel Example: User Story 2 (docs)

```bash
# Launch all docs pages together (different files, English prose):
Task: "T017 docs/docs/discovery/overview.md"
Task: "T018 docs/docs/discovery/room-registration.md"
Task: "T019 docs/docs/discovery/ticket-resolution.md"
Task: "T020 docs/docs/discovery/room-listing.md"
Task: "T021 docs/docs/discovery/mtls-authentication.md"
Task: "T022 docs/docs/architecture/end-to-end-flow.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational). This needs the PRD gate and the decisions.
3. Complete Phase 3 (US1). Check it with quickstart check 7.
4. **STOP and VALIDATE**: a reviewer can look up five concepts without asking anyone.

### Incremental Delivery

1. Phase 1 + 2: gates cleared, decisions recorded.
2. Phase 3 (US1): glossary and contract agree.
3. Phase 4 (US2): drafts, then docs, then OD follow-ups. Each file is a separate reviewable change.
4. Phase 5 (US3): checklist and spot-check.
5. Phase 6: harness, licence, migration note, build, and the review record.

---

## Notes

- Frozen identifiers (FR-018) keep their current names until their Open Decision is recorded. Do not rename them early.
- Every rename lands in the same change as the drafts that use it (FR-017).
- Historical records (`prd/review-20260902-1.md`) are not edited.
- Commit only when asked. Each task can be a separate reviewable change.
