# Data Model: Aimduck Lobby and Connectivity Example

This feature documents a game example and does not add runtime entities, persistence, or a machine-readable schema. The concepts below describe the example's reader-facing domain model only; they are not new OGS protocol entities or wire contracts.

## Concepts

### Player

- **Meaning**: An authenticated participant in an Aimduck lobby or match.
- **Identity**: The stable authenticated player identity already carried through the OGS admission flow.
- **Relationships**: Occupies one lobby seat; has one game role for a round; contributes to the match score.
- **Validation/policy**: A reconnecting lobby player is recognized as the same authenticated player and must present a fresh valid join ticket.

### Room

- **Meaning**: An OGS room instance hosting an Aimduck game session.
- **Operational state**: The room's OGS lifecycle/capacity state; it is not the same as Aimduck lobby readiness or match phase.
- **Relationships**: Hosts one example lobby/match at a time.
- **Validation/policy**: Discovery listing masks the real address; Discovery resolution and room admission retain their existing security behavior.

### Lobby

- **Meaning**: The example's pre-match waiting phase for participants.
- **Illustrative attributes**: Capacity of eight players, occupied seats, each player's readiness, and the 30-second reservation deadline for a disconnected player.
- **Relationships**: Exists within a room; transitions to a match when all eight participants are present and ready.
- **Validation/policy**: After the example's 30-second reservation expires, the seat may be released. These are Aimduck example policies, not OGS guarantees.

### Match and Round

- **Meaning**: The Aimduck game session and its eight consecutive rounds.
- **Illustrative attributes**: Current round, current shooter, seven duck roles, player scores, and phase.
- **Relationships**: A match is hosted by a room and follows the lobby; each round assigns one shooter and seven ducks.
- **Validation/policy**: Shooter role rotates between participants; the shooter gains three points per duck hit, and each duck gains one point for crossing. Highest cumulative score after eight rounds wins.

### Join Ticket

- **Meaning**: Existing signed OGS credential for admission to a specific room on behalf of an authenticated player.
- **Ownership/handling**: Issued during room resolution, validated by the room, and kept by the client only as needed for joining.
- **Validation/policy**: A reconnect must obtain and present a fresh valid ticket; this example does not extend ticket lifetime or define a new credential.

## Example State Transitions

```text
Discovery listing → Room resolved / ticket issued → Room admission and secure session
    → Aimduck lobby (waiting / ready) → Match (rounds 1–8) → Complete

Lobby disconnect → Seat reserved (illustrative, up to 30 seconds)
    ├── Same player returns with fresh valid ticket → Lobby participation resumes
    └── Reservation expires → Seat may be released

In-match disconnect → Recovery policy is game-specific; no OGS guarantee is implied
```
