# Tasks: Aimduck Lobby and Connectivity Example

**Input**: Design documents from `/specs/002-aimduck-lobby-connectivity/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: No automated test tasks were requested. The Docusaurus production build and editorial acceptance checks are included in the final validation phase.

**Organization**: Tasks are grouped by the three user stories in `spec.md`. The deliverable is one public page, so story edits and validation are sequenced to avoid conflicting edits to the same file.

## Phase 1: Setup

**Purpose**: Establish the Aimduck page and make it discoverable in the public documentation.

- [X] T001 Create the Aimduck example page scaffold with overview, lobby/match, connectivity, interruption, and further-reading sections in `docs/docs/implementation/aimduck.md`, then add the page under the Implementation items in `docs/sidebars.js`.

## Phase 2: Foundational

**Purpose**: Set the shared editorial and security boundary before adding story content.

- [X] T002 Add a short scope statement to `docs/docs/implementation/aimduck.md` that distinguishes illustrative Aimduck policies from normative OGS behavior and points readers to the existing Discovery and Room Protocol guides for authoritative contracts.

**Checkpoint**: The public page is discoverable and has the context needed to add independent gameplay and connectivity sections.

## Phase 3: User Story 1 - Understand the Aimduck lobby (Priority: P1) 🎯 MVP

**Goal**: Explain how the illustrative eight-player Aimduck lobby becomes an eight-round match.

**Independent Test**: A reader can identify the 1v7 roles, lobby capacity, all-ready start condition, eight rounds, shooter rotation, scoring, and winner condition from `docs/docs/implementation/aimduck.md`.

### Implementation for User Story 1

- [X] T003 [US1] Document the eight-seat lobby, readiness and start condition, one-shooter/seven-duck roles, eight-round rotation, scoring, and highest-cumulative-score winner in `docs/docs/implementation/aimduck.md`, matching `samples/aimduck/README.md` and labeling lobby policies as illustrative.

**Checkpoint**: The page explains the lobby and match rules without implying that they are OGS protocol requirements.

## Phase 4: User Story 2 - Follow the client connection journey (Priority: P1)

**Goal**: Show how an authenticated player discovers a room and safely joins the Aimduck lobby.

**Independent Test**: A reader can put the described flow in order from authentication and masked room discovery through resolution, signed join ticket, secure direct room connection, and lobby entry; the page links to existing normative guides.

### Implementation for User Story 2

- [X] T004 [US2] Add the ordered client connectivity journey to `docs/docs/implementation/aimduck.md`, explaining masked listing, room resolution, admission-ticket validation, secure session establishment, and selection of a transport advertised by the room; link to `docs/docs/discovery/overview.md`, `docs/docs/discovery/room-listing.md`, `docs/docs/discovery/ticket-resolution.md`, `docs/docs/room-protocol/handshake-ecdh.md`, `docs/docs/room-protocol/transports.md`, and `docs/docs/room-protocol/schema-state.md`.

**Checkpoint**: The page demonstrates OGS connectivity without defining a new endpoint, ticket format, or mandatory transport.

## Phase 5: User Story 3 - Understand connectivity interruptions (Priority: P2)

**Goal**: Explain full-room, rejected-ticket, lobby-disconnect, and in-match disconnect outcomes and their limits.

**Independent Test**: A reader finds a clear next action for a full room or invalid/expired ticket and can distinguish the illustrative lobby reservation from any OGS guarantee about in-match recovery.

### Implementation for User Story 3

- [X] T005 [US3] Document full-room and invalid/expired-ticket outcomes, the illustrative 30-second lobby-seat reservation requiring the same authenticated identity and a fresh valid ticket, and the game-specific nature of in-match recovery in `docs/docs/implementation/aimduck.md`.

**Checkpoint**: All requested user journeys and edge cases are explicit and do not overstate protocol guarantees.

## Phase 6: Polish and Cross-Cutting Validation

**Purpose**: Verify repository coherence, public-documentation requirements, and the production build.

- [X] T006 Review `docs/docs/implementation/aimduck.md` against `prd/aimduck-example.md`, `specs/002-aimduck-lobby-connectivity/spec.md`, and the linked Discovery/Room Protocol guides; check relevant effects on `CLAUDE.md`, `.claude/skills/`, `.github/workflows/`, and `.specify/memory/constitution.md`, and record the review outcome in `specs/002-aimduck-lobby-connectivity/plan.md`.
- [X] T007 Run `npm run build` from `docs/`, resolve any build or sidebar errors in `docs/docs/implementation/aimduck.md` or `docs/sidebars.js`, and execute the editorial acceptance review described in `specs/002-aimduck-lobby-connectivity/quickstart.md`.

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001; establishes shared framing for all story content.
- **User Story 1 (Phase 3)**: Depends on T002 and the page scaffold.
- **User Story 2 (Phase 4)**: Depends on T002; execute after US1 to avoid concurrent edits to the shared Aimduck page.
- **User Story 3 (Phase 5)**: Depends on T002; execute after US1 and US2 to avoid concurrent edits to the shared Aimduck page.
- **Polish (Phase 6)**: Depends on all three user-story phases.

### User Story Dependencies

- **US1 (P1)**: Starts after Setup and Foundational. No semantic dependency on another user story; this is the suggested MVP.
- **US2 (P1)**: Starts after Setup and Foundational. Semantically independent, but sequenced after US1 because both add content to `docs/docs/implementation/aimduck.md`.
- **US3 (P2)**: Starts after Setup and Foundational. Semantically independent, but sequenced after US1 and US2 because all story content shares `docs/docs/implementation/aimduck.md`.

### Parallel Opportunities

- No story implementation tasks are marked `[P]`: each changes the same Aimduck page and must be applied in the listed sequence to avoid overlapping edits.
- After T005, the repository-coherence review (T006) and production build/editorial validation (T007) are kept sequential because either activity may require a documentation correction before final verification.

## Implementation Strategy

### MVP First (User Story 1)

1. Complete T001 and T002 to create and frame the public page.
2. Complete T003 to document the lobby and match journey.
3. Validate the US1 independent-test criteria in the page.
4. Continue to connectivity and interruption scenarios before considering the full feature complete.

### Incremental Delivery

1. Setup and shared framing establish the public page.
2. US1 adds a useful lobby/match example as the MVP.
3. US2 adds the OGS client connectivity walkthrough.
4. US3 adds failure and reconnection boundaries.
5. Complete cross-repository coherence review and Docusaurus build.

## Notes

- Every task has a checkbox, sequential ID, appropriate story label where required, and exact repository paths.
- Automated tests and protocol contract tests are omitted because the feature adds documentation only and neither the specification nor the user requested TDD.
- Do not change existing OGS contracts or add a `contracts/` artifact as part of this feature.
