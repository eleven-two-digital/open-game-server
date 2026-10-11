---
sidebar_position: 1
---

# Room Protocol

The protocol specification between a **room instance** and the **game client**, after the client resolves the room through Discovery.

## Phases

1. **Well-known**: the client discovers the room's capabilities (`/.well-known/game-room`).
2. **Handshake**: session agreement, with an ECDH key unique to each client.
3. **Schema**: the room defines the format of the `$.server`, `$.me`, and `$.others` dictionaries.
4. **State sync**: reactive state exchange, with caching by `_id` and `ttl_ms`.

Details are on each page of this section.
