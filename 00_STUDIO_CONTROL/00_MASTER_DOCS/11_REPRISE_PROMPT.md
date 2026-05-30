# Reprise Prompt — Session 2026-05-30

Utilise ce fichier pour reprendre le projet après une interruption.

## Lire dans cet ordre

1. `00_STUDIO_CONTROL/00_MASTER_DOCS/00_VISION.md`
2. `00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md`
3. `00_STUDIO_CONTROL/00_MASTER_DOCS/02_ROCKY.md`
4. `00_STUDIO_CONTROL/00_MASTER_DOCS/06_KNOWN_ISSUES.md`
5. `ml/coach.py`

## Sprint 2026-05-30 — ce qui a été fait

✅ Bug negamax + aspiration window pour les mats (6875b43)
✅ Nettoyage S-7 : select_root_move supprimé, argmax pur (90fe323) — 1230 lignes supprimées
✅ Zobrist hash pour la clé de répétition engine-side (f758ff4)
✅ Arc<str> pour Unit::template_name (f758ff4)
✅ Tri des coups légaux par tuple entier au lieu de String (f758ff4)
✅ Issues #16, #17, #18 fermées dans 06_KNOWN_ISSUES.md
✅ 07_CURRENT_STATE.md et 11_REPRISE_PROMPT.md mis à jour

## État actuel

✅ Coach v0 (ml/coach.py) — LM Studio opérationnel, parsing à affiner
⏳ Rocky explosion combinatoire — à corriger avant génération logs coach

## Prochaine action

1. Corriger l'explosion combinatoire dans Rocky (issue #15 : depth cap, quiescence, boucle partie).
2. Générer des logs MOVE_DIAG exploitables pour le coach.
3. Affiner le parsing log dans `ml/coach.py`.

## Règle

Code > docs. Si un doc contredit le code, le code a raison.
