---
sidebar_position: 5
---

# mTLS Authentication

Communication between the **Discovery Server** and **room instances** uses **mTLS (Mutual TLS)**: both parties authenticate each other with X.509 certificates.

## Why mTLS?

At the **infrastructure** layer (Discovery ↔ room), we do not use JWT because:

- Rooms must authenticate **without being validated by an external IdP**
- mTLS provides **certificate-based** authentication, which suits machine-to-machine communication
- It prevents unknown machines from registering as rooms

## mTLS Flow

### 1. Initial Setup (before any communication)

**Discovery:**
```
$ openssl req -new -x509 -days 365 -keyout discovery.key -out discovery.crt
Subject: CN=discovery.example.com
```

**Room (on each host):**
```
$ openssl req -new -x509 -days 365 -keyout room.key -out room.crt
Subject: CN=room-1234 (or CN=rooms.example.com)
```

**Shared CA (signs both):**
```
$ openssl req -new -x509 -keyout ca.key -out ca.crt
  (both Discovery and the room trust this CA)
```

### 2. mTLS Handshake

When a room tries to connect to Discovery:

```
1. Room → Discovery: "Hello, I am room-1234, my cert is [cert.pem]"
2. Discovery: "I check whether your cert is signed by a CA I trust"
   └─> ✓ Valid → continue
   └─> ✗ Invalid → reject

3. Discovery → Room: "OK, I am discovery.example.com, my cert is [cert.pem]"
4. Room: "I check whether your cert is signed by a CA I trust"
   └─> ✓ Valid → continue
   └─> ✗ Invalid → reject

5. Both sides: derive the shared secret through TLS 1.3
6. The connection is established and encrypted with TLS
```

## Discovery Configuration

```yaml
# discovery-server-config.yaml
tls:
  ca_cert: /etc/discovery/ca.crt
  server_cert: /etc/discovery/discovery.crt
  server_key: /etc/discovery/discovery.key
  client_auth: REQUIRE  # Require a client certificate (mTLS)

listeners:
  - port: 443
    protocol: https
    tls_version: "1.3"

    routes:
      # Room-facing (require client cert)
      - path: "/v1/discovery/*"
        require_mTLS: true

      # Client-facing (JWT auth)
      - path: "/v1/rooms/*"
        require_mTLS: false
        require_jwt: true
```

## Room Configuration

```yaml
# room-server-config.yaml
server:
  id: room-1234

tls:
  cert: /etc/room/room.crt
  key: /etc/room/room.key
  ca_cert: /etc/room/ca.crt  # CA used to validate the Discovery certificate

dns:
  host: discovery.example.com
  port: 443
  protocol: https
  use_mTLS: true  # Enable mTLS for all Discovery requests
```

## Certificate Verification

### At Discovery (validating the room certificate)

```
Checks:
1. The certificate is not expired
2. The certificate is signed by a known CA
3. The Subject CN or SAN matches:
   - room-* (wildcards: room-[a-z0-9-]*)
   - room.example.com

If any check fails → the connection is rejected
```

### At the room (validating the Discovery certificate)

```
Checks:
1. The certificate is not expired
2. The certificate is signed by a known CA
3. The Subject CN or SAN is "discovery.example.com"

If any check fails → registration fails, retry with backoff
```

## Certificate Lifecycle

### Issuance

- Each room generates a certificate (self-signed or issued by a CA)
- The certificate is valid for 365 days (configurable)

### Rotation

Before expiration:

1. Generate a new certificate
2. Load the new certificate and key into the server (without downtime)
3. Existing clients keep their connections with the old certificate
4. New connections use the new certificate
5. After expiration, the old certificate is rejected

### Revocation

If a certificate is compromised:

1. Add its thumbprint to the CRL (Certificate Revocation List)
2. Discovery and rooms reload the CRL periodically
3. New connections with the revoked certificate are rejected

## Debugging

### Test the mTLS connection

```bash
# Inspect the room certificate
openssl x509 -in room.crt -text -noout

# Test the connection
openssl s_client -connect discovery.example.com:443 \
  -cert room.crt \
  -key room.key \
  -CAfile ca.crt

# On success:
# Verify return code: 0 (ok)
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `certificate verify failed` | Certificate not signed by the CA | Check the shared CA |
| `certificate expired` | Certificate expired | Renew the certificate |
| `unknown ca` | CA not trusted | Share the CA between both sides |
| `certificate revoked` | Certificate was revoked | Issue a new certificate |

---

Discovery Server summary: [Back](overview)

Next section: [Room Protocol](../room-protocol/overview)
