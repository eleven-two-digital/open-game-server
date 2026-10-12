# Quickstart: Validate the Aimduck Lobby and Connectivity Documentation

## Prerequisites

- Node.js 18 or later and npm.
- Dependencies installed in `docs/` (`npm install` if this checkout has no installed dependencies).

## Build the public documentation

From the repository root:

```sh
cd docs
npm run build
```

Expected result: Docusaurus completes the production build without broken Markdown/MDX or sidebar errors, and the Aimduck page is included in the generated site.

## Editorial acceptance review

Review the Aimduck implementation page alongside [the feature specification](./spec.md), [the game source material](../../../samples/aimduck/README.md), and the linked normative OGS guides.

1. Confirm the Implementation sidebar links to the Aimduck page.
2. Follow the connection narrative in order: authenticate, discover masked rooms, resolve a selected room, receive a signed join ticket and connection details, connect securely to the advertised room transport, and enter the lobby.
3. Check that a full room and an invalid/expired ticket each have a clear player-facing next step.
4. Check that the lobby shows eight players, readiness before start, eight rounds, rotating shooter roles, scoring, and the stated winner condition.
5. Check that the 30-second seat reservation is labeled as illustrative; a returning player uses the same authenticated identity and a fresh valid ticket; in-match recovery is explicitly game-specific.
6. Confirm that room operational lifecycle is distinguished from game lobby/match state, all normative OGS details link to existing guides, and no new protocol behavior is implied.
7. Confirm all published content is English and contains no internal repository workflow details.

Expected result: a reviewer can trace the full client path and distinguish existing OGS contracts from Aimduck-specific example policies without ambiguity.

## Validation Record

- Production build: `npm run build` from `docs/` succeeded on 2026-10-11. Docusaurus emitted its existing deprecation warning for `siteConfig.onBrokenMarkdownLinks`; both client and server bundles compiled and static output was generated.
- Editorial review: passed. The Implementation sidebar includes Aimduck; the client journey, room-full and ticket-rejection cases, lobby/match rules, reconnection limits, and links to normative guides were checked against the feature specification and source materials.
- Repository coherence: passed. No protocol contracts or harness files required changes; details are recorded in [the implementation plan](./plan.md).

## Scope guard

No game runtime, network interface, schema, API, credential format, or protocol conformance test is added by this documentation feature.
