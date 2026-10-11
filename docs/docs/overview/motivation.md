---
sidebar_position: 1
---

# Motivation and Vision

The **Open Game Server Ecosystem** is an open, standardized, and generic specification for the architecture of multiplayer game servers.

## Goal

Define a standard that is fully agnostic of:
- **Game engine**: Unity, Unreal, Godot, Web, and others
- **Programming language**: Python, Go, Rust, Node.js, C#, and others
- **Infrastructure**: cloud providers, containers, bare metal

## Core Principles

### 1. **Decoupling**
Clearly separate the responsibility of **discovery and masking** (the Discovery Server, the "Discovery") from the **execution of matches** (decentralized room instances).

### 2. **Scalability**
An architecture that can scale from one room to thousands of rooms hosted across many providers or containers, without central bottl_msenecks.

### 3. **Dynamic Security**
A unique encryption key per room, stateless client identity validation through JWT, and mTLS authentication between infrastructure components.

### 4. **Efficiency**
A reactive state schema with smart caching (`_id` and `ttl_ms`), which reduces unnecessary data traffic.

### 5. **Flexibility**
Support for multiple transports (HTTP, WebSockets, SSE) in parallel, or configured for the profile of each game.

## Component Structure

```mermaid
flowchart TB
    client["Game client"]
    idp["Identity provider<br/>OAuth2 / OIDC"]
    discovery["Discovery server<br/>mTLS · JWKS · room lookup"]
    roomA["Room A<br/>Independent match"]
    roomB["Room B<br/>Independent match"]

    idp -->|"Player identity"| client
    client -->|"Find and resolve a room"| discovery
    discovery -->|"Join ticket and connection details"| client
    roomA -->|"Self-register securely"| discovery
    roomB -->|"Self-register securely"| discovery
    client -->|"Connect directly"| roomA
    client -->|"Connect directly"| roomB

    classDef clientNode fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    classDef identityNode fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef discoveryNode fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef roomNode fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
    class client clientNode
    class idp identityNode
    class discovery discoveryNode
    class roomA,roomB roomNode
```

The client gets its credentials from the IdP, resolves rooms through Discovery, and connects directly to the chosen room.

## Next Steps

Read the [Architecture](../architecture/overview) and [Components](../architecture/components) sections to see how these elements relate in depth.
