# Validation - Discovery 2.0.0 - 2026-10-31

Executed on Node.js 22.22.3:

- 27 current JSON Schemas and 40 archived schemas compile with Ajv2020 strict mode and ajv-formats.
- Current fixtures: 222 positive accepted and 5 negative rejected. Including archives: 583 registered fixtures, 564 positive and 19 negative.
- 39 semantic checks: books/modules, seats, private keys, suspended state/current question, flag/country shape, wallet postings and payout conservation.
- The synthetic flag bank with duplicate question families is correctly rejected for production publication. It exists only for demo UI.
- Mock: 30 validated sequenced events; all five numeric questions, leave/resume with the same attempt/question, library, country and separate competition fixture flow.
- OpenAPI 3.1.1 passes swagger-parser: 34 operations. AsyncAPI 3.0.0 passes asyncapi/parser without error-level diagnostics: 45 events. YAML/JSON equivalence and local references checked.
- Exact world bytes and hashes checked: W=23334 bytes, B=2333 bytes, initial interest=1135 bytes. Placeholder flag included in accounting.
- 403 archived schema/fixture files remain byte-identical to release 1.1.0.

Offline validation/replay dependencies are bundled; Node.js must be installed separately. Full OpenAPI/AsyncAPI release validators are not bundled.

Not executed: actual reading-room scene, browser/Pointer Lock/Three.js, Rust/Axum, PostgreSQL or transaction races, Windows Docker, trusted LAN HTTPS/WSS or GPU memory. See acceptance requirements.

The real flag dataset was neither inspected nor changed because it was not attached. Only an adapter contract and explicit fictional placeholders are included. No external knowledge corpus was downloaded for this update; these fixtures are not a reviewed production library.
