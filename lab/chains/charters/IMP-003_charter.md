# Charter IMP-003 — Conflict matrix checker pour multi-lanes parallèles

## Status
CLOSED — stub auto-genere depuis ledger

## Lane
SAFE_AUTO

## Impact / Effort / ROI
Impact: HIGH | Effort: SMALL | ROI: -

## Acceptance criteria
Parse lane_plan.yaml, détecte intersection de files entre lanes, refuse si overlap non vide. Test : 2 lanes disjointes = CLEAR, 2 lanes partagées = CONFLICT.

## Files
- lab/chains/lane_conflict_checker.py
- lab/chains/lane_plan.yaml

## Notes
Fermeture documentee en session: 2026-05-31
