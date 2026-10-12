# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The repository does not yet contain a production Open Game Server implementation. The Docusaurus
site in `docs/` remains the primary project artifact; `samples/aimduck/` is a runnable, educational
browser game and local OGS integration example, not production server code.

## Document workflow

The project separates draft specs from final documentation:

- `prd/` — accumulates specification drafts/requests as they come in (currently in Portuguese, each versioned via a header date like `2026.09.02-1`).
- `docs/` — a Docusaurus site (classic preset, English locale) holding the final, polished version of the documentation. The content is written in English (not a literal translation of the drafts in `prd/`); the pages are a skeleton, and content still needs to be ported from `prd/`.
  - Commands (run from `docs/`): `npm install`, `npm start` (dev server), `npm run build` (static build to `docs/build`).
  - No `package-lock.json` is committed yet (gitignored) — CI uses `npm install` rather than `npm ci` until one exists. If you add a lockfile, remove it from `docs/.gitignore` and switch the workflow to `npm ci`.
- `.github/workflows/docs.yml` builds the site on PRs touching `docs/**`, and builds + deploys to GitHub Pages on push to `main`. Deploy requires the repo's Pages source to be set to "GitHub Actions" in repo settings — not yet verified/enabled.
- `samples/aimduck/` — a local-only TypeScript/React/Phaser multiplayer game sample with Keycloak,
  Discovery, two authoritative room instances, and Docker Compose. See its README and feature
  quickstart before running it; seeded credentials, generated certificates, and ticket secrets are
  development-only. The sample has its own lint, typecheck, test, build, and browser acceptance
  workflow in `.github/workflows/aimduck.yml`.

## Spec-driven workflow (spec-kit)

This repo is set up for the GitHub spec-kit workflow via `.specify/` and the `speckit-*` skills (`speckit-constitution`, `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-checklist`, `speckit-analyze`, `speckit-implement`, `speckit-converge`, `speckit-taskstoissues`). The intended flow is constitution → specify → plan → tasks → implement, with each feature living under `specs/<feature-name>/`.

`.specify/memory/constitution.md` is the ratified repository constitution (v1.0.0) and is the source of project governance.

## Architecture (from prd/ specs)

The production architecture lives in `prd/`; `samples/aimduck/` is an educational implementation
of a bounded subset. The project defines the **Open Game Server Ecosystem**: a decentralized,
game-engine- and language-agnostic architecture for multiplayer game rooms and match discovery.

Core components:
- **Identity Provider (IdP)** — external auth (OAuth2/OIDC/platform-specific), issues JWTs/tickets to clients.
- **Discovery server** — aggregates the catalog of active room instances, masks real room addresses during listing, issues signed join tickets, and authenticates rooms via mTLS.
- **Room instances** — decentralized, stateless, self-registering (auto-register with the Discovery server via mTLS on boot), each owning the lifecycle of its own match.
- **Game client** — resolves rooms through Discovery, then connects directly to a room instance.

Layered security model: mTLS between infrastructure (Discovery ↔ rooms), ECDH-derived session keys with AES-256-GCM/ChaCha20 between client and room, JWT/JWKS for stateless client identity validation at Discovery.

State sync schema: reactive dictionaries at `$.server` (global state), `$.me` (current player), `$.others` (other players); every root-level attribute carries `_id` (hash/version) and `ttl_ms` so clients only reprocess an attribute when it changes or expires.

Do not conflate that OGS state-sync model with Aimduck's local version-1 WebSocket `RoomSnapshot`
(`server`, `game`, `me`, `others`, and `arena`). The sample projection is recipient-specific and
non-normative; it does not replace OGS attribute versioning or expiry semantics.

Rooms support multiple transports in parallel — HTTP, WebSockets, SSE — and expose their capabilities via a well-known discovery endpoint (`/.well-known/game-room`). A separate admin API allows trusted admins/bots to pause/end a room, kick/ban players, and inject custom events into a match.

Source documents (read these for details, not this file):
- `prd/desejo.md` — initial vision/motivation and high-level endpoint list.
- `prd/architecture.md` — end-to-end architecture with Mermaid diagrams, component and trust/security matrices.
- `prd/discovery.md` — detailed Discovery server spec (registration, heartbeat/lease, drain mode, tag filtering, join tickets).
- `prd/room-protocol.md` — detailed room protocol spec (well-known discovery, handshake, schema negotiation, state sync).
