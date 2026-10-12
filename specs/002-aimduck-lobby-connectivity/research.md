# Research: Aimduck Lobby and Connectivity Example

## Findings and Decisions

### Public documentation format and placement

- **Decision**: Add one English Markdown page to `docs/docs/implementation/` and register it under the existing Implementation sidebar category.
- **Rationale**: The project publishes final, public-facing documentation in English, and the current Implementation section already contains client and room examples. The Docusaurus configuration uses an explicit sidebar.
- **Alternatives considered**: Add the material only under `samples/`, or create an independent docs section. The sample folder is a source/reference location rather than the public documentation site; a new category would unnecessarily fragment the existing examples.
- **Evidence**: `docs/package.json` identifies the existing Docusaurus 3 build; `docs/sidebars.js` lists the Implementation pages; `samples/aimduck/README.md` contains the user-provided gameplay description.

### Normative connectivity flow

- **Decision**: Explain the existing sequence: authenticated client lists masked rooms, resolves the chosen room through Discovery, receives connection details and a signed join ticket, connects directly to the room, and completes the room's admission/session negotiation before joining the game lobby. Link to the existing Discovery, room listing, ticket resolution, room handshake, transports, and state schema guides.
- **Rationale**: This sequence demonstrates OGS connectivity without defining new endpoints or changing the protocol.
- **Alternatives considered**: Define a new lobby service or custom matchmaking/ticket exchange. These are outside the documentation-only scope and would imply unsupported protocol contracts.
- **Evidence**: `docs/docs/discovery/overview.md`, `docs/docs/discovery/room-listing.md`, `docs/docs/discovery/ticket-resolution.md`, and `docs/docs/room-protocol/`.

### Aimduck lobby and reconnect policies

- **Decision**: Present the eight-player lobby, all-ready start condition, eight rounds with shooter rotation, and a 30-second lobby-seat hold as illustrative Aimduck policies. Require the same authenticated identity and a fresh valid join ticket for a returning player; state that recovery during a match is game-specific.
- **Rationale**: The source gameplay defines the 1v7 format, rounds, rotation, and scoring, but does not establish lobby readiness or reconnection rules. Explicitly labeling these as illustrative fills the example's explanatory gap without making them OGS guarantees.
- **Alternatives considered**: Leave lobby policy unspecified, or promote the illustrative behavior to the OGS protocol. The former fails the requested lobby example; the latter improperly changes the protocol's scope.
- **Evidence**: `samples/aimduck/README.md` for gameplay, `prd/aimduck-example.md` for approved documentation scope, and `spec.md` for acceptance criteria and assumptions.

### Failure handling and security boundary

- **Decision**: Explain full-room resolution as a reason to refresh discovery and choose another room; explain invalid/expired admission credentials as a rejected entry requiring a fresh valid ticket. Do not expose room addresses in listings or suggest bypassing ticket validation and secure session setup.
- **Rationale**: These outcomes reuse the existing OGS contract and are necessary to document the connection journey safely.
- **Alternatives considered**: Invent retry timing or connection recovery guarantees. No such behavior is established by the source spec or existing documentation, so the example will not promise it.
- **Evidence**: `docs/docs/discovery/room-listing.md`, `docs/docs/discovery/ticket-resolution.md`, `docs/docs/room-protocol/handshake-ecdh.md`, and the trust model in `prd/architecture.md`.

### Validation strategy

- **Decision**: Run `npm run build` from `docs/`; manually check the new page's links, sidebar visibility, requirements coverage, and distinction between OGS contracts and illustrative game policy.
- **Rationale**: The deliverable is static documentation. A successful Docusaurus production build validates parsing and sidebar integration; focused editorial checks validate the behavior-specific acceptance criteria.
- **Alternatives considered**: Add test infrastructure or a new machine-readable protocol contract. There is no runtime code or protocol change to warrant either.

## Unknowns Resolved

No implementation or protocol unknowns remain. The only missing lobby/reconnection behavior is intentionally defined as example policy in the feature specification, not as a fact about OGS.
