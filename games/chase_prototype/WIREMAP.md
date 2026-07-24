# WireMap — Chase Prototype

Étape 9 exécutée directement (pas de blueprint/WireMap amont s1-s8 pour ce prototype
ad hoc) : cette WireMap est produite par le builder lui-même, colonnes conformes au
schéma canonique (fichiers/fonction/version/preuve/statut).

| fichier | fonction | version | preuve | statut |
|---|---|---|---|---|
| game.mjs | moteur headless pur (état, `step`, poursuite, capture, survie 30s) | v1 | logic.test.mjs (18/18 verts) + mutation 17/17 tués (100%) | DONE |
| render.mjs | dessin canvas pur (aucune règle de jeu) | v1 | e2e.mjs (captures 01-04) | DONE |
| input.mjs | capture clavier pure (flèches + WASD) | v1 | e2e.mjs (déplacement réel testé) | DONE |
| index.html | assemblage DOM + boucle rAF + hooks debug + overlay/restart | v1 | e2e.mjs (PASS, RESULT: PASS) | DONE |
| server.mjs | serveur statique local (zéro dépendance) | v1 | run-oracle.mjs (log "interface jouable") | DONE |
| solvability.mjs | oracle solvabilité (victoire ET défaite atteignables) | v1 | solvability.mjs (exit 0, SOLVABLE) | DONE |
| e2e.mjs | click-through Playwright réel | v1 | run-oracle.mjs (exit 0) | DONE |
| run-oracle.mjs | point d'entrée oracle (logic+e2e+solvabilité) | v1 | exécution directe : VERDICT ORACLE: PASS | DONE |
