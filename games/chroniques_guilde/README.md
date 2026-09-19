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
- `design/` — conception. V1 (aventuriers, quêtes/donjons, objets/économie), brief V2, `V5_SPEC.md`,
  audits `AUDIT_ARCHI.md` / `AUDIT_STATS.md`, `CHATEAU_SPEC.md`, et **trois specs non implémentées**
  (à ratifier, elles touchent `data.json` donc les vecteurs) : `CRAFT_BIOME_SPEC.md`,
  `ARMURE_ET_PREREQUIS_SPEC.md`, `QUETE_DE_CLASSE_SPEC.md`.
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
- V5 T2 : treize voies hybrides choisies vers le jour 8, Drake et Hydre en raid.
- V5 T2b : passages de raid rejoués dans l'ordre de réception (interruptions 71 % → 0 %), huit bugs de
  l'audit corrigés, code mort retiré.
- V5 T3 et T3b : vingt-six spécialisations avec leur verbe tactique, une reconversion par saison, Derby
  des Lames. Test de branche mécanisé : chaque branche prouve qu'elle résout sa situation mieux que sa
  sœur et que sa voie nue.
- V5 T5 : calibrage de la saison sur 60 graines. Morts 2,7 %, chute de guilde 3,3 %, les trois dragons
  entre 62 et 76 % de victoires, chaque biome réveillé, aucune spécialisation jamais choisie, château
  atteint dans 47 % des saisons, derby à 48 %. Banc `test/season_t5_check.mjs` qui verrouille ces bornes.
- Reste ouvert : point A4 de l'audit (le modèle de vue du raid ne décrit pas un passage en cours, d'où
  des accès bruts à l'état dans la page) ; réveils de dragon très tardifs encore difficiles.

## État
software_verdict: OK — treize bancs verts au 2026-09-19 : 10, 19, 16, 28, 26, 14, 14, 12, 52, 36, 55, 48, 90.
evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED.
**Aucun playtest humain** : rien n'est prouvé sur le plaisir de jeu, seulement sur le comportement mécanique.
Coupes, calibrages, décisions et non-vérifiés : voir CONTRACT.md (une section par tranche) et design/.
Non codé : fond d'écran animé Android, portage, morts-vivants, portail.
