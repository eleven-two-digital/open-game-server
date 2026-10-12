---
sidebar_position: 3
---

# Aimduck: Lobby and Connectivity Example

Aimduck is a sample 1v7 game for illustrating how a multiplayer game can use the Open Game Server
ecosystem. One player is the **Shooter** and seven are **Ducks**. Ducks try to cross the map while the
Shooter throws physics-based rocks to stop them.

> **Example policy, not an OGS requirement:** The lobby readiness rules, match roles, scoring, and
> reconnect window on this page belong to this Aimduck example. OGS defines room discovery and
> admission; each game defines its own lobby and match rules.

## Lobby and Match

An Aimduck room has eight player seats. In this example, players join the lobby, see who is present,
and mark themselves ready. The match starts when all eight seats are occupied and every player is
ready. These are illustrative game rules, not requirements imposed by OGS rooms.

The match has eight rounds. Each round assigns one player as the Shooter and the other seven as Ducks;
the Shooter role rotates among the participants over the match. The Shooter earns three points for
each Duck hit, and each Duck earns one point for reaching the other side of the map. The player with
the highest accumulated score after the eighth round wins.

Lobby readiness and match progress are game state. They are distinct from the room's operational
state in Discovery, such as whether the room is active or draining; fullness is reported separately
as listing capacity and occupancy. The runnable Aimduck sample uses a local, version-1
`RoomSnapshot` projection with `server`, `game`, `me`, `others`, and `arena` groups. This projection
is not an OGS entity or a normative OGS state schema. For OGS state concepts, see
[State Schema](../room-protocol/schema-state).

## Client Connection Journey

The client joins an Aimduck lobby through the existing OGS room discovery and admission flow:

1. **Authenticate** with the game's identity provider and obtain the credentials required by the
   game's Discovery service.
2. **Discover** available rooms. Discovery returns a listing with room addresses masked, so the
   client can compare available game sessions without connecting directly to an unverified address.
3. **Resolve** the selected room through Discovery. If it is still available, the response includes
   connection details and a signed join ticket bound to the player and room.
4. **Connect directly** to the resolved room using a transport that the room advertises. The client
   presents its admission credentials; the room validates them and completes the secure session
   handshake before admitting the player.
5. **Enter the Aimduck lobby** after room admission. The client then observes lobby and match state
   using the room's supported state and transport capabilities.

For normative details, see [Discovery Overview](../discovery/overview),
[Room Listing](../discovery/room-listing), [Ticket Resolution](../discovery/ticket-resolution),
[ECDH Handshake](../room-protocol/handshake-ecdh), and
[Transports](../room-protocol/transports). The room's
[well-known document](../room-protocol/well-known) describes the capabilities and transports it
supports. This example does not require one particular transport: a room may offer WebSocket, SSE,
HTTP, or a combination, and the client follows the room's advertised capabilities.

## When Entry or Connectivity Fails

- **The selected room is full or no longer available:** refresh the room listing and choose an
  available room. A listing is a snapshot; availability can change before resolution or admission.
- **The join ticket is invalid or expired:** the room rejects admission. Resolve the room again to
  obtain a new valid ticket before retrying.
- **A player disconnects in the lobby:** as an illustrative Aimduck policy, the lobby may reserve
  that player's seat for up to 30 seconds. The returning player must authenticate as the same player
  and obtain a fresh valid join ticket. The seat may be released after the reservation expires.
- **A player disconnects during a match:** recovery is game-specific. This example does not promise
  that OGS restores a match connection or player state automatically.

## Learn More

- [Client Examples](./client-examples)
- [Room Examples](./room-examples)
- [Getting Started](./getting-started)

## Runnable Browser Sample

The repository includes a browser-playable implementation under
[`samples/aimduck`](https://github.com/eleven-two-digital/open-game-server/tree/main/samples/aimduck).
It is an educational local demo rather than a production deployment template.

### Start the complete local stack

Requirements: Docker Engine with Compose v2, Node.js 22 or newer, npm, and a current browser.
From the repository root:

```sh
cd samples/aimduck
npm install
npm run dev:setup
```

Trust the generated development CA at `samples/aimduck/infra/dev-certs/ca.crt` in the browser/OS
trust store so the browser accepts HTTPS Discovery and WSS room connections. Then start the entire
demo:

```sh
docker compose up --build --wait
```

Open [http://localhost:5173](http://localhost:5173). The local services are:

| Service | Local address |
| --- | --- |
| Browser client | `http://localhost:5173` |
| Keycloak identity provider | `http://localhost:8180` |
| Discovery | `https://localhost:8080` |
| Room 1 | `wss://localhost:9101` after resolution |
| Room 2 | `wss://localhost:9102` after resolution |

Room listings show a masked identifier and operational state, never the address. The browser resolves
the selected listing through authenticated Discovery, then uses the short-lived player-bound ticket
for a direct encrypted room connection.

### Demo users and controls

The imported Keycloak realm contains eight distinct identities. Passwords are intentionally local,
predictable demo credentials; never reuse them:

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

Use separate browser profiles to sign in as eight players and join the same room. Everyone marks
their own lobby seat ready. Ducks move with WASD or arrow keys toward the green safe zone on the
right. The Shooter aims with the pointer or arrow keys and throws with a click or Space. The match
contains eight rounds; the Shooter rotates by seat, each active round lasts up to 35 seconds, and
results remain visible for four seconds between rounds. The Shooter earns three points per hit; each
Duck earns one point for crossing. All players tied at the top win.

### Entity ownership and source tour

The sample distinguishes three owners rather than treating every connection-related type as an OGS
entity:

| OGS contracts | Admission/transport | Aimduck game domain |
| --- | --- | --- |
| `PlayerIdentity`, `DiscoveryListing`, `RoomResolution`, `RoomInstance` | `RoomConnection`, server-only `RoomSocketSession` | `GameRoom`, `LobbySeat`, `PlayerSession`, `MatchRound`, `Scoreboard`, `ArenaSnapshot` |

`RoomSnapshot` is a recipient-specific sample projection, not a persisted entity or an OGS
requirement. `server.roomId` references the `RoomInstance`; `game.phase` is only the Aimduck match
phase. `game` contains aggregate game state without individual sessions, `me` contains the
recipient's session, `others` excludes that recipient, and `arena` contains simulation projections.
Admission credentials and cryptographic material are not included.

- `PlayerIdentity` is authenticated by Keycloak and validated by Discovery and each room.
- `DiscoveryListing` is masked; `RoomResolution` reveals the browser-reachable address only after
  resolve and carries the bounded join ticket.
- `RoomInstance` registers and renews its lease with Discovery over mTLS; its Discovery operational
  state is separate from `GameRoom` phase and match state.
- `RoomConnection` is the admission/transport context; it completes ticket validation and
  ECDH-derived AES-GCM framing before game messages are accepted.
- `GameRoom`, `LobbySeat`, `PlayerSession`, `MatchRound`, and `Scoreboard` are room-authoritative
  entities. Clients send readiness and bounded input only; they cannot submit hits, crossings,
  roles, or score changes.
- `client/src/components/design-system/` maps shared interface primitives to OGS and Aimduck
  entities; `services/room/src/game/` and `services/room/src/simulation/` own game rules.

### Local-only security boundaries and validation

The local CA, certificates, room ticket secrets, Keycloak admin credentials, and demo users are for
development only. Secrets are generated under ignored `infra/` paths. Do not expose these services
to a public network or reuse local credentials/certificates in production. Compose binds published
ports to loopback and does not mount the Docker socket. Two room services are statically declared in
Compose; this sample does not implement production autoscaling or a remote container orchestrator.
The browser-facing HTTPS handshake enforces a configured CORS origin allowlist, and WSS separately
validates the browser `Origin` against that allowlist.

From `samples/aimduck/`, run `npm run lint`, `npm run typecheck`, `npm test`,
`npm run test:e2e`, `npm run test:compose`, and `npm run build`. For service and protocol details, see the [sample README](https://github.com/eleven-two-digital/open-game-server/blob/main/samples/aimduck/README.md)
and the [feature quickstart](https://github.com/eleven-two-digital/open-game-server/blob/main/specs/003-aimduck-game/quickstart.md).
