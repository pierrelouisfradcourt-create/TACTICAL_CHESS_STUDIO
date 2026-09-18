# Chroniques de Guilde — prototype V2 « tableau vivant »
Date : 2026-09-18. Source : session Claude Code (branche claude/game-ideas-app-store-9dvk6p), GO Pierre
« prototype dans le dépôt ». Artefact publié : https://claude.ai/artifact/KC9qsgEm2aj6hPxeXq2FJM

Jeu de manager de guilde au jour le jour, entre amis : un héros par ami, plan du matin en un geste,
résolution déterministe, chronique du soir, tableau vivant qui se peint au fil de la journée, aperçu widget.

## Fichiers
- `index.html` — page de l'artefact (title + style en tête, sans doctype ; charge data.js puis sim.js).
- `sim.js` — moteur pur (UMD, node + navigateur), entiers seuls, mulberry32 sur graine du jour, API dans CONTRACT.md.
- `data.json` / `data.js` — tables (classes, XP, quêtes, monstres, objets, recettes, bâtiments, gabarits…).
- `CONTRACT.md` — contrat technique (API, actions, ordre de résolution, viewModel, plan graphique).
- `design/` — documents de conception V1 (aventuriers, quêtes/donjons, objets/économie) et brief V2.
- `test/harness.mjs` — banc principal (moteur 30 jours + page dans Chromium via Playwright global).
- `test/engine_extra.mjs` — invariants moteur. `test/ui_v2_check.mjs` — banc de la page V2.

## Lancer
```
node test/harness.mjs            # ENGINE_ONLY=1 pour le moteur seul
node test/engine_extra.mjs
node test/ui_v2_check.mjs
```
Les captures et rapports vont dans `test/out/` (non versionné). Ouvert en local, index.html utilise les
polices système : les polices Google ne se chargent qu'en http(s).

## État
software_verdict: OK (19/19 · 13/13 · 52/52 au 2026-09-18) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
claim_verdict: NO_CLAIM_ALLOWED. Aucun playtest humain. Coupes et non-vérifiés : voir CONTRACT.md et
design/UI_BRIEF_V2.md. Pistes discutées, non codées : âges du village jusqu'au château, événements
(dragon, morts-vivants, portail), fond d'écran animé Android.
