---

description: "Implementation tasks for clarifying Aimduck entity contracts"
---

# Tasks: Contratos claros das entidades Aimduck

**Input**: Design documents from `/specs/004-aimduck-entity-contracts/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Contract and entity-label tests are included because the specification requires cross-client/server validation and measurable contract outcomes.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared type categorization is complete.

## Phase 1: Setup

**Purpose**: Confirm the existing Aimduck toolchain; no new dependencies or project initialization are needed.

- [X] T001 Confirm Node.js >=22, Zod 3.24.2, and the existing Vitest/typecheck commands in `samples/aimduck/package.json` and `samples/aimduck/packages/shared/package.json`; do not add dependencies.

---

## Phase 2: Foundational

**Purpose**: Establish the shared entity categories used by both user stories while retaining existing package imports.

- [X] T002 Group shared OGS and Aimduck type contracts in `samples/aimduck/packages/shared/src/index.ts`; name Discovery's private registration record `RoomInstance` in `samples/aimduck/services/discovery/src/catalog/room-registry.ts`; distinguish client `RoomConnection` from server-only `RoomSocketSession` at their owning boundaries; and retain existing named-import compatibility.

**Checkpoint**: Shared type ownership is explicit; user stories can proceed independently.

---

## Phase 3: User Story 1 - Identificar a responsabilidade de cada entidade (Priority: P1)

**Goal**: Make the ownership category of each entity and the distinction between operational room state and Aimduck match phase immediately recognizable in the sample interfaces and guidance.

**Independent Test**: Run `npm exec vitest run tests/unit/client/entity-design-system.test.tsx` from `samples/aimduck/`; inspect the sample catalog and public guide to confirm each named entity has one category and that OGS operational state is not conflated with Aimduck phase.

### Tests for User Story 1

- [X] T003 [P] [US1] Add or update assertions for unambiguous OGS, admission/transport, and Aimduck labels and for distinct operational-room and match-phase wording in `samples/aimduck/tests/unit/client/entity-design-system.test.tsx`.

### Implementation for User Story 1

- [X] T004 [US1] Align the visible OGS and Aimduck entity names, category labels, and operational-state/match-phase distinction in `samples/aimduck/client/src/components/design-system/ogs/OgsDetailsPanel.tsx` and `samples/aimduck/client/src/components/design-system/aimduck/index.tsx` so they match the categorized exports in `samples/aimduck/packages/shared/src/index.ts`.
- [X] T005 [P] [US1] Update the entity ownership explanations and terminology in `samples/aimduck/README.md` and `docs/docs/implementation/aimduck.md`; state that the sample catalog is local and non-normative for OGS, and keep the published page English and public-facing.

**Checkpoint**: User Story 1 is independently testable through the entity-design-system unit test and review of the catalog and sample documentation.

---

## Phase 4: User Story 2 - Entender o estado recebido pelo cliente (Priority: P1)

**Goal**: Define and enforce shared client/server message and recipient-specific snapshot shapes, including the meaning and visibility of each snapshot group.

**Independent Test**: Run `npm exec vitest run tests/integration/gameplay-room.test.ts` from `samples/aimduck/`; verify valid server messages parse under the shared contract, two recipients receive distinct `me`/`others` projections, no session list is duplicated in `game`, secrets are absent, and `game.phase` is never represented as OGS operational state.

### Tests for User Story 2

- [X] T006 [P] [US2] Add or update gameplay contract cases in `samples/aimduck/tests/integration/gameplay-room.test.ts` for valid and invalid messages, shared-schema parsing, two-recipient `me`/`others` separation, absence of individual sessions in `game`, absence of credentials/secrets, and separation of `game.phase` from operational room state.

### Implementation for User Story 2

- [X] T007 [US2] Define strict Zod 3.24.2 schemas and inferred TypeScript types for the existing client-to-room and room-to-client message variants, including the `server`, `game`, `me`, `others`, and `arena` snapshot groups with explicit required/nullability semantics, in `samples/aimduck/packages/shared/src/messages.ts`; retain local contract version `1` and existing event names, give each payload an explicit shape, and reject unexpected fields for closed objects.
- [X] T008 [US2] Replace the generic `Record<string, unknown>` snapshot result in `samples/aimduck/services/room/src/game/gameplay-session.ts` with the typed recipient-specific projection: `server` metadata/reference, aggregate `game` state without individual sessions, recipient `me`, other participants in `others` excluding the recipient, and simulation-only `arena`; exclude admission credentials and cryptographic material.
- [X] T009 [US2] Validate incoming and emitted room messages against the shared schemas and handle schema failures explicitly in `samples/aimduck/services/room/src/transport/websocket.ts`, preserving the existing authentication, admission, handshake, and gameplay behavior.
- [X] T010 [US2] Parse and consume the shared message and snapshot types in `samples/aimduck/client/src/game/game-state.ts`; remove generic payload assumptions and ad hoc casts while preserving the existing version-1 event behavior and recipient visibility.

**Checkpoint**: User Story 2 is independently testable by the focused gameplay-room integration test and workspace typecheck.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify repository coherence and the full focused validation path without changing normative OGS behavior.

- [X] T011 Review `CLAUDE.md`, `.claude/skills/`, `docs/`, `prd/`, `.github/workflows/aimduck.yml`, `.github/workflows/docs.yml`, and `.specify/memory/constitution.md`; update only affected surfaces, preserve public documentation constraints, confirm there are zero changes to normative OGS endpoints/semantics/requirements, and record each surface checked plus its change/no-change rationale in `specs/004-aimduck-entity-contracts/plan.md`.
- [X] T012 From `samples/aimduck/`, run `npm exec vitest run tests/unit/client/entity-design-system.test.tsx tests/integration/gameplay-room.test.ts` and `npm run typecheck`; if `docs/docs/implementation/aimduck.md` changed, run `npm run build` from `docs/` and record the results in `specs/004-aimduck-entity-contracts/plan.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; confirms the existing runtime and test commands.
- **Foundational (Phase 2)**: Depends on setup and blocks both user stories because both rely on the categorized shared exports.
- **User Stories (Phase 3+)**: Both P1 stories depend on the foundational exports, then can proceed in parallel because their implementation and focused test files are separate.
- **Polish (Phase 5)**: Depends on both user stories; the coherence review and final validation cover the integrated result.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T002; otherwise independent.
- **User Story 2 (P1)**: Depends on T002; otherwise independent of User Story 1.

### Within Each User Story

- Add or update the focused tests before implementation and confirm the new assertions fail against the old behavior.
- In User Story 1, complete T003 before T004; T005 can proceed independently after T002.
- In User Story 2, complete T006 before T007-T010; then update the shared schema, server projection/emission, and client consumer in dependency order.
- Complete the repository review and quickstart validation after both stories are integrated.

## Parallel Opportunities

- T003 and T005 can proceed in parallel after T002 because they affect distinct test and documentation files.
- T006 can be prepared independently from User Story 1 after T002 because it targets a separate integration-test file.
- After T002, User Story 1 and User Story 2 can be implemented by separate contributors; within User Story 2, keep T007-T010 ordered because server and client behavior depend on the shared schema and projection.

## Parallel Example: User Story 1

```text
After T002:
Task: Add entity-category and phase-distinction assertions in samples/aimduck/tests/unit/client/entity-design-system.test.tsx
Task: Update ownership explanations in samples/aimduck/README.md and docs/docs/implementation/aimduck.md
Then implement the UI label changes after the test task.
```

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001-T002 to confirm the existing toolchain and make shared entity ownership explicit.
2. Complete T003-T005 to deliver and independently validate the entity categories and clear interface labels.
3. Stop for the User Story 1 checkpoint before beginning the wire-state work.

### Incremental Delivery

1. Complete Setup and Foundational work.
2. Deliver User Story 1 and validate its focused UI test and documentation.
3. Deliver User Story 2 and validate its contract tests and typecheck.
4. Complete the repository coherence review and quickstart/build validation.

## Notes

- `[P]` tasks touch separate files and have no dependency on unfinished tasks.
- `[US1]` and `[US2]` map directly to the priorities and scenarios in `specs/004-aimduck-entity-contracts/spec.md`.
- Changes remain local to `samples/aimduck/`; the contracts in `specs/004-aimduck-entity-contracts/contracts/` are not normative OGS specifications.
