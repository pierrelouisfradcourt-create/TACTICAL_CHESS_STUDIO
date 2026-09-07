# GEL DU LOT P8–P10 — Bomberman 3D, 2026-08-12

> **statut_artefact** : PROPOSED · **claim_verdict** : NO_CLAIM_ALLOWED
> **evidence_verdict** : MECHANICAL_VALIDATION_ONLY
> Clôture **intermédiaire**, décidée par Pierre. Aucun verdict global. Le lot est gelé pour
> servir de point de comparaison à l'audit d'autonomie qui suit — pas parce qu'il est fini.

## Surfaces gelées

| Surface | Statut | Preuve |
|---|---|---|
| P8 navigation par écrans | IMPLEMENTED / TESTED | 691 assertions, 0 échec · machine d'états pure · falsifications reproduites (3) |
| P9 pipeline d'assets | IMPLEMENTED / TESTED | Blender 5.1.1 exécuté via WSL Ubuntu-24.04, exit 0 |
| P9 kit militaire (3 props) | IMPLEMENTED / TESTED | 3/3 oracle géométrie OK · 120 / 340 / 264 sommets · pivot en base |
| P9 câblage anneau | IMPLEMENTED / TESTED | substitution 1:1 prouvée · grille intacte · coût par image nul |
| P10 cellule architecturale | IMPLEMENTED / TESTED | 19/19 déclaré == mesuré · hiérarchie ×3,17 · 3 instances, 3 signatures · grille 442 → 442 |
| R1 grammaire d'objet | DOCUMENTED_ONLY | née d'un échec mesuré (caisse « cage », sac « champignon ») |
| R2 contrat `size` | DOCUMENTED_ONLY | défaut mesuré : déclaré 0,74 vs mesuré 0,92 |
| R3 fonction spatiale | DOCUMENTED_ONLY | **confirmée à l'échelle CELLULE, insuffisante à l'échelle ARÈNE** |
| qualité artistique | jugée par Pierre au playtest | aucun oracle ne la mesure, et aucun ne le prétend |
| R9 solvabilité | FAIL — 7/20 | cause résiduelle : non-élimination délibérée, verrou D1 |

## Échecs conservés — ils valent autant que les réussites

- **Trois mutations de `bot_policy.gd` sur quatre** avaient une cause démontrée et ont **dégradé** R9. Une seule (A) l'a amélioré. Sur ce fichier, démontrer une cause n'a aucune valeur prédictive sur le gain.
- **Le décor V3 flotte** : props d'anneau à 0,57 au-dessus du sol, murs et destructibles à 0,45. Mesuré, **NON corrigé** — le réparer partout déplacerait tout le rendu. Effet pervers : à côté d'une cellule posée au sol, ce qui flotte se voit **plus** qu'avant.
- **La composition de l'arène n'existe pas.** Grille cachée, la cellule tient ; l'arène entière non. Cinq manques nommés : aucune circulation · anneau d'une seule case, donc aucune profondeur · flottement · aucune hiérarchie entre cellules · aucun récit d'orientation.
- **Cinq sondes de ma part ont conclu « absent » en regardant au mauvais endroit** : grammaire trop étroite (`N assertions` vs `RESULT: N passed`), champ brut pris pour un état, filtre sur mon propre vocabulaire, porte `startswith("adapter.")`, et Blender cherché sous Windows alors qu'il vit dans WSL. **Aucune n'a été trouvée par la lecture ; toutes par la falsification.**
- **`EXPECTED_ASSERTS` prouve le volume, jamais l'exécution** : un volet de test s'est interrompu en silence et le total est retombé exactement sur la valeur attendue.

## Décisions ratifiées pendant le lot

D1 = A (seuil `piege` gelé) · HUD (b) réduit en jeu · direction A « jouet de guerre » · soldats V3 remplaçant le corps cube · garde `voisin == depart` **rejetée** malgré sa cause réelle · gate `test_app_state.gd` + `test_pause_musique.gd` (portée limitée) · exception `ÉCHAP` depuis `EN_JEU` · écriture `build_asset.py` (366 insertions, `ARCHETYPES` 8 → 11, sans autorisation générale).

## Décisions différées, avec leur condition de déclenchement

- **Frontière architecturale du producteur** — `build_asset.py` cumule registre, dispatcher, point d'extension et producteur. Mesurée **une fois**. Refactor **seulement si** un second kit rencontre la même frontière ET que R1/R2 se généralisent à des pièces qu'elles n'ont pas servi à produire.
- **Flottement général** du décor et des murs.
- **Tension R1 ↔ échelle de groupe** : le blockhaus porte 3 saillies là où R1 dit 1 à 2. Toutes sont des bandes ou des plaques. R1 régit-elle la pièce ou le groupe ?
- Gelés inchangés : `core.exit` · D1 · recensement `6 → 7` · taxonomie universel/genre.

## Ce que ce lot a mesuré sans le chercher — et qui motive l'audit suivant

**La Forge produit correctement quand on la pilote. Elle ne remonte pas spontanément au bon
niveau quand quelque chose casse.** Chaque changement de niveau de ce lot — du prop à la
grammaire, de la grammaire à la composition, de la composition à l'architecture — a été
provoqué par une intervention humaine, jamais par la chaîne elle-même.

C'est cette propriété, et non la qualité des artefacts, que l'audit d'autonomie doit mesurer
**avant** toute modification du workflow.
