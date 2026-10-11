# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The project has no application/game-server source code yet (no `package.json`, `Makefile`, `go.mod`, etc. at the repo root) — don't invent or guess build/lint/test/run commands for the game server itself. The one exception is the `docs/` site described below, which is a real Node/Docusaurus project.

## Document workflow

The project separates draft specs from final documentation:

- `prd/` — accumulates specification drafts/requests as they come in (currently in Portuguese, each versioned via a header date like `2026.09.02-1`).
- `docs/` — a Docusaurus site (classic preset, pt-BR) holding the final, polished version of the documentation. Currently just the scaffold (`docs/docs/intro.md` placeholder) — content still needs to be ported from `prd/`.
  - Commands (run from `docs/`): `npm install`, `npm start` (dev server), `npm run build` (static build to `docs/build`).
  - No `package-lock.json` is committed yet (gitignored) — CI uses `npm install` rather than `npm ci` until one exists. If you add a lockfile, remove it from `docs/.gitignore` and switch the workflow to `npm ci`.
- `.github/workflows/docs.yml` builds the site on PRs touching `docs/**`, and builds + deploys to GitHub Pages on push to `main`. Deploy requires the repo's Pages source to be set to "GitHub Actions" in repo settings — not yet verified/enabled.

## Spec-driven workflow (spec-kit)

This repo is set up for the GitHub spec-kit workflow via `.specify/` and the `speckit-*` skills (`speckit-constitution`, `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks`, `speckit-checklist`, `speckit-analyze`, `speckit-implement`, `speckit-converge`, `speckit-taskstoissues`). The intended flow is constitution → specify → plan → tasks → implement, with each feature living under `specs/<feature-name>/`.

`.specify/memory/constitution.md` is still the unfilled template (placeholders like `[PROJECT_NAME]` have not been replaced) — it has not been ratified and shouldn't be treated as a real source of project principles until `speckit-constitution` is run to fill it in.

## Architecture (from prd/ specs)

Since there's no code yet, the architecture lives in `prd/`. The project defines the **Open Game Server Ecosystem**: a decentralized, game-engine- and language-agnostic architecture for multiplayer game rooms and match discovery.

Core components:
- **Identity Provider (IdP)** — external auth (OAuth2/OIDC/platform-specific), issues JWTs/tickets to clients.
- **Discovery/Proxy Server** ("DNS of rooms") — aggregates the catalog of active room instances, masks real room addresses during listing, issues signed join tickets, and authenticates rooms via mTLS.
- **Room instances** — decentralized, stateless, self-registering (auto-register with the Discovery server via mTLS on boot), each owning the lifecycle of its own match.
- **Game client** — resolves rooms through Discovery, then connects directly to a room instance.

Layered security model: mTLS between infrastructure (Discovery ↔ rooms), ECDH-derived session keys with AES-256-GCM/ChaCha20 between client and room, JWT/JWKS for stateless client identity validation at Discovery.

State sync schema: reactive dictionaries at `$.server` (global state), `$.me` (current player), `$.others` (other players); every root-level attribute carries `_id` (hash/version) and `ttl` so clients only reprocess an attribute when it changes or expires.

Rooms support multiple transports in parallel — HTTP, WebSockets, SSE — and expose their capabilities via a well-known discovery endpoint (`/.well-known/game-room`). A separate admin API allows trusted admins/bots to pause/end a room, kick/ban players, and inject custom events into a match.

Source documents (read these for details, not this file):
- `prd/desejo.md` — initial vision/motivation and high-level endpoint list.
- `prd/architecture.md` — end-to-end architecture with Mermaid diagrams, component and trust/security matrices.
- `prd/discovery.md` — detailed Discovery/Proxy server spec (registration, heartbeat/lease, drain mode, tag filtering, join tickets).
- `prd/room-protocol.md` — detailed room protocol spec (well-known discovery, handshake, schema negotiation, state sync).
