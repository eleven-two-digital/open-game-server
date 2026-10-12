# Quickstart: Aimduck local demo

This guide validates the browser game, OGS discovery/admission flow, and multiple room instances locally. The demo configuration is not suitable for production.

## Prerequisites

- Docker Engine with Docker Compose v2.
- Node.js 22 LTS with npm, for the one-time development setup and workspace test commands.
- A current desktop browser.
- Playwright Chromium, if running browser acceptance tests (`npx playwright install chromium`).
- The generated local development CA must be trusted by the browser/operating system to use WSS without bypassing certificate validation.

## Start the demo

1. From `samples/aimduck/`, install the locked dependencies and generate ignored development certificates and per-room secrets:

   ```sh
   npm ci
   npm run dev:setup
   ```

2. Trust the generated development CA in the local browser/OS trust store.
3. Start the complete environment:

   ```sh
   docker compose up --build --wait
   ```

4. Open `http://localhost:5173` and authenticate as one of the eight distinct seeded local demo identities listed in the sample README. Use a different identity in each browser profile.
5. Select a room. Confirm the room list shows capacity and operational state without host/port. Resolve and join it; the client then connects directly over WSS to the host-published port.
6. Open additional browser profiles and join the same room with the remaining distinct demo identities until eight seats are occupied. Mark each player ready.
7. Use WASD or arrow keys to move Ducks from the left start zone to the right safe zone. As Shooter, aim with the pointer and click or press Space to throw; keyboard focus on the arena allows arrow-key aiming. Play through all eight rounds and compare roles, outcomes, and scoreboards across clients.

## Expected results

- Compose reports the client, IdP, Discovery, and at least two room services healthy.
- Both rooms self-register with Discovery over mTLS and appear in the authenticated masked listing.
- Room cards do not expose service names or host ports; resolution returns `localhost` plus the selected room's distinct host port and a short-lived join ticket.
- One room reaches eight participants, waits until all are ready, and then runs a complete authoritative match.
- The Shooter role rotates across all eight players; each hit awards 3 points and each successful crossing awards 1 point.
- Each round starts with a visible role/control countdown, lasts at most 35 seconds, and gives a 4-second result/intermission before the next round.
- Every connected client sees the same round and score state; the final result reports the top score or a tie.
- An invalid/expired ticket or invalid gameplay input is rejected with an actionable error and without changing match scores.

## Focused validation

- Review the external request and gameplay contract in [contracts/ogs-integration.md](./contracts/ogs-integration.md) and [contracts/room-gameplay-websocket.md](./contracts/room-gameplay-websocket.md).
- Check the fixed service/port and security assumptions in [contracts/local-compose.md](./contracts/local-compose.md).
- Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, and `npm run test:compose` from `samples/aimduck/`.
- With the full stack running, run `AIMDUCK_COMPOSE_E2E=1 npm run test:e2e -- --workers=1`. The browser suite completes an eight-player, eight-round match and typically takes about two minutes on a healthy local stack.
- Run `AIMDUCK_COMPOSE_RESTART=1 npm run test:integration -- tests/integration/compose-room-restart.test.ts` to check room restart and continued availability.
- Run `AIMDUCK_SECURITY_IMAGE_SCAN=1 npm run test:integration -- tests/integration/security-artifacts.test.ts` to inspect generated-artifact exclusions in the built images.
- Confirm hit, crossing, point, and role-transition feedback is available both visually and in the text event log; repeat a short keyboard-only and reduced-motion session.
- Verify that all eight clients agree on role assignments, each result, and final scoreboard.
- Verify unauthorized/expired admission, full-room resolution, room restart/lease expiry, rejected forged score input, and WebSocket Origin rejection.
- Run `docker compose config` and the sample health smoke check.
- If public docs are updated, run `npm run build` from `docs/`.

The automated Compose browser fixtures accept the local development certificates so they can run without modifying the host trust store. That is not evidence that a clean browser trusts the CA; complete the explicit CA-trust step above for manual play.

## Shut down

```sh
docker compose down
```

The local registry and game state are in memory. Demo credentials, certificates, and ticket keys are development-only and must never be reused outside this local sample.
