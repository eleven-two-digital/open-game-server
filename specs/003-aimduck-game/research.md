# Research: Browser-playable Aimduck sample

## Browser client and game rendering

- **Decision**: Use Vite, React, and TypeScript for the web application shell; use Phaser for the 2D playfield. Keep room browsing, OIDC flow, lobby, player seats, status, dialogs, and accessible controls in the DOM. Mount Phaser for movement, thrown rocks, collision effects, and playfield rendering.
- **Rationale**: Phaser is designed for browser 2D games and can coexist with a React application. This leaves the stateful navigation and form controls accessible and inspectable while using a game-focused renderer for the playfield. TypeScript provides a shared language for client and Node services.
- **Alternatives considered**: PixiJS is a lighter renderer but would require more game-loop and physics behavior to be built. A fully client-side simulation is rejected because it cannot establish the room as authority for hit and score outcomes.
- **Evidence**: [Phaser overview](https://docs.phaser.io/phaser/getting-started/what-is-phaser); repository [Aimduck game/connectivity guide](../../docs/docs/implementation/aimduck.md).

## OGS entities and design-system structure

- **Decision**: Group UI modules around the OGS-facing identity, Discovery listing, room resolution, join ticket, room connection, and room instance concepts; group gameplay modules around GameRoom, LobbySeat, PlayerSession, MatchRound, and Scoreboard. Reuse shared visual tokens and accessible primitives, and visibly distinguish room operational status from Aimduck lobby/match phase.
- **Rationale**: This directly satisfies the educational purpose and preserves the distinction between OGS operational state and game-specific state stated in the existing guide.
- **Alternatives considered**: Organize components only by page/screen. Rejected because the user explicitly asked for design-system clarity in terms of OGS entities.
- **Evidence**: [Aimduck guide](../../docs/docs/implementation/aimduck.md); [ecosystem components](../../docs/docs/architecture/components.md); [state schema](../../docs/docs/room-protocol/schema-state.md).

## Authoritative multiplayer rooms

- **Decision**: Implement a small Node.js/TypeScript room process with a fixed-tick authoritative simulation and a bidirectional WebSocket for play. Clients submit player-scoped movement and throw inputs; the room validates their shape, bounds, cadence, and ownership, simulates collisions, and publishes shared state and round results.
- **Rationale**: The room must own match simulation and synchronized state; client-reported hits or scores would make a sample easy to cheat and inconsistent with the OGS component model.
- **Alternatives considered**: Colyseus has useful room/state primitives but its own matchmaking and seat-reservation model overlaps OGS Discovery. It remains an option only if it stays behind the OGS list/resolve/ticket/admission flow; the initial sample should avoid this extra abstraction.
- **Evidence**: [OGS ecosystem components](../../docs/docs/architecture/components.md); [Colyseus room model](https://docs.colyseus.io/room/); [Colyseus server](https://docs.colyseus.io/server/).

## Discovery and browser-reachable Compose networking

- **Decision**: Declare at least two named room services from one image. Each service uses the same container port and a unique host-published port. The room calls Discovery through its Compose service DNS name, but registers the host-reachable `localhost` address and mapped port for browser clients.
- **Rationale**: Compose service names work for container-to-container traffic, not for a browser on the host. Fixed, named room services make host ports deterministic and avoid a dynamic room controller.
- **Alternatives considered**: Scaling one service to arbitrary replicas with an identical host-port mapping. Rejected because concurrent replicas cannot claim the same fixed host port. A controller with Docker socket access is also rejected as unnecessary privilege.
- **Evidence**: [Compose networking](https://docs.docker.com/compose/how-tos/networking/); [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/); [Compose `up --scale`](https://docs.docker.com/reference/cli/docker/compose/up/).

## Local identity provider and OAuth flow

- **Decision**: Include a local-only Keycloak realm with seeded demo users and use OIDC Authorization Code flow with PKCE in the browser. Configure Discovery to validate JWT signatures and issuer/audience/expiry using JWKS. Keep browser issuer URL and container-internal JWKS retrieval separately configurable if their hostnames differ.
- **Rationale**: The OGS flow requires a player token and stateless JWT/JWKS validation. A local IdP makes the demo repeatable without embedding an insecure fake token issuer in the game client.
- **Alternatives considered**: A hardcoded local JWT accepted by the client/Discovery. Rejected because it teaches an authentication bypass and does not exercise JWKS. A remote public IdP is rejected for a self-contained local demo.
- **Evidence**: [Keycloak JavaScript adapter](https://www.keycloak.org/securing-apps/javascript-adapter); [OAuth 2.0 Security Best Current Practice (RFC 9700)](https://www.rfc-editor.org/rfc/rfc9700.html); [Keycloak Docker getting started](https://www.keycloak.org/getting-started/getting-started-docker); [Keycloak production configuration](https://www.keycloak.org/server/configuration-production).

## Security and protocol boundary

- **Decision**: Use JWT/JWKS between player identity and Discovery; mTLS for room registration/heartbeat; a short-lived room/player-bound ticket for admission; WSS plus ECDH-derived AEAD for browser-room session security. Generate local CA, room/Discovery certs, and room-scoped ticket secrets only for development and never commit them. Validate WebSocket Origin and all gameplay input server-side.
- **Rationale**: These trust zones are independently required by OGS. A browser must not present the room's infrastructure mTLS certificate. A local sample must not turn local credentials or development transport into production recommendations.
- **Alternatives considered**: One fleet-wide HMAC secret, plain WebSocket for all environments, or trusting client hit/score claims. Rejected because each increases credential blast radius, weakens traffic protection, or makes game outcomes client-controlled.
- **Evidence**: [OGS security model](../../docs/docs/architecture/security.md); [room registration](../../docs/docs/discovery/room-registration.md); [ticket resolution](../../docs/docs/discovery/ticket-resolution.md); [ECDH handshake summary](../../docs/docs/room-protocol/handshake-ecdh.md).

## Known protocol/documentation gaps

- **Decision**: Use the endpoint paths and names recorded in [canonical-identifiers.md](../001-standardize-resource-naming/contracts/canonical-identifiers.md), especially `GET /v1/rooms`, `POST /v1/rooms/resolve`, `masked_token`, `room_id`, `join_ticket`, and `Authorization: Bearer`. Align directly affected public examples when implementing. Record the exact sample contract in `contracts/`; do not silently generalize it to the OGS protocol.
- **Rationale**: Existing pages differ in some field descriptions and the dedicated handshake page has only a summary. The canonical identifier feature is the source of truth for naming; wire-level gaps need explicit profile documentation and, if needed, a separate protocol decision.
- **Alternatives considered**: Copy whichever page is nearest and preserve contradictions. Rejected because it would make independent client and server implementations incompatible.
- **Evidence**: [canonical identifiers](../001-standardize-resource-naming/contracts/canonical-identifiers.md); [room listing](../../docs/docs/discovery/room-listing.md); [ticket resolution](../../docs/docs/discovery/ticket-resolution.md); [room registration](../../docs/docs/discovery/room-registration.md).
