---
sidebar_position: 5
---

# Caching with `_id` and `ttl_ms`

Every root-level attribute carries `_id` (a hash or version of the state) and `ttl_ms` (time-to-live). The client only reprocesses an attribute when its `_id` changes or its `ttl_ms` expires.
