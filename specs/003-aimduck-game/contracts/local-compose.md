# Sample Contract: Local Docker Compose

## Services

The Compose project includes:

| Service | Purpose | Host access |
| --- | --- | --- |
| `client` | Browser application | `http://localhost:5173` |
| `idp` | Local Keycloak OIDC realm with seeded demo identities | `http://localhost:8180` |
| `discovery` | OGS room catalog, masked listing, resolution, and tickets | `https://localhost:8080` |
| `room-1` | First authoritative Aimduck room | `wss://localhost:9101` |
| `room-2` | Second independent Aimduck room | `wss://localhost:9102` |

Additional fixed room services may be declared with distinct host ports. They use the same room image and internal port.

## Network rules

- Containers communicate over the Compose network using service DNS names.
- Browser-facing resolution uses `localhost` and the published room host port; Compose-only service names are never advertised.
- Services are health-checked; rooms register only after Discovery is healthy and re-register after restart.
- Published demo ports bind to loopback by default.
- Local certificates and secrets are generated for development and are not committed. The developer trusts the local CA before using WSS.
- No application container mounts `/var/run/docker.sock`.

## Lifecycle

- Run `npm run dev:setup` from `samples/aimduck/` to generate ignored development certificates and room-scoped secrets before the first WSS/mTLS run.
- `docker compose up --build --wait` builds/starts all services and waits for declared health checks.
- `docker compose down` stops the demo; Discovery registry and game state are ephemeral.
- `docker compose logs <service>` exposes operational logs, which MUST redact bearer tokens and tickets.

The Compose configuration and dev-only credentials are not production deployment templates.
