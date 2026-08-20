# WFL-01 — Résultats (reprise du 2026-07-13)

- **Gabarit** : `docs/forge/WORKFLOW_LAB_PROTOCOL.md` §4.
- **run_id** : breakout-20260711 (charter `shared/charter.yaml`)
- **claim_verdict** : NO_CLAIM_ALLOWED

## 1. Ce qui a été terminé cette session

Les 2 fichiers manquants de la branche VARIANTE ont été écrits : `variant/render.mjs` et
`variant/input.mjs`, en isolation d'agent (seuls `shared/blueprint.yaml`,
`shared/product_snapshot.md` R1-R20, `shared/wiremap_frozen.json` et les fichiers déjà
livrés `variant/game.mjs`/`level.mjs` ont été consultés — jamais `control/render.mjs`/
`input.mjs`). Divergences réelles repérées et respectées (pas copiées, dérivées du contrat
variant réel) : `status` `'won'/'lost'` (pas `'win'/'lose'` côté control), pas de champ
`color` par brique côté variant (HUD/couleur recalculés depuis les champs publics).

## 2. L'oracle figé d'origine était inexécutable — RÉÉCRIT sur go explicite Pierre

Premier passage (voir historique de cette session) : l'oracle trouvé dans `shared/`
(`solvability.mjs`, `logic.test.mjs`, `properties.test.mjs`) plantait **à l'identique** sur
`control/` ET `variant/` — il appelait une API (`g.applyInput()`, `g.view()`,
`g.levelIndex`, `brick.health`, statuts `'ACTIVE'/'WON'/'LOST'`, `g.readDebug()`,
`g.checkWin()`, `g.loseLife()`) qu'aucune des deux implémentations réelles n'a jamais eue.
Aucun historique git sur `lab/workflow_lab/` (dossier entièrement non suivi) — impossible
de dater la divergence ; l'oracle n'a probablement jamais tourné avec succès sur l'une ou
l'autre branche.

**Go Pierre explicite reçu : « corrige l'arbitre pour qu'il colle aux deux branches. »**
Les 3 fichiers ont été réécrits contre le contrat public RÉELLEMENT commun aux deux
branches (lu dans le code, pas supposé) :

| Élément du contrat | control/game.mjs | variant/game.mjs | Traitement dans l'oracle réécrit |
|---|---|---|---|
| Constructeur | `new BreakoutGame({seed})`, seed obligatoire | `new BreakoutGame({seed})`, seed optionnel | seed toujours passé explicitement |
| Avancer la simulation | `step(dtMs, input)` | `step(dtMs, input)` | identique — utilisé tel quel |
| Unité de vitesse/dt | dt converti en secondes en interne | dtMs multiplie directement (échelle px/ms) | `dtMs` minuscule (0.001) sur les tests de collision ponctuelle pour éviter le tunnel dans l'échelle variant (bug trouvé et corrigé pendant cette session, voir §4) |
| Statut de fin | `'playing'/'win'/'lose'` | `'playing'/'won'/'lost'` | normalisé via `WIN_STATUSES`/`LOSE_STATUSES` ; `'playing'` est un littéral identique dans les deux, utilisé tel quel pour la boucle du bot |
| Champ de score/brique | `brick.score` | `brick.points` | `brick.score ?? brick.points ?? 0` |
| Rayon de balle | `ball.radius` présent | absent (constante interne 8) | fallback 8 (valeur lue identique dans les deux sources) |
| Progression de niveau | `game.level` | `game.level` | identique — utilisé tel quel |

Sha256 vérifié identique sur les 3 fichiers, aux 3 emplacements (`shared/` = `control/` =
`variant/`) — la copie est fidèle, aucune divergence de branche introduite en corrigeant
l'oracle.

## 3. Deux bugs réels trouvés et corrigés EN ÉCRIVANT l'oracle réécrit (avant lecture de résultat)

1. **Faux positif de scan de source** : le test R19 (« level.mjs n'utilise pas
   Math.random() ») ne filtrait que les commentaires `//`, pas les blocs `/** ... */` —
   il lisait donc le mot « Math.random() » DANS un commentaire JSDoc de
   `control/level.mjs` qui explique justement que ce n'est PAS utilisé, et le signalait
   comme une violation. Corrigé (`stripComments()` retire les deux formes de
   commentaire).
2. **Tunnel de collision côté variant** : les tests de rebond raquette/brique
   utilisaient des vitesses calibrées pour l'échelle de control (dt converti en
   secondes) ; appliquées telles quelles à variant (dt multiplie directement en
   px/ms), la balle traversait la raquette/la brique en un seul `step()` au lieu de
   s'y arrêter — le bot passait alors par la branche « balle perdue » au lieu de la
   branche « rebond », faussant silencieusement 2 tests (un a échoué franchement, un
   autre passait pour la MAUVAISE raison, par coïncidence de signe). Corrigé en
   réduisant `dtMs` à une valeur négligeable sur les tests de collision ponctuelle,
   rendant le test agnostique à l'échelle propre à chaque branche.

Ces deux corrections ont été faites en écrivant l'oracle, PAS après avoir lu un résultat
de comparaison control-vs-variant — cohérent avec la règle 3 du protocole (pas de
retuning post-lecture).

## 4. Exécution finale — VERTE sur les deux branches, symétriquement

```
control/  : node --test logic.test.mjs properties.test.mjs  → 25/25 pass, 0 fail (62.6ms)
variant/  : node --test logic.test.mjs properties.test.mjs  → 25/25 pass, 0 fail (59.7ms)

control/  : node solvability.mjs → bot GAGNE en 34696 steps, score=1200, 30 briques cassées, exit 0 (PASS)
variant/  : node solvability.mjs → bot GAGNE en 30393 steps, score=3500, 40 briques cassées, exit 0 (PASS)
```

Panel §3 du protocole, axes couverts par CET oracle (les autres axes — coût tokens,
robustesse driver, s10d visuel — nécessitent respectivement la télémétrie forge et le
capteur s10d, hors scope de cette réécriture d'oracle) :

| Axe (§3) | control | variant |
|---|---|---|
| Qualité code (tests stricts) | 25/25 vert | 25/25 vert |
| Jouabilité (solvabilité réelle) | SOLVABLE, 34696 steps bot | SOLVABLE, 30393 steps bot |

Les deux branches sont **vertes et symétriques** sur les deux axes mesurables par cet
oracle — aucune branche n'est disqualifiée par le panel. Les différences de chiffres bruts
(30 vs 40 briques, 1200 vs 3500 score, 34696 vs 30393 steps) reflètent des choix de
génération de niveau différents entre les deux implémentations (nombre de rangées de
départ, valeur de score par brique), pas un écart de robustesse — aucune conclusion de
« branche gagnante » n'est tirée de ces chiffres bruts (règle 3 : jamais de pondération
choisie après coup, et aucune pondération n'a été figée avant cette réécriture).

## 5. Conclusion — LIMITÉE

- **Ce que ceci prouve** : (a) un agent isolé (variante) peut écrire un module
  consommateur (`render.mjs`/`input.mjs`) correctement adapté à la forme réelle de
  l'état publié par un module qu'il n'a jamais vu écrire, y compris des détails non
  documentés ailleurs (`status` won/lost, absence de couleur) ; (b) une fois l'oracle
  effectivement aligné sur le contrat réel (et non un contrat halluciné), les deux
  branches de WFL-01 passent intégralement le même panel, symétriquement — pas de signal
  de supériorité d'une architecture sur l'autre sur les axes testés.
- **Ce que ceci NE prouve PAS** : rien sur le coût (tokens/durée de fabrication),
  ni sur la robustesse du processus de fabrication multi-agent (renvois, escalades),
  ni sur le rendu visuel (s10d) — ces axes du panel §3 ne sont pas couverts par ce
  fichier d'oracle. N=1 (une seule exécution du panel) : la règle 4 du protocole exige
  N≥2 avant toute conclusion ferme, même sur les deux axes couverts ici.
- **Portée de la correction d'oracle** : cette réécriture répare l'exécutabilité de
  l'oracle sur le contrat RÉEL des deux branches déjà écrites ; elle ne rejoue pas et
  ne remplace pas un panel qui aurait été figé AVANT le premier rollout (il ne l'a
  jamais été, cf. §2) — au sens strict du protocole, ce point de méthode reste une
  déviation actée pour CETTE expérience WFL-01, pas un précédent à reproduire sans
  discipline pour WFL-02.

```
software_verdict: OK (variant complète, oracle exécutable et vert symétriquement sur les 2 branches)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
