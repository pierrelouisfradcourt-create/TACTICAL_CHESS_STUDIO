# Kitten Clicker — Calibration V2.1 (Lot C, PROPOSED — à ratifier par Pierre)
*V2.1b : 2ᵉ audit — cellule « Niveau 1 total » alignée (2,5–5 / 14–22 H5), métrique `new_content_per_run` (nœud `further`) ajoutée, réponses §8 de C.1 synchronisées.*
*V2.1 : après audit de cohérence C.1 ↔ V2 (11 contradictions, 1 écart, 2 métriques manquantes) — coût COMMUN rétabli à la décision 1 (60 R), 0,4 C/s corrigé, `placement_cost` et `album_progress` ajoutés, durées visées du §1 alignées sur le §2 ; C.1 synchronisé sur ces valeurs.*
*Date : 2026-08-23 · Source : conséquence du Gameplay / Progression Contract V1.2 (ratifié Pierre 2026-08-23 : cœurs additifs, coûts
identiques par portée, décision 2 par objectif). Remplace la Calibration V1 (non ratifiée). Chaque nombre répond aux 7 questions :
pourquoi · quelle boucle · quelle possibilité · quelle durée · perception joueur · mesure Forge · preuve PASS. Aucun code.*

## 0. Modèle de calcul (hypothèses nommées, à re-mesurer par la sonde — ce sont des prédictions)
- Politique **actif humain** : 6 clics/s (borne basse d'un joueur attentif ; la sonde clique 20/s — elle mesure la borne, pas la main).
- Politique **idle** : amorçage par clics jusqu'au 1ᵉʳ chaton, puis aucun clic.
- Achat dès que finançable, ordre des steps de C.1 ; la décision 1 est jouée « A adopter » pour le calcul (branche B plus rapide en actif).
- Unités : R ronrons, C croquettes, s secondes ; production PAR SECONDE ; 60 frames = 1 s.
- **Changement vs V1** : avec les coûts V1 (10·30·70·150·300, jardin 150), la maîtrise arrive en ≈ 1,7 min en actif → hors cible 3–6 min.
  Les FONCTIONS de C.1 ne changent pas ; les coûts sont doublés (H3 validée par le calcul, pas par un run).

## 1. Invariants (CONTRAIGNANTS → `game_master.progression_metrics[kind=invariant]` → `economy.json` → registre lu par `05_SYSTEMS`)
| id | valeur | pourquoi il existe | boucle servie | possibilité ouverte | durée visée | perception joueur | mesure Forge | preuve PASS |
|---|---|---|---|---|---|---|---|---|
| `click_value` | 1 R | l'unité de sens : tout se lit en clics | core | `kitten` quand R ≥ 20 | 1ᵉʳ gain < 1 s | `hud.ronrons` +1, pop + son | sonde B (`increases`) | delta = repeat × 1 |
| `kitten_cost` | 20 · 60 · 140 · 300 · 600 | première possession, puis chaque chaton « coûte » la production cumulée des précédents (courbe ≈ ×2,2) | progression | chaton 1 → `placer` ; chatons 3-5 → `mastery` | 1ᵉʳ : 2–8 s ; 5ᵉ = `t_mastery` | `hud.cout_acheter_chaton` = valeur du registre, grisé + raison si R < coût | `economy_bypass` (aucune constante en dur) ; `hud.cout_*` | affiché == registre |
| `kitten_production` | 0,5 R/s par chaton au refuge | un chaton = un demi-clic/s : l'idle vaut la moitié d'un joueur lent | core/idle | production sans clic (step D) | (pas de cible temporelle : métrique d'effet) | `hud.taux` monte à chaque adoption | sonde D (`increases` sans clic) | Δtaux = +0,5 |
| `garden_multiplier` | ×1,5 | le lieu doit valoir plus que son coût : 2 chatons au jardin = +0,5 R/s | progression | `mastery` (5 placés) | rentabilisé en ≈ 5 min idle | `hud.taux` monte au placement | `hud.taux` avant/après `placer` | Δtaux > 0 sans achat |
| `placement_cost` | 0 R | placer est gratuit : l'espace est une règle, pas une dépense — la dépense est la PLACE | progression | `place` (mur lisible) | ≤ 10 s après le 1ᵉʳ chaton | `hud.places` 0/1 → 1/1 ; chaton dans son lieu | `hud.places` changes | 0/1 → 1/1 |
| `place_cost` | 80 R | l'espace coûte : 1ʳᵉ dépense hors chaton, placée entre le chaton 2 (60) et le chaton 3 (140) pour que le mur « plus de place » soit ressenti avant d'être levé | progression | `kitten_2`, `decision_1` visible | 10–30 s actif / 100–250 s idle | `hud.places` 1/1 → mur « plus de place : achète une place (80) » | `hud.places` changes | 1/1 → 1/2 |
| `places_initial` / `places_per_garden` | 1 / +3 | départ à UNE place : le mur apparaît dès le 2ᵉ chaton et nomme la suite | progression | `place` puis `garden` | — | `hud.places` toujours visible | `hud.places` | 0/1 au boot |
| `garden_cost` | 300 R | nouvelle boucle de production + 3 places : le plafond devient un lieu ; jalon du niveau 1 | progression/content | `kitten_3..5`, `mastery` | 45–105 s actif / 6–12 min idle | `appears lieu` ; `hud.places` +3 | `appears:lieu` | 1 → 2 lieux |
| `upgrade_cost` | 60 · 180 · 540 | décision actif/passif ; niveau 1 = 60 R = COÛT COMMUN avec le chaton 2 (la décision 1 est un vrai arbitrage au même prix, exigence C.1) ; ×3 par niveau pour ×2 de gain = rendement décroissant ; 3 niveaux max | progression/decision | `caresse_longue` (niveau 1) | au seuil 60 R : 15–45 s actif / 3–7 min idle | `hud.cout_acheter_amelioration`, `hud.effet_*` « clic ×2 » | DECISION (sonde) | non-dominance H1 |
| `upgrade_click_multiplier` | ×2 / niveau, max 3 | B ne vaut que si le joueur clique | core | — | (pas de cible temporelle : métrique d'effet) | delta clic visible | `hud.ronrons` par clic | delta ×2 |
| `prestige_requires` | 5 chatons placés ET jardin | maîtrise lisible du niveau 1 (ratifié P0) | meta | `prestige` apparaît | 2,5–5 min actif / 14–22 min idle (H5) | `aff.prestige` n'existe pas avant | `appears:affordance` au step P08 | 0 → 1 |
| `heart_bonus` | +0,25 par cœur, ADDITIF (×1,25 / ×1,5 / ×1,75), clic ET production | héritage lisible : « chaque cœur = +25 % » (ratifié) | meta | niveau 1 rejoué −20 % (H4) | — | `hud.coeurs` ; delta clic après prestige | ADVANTAGE (`increases_more_than`) | delta après > avant |
| `prestige_reset` | R 0 · chatons 0 · améliorations 0 · places 1 · lieux refuge | un prestige qui ne reset pas n'est pas un prestige | meta | portée 2 | immédiat (≤ 1 s après le clic) | écran redevient celui du boot + cœurs + album coloré | `resets` sur `hud.ronrons` ; `hud.places` 0/1 | resets |
| `level1_costs_per_run` | IDENTIQUES à chaque portée | l'accélération vient du méta, jamais d'une remise (ratifié) | meta | — | portée 2 ≈ −20 % | mêmes coûts affichés | `hud.cout_*` inchangés après prestige | égalité |
| `kibble_production` | 0,2 C/s par chaton au jardin (portée ≥ 2) | 2ᵉ ressource lente : elle oriente un choix | content | `decision_2`, `rare` | 1ʳᵉ C < 30 s après le jardin | `hud.croquettes` monte sans clic | `hud.croquettes` increases | > 0 |
| `decision2_cost` | 500 R (commun) | exclusivité au seuil : jardin OU grenier | decision | `rare` / `kitten_6..8` | 0,7–2 min actif / 4–9 min idle après prestige | deux boutons, même coût, effets différents | HumanGate P5 + `hud.croquettes`/`hud.places` | choix observé |
| `garden_dev_effect` / `attic_effect` | C ×2 / +3 places & R ×1,5 | deux intentions : collectionner vs produire (non-dominance par OBJECTIF, ratifiée) | decision/meta | rares plus tôt / maîtrise plus tôt | (pas de cible temporelle : métrique d'effet) | `hud.effet_*` nomme l'intention | HumanGate | — |
| `rare_kitten_cost` | 400 R + 30 C | objectif de portée 2 : l'album se colore ; 30 C = ≈ 75 s de jardin à 2 chatons | content/meta | `album_progress` | 2–5 min après prestige | silhouette dorée → chaton | `hud.collection` ; panneau album | +1 rare |
| `new_content_per_run` | ≥ 1 affordance nouvelle après CHAQUE prestige (portée 2 : `ouvrir_grenier`, `developper_jardin`, `adopter_rare` ; portée 3 : aucune nouvelle — l'objectif devient « album complet », fin) | une raison de revenir au cycle suivant (nœud `further` de C.1) | meta | portée suivante | immédiat après prestige | une affordance que le joueur n'avait jamais vue | `appears:affordance` après le step META_LOOP | count(après) > count(avant) à la portée 2 ; à la portée 3, observation seulement |
| `rare_count` | 3, tous disponibles dès la portée 2 | fin de partie visible dès le départ : album complet | meta | fin (écran « Refuge complet ») | portée 2–3 | album 6 + 3 | panneau album | 9/9 |
| `album_progress` | chatons découverts / 9 (observation) | la promesse se tient : chaque adoption colore une silhouette | meta/content | — | (observation, non bloquante) | panneau album : n colorés | compte des nœuds colorés du panneau | n == `hud.collection` + rares |

## 2. Durées calculées par step (deux politiques) → cibles `target` (tolérance ±50 %, arrondie) → `target_frames` sur les steps du Prisme
Revenus : actif = 6 clics/s × clic + production ; idle = production seule. Production : 0,5/chaton au refuge, 0,75 au jardin.

| step (C.1) | dépense | actif : t cumulé | idle : t cumulé | cible actif (tol.) | cible idle (tol.) | metric id (`kind=target`) |
|---|---|---|---|---|---|---|
| P01 10 clics → P02 chaton 1 (20) | 20 | ≈ 3 s | ≈ 3 s (amorçage par clics) | 2–8 s | 2–8 s | `t_first_kitten` |
| P03 placer | 0 | 5 s | 5 s | ≤ 10 s | ≤ 10 s | `t_first_place` |
| P04 place (80) | 80 | ≈ 17 s (6,5 R/s) | ≈ 165 s (0,5 R/s) | 10–30 s | 100–250 s | `t_second_place` |
| P05 décision (coût commun 60 : A chaton 2 / B amélioration 1) | 60 | ≈ 26 s | ≈ 285 s | 15–45 s | 180–420 s | `t_decision_1` |
| P06 jardin (300) | 300 | ≈ 69 s (7 R/s) | ≈ 585 s (1 R/s) | 45–105 s | 6–12 min | `t_garden` |
| P07 placer ×2 au jardin | 0 | 72 s | 590 s | — | — | — |
| P08 chatons 3-5 (140+300+600) | 1 040 | ≈ 205 s (≈ 7,8 R/s) | ≈ 1 180 s (≈ 1,75 R/s) | **2,5–5 min** | **14–22 min** | `t_mastery` |
| **Niveau 1 total** (= `t_mastery`) | 1 500 R | **≈ 3,4 min** | **≈ 19,7 min** | 2,5–5 min ✔ | 14–22 min (H5, remplace le 8–14 de la direction produit — À RATIFIER) | `t_level1` (alias de `t_mastery`) |
| P09 prestige → P10 rejeu (×1,25) | 1 500 | ≈ 2,8 min | ≈ 16 min | −20 % | −20 % | `t_level1_run2` |
| P11 décision 2 (500) pendant le rejeu | 500 | ≈ 1,2 min après prestige | ≈ 6 min | 0,7–2 min | 4–9 min | `t_decision_2` |
| P12 rare (400 R + 30 C) | 400 + 30 C | ≈ 2,5 min après prestige (C = goulot : 30 C / 0,4 C/s à 2 chatons au jardin ≈ 75 s, après le jardin racheté ≈ 70 s) | ≈ 8 min | 2–5 min | 5–12 min | `t_first_rare` |

**Lecture honnête** : actif dans la cible ; **idle ≈ 20 min, hors de la cible 8–14 min de la direction produit**. Deux réglages possibles, à ratifier : (a) accepter
14–22 min idle (H5 ; c'est la cible inscrite dans les tableaux) (l'idle est un chemin secondaire ; cible `t_level1_idle` = 10–22 min) — **recommandé**, parce que raccourcir l'idle
casserait la non-dominance de la décision 1 (A doit rester meilleur en idle, donc la production ne doit pas rattraper le clic) ;
(b) `kitten_production` 0,75 R/s → idle ≈ 13 min, mais A se rapproche de B en actif. Je propose (a).

## 3. Observations (MESURÉES, non bloquantes → `kind=observation`)
`obs_clicks_level1` (nombre de clics jusqu'à la maîtrise) · `obs_idle_ratio` (part du revenu passif) · `obs_decision1_branch`
(A ou B choisie par le bot/HumanGate) · `obs_time_to_prestige_press` (délai entre apparition de `prestige` et clic) · `obs_rares_adopted_run2`.

## 4. Hypothèses de balance (nommées, mesurées, jamais décrétées)
H1 décision 1 : A > B en idle, B > A en actif (sonde, 300 frames : A +2,5 R / B 0 en idle ; B +60 R vs A +2,5 R en actif) ·
H2 décision 2 : non-dominance par objectif (HumanGate P5) · H3 coûts ×2 (validée par le calcul §2, à confirmer au run 10) · décision 1 à coût commun 60 R (C.1) ·
H4 −20 % par cœur suffisant pour « sentir » la portée 2 (HumanGate) · H5 idle 10–22 min acceptable (à ratifier).

## 5. Consommation (qui lit quoi, sans rien inventer)
C.1 + V2 → tâche s2.7 (et injection `design` au Lot D) → GM Opus reprend invariants/targets TELS QUELS (`source: design:calibration_v2.<id>`)
→ `economy.json` (gate `economy_bypass`) → Prisme (`target` → `target_frames`, steps dans l'ordre P01…P12) → sonde (frames par step,
DECISION) → HumanGate P5. Tout nombre du runtime absent de ce document est une invention du builder = FAIL.
