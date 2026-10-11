# Quickstart: Validate the Naming Standard

**Feature**: `001-standardize-resource-naming` | **Date**: 2026-10-11

Run these checks after the renames land (tasks phase). Run from the repository root. Each check says what a passing result looks like.

## Prerequisites

- The four PRD drafts and the `docs/docs/` pages have been updated per [contracts/canonical-identifiers.md](contracts/canonical-identifiers.md).
- Open Decisions are recorded (or their identifiers are still frozen, which the checks allow).

## 1. Retired identifiers are gone (SC-001)

```bash
grep -rn -E "/v1/dns|game-dns|dns_register|X-DNS-Signature|masked_room_token|room_token|masked_id|/v1/stream|IN_PROGRESS|\bACTIVE\b|\bDRAIN\b|\"timestamp\"|\"ttl\"" \
  prd/architecture.md prd/desejo.md prd/discovery.md prd/room-protocol.md docs/docs
```

**Passing**: no matches, except the frozen identifiers (`/v1/dns/drain`, `DRAIN`, `PLAYING`) while their Open Decisions remain unresolved. Any other match is a failure.

`prd/review-20260902-1.md` is excluded on purpose: it is a historical record.

## 2. The component is named Discovery in prose (FR-009)

```bash
grep -rn -w -E "DNS|Proxy" prd/architecture.md prd/desejo.md prd/discovery.md prd/room-protocol.md docs/docs
```

**Passing**: no matches that name the component. Review any hit by hand; a generic use of the word for something other than the component is allowed.

## 3. Harness names match (Principle VI)

```bash
grep -n -E "Discovery/Proxy|DNS of rooms" CLAUDE.md
```

**Passing**: no matches. `CLAUDE.md` describes the component as Discovery.

## 4. Docs build (constitution completion gate)

```bash
cd docs && npm install && npm run build
```

**Passing**: the build succeeds. This is the only build the repository has; the game server has none (CLAUDE.md).

## 5. Reviewer spot-check (SC-005)

Pick 10 identifiers at random from the drafts. For each one, apply the rules in [spec.md](spec.md) (FR-001 to FR-018) and compare with the author's name.

**Passing**: at least 9 of 10 agree on the canonical form. Any disagreement is recorded with the rule that decides it.

## 6. Open Decision freeze (SC-004)

Compare the list of renamed identifiers against [contracts/canonical-identifiers.md](contracts/canonical-identifiers.md). Every frozen row must still carry its current name.

**Passing**: no frozen identifier appears in a renamed form.
