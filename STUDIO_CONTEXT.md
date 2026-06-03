# STUDIO_CONTEXT — Tactical Chess Studio
<!-- AUTO-GENERATED — ne pas modifier manuellement -->
<!-- Regenere le 2026-06-03 depuis IMPROVEMENT_LEDGER.yaml + FILE_ROUTING_MANIFEST.yaml -->

**Ledger version:** v0  
**Derniere mise a jour:** 2026-06-02  
**claim_verdict:** NO_CLAIM_ALLOWED

## Ameliorations actives

| ID | Titre | Statut | Impact | Effort | Lane |
|---|---|---|---|---|---|
| IMP-008 | Dataset rebuild (teacher_samples corrompu) | OPEN | CRITICAL | LARGE | FORBIDDEN |
| IMP-038 | sf_dataset_generator.py — Pool-SF Stockfish depth 14 | OPEN | CRITICAL | SMALL | AUDIT_REQUIRED |

## Distribution des lanes (manifest tracked)

- **AUDIT_REQUIRED**: 17 patterns
- **DOCUMENTED_ONLY**: 3 patterns
- **FORBIDDEN**: 2 patterns
- **HUMAN_REQUIRED**: 6 patterns
- **SAFE_AUTO**: 38 patterns

## Dernieres metriques (kaizen)

- **Session:** 2026-06-02-humangate
- **Total:** 42
- **Open:** 4
- **Closed:** 37
- **Tests verts:** None
- **Commits:** 2

## Regles absolues

- claim_verdict: NO_CLAIM_ALLOWED
- Aucun git write sans HumanGate
- FORBIDDEN: push main, force push, dataset reset, broad refactor engine/search/neural
- Lane FORBIDDEN: lab/datasets/teacher_samples.jsonl, lab/runs/, ml/train.py

---
*Genere par studio_context_builder.py (IMP-012)*
