# Tasks: Browser-playable Aimduck sample

**Input**: Design documents from `/specs/003-aimduck-game/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included because the specification and plan define contract, domain, integration, browser end-to-end, security, and Compose acceptance checks. For each story, write the listed tests first and confirm they fail for the missing behavior before implementing it.

**Organization**: Tasks are grouped by user story; foundational shared work precedes all stories. User stories are ordered with P1 stories first, then P2.

**Path convention**: Paths are relative to the repository root unless prefixed with `samples/aimduck/`.

## Phase 1: Setup

**Purpose**: Create the sample workspace and baseline developer tooling.

- [X] T001 Create the npm workspace root and package scripts in `samples/aimduck/package.json`
- [X] T002 [P] Configure strict shared TypeScript options and package aliases in `samples/aimduck/tsconfig.base.json`
- [X] T003 [P] Configure ESLint and formatting rules for the workspace in `samples/aimduck/eslint.config.js`
- [X] T004 [P] Configure Vitest workspace projects for shared, client, Discovery, and room packages in `samples/aimduck/vitest.workspace.ts`
- [X] T005 [P] Add generated certificate, private key, local secret, build output, and dependency exclusions to `samples/aimduck/.gitignore`
- [X] T006 Create the sample learning-goals and source-tour README outline in `samples/aimduck/README.md`

## Phase 2: Foundational

**Purpose**: Provide shared, transport-independent contracts and test seams required by all stories.

**Checkpoint**: Complete this phase before implementing any user story.

- [X] T007 Define shared identity, room, lobby, match, snapshot, and error types in `samples/aimduck/packages/shared/src/index.ts`
- [X] T008 Define runtime schemas for versioned client/server messages, bounded payloads, normalized movement/aim, and public error codes in `samples/aimduck/packages/shared/src/messages.ts`
- [X] T009 [P] Implement injectable clock, deterministic random source, and test ID helpers in `samples/aimduck/packages/shared/src/testing.ts`
- [X] T010 [P] Implement structured logging and redaction helpers that remove bearer tokens, join tickets, keys, certificates, and player input payloads in `samples/aimduck/packages/shared/src/logging.ts`
- [X] T011 [P] Define validated service configuration schemas for issuer, audiences, origins, ports, room IDs, lease timing, and local-only certificate paths in `samples/aimduck/packages/shared/src/config.ts`
- [X] T012 Add cross-package typecheck and workspace script wiring for client, Discovery, room, and shared packages in `samples/aimduck/package.json`

## Phase 3: User Story 1 - Discover and join a room (Priority: P1)

**Goal**: Authenticate a browser player, find a masked room through Discovery, resolve it, and join it only after ticket and secure-session validation.

**Independent Test**: Run client, IdP, Discovery, and one test room without the full Compose topology. Authenticate two distinct users; assert that listings omit host/port, resolution returns a reachable endpoint and a short-lived bound ticket, a valid user enters, and expired/mismatched credentials are rejected.

### Tests for User Story 1

- [X] T013 [P] [US1] Add Discovery contract tests for masked `GET /v1/rooms`, `POST /v1/rooms/resolve`, errors, and canonical field names in `samples/aimduck/tests/integration/discovery-contract.test.ts`
- [X] T014 [P] [US1] Add Discovery catalog tests for unique registration, lease expiry, room filtering, atomic capacity reservation, and no address leakage in `samples/aimduck/tests/unit/discovery-catalog.test.ts`
- [X] T015 [P] [US1] Add JWT/JWKS tests for invalid signature, issuer, audience, expiry, JWKS rotation, and cache failure behavior in `samples/aimduck/tests/unit/jwt-verifier.test.ts`
- [X] T016 [P] [US1] Add ticket tests for signature, expiry, player binding, room binding, one-time session use, and per-room key separation in `samples/aimduck/tests/unit/join-ticket.test.ts`
- [X] T017 [P] [US1] Add handshake crypto test vectors for transcript binding, directional key derivation, nonce uniqueness, sequence replay, and malformed key rejection in `samples/aimduck/tests/unit/room-handshake.test.ts`
- [X] T018 [P] [US1] Add room admission integration tests for invalid/expired tickets, identity mismatch, full capacity, and successful direct join in `samples/aimduck/tests/integration/room-admission.test.ts`

### Implementation for User Story 1

- [X] T019 [US1] Implement Discovery JWT/JWKS validation for signature, issuer, audience, expiry, and bounded JWKS cache refresh in `samples/aimduck/services/discovery/src/auth/jwt-verifier.ts`
- [X] T020 [US1] Implement the in-memory room catalog with lease expiry, filtering, current capacity, and atomic room reservation in `samples/aimduck/services/discovery/src/catalog/room-registry.ts`
- [X] T021 [US1] Implement masked room listing and canonical `GET /v1/rooms` response serialization without host, port, certificate, or private key in `samples/aimduck/services/discovery/src/catalog/list-rooms.ts`
- [X] T022 [US1] Implement authenticated room resolution by `masked_token`, browser-reachable address response, and distinct unknown/full/draining error codes in `samples/aimduck/services/discovery/src/resolution/resolve-room.ts`
- [X] T023 [US1] Implement short-lived player- and room-bound ticket signing/verification metadata with room-scoped keys in `samples/aimduck/services/discovery/src/resolution/join-ticket.ts`
- [X] T024 [US1] Implement Discovery HTTP routes, bearer middleware, bounded CORS policy, and health/readiness endpoints in `samples/aimduck/services/discovery/src/http/app.ts`
- [X] T025 [US1] Implement room self-registration, heartbeat, lease renewal, and graceful drain over mutually authenticated TLS in `samples/aimduck/services/room/src/ogs/discovery-registration.ts`
- [X] T026 [US1] Implement the HTTPS handshake endpoint to validate bearer identity and ticket before allocating a seat and return a single-use `session_id` in `samples/aimduck/services/room/src/transport/handshake.ts`
- [X] T027 [US1] Implement ECDH transcript authentication and HKDF-derived directional AEAD session keys according to `contracts/room-gameplay-websocket.md` in `samples/aimduck/packages/shared/src/crypto/session-keys.ts`
- [X] T028 [US1] Implement the WSS `/v1/ws` upgrade to validate Origin, consume one-time `session_id`, enforce AEAD nonce/sequence rules, and reject plaintext downgrade in `samples/aimduck/services/room/src/transport/websocket.ts`
- [X] T029 [US1] Implement the browser OIDC Authorization Code + PKCE flow with in-memory token handling and no browser client secret in `samples/aimduck/client/src/features/identity/oidc-client.ts`
- [X] T030 [US1] Implement the browser Discovery API client for bearer-authenticated masked list and room resolution in `samples/aimduck/client/src/features/discovery/discovery-client.ts`
- [X] T031 [US1] Implement room-browser loading, empty, stale, full, unavailable, retry, and masked room-card states in `samples/aimduck/client/src/features/discovery/RoomBrowser.tsx`
- [X] T032 [US1] Implement the admission progress UI and direct secure room connection using only the resolved host/port/path in `samples/aimduck/client/src/features/admission/JoinRoom.tsx`
- [X] T033 [US1] Implement safe admission error mapping and retry actions for invalid identity, expired ticket, full room, and network/TLS failure in `samples/aimduck/client/src/features/admission/admission-errors.ts`

**Checkpoint**: The authenticated list → resolve → ticket → direct admission journey works and is independently testable before gameplay is added.

## Phase 4: User Story 2 - Play a complete Aimduck match (Priority: P1)

**Goal**: Provide a complete eight-player lobby and playable authoritative 1v7 match with synchronized movement, outcomes, score, and result.

**Independent Test**: Use a deterministic room test harness and eight clients to fill seats, ready up, complete all eight rounds, and assert that every client observes the same state, each participant is Shooter once, and the final scoreboard follows the specified scoring rules.

### Tests for User Story 2

- [X] T034 [P] [US2] Add game-room transition tests for eight seats, ready guard, unready/departure, role rotation, match completion, and tie outcomes in `samples/aimduck/tests/unit/game-room.test.ts`
- [X] T035 [P] [US2] Add lobby seat tests for unique player ownership, atomic last seat, 30-second reservation boundary, same-identity return, and ready reset in `samples/aimduck/tests/unit/lobby-seat.test.ts`
- [X] T036 [P] [US2] Add deterministic simulation tests for world bounds, movement, throw cooldown, projectile cap, swept collision, hit/cross mutual exclusion, and round deadline in `samples/aimduck/tests/unit/arena-simulation.test.ts`
- [X] T037 [P] [US2] Add score tests for hit=3, crossing=1, no score for unresolved deadline outcomes, and multiple tied winners in `samples/aimduck/tests/unit/scoreboard.test.ts`
- [X] T038 [P] [US2] Add real-time room integration tests for snapshot ordering, per-player `$.me`, shared `$.server`/`$.others`, reconnect reservation, and stale connection handling in `samples/aimduck/tests/integration/gameplay-room.test.ts`
- [X] T039 [P] [US2] Add browser tests for role-specific keyboard/pointer controls, visible projectile/hit/cross feedback, and event-log equivalents in `samples/aimduck/tests/e2e/gameplay-controls.spec.ts`

### Implementation for User Story 2

- [X] T040 [US2] Implement `GameRoom`, `LobbySeat`, and `PlayerSession` transitions with exactly eight seats, atomic admission, and owner-only ready changes in `samples/aimduck/services/room/src/game/game-room.ts`
- [X] T041 [US2] Implement eight-round `MatchRound` lifecycle with countdown, stable seat-order Shooter rotation, 35-second deadline, and 4-second results/intermission in `samples/aimduck/services/room/src/game/game-room.ts` (co-located with room state transitions)
- [X] T042 [US2] Implement authoritative 30 Hz arena simulation with normalized input, server-owned movement speed/bounds, gravity, projectile cooldown/count, and deterministic clock/RNG injection in `samples/aimduck/services/room/src/simulation/arena.ts`
- [X] T043 [US2] Implement swept projectile collision, two static cover collisions, Duck crossing detection, and one-outcome-per-Duck resolution in `samples/aimduck/services/room/src/simulation/collisions.ts`
- [X] T044 [US2] Implement score updates, round events, final ranking, and all-tied-winners semantics in `samples/aimduck/services/room/src/game/scoreboard.ts`
- [X] T045 [US2] Implement game message handling and snapshots at 15 Hz or on critical state change, with monotonically increasing tick/revision in `samples/aimduck/services/room/src/game/gameplay-session.ts`
- [X] T046 [US2] Implement lobby ready control, eight-seat layout, role and countdown instructions, and reservation countdown UI in `samples/aimduck/client/src/features/lobby/Lobby.tsx`
- [X] T047 [US2] Implement Phaser arena scene with left start zone, right safe zone, Shooter platform, two visible cover blocks, player/rock entities, impact and crossing effects in `samples/aimduck/client/src/game/scenes/ArenaScene.ts`
- [X] T048 [US2] Implement keyboard movement, pointer/keyboard aim, edge-triggered throw, focus management, and reduced-motion behavior in `samples/aimduck/client/src/game/input/controls.ts`
- [X] T049 [US2] Implement client snapshot interpolation, local movement reconciliation, stale-state handling, and render-only aim prediction in `samples/aimduck/client/src/game/rendering/snapshot-interpolator.ts`
- [X] T050 [US2] Implement match HUD, role-specific instructions, round timer, accessible scoreboard, result/intermission view, and text event log in `samples/aimduck/client/src/features/match/MatchView.tsx`

**Checkpoint**: A full deterministic match can be played with eight clients; server state, scoring, transitions, and feedback are consistent for all clients.

## Phase 5: User Story 4 - Start the complete local demo (Priority: P1)

**Goal**: Start client, local OIDC provider, Discovery, and multiple independent room instances from one Docker Compose project with browser-reachable room addresses.

**Independent Test**: From a clean checkout, run the documented local setup once, trust the generated CA, execute one Compose command, and verify all services become healthy, rooms register, the browser can authenticate and join a room, and restarting one room does not remove the other.

### Tests for User Story 4

- [X] T051 [P] [US4] Add Compose smoke checks for required services, health checks, loopback port bindings, and forbidden Docker socket mounts in `samples/aimduck/tests/integration/compose-config.test.ts`
- [X] T052 [P] [US4] Add local-network integration checks that resolution advertises distinct host ports and never Compose service DNS names in `samples/aimduck/tests/e2e/compose-flow.spec.ts`
- [X] T053 [P] [US4] Add restart/lease smoke test for one room while the other remains registered and joinable in `samples/aimduck/tests/integration/compose-room-restart.test.ts`

### Implementation for User Story 4

- [X] T054 [US4] Implement idempotent local CA, Discovery certificate, per-room mTLS certificates, and per-room ticket secret generation under ignored paths in `samples/aimduck/scripts/dev-setup.ts`
- [X] T055 [US4] Create a Keycloak development realm import with OIDC public client using PKCE and eight distinct clearly labeled demo users in `samples/aimduck/infra/keycloak/realm-import/aimduck-realm.json`
- [X] T056 [US4] Create a non-root multi-stage client container with a production static build and health endpoint in `samples/aimduck/Dockerfile.client`
- [X] T057 [US4] Create a non-root multi-stage Discovery container with read-only certificate mounts and health endpoint in `samples/aimduck/Dockerfile.discovery`
- [X] T058 [US4] Create a non-root multi-stage room container with graceful signal handling and health endpoint in `samples/aimduck/Dockerfile.room`
- [X] T059 [US4] Define Keycloak, client, Discovery, `room-1`, and `room-2` services with health dependencies, unique loopback host ports, internal shared room port, and read-only secret mounts in `samples/aimduck/docker-compose.yml`
- [X] T060 [US4] Implement root scripts for setup, Compose up/down, lint, typecheck, unit, integration, e2e, Compose tests, and production build in `samples/aimduck/package.json`
- [X] T061 [US4] Document seeded user credentials, CA trust procedure, controls, source map, OGS flow, game tuning defaults, test commands, limitations, and local-only security warning in `samples/aimduck/README.md`

**Checkpoint**: A fresh local environment is repeatably startable with one documented Compose command after initial local certificate setup.

## Phase 6: User Story 3 - Understand OGS entities and state (Priority: P2)

**Goal**: Make the sample self-explanatory as an OGS integration example, with consistent entity-based UI and clear separation of infrastructure and game state.

**Independent Test**: A developer who has not implemented the feature completes the discovery, admission, lobby, and match flows; identifies PlayerIdentity, DiscoveryListing, RoomResolution, RoomInstance, RoomConnection, GameRoom, LobbySeat, MatchRound, and Scoreboard from UI/source tour; and never confuses operational room state with game phase.

### Tests for User Story 3

- [X] T062 [P] [US3] Add component mapping/accessibility tests for OGS entity labels, operational/game state separation, focus order, and non-color status in `samples/aimduck/tests/unit/entity-design-system.test.tsx`
- [X] T063 [P] [US3] Add browser accessibility checks for keyboard-only discovery, lobby, match, result, and reduced-motion flows in `samples/aimduck/tests/e2e/accessibility.spec.ts`

### Implementation for User Story 3

- [X] T064 [US3] Define design tokens for status semantics, typography, spacing, focus, contrast, breakpoints, and reduced motion in `samples/aimduck/client/src/components/design-system/foundation/tokens.css`
- [X] T065 [US3] Implement shared accessible primitives for buttons, badges, alerts, dialogs, cards, progress, loading, empty, and error states in `samples/aimduck/client/src/components/design-system/primitives/index.tsx`
- [X] T066 [US3] Implement OGS entity components for identity, masked Discovery room, operational status, resolution progress, connection, and safe details panel in `samples/aimduck/client/src/components/design-system/ogs/index.tsx`
- [X] T067 [US3] Implement Aimduck entity components for seats, readiness, role, round status, score row, scoreboard, and match result in `samples/aimduck/client/src/components/design-system/aimduck/index.tsx`
- [X] T068 [US3] Implement a persistent but collapsible OGS learning panel that shows safe identifiers, transport, connection status, and protocol version without credentials or private addresses in `samples/aimduck/client/src/components/design-system/ogs/OgsDetailsPanel.tsx`
- [X] T069 [US3] Add public English documentation for playable capabilities, controls, OGS entity mapping, local security limitations, and sample quick start in `docs/docs/implementation/aimduck.md`

**Checkpoint**: The main game flows remain usable and understandable while the UI clearly teaches which state belongs to OGS and which belongs to Aimduck.

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Verify security, playability, operational quality, licenses, and repository coherence across all stories.

- [X] T070 [P] Document service diagram, source tour, sample contracts, architecture decisions, and known protocol gaps in `samples/aimduck/README.md`
- [X] T071 [P] Document local Compose usage and explicitly distinguish the sample from production deployment in `docs/docs/implementation/deployment.md`
- [X] T072 Review and align Discovery/room-protocol public docs with canonical endpoint/field names and record any separate protocol decision needed in the affected `docs/docs/discovery/` and `docs/docs/room-protocol/` pages
- [X] T073 Review `CLAUDE.md`, `.claude/skills/`, `.github/workflows/`, and `.specify/memory/constitution.md`; update only demonstrated mismatches and record each decision in `specs/003-aimduck-game/plan.md`
- [X] T074 Add CI workflow coverage for sample lint, typecheck, unit, integration, e2e, Compose config, and docs build when docs change in `.github/workflows/aimduck.yml`
- [X] T075 Run dependency license compatibility review and record the result in `samples/aimduck/README.md`
- [X] T076 Run secret scan and verify generated certificate/key/ticket material is ignored and absent from image layers in `samples/aimduck/tests/integration/security-artifacts.test.ts`
- [X] T077 Run at least three complete eight-player playtests or repeatable eight-client sessions; record control comprehension, unclear hits, dead time, disconnects, selected tuning values, and evidence in `samples/aimduck/README.md` (automated repeatability evidence; human usability measures remain uncollected)
- [X] T078 Run all commands and scenarios in `specs/003-aimduck-game/quickstart.md` from a clean environment and record pass/fail evidence in `specs/003-aimduck-game/plan.md` (fresh Compose lifecycle; existing ignored local certificates retained)
- [X] T079 Verify all requirements FR-001 through FR-019 and success criteria SC-001 through SC-007 against automated tests or recorded manual evidence in `specs/003-aimduck-game/plan.md` (SC-005 explicitly remains unverified pending a moderated developer study)
- [X] T080 Run final `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:compose`, `npm run build`, and `npm run build` from `docs/` when documentation changed

## Dependencies and Execution Order

### Phase dependencies

- **Setup (Phase 1)**: independent; establishes workspace files.
- **Foundational (Phase 2)**: depends on Setup; blocks all story phases because client and services share schemas, logging, validated configuration, and deterministic test seams.
- **US1 (Phase 3)**: depends on Foundation; produces identity, Discovery, secure admission, and a direct room connection usable by later gameplay.
- **US2 (Phase 4)**: depends on Foundation and the room connection/admission slice of US1; its pure domain/simulation tests can begin after Foundation, while real-time integration and client wiring depend on US1.
- **US4 (Phase 5)**: depends on US1 and US2 implementations because Compose packages the real client, Discovery, and room; Keycloak/containers/configuration tasks may be developed in parallel with independent US3 UI work after Foundation.
- **US3 (Phase 6)**: design-system foundations can start after Phase 2; entity mapping and learning panel integrate with US1/US2 UI and therefore complete after those stories.
- **Polish (Phase 7)**: depends on all feature stories intended for release.

### User-story dependencies

- **US1 (P1)**: after Foundation; independently testable with a test IdP/room harness before Compose.
- **US2 (P1)**: game domain/simulation is independently testable after Foundation; its connected multiplayer client depends on the US1 room admission/session interface.
- **US4 (P1)**: local Compose acceptance depends on working US1 and US2 services/client. The local setup/Keycloak/Dockerfile tasks can be parallelized with US3 component styling, but full acceptance waits for both stories.
- **US3 (P2)**: shared primitives/tokens can begin after Foundation; complete entity-oriented explanations depend on US1 and US2 flows being available.

### Parallel opportunities

- **Setup**: T002-T005 are independent after T001 establishes the workspace directory; T006 can proceed alongside configuration.
- **Foundation**: T009-T011 can proceed in parallel after T007/T008 types are agreed; package wiring T012 follows workspace package creation.
- **US1**: T013-T018 tests are separate files and can be authored in parallel after shared schemas. T019, T020, and frontend OIDC work T029 can proceed in parallel; HTTP route wiring follows auth/catalog/resolution. Client list UI T031 can proceed once the discovery response types are fixed; admission UI T032 follows the resolve contract and handshake interface.
- **US2**: T034-T039 tests can be split by domain area. T042 simulation and T044 scoreboard are independent after core game types; T047 Phaser arena can proceed in parallel with room simulation; T048 controls depends on the arena input contract; T050 HUD follows room snapshot types.
- **US4**: T054 certificate tooling, T055 realm import, and T056-T058 image builds can proceed in parallel after service ports/config are fixed; T059 Compose wiring follows image names, ports, and secret paths; T061 README credentials depend on T055.
- **US3**: T064 tokens, T065 primitives, and T062 mapping test scaffolding can proceed in parallel; T066-T068 depend on tokens/primitives and entity contracts.
- **Polish**: T070-T073 documentation/review tasks can be distributed by separate file surfaces; T074 CI configuration follows stable scripts from T060; final acceptance tasks T078-T080 run after all changes land.

## Parallel Execution Examples

### User Story 1

```text
Task: T013 Discovery contract tests in samples/aimduck/tests/integration/discovery-contract.test.ts
Task: T015 JWT/JWKS tests in samples/aimduck/tests/unit/jwt-verifier.test.ts
Task: T017 Handshake crypto vectors in samples/aimduck/tests/unit/room-handshake.test.ts
Task: T029 OIDC PKCE client in samples/aimduck/client/src/features/identity/oidc-client.ts
```

### User Story 2

```text
Task: T034 Game-room transitions in samples/aimduck/tests/unit/game-room.test.ts
Task: T036 Arena simulation in samples/aimduck/tests/unit/arena-simulation.test.ts
Task: T037 Scoreboard rules in samples/aimduck/tests/unit/scoreboard.test.ts
Task: T047 Phaser arena in samples/aimduck/client/src/game/scenes/ArenaScene.ts
```

### User Story 4

```text
Task: T054 Local development certificates in samples/aimduck/scripts/dev-setup.ts
Task: T055 Keycloak realm in samples/aimduck/infra/keycloak/realm-import/aimduck-realm.json
Task: T056 Client image in samples/aimduck/Dockerfile.client
Task: T057 Discovery image in samples/aimduck/Dockerfile.discovery
Task: T058 Room image in samples/aimduck/Dockerfile.room
```

## Implementation Strategy

1. **MVP order**: finish Setup/Foundation, then deliver US1 as a real authenticated discovery-and-admission path, followed by US2 so the same room connection carries an authoritative complete match. This yields a meaningful, playable vertical slice before polishing the explanatory UI.
2. **Runnable environments**: keep unit tests runnable without Docker; use service integration harnesses for US1/US2; make Compose the acceptance environment for US4 rather than a prerequisite for every inner development loop.
3. **Teach by tracing**: keep one obvious path from UI action to client module to shared schema to service handler to domain decision and back to a typed event/snapshot. Include links between README, contracts, and source directories.
4. **Secure integration before shortcut**: no fake identity, bypass ticket, browser-held room secret, plaintext gameplay fallback, Docker socket, or client-authoritative score may be introduced to accelerate a demo.
5. **Tune only with evidence**: use deterministic defaults first, run playtests, then adjust only centralized tuning values while keeping PRD/spec rules unchanged. Record playtest evidence and chosen tradeoffs.
6. **Release gate**: complete US4 and US3, documentation/harness review, all automated tests, and quickstart validation before calling the sample complete.

## Format Validation

Every task uses `- [ ] Tnnn`, includes `[P]` only when tasks can work on distinct files independently, includes `[USn]` for story-phase tasks, and names at least one exact file path. Setup, Foundational, and Polish tasks intentionally have no story labels.
