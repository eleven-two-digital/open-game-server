<!--
Sync Impact Report
- Version change: (unratified template) → 1.0.0
- Principles: all new (I. Open Protocol and Apache 2.0 License; II. PRD First, with Viability;
  III. Normative, Implementation-Independent Specification; IV. Protocol Compatibility and Versioning;
  V. Secure by Default; VI. Whole-Repository and Harness Coherence)
- Sections added: Licensing and Contribution; Development Workflow and Quality Gates; Governance
- Sections removed: none
- In-place corrections of v1.0.0 (not yet committed, so no version bump):
  - `docs/` MUST be in English; PRDs and specs in `prd/` and `specs/` MAY be in pt-BR or English.
    The English text is a rewrite, not a literal translation.
  - `docs/` MUST be public-facing: no internal repository details (new Audience rule).
  - Traceability from `docs/` to its source PRD moves from the published page to the promoting PR or
    plan (Principle VI).
- `docs/` conformed to the Audience rule: internal references and status notes removed from 18 pages;
  field and query names aligned (`game_mode`, `language`, `join_ticket`, snake_case JSON fields).
- Deferred items (TODO):
  - TODO(prd-field-names): `prd/discovery.md` uses names that differ from `docs/` (`tag.game_mode`,
    `lease_ttl_seconds`, `masked_id`, `/v1/dns/unregister`). Choose the canonical names and align the PRD
    and `docs/`.
  - TODO(LICENSE): there is no LICENSE or NOTICE file at the repository root; create LICENSE with the
    full text of the Apache License 2.0.
  - TODO(CLAUDE.md): update `CLAUDE.md` to reference the ratified constitution (it still says the
    constitution is unfilled).
-->
# Open Game Server Constitution

## Core Principles

### I. Open Protocol and Apache 2.0 License
The Open Game Server Ecosystem is an **open protocol**, independent of any game engine, programming
language, or vendor. All content in the repository (specifications, documentation, schemas, reference
code) MUST be licensed under the **Apache License 2.0**.

- The `LICENSE` file with the full Apache 2.0 text MUST exist at the repository root.
- Dependencies, copied snippets, and third-party content MUST be compatible with Apache 2.0.
- The protocol MUST NOT depend on a proprietary or single-vendor component to be implemented. Every
  external dependency (identity provider, transport, cryptography) MUST be based on an open standard
  (OAuth2/OIDC, JWT/JWKS, mTLS, HTTP/WebSocket/SSE, and so on).
- Anyone MUST be able to build an independent implementation (Discovery, room, or client) using only
  the published specification.

Rationale: protocol adoption depends on implementation freedom and legal certainty. Apache 2.0 provides
an explicit patent grant and permits commercial use.

### II. PRD First, with Viability (NON-NEGOTIABLE)
Every specification MUST start from a **PRD** in `prd/`. Running `speckit-specify`, `speckit-plan`, or
implementation without a corresponding PRD is not allowed.

Every PRD MUST include a **Viability** section that covers, at minimum:
- technical viability (risks, unknowns, and a proof of concept when needed);
- security and privacy impact;
- compatibility impact with the protocol already published (see Principle IV);
- estimated effort and complexity, and the alternatives that were rejected;
- an explicit conclusion: **viable**, **viable with caveats**, or **not viable**.

A PRD concluding **not viable** MUST NOT advance to specification. The PRD MUST have a header with a
version/date (for example, `2026.09.02-1`), following the pattern already used in `prd/`.

Rationale: protocol decisions are expensive to reverse once published. Recording viability up front
prevents specifying things that cannot be built or protected.

### III. Normative, Implementation-Independent Specification
Specifications MUST describe **observable behavior and contracts** (endpoints, messages, schemas,
states, errors), not the details of a particular implementation.

- Normative requirements MUST use RFC 2119 terminology (MUST, MUST NOT, SHOULD, MAY) consistently and
  with a testable meaning.
- Every requirement MUST be verifiable through a conformance test or an explicit acceptance criterion.
- Contracts (for example, `/.well-known/game-room` and the `$.server`/`$.me`/`$.others` state schemas)
  MUST have a formal definition and examples.
- Reference code, when it exists, MUST be treated as illustration; if it conflicts with the
  specification, the specification prevails.

### IV. Protocol Compatibility and Versioning
The protocol MUST be versioned with **Semantic Versioning**, and the version MUST be negotiable between
the parties (through the well-known endpoint or the handshake).

- Breaking changes require a MAJOR increment, a migration note, and a justification in the PRD.
- Extensions MUST be additive and optional; implementations MUST ignore unknown fields.
- Features MUST be announced through capabilities and MUST NOT be assumed.
- Deprecations MUST be documented, with a deadline, before removal.

### V. Secure by Default
Security is a first-class requirement in every specification, not a step added later.

- Infrastructure-to-infrastructure communication MUST use mTLS. Client-to-room communication MUST use
  session keys derived through ECDH with authenticated encryption (AES-256-GCM or ChaCha20-Poly1305).
- Client identity MUST be validated statelessly (JWT/JWKS). Real room addresses MUST NOT be exposed in
  listings. Join tickets MUST be signed and short-lived.
- Every specification MUST declare its threat model or reference the trust matrix in
  `prd/architecture.md`.
- Default values MUST be the most secure ones. Any relaxation MUST be explicit and documented.

### VI. Whole-Repository and Harness Coherence
The repository (PRDs, `docs/`, specifications, and the **harness**: `CLAUDE.md`, skills in `.claude/`,
workflows in `.github/`, and templates in `.specify/`) MUST remain mutually consistent.

- **Every plan (`plan.md`) MUST include a documentation and harness review step**, and the matching
  `tasks.md` MUST include tasks that carry it out.
- This review MUST check and, where affected, update: `CLAUDE.md`, skills, `docs/` (the Docusaurus
  site), `prd/`, CI workflows, and this constitution.
- Terms, endpoint names, versions, and examples MUST be identical across PRD, specification, docs, and
  harness. Contradictions MUST be resolved in the same change that introduces them.
- A change is only complete when the review is recorded (in the plan or in the PR).
- `docs/` is the final, polished version; `prd/` accumulates drafts. Content promoted from `prd/` to
  `docs/` MUST be written in English and MUST be public-facing (see Licensing and Contribution →
  Language and Audience). Traceability to the source PRD MUST be recorded in the promoting PR or plan,
  not on the published page.

Rationale: the harness guides agents and contributors. An outdated harness produces specifications and
code that do not fit together.

## Licensing and Contribution

- Contributions MUST be licensed under Apache 2.0 (per Section 5 of the license). The repository MAY
  adopt the DCO (`Signed-off-by`) to record authorship.
- Source files, when they exist, SHOULD carry the Apache 2.0 license header or an SPDX identifier
  (`Apache-2.0`).
- A `NOTICE` file MUST be maintained if third parties require attribution.
- **Language**: documentation published in `docs/` MUST always be in **English**. PRDs, specifications,
  and other working artifacts (`prd/`, `specs/`) MAY be written in Portuguese (pt-BR) or English.
  Translations of the documentation MAY exist, but the English version is the source of truth.
- **Audience**: `docs/` is public documentation for the people who implement or play the protocol. Its
  pages MUST NOT contain internal repository details. This includes references to `prd/`, `specs/`,
  `.specify/`, `.claude/`, `CLAUDE.md`, skills, CI workflows, drafting history, status or TODO notes,
  and local development paths or tooling. Links to public project resources (such as the `LICENSE` on
  the default branch) MAY appear. Internal material belongs in `prd/`, `specs/`, or the harness.

## Development Workflow and Quality Gates

The required workflow is **PRD (with viability) → constitution check → specify → clarify → plan →
tasks → implement**, with each feature in `specs/<feature-name>/`.

Gates:
1. **PRD gate**: the PRD exists and its viability conclusion is not "not viable".
2. **Plan gate**: `plan.md` checks compliance with this constitution and includes the documentation and
   harness review step (Principle VI).
3. **Completion gate**: the documentation (in English, public-facing) and harness are reviewed; `docs/`
   builds (`npm run build` in `docs/`) when `docs/` changes; the license and headers are compliant.

Any added complexity MUST be justified in the plan.

## Governance

This constitution takes precedence over the other practices of the project.

- **Amendments**: proposed through a PR that changes `.specify/memory/constitution.md`, with a
  justification, an impact report, and a review of repository coherence (Principle VI). Approval from
  at least one maintainer is required.
- **Versioning** (SemVer): MAJOR for removing or incompatibly redefining a principle; MINOR for a new
  principle or section, or a material expansion; PATCH for clarifications and wording fixes.
- **Compliance review**: every PR and every `plan.md` MUST verify adherence to this constitution.
  Violations MUST be corrected or justified, and the justification MUST be recorded.
- **Runtime guidance**: `CLAUDE.md`, and the documents in `prd/` and `docs/`, guide day-to-day
  development and are subordinate to this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-10-11 | **Last Amended**: 2026-10-11
