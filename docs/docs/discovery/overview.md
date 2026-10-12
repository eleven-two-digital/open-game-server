---
sidebar_position: 1
---

# Discovery Server

The **Discovery Server** (also called the "Discovery") is the central component that aggregates and masks multiplayer rooms.

## Main Responsibilities

1. **Catalog aggregation**: keep an up-to-date registry of all active rooms
2. **Address masking**: hide real IPs and ports during listing
3. **Join ticket issuance**: generate signed credentials so clients can join rooms
4. **mTLS authentication**: validate the identity of registered rooms
5. **JWT validation**: validate client identity against the IdP's JWKS
6. **Filtering and search**: let clients filter rooms by tags (game mode, language, region, and so on)

## High-Level Architecture

```mermaid
flowchart LR
    rooms["Room instances"]
    clients["Game clients"]

    subgraph discovery["Discovery server"]
        lifecycle["Room lifecycle handler<br/>Register · heartbeat · lease expiry"]
        registry[("Room registry<br/>Active and draining rooms")]
        requests["Client request handler<br/>JWT/JWKS · filters · masked listing"]
        tickets["Resolution service<br/>Address and signed join ticket"]

        lifecycle -->|"Add / renew / expire"| registry
        registry -->|"Available rooms"| requests
        requests -->|"Selected room"| tickets
    end

    rooms -->|"mTLS registration and heartbeat"| lifecycle
    clients -->|"JWT-authenticated search"| requests
    tickets -->|"Masked results and join details"| clients

    classDef external fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    classDef service fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef store fill:#fef3c7,stroke:#d97706,color:#78350f
    class rooms,clients external
    class lifecycle,requests,tickets service
    class registry store
```

## Room Lifecycle

```mermaid
flowchart LR
    start([Room starts]) --> configure[Load Discovery endpoint and create certificate]
    configure --> register[Register over mTLS]
    register --> active[Room is active in the catalog]
    active --> heartbeat[Renew lease every 30 seconds]
    heartbeat --> active
    active --> drain[Enter drain mode before shutdown]
    drain --> deregister[Heartbeat lease expires]
    deregister --> removed([Discovery removes room from catalog])
```

## Main Endpoints

### Client-facing (HTTPS + JWT)

- **`GET /v1/rooms`**: list masked rooms with filters
- **`POST /v1/rooms/resolve`**: resolve the chosen room and issue a join ticket

### Room-facing (HTTPS + mTLS)

- **`POST /v1/discovery/register`**: self-registration of a new room
- **`POST /v1/discovery/heartbeat`**: renew the lease and report state
- **`POST /v1/dns/drain`**: frozen legacy identifier pending Open Decision OD1; do not treat
  `/v1/discovery/drain` as canonical until that decision is recorded

## Discovery Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Discovery
    participant Room as Selected room

    Client->>Discovery: GET /v1/rooms with JWT and filters
    Discovery->>Discovery: Validate JWT and filter catalog
    Discovery-->>Client: Return masked room listings
    Client->>Discovery: POST /v1/rooms/resolve with masked_token
    Discovery->>Discovery: Validate JWT and issue signed join ticket
    Discovery-->>Client: Return connection details and join ticket
    Client->>Room: Connect directly with join ticket
```

Continue with [Room Registration](room-registration), [Room Listing](room-listing), and [Ticket Resolution](ticket-resolution).
