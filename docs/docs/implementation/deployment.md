---
sidebar_position: 4
---

# Deployment

How to publish rooms and the Discovery Server in containers or on hosts.

## Local Aimduck Compose example

The [Aimduck implementation page](./aimduck.md#runnable-browser-sample) describes a complete,
local-only Compose stack for the browser client, Keycloak, Discovery, and two independently
registered room instances. It demonstrates container boundaries, health checks, mTLS room
registration, browser-reachable resolved endpoints, and read-only certificate/secret mounts.

This Compose topology is a learning and development example. Its self-signed CA, seeded credentials,
static room count, in-memory catalog/game state, and local port mappings are not production
deployment guidance. Production deployments must provide their own certificate lifecycle, secret
management, identity configuration, network policy, scaling strategy, and observability.
