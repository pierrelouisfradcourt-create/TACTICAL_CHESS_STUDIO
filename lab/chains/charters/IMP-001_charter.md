# Charter IMP-001 — Fix detect_lane() mismatch avec FILE_ROUTING_MANIFEST

## Status
CLOSED — stub auto-genere depuis ledger

## Lane
SAFE_AUTO

## Impact / Effort / ROI
Impact: HIGH | Effort: TRIVIAL | ROI: -

## Acceptance criteria
detect_lane() lit les lanes depuis FILE_ROUTING_MANIFEST.yaml au lieu de hardcoder. Test refuse si manifest/detect_lane contradiction.

## Files
- lab/chains/doc_hygiene_chain.py

## Notes
Fermeture documentee en session: 2026-05-31
