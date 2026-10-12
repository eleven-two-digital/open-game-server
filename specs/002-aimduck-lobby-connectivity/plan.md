# Implementation Plan: Aimduck Lobby and Connectivity Example

**Branch**: `002-aimduck-lobby-connectivity` | **Date**: 2026-10-11 | **Spec**: [spec.md](./spec.md)

**Input**: [Feature specification](./spec.md) and source PRD [aimduck-example.md](../../prd/aimduck-example.md)

## Summary

Create an English, public-facing Aimduck example page in the Docusaurus implementation section, linked from the existing sidebar. Explain the illustrative 1v7 lobby and match flow, and walk through client discovery, room resolution, ticket validation, secure connection, lobby entry, and documented failure cases. Reuse and link to existing OGS documentation for normative contracts. Do not add runtime code, new protocol interfaces, or alter existing protocol contracts.

## Technical Context

**Language/Version**: English Markdown/MDX content; Node.js >=18 for the existing documentation site  
**Primary Dependencies**: Existing Docusaurus 3 site in `docs/`; no new dependencies  
**Storage**: N/A; static documentation  
**Testing**: `npm run build` from `docs/`, plus manual content, navigation, and link review  
**Target Platform**: Static public documentation site  
**Project Type**: Documentation-only change to the existing Docusaurus site  
**Performance Goals**: N/A; no runtime behavior or performance-sensitive code  
**Constraints**: Keep published documentation English and public-facing; preserve existing OGS protocol/security contracts; clearly label Aimduck-specific lobby and reconnect policies as illustrative; make no implementation-code changes  
**Scale/Scope**: One Aimduck example page and one sidebar entry; review related examples and normative Discovery/room-protocol references for consistency

## Constitution Check

**Pre-design gate: PASS**

- **PRD first (Principle II)**: [aimduck-example.md](../../prd/aimduck-example.md) exists, includes all required viability dimensions, and concludes `viable`.
- **Implementation-independent and testable (Principle III)**: the deliverable is public documentation; no implementation code or new normative protocol contracts are planned.
- **Compatibility and versioning (Principle IV)**: no protocol changes, extensions, or deprecations are in scope.
- **Secure by default (Principle V)**: explain existing address masking, signed short-lived join tickets, identity validation, and secure client-room session setup; do not introduce credential examples that bypass these requirements. Reference the trust model in [architecture.md](../../prd/architecture.md).
- **Repository coherence and audience (Principle VI)**: publish in English, link to canonical Discovery and room-protocol docs, and record a documentation/harness review in this plan and its implementation tasks. Traceability to the PRD remains in this internal plan, not the public page.
- **License and quality gates**: use repository-owned prose and the user-provided Aimduck source material; run the Docusaurus production build if docs change.

No constitution violations or added complexity require justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-aimduck-lobby-connectivity/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── tasks.md                 # Produced by /speckit-tasks
```

### Source Content and Documentation

```text
prd/
└── aimduck-example.md       # Feature source PRD

samples/
└── aimduck/
    └── README.md            # User-provided gameplay reference; retain as source

docs/
├── sidebars.js              # Add the public Aimduck page to Implementation
└── docs/implementation/
    └── aimduck.md           # New public-facing example page
```

**Structure Decision**: Add one static implementation guide under the existing Docusaurus `docs/docs/implementation/` section and register it in `docs/sidebars.js`. Keep the supplied gameplay reference in `samples/aimduck/` and use it as source material, not as a replacement for the polished public page. No application or test source tree is involved.

## Design Decisions

- Treat lobby presence/readiness and match phases as Aimduck game state, distinct from the OGS room's operational lifecycle.
- Show the client journey in order: authenticate, discover masked rooms, resolve the selected room, receive a signed join ticket and connection details, establish the room's advertised secure transport/session, then enter the game lobby.
- Refer readers to existing pages for normative protocol details rather than restating conflicting versions of endpoints or credential schemas.
- Document full-room and rejected/expired-ticket outcomes using existing Discovery and room-protocol behavior.
- Present the eight-player capacity, ready-up start condition, eight-round shooter rotation, scoring, and 30-second lobby return window as example policies only. A return after disconnection requires the same authenticated player identity and a newly obtained valid ticket; in-match recovery remains game-specific.
- Do not create a `contracts/` artifact: this feature adds no external protocol, API, schema, or other machine-consumable interface. The public Markdown guide is the deliverable.

## Documentation and Harness Review

As part of implementation, review the public documentation, source PRD, and existing Discovery/room-protocol examples for terminology, security, link, and behavioral consistency. Check the effect on `CLAUDE.md`, skills, CI workflows, and the constitution; update those only if the feature exposes a real mismatch. Record the review and outcome in the implementation PR or plan. Confirm the feature creates no new protocol contract or runtime behavior.

**Review completed 2026-10-11**:

- The public Aimduck page follows the feature PRD and gameplay source: eight-player 1v7 roles, eight rounds, rotating Shooter, scoring, and a clearly labeled illustrative lobby policy.
- Discovery masking/resolution and join-ticket handling, room admission/session negotiation, and advertised transports are linked to their existing public guides; no protocol endpoint, schema, or security requirement was added or changed.
- The new links resolve to existing documentation pages, and the page is registered in the Implementation sidebar.
- `CLAUDE.md` already describes the Docusaurus site and build command; the existing skills, docs workflow, and constitution require no feature-specific changes.
- The page is English and public-facing and contains no internal repository workflow details. The source PRD remains internal and is not linked from the published page.
- Outcome: no documentation/harness changes beyond the Aimduck page and sidebar entry were needed; no new runtime behavior or protocol contract was introduced.

## Post-Design Constitution Check

**Post-design gate: PASS**

- The generated design remains documentation-only and does not introduce an external interface, persistent data model, protocol extension, or runtime behavior.
- Aimduck readiness, scoring/roles, and lobby reconnection details remain explicitly example-specific; existing OGS security and room-admission requirements remain authoritative.
- The required documentation/harness coherence review is retained above for implementation and completion.
- No constitution violation, unresolved clarification, or new complexity was found during design.

## Complexity Tracking

No constitution violations; no additional complexity to justify.
