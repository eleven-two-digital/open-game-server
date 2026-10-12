# Aimduck: browser-playable OGS sample

Aimduck is a playable 1v7 browser game and a reference implementation of the Open Game Server
(OGS) integration lifecycle. One player is the Shooter; seven players are Ducks. Ducks try to cross
the arena while the Shooter throws rocks. Shooter roles rotate across eight rounds.

This is a local learning sample, not a production deployment template. Its authentication realm,
demo credentials, certificates, room secrets, fixed room count, and in-memory state are deliberately
for development only.

## Learning goals

Follow one player from browser authentication to an authoritative room:

1. The browser authenticates with the local Keycloak realm using OIDC Authorization Code + PKCE.
2. Discovery validates the signed player identity, while the browser sees masked room listings.
3. Discovery resolves a selected listing and issues a short-lived ticket bound to that player and
   room.
4. The browser connects directly to the resolved room. The room validates the identity and ticket,
   performs the ECDH handshake, then accepts single-use session admission over WSS.
5. The room owns lobby seats, match phases, simulation, outcomes, and scores. The client sends
   bounded intent; it cannot authoritatively report hits, crossings, roles, or scores.

The sample classifies its contracts by ownership:

| OGS | Admission/transport | Aimduck game domain |
| --- | --- | --- |
| `PlayerIdentity`, `DiscoveryListing`, `RoomResolution`, `RoomInstance` | `RoomConnection`, server-only `RoomSocketSession` | `GameRoom`, `LobbySeat`, `PlayerSession`, `MatchRound`, `Scoreboard`, `ArenaSnapshot` |

`RoomInstance` operational state (active or draining) is separate from the Aimduck match phase.
`RoomSnapshot` is a local, recipient-specific projection, not an OGS entity or protocol
requirement: `server` carries a room reference and non-secret telemetry, `game` carries aggregate
match state, `me` carries the recipient's `PlayerSession`, `others` excludes that recipient, and
`arena` carries visual simulation state. The individual participant sessions are not duplicated in
`game`, and snapshots do not carry admission credentials or cryptographic material.

The executable sample profile is documented in
[`specs/003-aimduck-game/contracts/`](../../specs/003-aimduck-game/contracts/). It illustrates the
current integration; it does not amend or claim general conformance to OGS protocol specifications.

## Source tour

- `client/`: React application, OIDC client, Discovery/admission flows, accessible interface, and
  Phaser arena.
- `client/src/components/design-system/`: shared primitives and explicit OGS/Aimduck entity
  components.
- `packages/shared/`: runtime configuration and message schemas, identity verification, tickets,
  logging, test seams, and ECDH/HKDF/AES-GCM session framing.
- `services/discovery/`: authenticated masked listings, room resolution, ticket issuance, room
  registration, leases, and health endpoints.
- `services/room/`: mTLS self-registration, HTTPS admission, WSS transport, lobby/match state, and
  authoritative simulation.
- `infra/` and `docker-compose.yml`: local Keycloak realm, generated development material, and the
  client, Discovery, IdP, and two independently registered room services.
- `tests/`: domain/unit tests, service integration tests, and browser acceptance tests.

## Start the local game

Requirements: Docker Engine with Compose v2, Node.js 22 or newer, npm, and a current desktop browser.
From this directory:

```sh
npm install
npm run dev:setup
```

Trust `infra/dev-certs/ca.crt` in the browser/OS trust store, then start the stack:

```sh
docker compose up --build --wait
```

Open [http://localhost:5173](http://localhost:5173). The browser uses the local Keycloak provider at
`http://localhost:8180`, Discovery at `https://localhost:8080`, and rooms published on loopback
ports `9101` and `9102`. The Compose services publish their ports only on loopback.

The imported realm contains eight separate demo identities:

| Username | Password |
| --- | --- |
| `duck01` | `duck01-local` |
| `duck02` | `duck02-local` |
| `duck03` | `duck03-local` |
| `duck04` | `duck04-local` |
| `duck05` | `duck05-local` |
| `duck06` | `duck06-local` |
| `duck07` | `duck07-local` |
| `duck08` | `duck08-local` |

Use a separate browser profile for each participant to fill one room. Each player marks their seat
ready. Ducks move with WASD or the arrow keys. The Shooter aims with the pointer or arrow keys and
throws with a click or Space. The Shooter earns three points per hit; each Duck earns one point for
crossing. A round lasts up to 35 seconds, followed by a four-second result/intermission. The match
ends after all eight players have served as Shooter; every player tied for the top score wins.

## Repeatability and playtest evidence

The Compose browser suite completed a full eight-round match with eight independent browser
sessions. The test verified one Shooter assignment per player, seven resolved Duck outcomes per
round, matching outcomes and scoreboards across clients, and matching final tie/result text. Three
additional deterministic eight-client room sessions completed all eight rounds each: all seven
Ducks crossed in every round, every player earned seven points, the eight players tied, all clients
remained connected, and each client received the same authoritative completion snapshot. Evidence
is in [`accessibility.spec.ts`](./tests/e2e/accessibility.spec.ts) and
[`gameplay-room.test.ts`](./tests/integration/gameplay-room.test.ts).

| Playtest dimension | Automated evidence | Limitation |
| --- | --- | --- |
| Control comprehension | All eight browser players completed crossings using the documented ArrowRight control. | This verifies the action path, not whether an unmoderated human understands the instructions. No participant study was run. |
| Hit clarity | Shooter throws and event-log feedback are exercised by [`gameplay-controls.spec.ts`](./tests/e2e/gameplay-controls.spec.ts); scoring for hits is covered by unit tests. | The complete-match browser and three deterministic sessions used crossings only; they produced no hit events and provide no human clarity ratings. |
| Dead time | The current rules use a 3-second role countdown and 4-second results/intermission, with a 35-second round deadline. | These configured timings were not compared in a moderated usability study and were not empirically retuned. |
| Disconnects | No client disconnected during the three deterministic full-match sessions. Lobby reconnection and stale-socket cases are covered separately by integration tests. | This is not a network fault-injection or reliability study. |

The match used the defaults in `services/room/src/game/tuning.ts` (30 Hz simulation, 15 Hz
snapshots, 210 world units/second Duck movement, 35-second round deadline, 3-second role countdown,
and 4-second results/intermission). These values are documented defaults, not claims of optimal
competitive balance. Human comprehension, hit readability, and perceived downtime remain open
usability questions.

Stop the local services with `docker compose down`. The Discovery catalog, lobby, and match are
in-memory and are lost when their service containers restart.

## Security boundaries and sample limitations

- The browser has no infrastructure certificate or room ticket-signing secret.
- Room registration and heartbeats use mTLS; the room's browser-facing handshake uses a strict
  configured CORS allowlist, and WSS separately checks the browser Origin.
- Tickets are short-lived and bound to one player and room. Gameplay frames use keys derived from
  the authenticated handshake; they are not bearer tokens.
- Local secrets and generated certificates live under ignored `infra/` paths. Do not expose this
  Compose stack publicly or reuse its credentials, keys, or certificates.
- The realm includes a signed stable `player_id` claim for the seeded local identities; Discovery
  still validates the token signature, issuer, and audience before accepting that identity.
- The room count and host ports are fixed in Compose. This sample does not implement durable
  profiles, match persistence, autoscaling, production secret management, or deployment.
- The contracts define an explicit Aimduck sample profile. They must not be interpreted as a
  general OGS protocol amendment or promise interoperability with every OGS implementation.

## Dependency license inventory

The locked npm dependency metadata contains 370 package entries with declared licenses: 312 MIT,
21 Apache-2.0, 16 ISC, 9 BSD-3-Clause, and 8 BSD-2-Clause entries. Four entries use other
identifiers:

- `@csstools/color-helpers`: MIT-0
- `minimatch` (nested under `@typescript-eslint/typescript-estree`): BlueOak-1.0.0
- `argparse`: Python-2.0
- `caniuse-lite`: CC-BY-4.0

The locked set contains 366 entries under MIT, Apache-2.0, ISC, BSD-2-Clause, or BSD-3-Clause,
plus one MIT-0, one BlueOak-1.0.0, one Python-2.0, and one CC-BY-4.0 entry. Review of the lockfile
metadata and the installed upstream license texts found no copyleft or field-of-use restriction.
MIT-0, BlueOak-1.0.0, and Python-2.0 are permissive; retain their upstream license notices. The
CC-BY-4.0 entry is `caniuse-lite` browser-support data and carries an attribution condition if that
data is redistributed. Keep it identified as third-party data rather than treating it as project
source licensed under Apache-2.0; include the required attribution and license reference if a
release bundles or redistributes that data.

This is a technical review of the locked dependency set, not legal advice or blanket legal
approval. Recheck dependency license metadata on lockfile changes and preserve applicable upstream
notices in redistributed artifacts.

## Validate

From this directory:

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:compose
npm run build
```

The Compose browser acceptance test requires the full stack and Playwright Chromium. Run it with
`AIMDUCK_COMPOSE_E2E=1 npm run test:e2e -- --workers=1`; it completes an eight-player match and
typically takes about two minutes. The automated fixture accepts the local development
certificates, so this does not verify host/browser CA trust. Manual play requires trusting
`infra/dev-certs/ca.crt`. See the
[feature quickstart](../../specs/003-aimduck-game/quickstart.md) and the public
[Aimduck implementation guide](../../docs/docs/implementation/aimduck.md).
