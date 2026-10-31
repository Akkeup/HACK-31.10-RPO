# Validation - Discovery 1.1.0 - 2026-10-31

Executed on Node.js 22.22.3:

- 24 current schemas and 16 archived schemas compile with Ajv2020 strict mode and ajv-formats.
- Current version: 200 positive fixtures accepted and 8 negative fixtures rejected. Archived version: 142 positive accepted and 6 negative rejected. Total: 356 fixtures.
- 33 semantic fixture checks: three question banks, unique seats, quiz state transitions, wallet/reserve arithmetic, ledger postings, pot/payout conservation and private field exclusion.
- Fixture replay: 24 sequential server messages; client commands and server messages validate. Scenarios are independent; replay does not execute financial transactions.
- New world W=23124 bytes, B=floor(W/10)=2312 bytes, initial interest=925 bytes. Exact file sizes and SHA-256 verified. Assets are minimal fixtures, not finished artwork.
- OpenAPI 3.1.1 passes @apidevtools/swagger-parser: 31 operations. AsyncAPI 3.0.0 passes @asyncapi/parser without error-level diagnostics: 39 events.
- YAML/JSON equivalence and local references verified.
- 168 archived schema/fixture files remain byte-identical to the original 1.0.0 ZIP.

Runtime dependencies for schema validation and replay are included for offline use; Node.js 22+ must be installed separately. Full OpenAPI/AsyncAPI release validators were used during packaging and are not bundled.

Not executed: real Rust/Axum, PostgreSQL, database concurrency, browser/Three.js camera, GPU memory, Windows Docker or HTTPS/WSS LAN with 2-5 devices. These remain implementation acceptance requirements in docs/ACCEPTANCE.md. Passing fixture checks does not prove a running game.
