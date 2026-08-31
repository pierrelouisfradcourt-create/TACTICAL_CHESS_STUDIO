# p2_alpha — Code Execution Receipt (attempt 3)

**Date**: 2026-08-31
**Builder**: Sonnet 5 (s9-build, subagent dispatch)
**Dispatch**: `FORGE_DISPATCH:s9-build:p2_alpha-20260830-run1:3`

Ce reçu remplace celui de l'attempt 1. L'attempt 1 déclarait `software_verdict: OK`
sur la base d'une exécution qui n'avait PAS eu lieu (déclaré ≠ exécuté) : l'e2e était
une coquille inerte sur Windows (jamais invoquée), et 9/25 entrées de la WireMap
pointaient un `fonction` absent du code réel — exactement le motif des échecs
`s10a-oracle-code`/`s10c-oracle-wiremap` du pré-mortem.

## Défauts trouvés (attempt 3) et corrigés

| # | Défaut | Preuve | Correction |
|---|--------|--------|------------|
| 1 | `e2e.mjs` inerte sur Windows : `import.meta.url === file://${process.argv[1]}` ne matche jamais (backslashes), le bloc CLI ne s'exécutait JAMAIS — 0 sortie, exit 0 silencieux | `node e2e.mjs` sans sortie, confirmé par capture stdout/stderr vide | Réécrit en style CLI direct (comme `games/p1_beta/e2e.mjs`), plus de garde `import.meta.url` fragile |
| 2 | Aucun serveur HTTP : `run-oracle.mjs` supposait un serveur déjà lancé sur le port 3000, jamais démarré par personne | lecture de `run-oracle.mjs` PHASE 4 (commentaire "requires HTTP server") | `server.mjs` créé (patron `p1_beta/server.mjs`), `e2e.mjs` le spawn et attend `"interface jouable"` |
| 3 | E2E jamais réellement invoqué : `run-oracle.mjs` faisait un `import('./e2e.mjs')` dynamique sans jamais appeler la fonction, toujours `log('skipped in CI mode')` → retournait `true` sans exécution — passait le gate statique `check_e2e_harness` (le token `import...e2e.mjs` suffit) sans jamais avoir tourné | lecture de PHASE 4 originale (`runE2ETests`) | PHASE 4 réécrite : `spawn('node', ['e2e.mjs'])`, exit code + `RESULT: PASS` requis |
| 4 | Le jeu est canvas-only (aucun élément DOM), mais la WireMap ET l'e2e original prétendaient des clics réels sur `#coeur-de-lumen`, `#buy-g1`, `#rejouer` — ids inexistants | `grep` de `render.mjs`/`input.mjs`/`index.html` original : 0 occurrence | Calque DOM overlay réel ajouté (positionné sur `render.mjs::LAYOUT`, seule source de vérité géométrique) ; `input.mjs` réécrit pour consommer ces vrais éléments (plus de hit-test pixel dupliqué) |
| 5 | 9/25 entrées WireMap : `fonction` ne correspondait à AUCUN identifiant réel (`handleCoreClick`, `handleBuy`, `handleReplay`, `renderClickBurst`, `renderBuyButton`, `renderThresholdReveal`, `renderBackground`, `tick`, `solve`) | `check_wiremap` rejoué directement (`static_oracles.py`) sur le code avant correction : `fonctions_renommées` avec les 9 entrées | 6 extraites en fonctions nommées réelles (code plus modulaire, pas de gaming du check) ; 3 re-pointées vers le nom réel existant (`renderBuyButtons`, `gameLoop`, `solvabilityProof`) — re-pointage sanctionné par la doctrine C1/C2 (gel du jeu de RÈGLES, pas des noms de fonction) |
| 6 | Double initialisation : `index.html` ET `main.mjs` avaient chacun leur propre `DOMContentLoaded` → `initGame`/`startGame`, deux instances de jeu tournaient en parallèle sur le même canvas | lecture croisée `index.html` + fin de `main.mjs` (avant fix) | Auto-init dupliqué retiré de `main.mjs` ; `index.html` reste seul point d'entrée |
| 7 | Après victoire→rejouer, la boucle ne redémarrait jamais (`running` restait `false`) : l'écran restait figé sur la dernière frame de victoire, aucun re-render possible | lecture de `onReplay` original (`reset(state)` sans redémarrer `gameLoop`) | `onReplay` relance `startGame()` si la boucle est arrêtée |
| 8 | Détection de franchissement de seuil (R19, VFX) uniquement câblée sur les clics (`onStateChanged`), jamais sur la production passive (`step`) — un seuil franchi par génération automatique seule ne déclenchait jamais le flash | lecture de `initGame`'s `onStateChanged` (delta heuristique fragile, jamais appelé après `step`) | Détection déplacée dans `gameLoop`, comparaison stricte `getThresholdIndex` avant/après chaque tick |
| 9 | `asset_resolution.json` absent : 13/13 `asset_requests.json.requests[].id` silencieusement non consommés (`check_asset_consumption` FAIL certain) | fichier absent du dossier | Créé : 13 entrées `status: "blocked"`, raison = rendu procédural Canvas2D (fonction+fichier cités par entrée) |
| 10 | Playwright absent du dépôt (aucun `node_modules/playwright` accessible depuis `games/p2_alpha` ni via résolution parente) — l'e2e ne pouvait tourner NULLE PART, même corrigé | `require.resolve('playwright')` échoue avant correction (MODULE_NOT_FOUND) | `npm install playwright@1.61.1 --no-save` dans `games/p2_alpha/` (binaires Chromium déjà en cache local `~/AppData/Local/ms-playwright`, aucun téléchargement réseau lourd) ; `node_modules/` est gitignore-d globalement |

## Vérification mécanique réelle (re-jouée, pas relue depuis un rapport)

```
node run-oracle.mjs --e2e --mutation
```
```
Tests passed: 33
Tests failed: 0
✓ Oracle PASSED: all tests successful
```

- `logic.test.mjs` : 14/14 PASS
- `properties.test.mjs` : 15/15 PASS
- `solvability.mjs` : bot atteint S5 en 47845 ticks (budget 72000)
- `measureVariance()` : variance non triviale (mean=50241.4, variance=535400.24)
- **`e2e.mjs` (RÉELLEMENT exécuté, Chromium headless réel, PID observé, serveur HTTP réel sur :4603)** :
  10 vrais clics `#coeur-de-lumen` (delta strict +10000 mR), achat réel `#buy-g1`
  (delta strict −15000 mR, count 0→1), état disabled/abordable observé avant/après,
  production automatique confirmée sans clic, franchissement de seuil forcé
  (`__game_debug.reachThreshold`) → `#buy-g2` apparaît + `#threshold-reveal` > 0,
  victoire forcée → `#victory-overlay` visible + boucle arrêtée, clic réel `#rejouer`
  → reset strict à 0 + boucle relancée. `RESULT: PASS`.

Oracles statiques Forge (`scripts/forge/static_oracles.py`) rejoués directement, pas
supposés :

```
check_e2e_harness            -> passed: True
check_solvability_wired      -> passed: True
check_harness_no_hardcoded_flags -> passed: True
check_wiremap                -> passed: True (0 fonctions_renommées, 0 preuves_absentes)
check_feature_set_frozen     -> passed: True (25/25, aucun ajout/suppression)
check_architecture           -> passed: True (0 dépendance interdite)
check_asset_consumption      -> passed: True (13 blocked, 0 resolved, 0 missing)
```

## Ownership (blueprint) — inchangé, vérifié par grep des imports

- `economy.mjs` : 0 import (logique pure)
- `render.mjs` : importe `economy.mjs` uniquement
- `input.mjs` : importe `economy.mjs` uniquement (aucun import de `render.mjs`)
- `main.mjs` : importe `economy.mjs` + `render.mjs` + `input.mjs`
- `solvability.mjs` : importe `economy.mjs` uniquement

Aucune arête interdite du blueprint franchie.

## reuse_ratio.mjs (evidence_path)

```
node scripts/forge/reuse_ratio.mjs games/p2_alpha
```
`reuseRatio: 0`, `crossGameReuse: 0` — 4 fichiers de logique scannés
(economy/input/render/update_wiremap.mjs ; main.mjs et solvability.mjs hors du
scan de cet outil). Recherche `knowledge_base/search.mjs` effectuée avant
d'écrire le calque DOM ("incremental clicker generator buy button DOM overlay
canvas") : 0 résultat au-dessus du seuil — aucun module bibliothèque à réutiliser
pour ce delta.

## software_verdict

**OK** — oracle code rejoué en direct (pas relu depuis un ancien rapport), e2e
réellement exécuté avec sortie observée, gates statiques Forge rejoués et verts.

## evidence_verdict

**MECHANICAL_VALIDATION_ONLY**

## claim_verdict

**NO_CLAIM_ALLOWED** — qualité ludique (M7) hors périmètre s9 par charter.
