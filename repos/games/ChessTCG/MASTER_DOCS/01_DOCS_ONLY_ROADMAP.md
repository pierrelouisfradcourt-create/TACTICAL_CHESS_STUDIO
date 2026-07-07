# Chess TCG Docs-Only Roadmap

status: DOCUMENTED_ONLY

## Phase 0 - Documentation Placement

Status: DOCUMENTED_ONLY

- Create the project documentation shell under `repos\games\ChessTCG`.
- Register the project in studio control registries.
- Keep all work documentation-only.

## Phase 1 - Source Canonization

Status: DOCUMENTED_ONLY / PARTIAL

Candidate sources:

- external Tactical Chess bibles in `Downloads`
- existing TacticalChessPureLab master docs
- current studio control routing docs

Required work before any source becomes canonical:

- encoding cleanup
- duplicate/source conflict review
- source inventory
- HumanGate approval

Current docs-only outputs:

- `03_GAME_DESIGN_CANON.md`
- `04_RNG_FORMULA_CANON.md`
- `05_CARD_ABILITY_TAXONOMY.md`
- `06_SOURCE_INVENTORY.md`
- `07_OPEN_DECISIONS.md`

## Phase 2 - Product Specification

Status: DOCUMENTED_ONLY / PARTIAL

Future docs may define:

- game loop
- card taxonomy
- board and piece model
- RNG budget model
- factions/archetypes
- combat/status/terrain systems
- UX target

## Phase 3 - Runtime Planning

Status: BLOCKED until explicit request

No implementation is authorized here. Any future runtime work must define:

- Rust-owned deterministic runtime boundary
- Python tooling boundary
- test plan
- artifact routing
- HumanGate decision packet
