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

## Versions
- V2 (2026-09-18) : un héros par ami, tableau vivant, aperçu widget, trois écrans.
- V3 : âges du village (campement → château), attaque de dragon, présage, défense.
- V4 (GO Pierre) : dragons de fin de biome (réveil par maîtrise, légendaires, matériaux et recettes de dragon),
  points d'action et journées composées, savoir-faire par l'usage, missions solo, mort et héritier, défaite.
  Bancs : `test/engine_v4_check.mjs` (24), `test/ui_v4_check.mjs` (55), `ui_v3_check` (48), `ui_v2_check` (52).
- V5 T1 (GO Pierre) : `tactic.js` — grille 9×11, points d'action et de mouvement, portées et lignes de vue,
  formes de zone, poussées, états, passages entrelacés, riposte télégraphiée, nuit et enrage. Six classes de
  base dont l'Invocateur. Le dragon de la forêt devient un raid persistant sur plusieurs jours (activité
  `raid`, action `raid_pass`). Banc `test/tactic_t1_check.mjs` (20).
- V5 T4 : écran Raid dans la page — grille tactile, bandeau du boss avec sa riposte annoncée, barre de sorts,
  aperçu de zone en deux temps, journal des passages, jauge du boss sur le tableau et l'aperçu widget.
  La page charge `tactic.js`. Banc `test/ui_v5_check.mjs` (39).
  Limite connue, à arbitrer : le passage humain se compose sur la grille du matin alors que le moteur le rejoue
  après ceux des amis (managers triés par identifiant, le joueur passe dernier). La page prévient en clair quand
  un passage sera interrompu, et les traces laissées par les amis le jour même n'apparaissent que le lendemain.
- V5 T2, T3, T5 (à construire) : hybrides et deux autres dragons en raid, spécialisations, calibrage —
  voir `design/V5_SPEC.md`.

## État
software_verdict: OK (19/19 · 13/13 · 24/24 · 20/20 · 52/52 · 48/48 · 55/55 · 39/39 au 2026-09-18) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
claim_verdict: NO_CLAIM_ALLOWED. Aucun playtest humain. Coupes, calibrages et non-vérifiés : voir CONTRACT.md
(section V4) et design/UI_BRIEF_V2.md. Non codé : fond d'écran animé Android, morts-vivants, portail.
