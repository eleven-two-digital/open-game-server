# Data Model: Browser-playable Aimduck sample

## OGS-facing entities

### PlayerIdentity

- **Fields**: `player_id`, display name, optional avatar, issuer, token expiry.
- **Source/validation**: OIDC access token; Discovery validates signature through issuer JWKS plus issuer, audience, and expiry.
- **Relationships**: one identity can hold one active `PlayerSession` in a given room.
- **Rules**: browser keeps access and join credentials in memory; never persists them to local/session storage.

### DiscoveryListing

- **Fields**: opaque `masked_token`, display name, `current_players`, `max_players`, operational `state`, and public tags such as game mode.
- **Source**: Discovery registry entries from active room self-registration and heartbeats.
- **Rules**: MUST NOT contain host, port, certificate, or room-private keys. Full and draining rooms are not joinable.

### RoomResolution

- **Fields**: `room_id`, player-bound `join_ticket`, `host`, `port`, `protocol`, `path`, and expiry information.
- **Relationships**: joins one `PlayerIdentity` to one `RoomInstance` for a limited admission period.
- **Rules**: only returned after authenticated resolve; address is revealed only in this step. Tickets are short-lived and validated by the destination room.

### RoomInstance

- **Fields**: `room_id`, operational state (`active` or `drain`), advertised browser host/port, capacity, current occupants, supported transports, certificate identity, and lease deadline.
- **Lifecycle**: starts → registers over mTLS → active with periodic heartbeat → drains or becomes unavailable → lease expires/unregisters.
- **Relationships**: owns one `GameRoom` in this sample.

### RoomConnection

- **Fields**: authenticated `player_id`, `room_id`, ticket validity, negotiated transport, session status, and ECDH-derived session keys.
- **Lifecycle**: resolved → ticket validated → handshake complete → active → closed/expired.
- **Rules**: admission credentials are not logged or persisted; infrastructure mTLS is not used by the browser.

## Aimduck game entities

### GameRoom

- **Fields**: `room_id`, phase (`lobby`, `in_progress`, `complete`), eight seats, current match identifier, and current round number.
- **Relationship to OGS**: a game room is hosted by a `RoomInstance`; its phase is game state and is not the Discovery operational state.
- **Transitions**: lobby → in_progress only when all eight seats are occupied and ready; in_progress → complete after eight rounds.

### LobbySeat

- **Fields**: stable seat number `0..7`, optional `player_id`, ready state, connection state, optional reservation deadline.
- **Validation**: no `player_id` may occupy two seats in one room; only the authenticated owner may toggle their readiness.
- **Transitions**: empty → occupied/not-ready → occupied/ready; on lobby disconnect, occupied → reserved for 30 seconds; same identity may reclaim before expiry; otherwise reserved → empty.

### PlayerSession

- **Fields**: `player_id`, seat number, display name, role in current round (`shooter` or `duck`), connection status, and current score.
- **Relationship**: belongs to one seat and one match. A player has at most one role per round.
- **Rules**: clients submit actions only for their own session; server assigns roles and validates actions.

### MatchRound

- **Fields**: round number `1..8`, Shooter `player_id`, seven Duck identities, start/deadline timestamps, per-Duck outcome (`running`, `crossed`, `hit`), and round completion state.
- **Transitions**: pending → countdown → active → results; the round resolves when every Duck has crossed/been hit or the 35-second deadline expires; a 4-second intermission precedes the next round.
- **Rules**: Shooter assignment rotates through the eight players by stable seat order; the room simulates movement/projectile collision and resolves outcomes. A Duck still unresolved at the deadline is neither hit nor crossed and earns no point for that round.

### Scoreboard

- **Fields**: one non-negative integer total per `player_id`; final ranking and winner/tie result.
- **Update rules**: add 3 points to Shooter for each Duck hit; add 1 point to each Duck that crosses successfully; no client-provided score increments are accepted.
- **Completion**: after round 8, all maximum-score players are reported as winners in the event of a tie.

## Design-system mapping

| Entity/state | UI responsibility |
| --- | --- |
| `PlayerIdentity` | Signed-in player summary, sign-in/out actions, token expiry/error state |
| `DiscoveryListing` | Room cards, capacity, operational availability, refresh and empty/error states |
| `RoomResolution` / `RoomConnection` | Selected room, admission progress, safe failure/retry message |
| `RoomInstance` | OGS operational badge and connection/lease diagnostics for the sample view |
| `GameRoom` / `LobbySeat` | Lobby phase, eight seat cards, readiness and reservation indicators |
| `PlayerSession` / `MatchRound` | Role assignment, player/round feedback, game canvas HUD |
| `Scoreboard` | Per-player score list, final winner or tie state |

Components MUST use consistent labels, state semantics, spacing, typography, focus indicators, and accessible text alternatives. Operational room state and match phase use separate labels and visual groups.
