# Implementation Plan: Standardize Resource and Endpoint Naming

**Branch**: `001-standardize-resource-naming` (spec directory; no git branch created, repository is on `master`) | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-standardize-resource-naming/spec.md`

## Summary

The drafts in `prd/` and `docs/docs/` name the same concepts in several ways: the Discovery server is "DNS", "Proxy", and "DNS de Salas"; the same path appears as `/v1/stream` and `/v1/events`; and the same field appears as `ttl` with no unit. The spec sets one name per concept and the naming rules. This plan takes the spec's decisions that were left open for the plan:

- Value format for `_at` fields: ISO 8601 UTC (R1).
- Unit suffixes: `ttl_ms` for state, `ttl_seconds` for the join ticket (R2).
- Client-facing room identity: `masked_token` only; `room_id` is internal (R3).
- Well-known endpoint keys end in `_endpoint` (R4).
- Freeze map for the five Open Decisions (R6), with proposed positions.

The change is documentation only. It renames identifiers in four PRD drafts and in the `docs/` pages that use them, and it updates the harness and the constitution's open TODO. No code, tests, or CI change.

## Technical Context

**Language/Version**: Markdown (GitHub-flavored) for `prd/` and `specs/`; Node.js for `docs/` (Docusaurus).

**Primary Dependencies**: Docusaurus `^3.6.0` (`docs/package.json`). No new dependency.

**Storage**: N/A.

**Testing**: Text search for retired identifiers (quickstart.md checks 1 to 3); `npm run build` in `docs/` (constitution completion gate); reviewer spot-check (SC-005).

**Target Platform**: Git repository, and the published docs site via `.github/workflows/docs.yml` (GitHub Pages).

**Project Type**: Documentation: protocol drafts (`prd/`) and the public docs site (`docs/`).

**Performance Goals**: N/A. The success condition is that the docs build still passes.

**Constraints**:
- FR-017: every rename lands in the same change as the drafts that use it.
- FR-018: identifiers under an open decision are frozen.
- Constitution Principle VI: terms, paths, and examples must match across PRD, spec, docs, and harness.
- Constitution Licensing (Audience): `docs/` pages must not reference `prd/`, `specs/`, or the harness.

**Scale/Scope**: Four in-scope PRD drafts (`architecture.md`, `desejo.md`, `discovery.md`, `room-protocol.md`). Every `docs/docs/` page that names an affected identifier; the count is taken in tasks. `prd/review-20260902-1.md` is excluded because it is a historical record.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against `.specify/memory/constitution.md` (v1.0.0, ratified 2026-10-11).

| Principle | Status | Notes |
| :--- | :--- | :--- |
| I. Open Protocol and Apache 2.0 | **FAIL (pre-existing)** | No `LICENSE` at the repository root (constitution `TODO(LICENSE)`). Not caused by this feature. The completion gate requires it, so it must be fixed before this feature completes. |
| II. PRD First, with Viability | **FAIL: blocks tasks and implementation** | No PRD in `prd/` has a Viability section or a viability conclusion (`discovery.md`, `room-protocol.md`, `architecture.md`, `desejo.md`). The PRD authors must add it. This plan does not write the conclusion. |
| III. Normative, Implementation-Independent | PASS | Rules use MUST. [contracts/canonical-identifiers.md](contracts/canonical-identifiers.md) lists each identifier. Each rename is checkable (quickstart.md). |
| IV. Compatibility and Versioning | **CONDITIONAL** | The renames are breaking changes to the drafted protocol. No implementation or consumer exists, so no migration is needed. The constitution still requires a migration note and a justification in the PRD. Also, `spec_version` (`2026.09.02-1`) is date-based, not Semantic Versioning as Principle IV requires; record this in the PRD update. |
| V. Secure by Default | PASS | No change to mTLS, ECDH, JWT/JWKS, join ticket signing, or the trust matrix in `prd/architecture.md`. R3 reduces exposure: `room_id` is no longer accepted as client input. |
| VI. Whole-Repository and Harness Coherence | PASS for the plan (review step below); tasks must carry it out | Known drift: `CLAUDE.md` says "Discovery/Proxy" and "DNS of rooms", and says the constitution is unfilled. This feature closes the constitution's `TODO(prd-field-names)`. |
| Licensing: docs in English, public-facing | PASS for the plan; checked in tasks | Renames must not add `prd/` or `specs/` references to `docs/`. |
| Workflow: clarify before plan | **CONDITIONAL** | The five Open Decisions are not recorded yet. The plan freezes their identifiers (R6) and proposes positions (below). The spec checklist asks for them to be resolved before the endpoint list is final. |

**Gate result: ERROR on Principle II.** Per the constitution, the PRD gate blocks implementation. The design artifacts are complete for review, but `/speckit-tasks` and implementation should wait until the PRD viability sections exist. The constitution's Principle I gap is pre-existing and does not block the plan.

## Decisions Made in This Plan

These go beyond the spec's naming rules. Each is in [research.md](research.md). The user should confirm or redirect them (see Decisions for Confirmation).

1. **R1** `_at` values are ISO 8601 UTC strings.
2. **R2** Join ticket duration is `ttl_seconds`; state duration is `ttl_ms`.
3. **R3** Clients identify rooms by `masked_token` only. Affects the docs' resolve request and listing.
4. **R4** Well-known endpoint keys end in `_endpoint`. Overrides the spec's `discovery_register` row.
5. **R5** `room.drain` is frozen. If OD1 resolves to status, it becomes `room.status_changed`.

## Resolved Decisions

The five Open Decisions are now recorded and applied. They resolve the frozen identifiers that were previously blocked.

| # | Subject | Proposed position |
| :--- | :--- | :--- |
| 1 | Drain: operation or status | Resolved as a status change: use `room.status_changed` with `new_status: "drain"`; `/v1/discovery/drain` is retired. |
| 2 | Events path and subscription | Resolved as SSE `/v1/events` only; `/v1/events/subscribe` and `subscription_endpoint` are retired. |
| 3 | `POST /v1/handshake-verify` | Resolved as retired; the handshake validates the join ticket directly. |
| 4 | `playing` vs `in_progress` | Resolved as `in_progress` for match phase and no `playing` room status value. |
| 5 | Admin state vs room state | Resolved as shared noun with namespaced routes under `/v1/admin/` and `/v1/rooms/`. |

## Documentation and Harness Review (Principle VI)

Each item below is a task in `tasks.md` (not yet created). The review is recorded here so the change counts as complete when the tasks are done.

| Artifact | Finding | Action |
| :--- | :--- | :--- |
| `CLAUDE.md` | Names the component "Discovery/Proxy" and "DNS of rooms"; says the constitution is unfilled (stale) | Rename to Discovery. Update the constitution status line (`TODO(CLAUDE.md)`). |
| `prd/architecture.md` | "DNS" / "Discovery/Proxy" in prose (about 13 hits) | Rename to Discovery; apply the mapping. |
| `prd/discovery.md` | Largest drift: `/v1/dns/*`, `game-dns`, `X-DNS-Signature`, `timestamp`, `ttl`, status casing, resolve body | Apply the mapping in full. Add the Viability section (Principle II, author task). |
| `prd/room-protocol.md` | `ttl`, `pos`/`anim`/`id`, `IN_PROGRESS`, `/v1/stream` references | Apply the mapping. |
| `prd/desejo.md` | Endpoints without `/v1/`; `/v1/dns/*`; `/v1/stream` | Apply the mapping; add `/v1/` prefix. |
| `prd/review-20260902-1.md` | Historical record | Not rewritten (spec Assumptions). |
| `docs/docs/` | Retired names across about 14 pages | Apply the mapping, including the R7 additions. Build with `npm run build`. |
| `.claude/skills/` (`docs-servir-local`, speckit skills) | No retired names found | No change. Recorded. |
| `.github/workflows/docs.yml` | No retired names | No change. Recorded. |
| `.specify/templates/` | No retired names | No change. Recorded. |
| `.specify/memory/constitution.md` | `TODO(prd-field-names)` is closed by this feature | Remove the TODO when the renames land. `TODO(LICENSE)` and `TODO(CLAUDE.md)` stay open. |

## Project Structure

### Documentation (this feature)

```text
specs/001-standardize-resource-naming/
├── spec.md                          # Feature specification
├── plan.md                          # This file
├── research.md                      # Phase 0: decisions R1 to R7
├── data-model.md                    # Phase 1: field dictionary per entity
├── quickstart.md                    # Phase 1: validation checks
├── contracts/
│   └── canonical-identifiers.md     # Phase 1: canonical names and status
├── checklists/
│   └── requirements.md              # Spec quality checklist
└── tasks.md                         # NOT created by /speckit-plan (next step: /speckit-tasks)
```

### Affected Files (documentation only)

```text
prd/
├── architecture.md                  # Rename "DNS" in prose; apply mapping
├── desejo.md                        # /v1/ prefix; apply mapping
├── discovery.md                     # Full mapping; Viability section (author)
├── room-protocol.md                 # ttl_ms, position/animation/player_id, in_progress, /v1/ws|events|state
└── review-20260902-1.md             # NOT changed (historical record)

docs/docs/                           # Pages listed in research.md R7 and the review table above

CLAUDE.md                            # Component name; constitution status line
.specify/memory/constitution.md      # Close TODO(prd-field-names)
```

No code, tests, or CI files change.

**Structure Decision**: Documentation-only change. The canonical identifiers are recorded once in `contracts/canonical-identifiers.md` and the data dictionary in `data-model.md`. Each draft and docs page is updated to match them. There is no source tree to add.

## Decisions for Confirmation

The user should confirm these before `/speckit-tasks`:

1. `masked_token` is the only room identifier clients send (R3). This changes the docs' resolve request.
2. Well-known endpoint keys end in `_endpoint` (R4). This overrides the spec's `discovery_register` row.
3. Join ticket duration is `ttl_seconds`, not `ttl` (R2).
4. ISO 8601 UTC strings for `_at` fields (R1). This replaces the PRD's integer timestamps.
5. The five proposed Open Decision positions (above).

## Complexity Tracking

None. The plan adds no structure beyond the spec's artifacts.
