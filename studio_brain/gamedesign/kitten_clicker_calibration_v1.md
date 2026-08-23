# Kitten Clicker — Calibration V1 (Lot C, NON RATIFIÉE — rétrogradée : devient V2 après le Gameplay / Progression Contract V1, décision Pierre 2026-08-23)
*Date : 2026-08-23 · Source : Fable, sur la direction produit V1 ratifiée (`kitten_clicker_direction_produit_v1.md`) et l'audit
`docs/audit/2026-08-23-kitten-clicker-design-chain-audit.md` (11 grandeurs, 5 introuvables). Forme = celle du bloc `game_master`
(Lot B) : chaque nombre a une SOURCE, une RAISON, une UNITÉ, une CIBLE et une PREUVE. Les `invariant` sont CONTRAIGNANTS (le
runtime ne peut pas en inventer d'autres — gate `economy_bypass`), les `target` ont une tolérance (gate `target_frames`), les
`observation` sont mesurées sans bloquer. Hypothèses de balance nommées comme telles : elles se mesurent, elles ne se décrètent pas.*

## 0. Unités et conventions
- Ronrons (R) : ressource principale. Croquettes (C) : ressource du niveau 2, produite par le jardin seulement.
- Temps : secondes ; la sonde mesure en frames à 60 fps (1 s = 60 frames). Production passive = par SECONDE, jamais par frame
  (défaut mesuré au run 9 : `PASSIVE_UNIT` appliqué par trame, HUD « /s » faux ×60).
- Politiques de mesure : `idle` (aucun clic après l'amorçage) · `actif` (un clic sur la pelote toutes les 3 frames = 20 clics/s, borne
  haute d'un joueur humain ≈ 6-8 clics/s — la sonde mesure la borne, le HumanGate mesure la main).

## 1. Invariants (CONTRAIGNANTS — `progression_metrics[kind=invariant]` → `economy.json` → `05_SYSTEMS` les LIT)
| id | valeur | unité | raison (why) | preuve |
|---|---|---|---|---|
| `click_value` | 1 | R/clic | le clic est l'unité de sens du genre ; tout le reste se lit en multiples de clics | hud `ronrons` +1 par clic (sonde B) |
| `kitten_cost` | 10 · 30 · 70 · 150 · 300 | R (chaton n = 1…5) | courbe géométrique ≈ ×2,2 (Cookie Clicker ×1,15 par achat sur 100+ achats ; ici 5 achats seulement, donc pas plus raide) : chaque chaton « coûte » la production cumulée des précédents | `cout_acheter_chaton` affiché = valeur du registre ; `economy_bypass` |
| `kitten_production` | 0,5 | R/s par chaton au refuge | un chaton = un demi-clic par seconde : l'idle vaut la moitié d'un joueur lent, jamais plus que le clic au départ | hud `taux` ; sonde D (production sans clic) |
| `garden_multiplier` | 1,5 | × production des chatons placés au jardin | le lieu doit valoir plus que son coût en ~60 s idle (voir §3) | hud `taux` avant/après placement |
| `place_cost` | 40 | R | la 2ᵉ place coûte plus que le 1ᵉʳ chaton et moins que le 2ᵉ : l'espace est une ressource intermédiaire | hud `places` 1/1 → 1/2 |
| `places_initial` / `places_per_garden` | 1 / +3 | places | départ à UNE place : le mur apparaît dès le 2ᵉ chaton et nomme le jardin | hud `places` ; affordance `acheter_chaton` grisée avec raison |
| `garden_cost` | 150 | R | ≈ 1 min de production à 2 chatons actifs ; jalon visible du niveau 1 | appears `lieu` ; hud `places` +3 |
| `upgrade_cost` | 20 · 60 · 180 | R (niveau 1…3) | ×3 par niveau pour un gain ×2 : rendement décroissant (défaut run 9 : coût linéaire vs gain exponentiel) | `cout_acheter_amelioration` ; `economy_bypass` |
| `upgrade_click_multiplier` | ×2 par niveau, max 3 niveaux | × `click_value` | B (améliorer) bat A (adopter) en actif, pas en idle — hypothèse de balance H1 à mesurer | DECISION non-dominance (sonde) |
| `prestige_requires` | 5 chatons placés ET jardin ouvert | condition | ratifié P0 : le joueur a développé son premier espace avant de recommencer | affordance `prestige` appears seulement là |
| `heart_bonus` | +25 % par cœur, clic ET production | × | ratifié P0 ; +25 % rend la 2ᵉ portée visiblement plus rapide (§3 : −20 % de durée) sans casser l'économie | ADVANTAGE : delta clic après prestige > avant |
| `prestige_reset` | ronrons 0 · chatons 0 · places 1 · lieux refuge · améliorations 0 | état | un prestige qui ne reset pas n'est pas un prestige (P0) | META_LOOP `resets` ; hud `places` 0/1 |
| `kibble_production` | 0,2 | C/s par chaton au jardin (portée ≥ 2) | la 2ᵉ ressource est lente : elle oriente un choix, elle ne remplace pas les ronrons | hud `croquettes` increases |
| `rare_kitten_cost` | 200 R + 30 C | R, C | exige ≈ 2,5 min de jardin à 1 chaton : la décision jardin/grenier a un prix | `cout_*` affichés |
| `attic_cost` / `garden_dev_cost` | 250 / 250 | R | coût COMMUN = exclusivité au seuil (DECISION niveau 2) | DECISION non-dominance (HumanGate au run 10 : une seule DECISION mesurée) |
| `attic_effect` / `garden_dev_effect` | +3 places, ronrons ×1,5 / croquettes ×2 | × | deux stratégies : production vs album (rares) — hypothèse H2 | HumanGate P5 + observation `croquettes` |

## 2. Cibles (CONTRAIGNANT + tolérance — `progression_metrics[kind=target]` → `target_frames` sur les steps du Prisme)
| id | cible | tolérance | unité | raison | preuve |
|---|---|---|---|---|---|
| `t_first_kitten` | 10 s | 5 – 20 s | s depuis le 1ᵉʳ clic | la première possibilité nouvelle (« placer ») doit apparaître en moins de 20 s — sinon le joueur ne sait pas que le jeu a une suite | `target_frames` sur le step UNLOCK `p_buy_kitten` (300–1200 frames) |
| `t_level1_actif` | 4 min | 3 – 6 min | min | un niveau 1 jouable d'une traite ; au-delà de 6 min sans prestige le joueur décroche (risque de monotonie nommé par le World Scan) | somme des `frames` des steps jusqu'à `prestige` (politique actif) |
| `t_level1_idle` | 11 min | 8 – 14 min | min | l'idle doit rester un chemin viable (A > B en idle) mais 2-3× plus lent que l'actif | même mesure, politique idle (observation au run 10, target au run 11) |
| `t_level2_first_rare` | 3 min après prestige | 2 – 5 min | min | la 2ᵉ portée doit montrer du neuf (chaton rare) avant la durée du niveau 1 | `target_frames` sur le step UNLOCK `p_adopt_rare` |
| `n_new_possibilities_level1` | 5 | ≥ 4 | possibilités (placer, place, jardin, prestige, caresse_longue) | « chaque palier apporte une possibilité, pas +X % » | `appears` satisfaits (sonde) |
| `n_decisions` | 2 | ≥ 1 mesurée + 1 HumanGate | décisions significatives | niveau 1 : adopter/améliorer ; niveau 2 : jardin/grenier | DECISION 6/6 + P5 |

## 3. Cohérence calculée (depuis les invariants ; à re-mesurer par la sonde — ce sont des prédictions, pas des preuves)
Dépense totale du niveau 1 : chatons 560 + place 40 + jardin 150 + 1 amélioration 20 = **770 R** (2 améliorations : 830).
- **Actif** (20 clics/s borne sonde → 20 R/s ; production moyenne ≈ 1,5 R/s) : ≈ 40 s — trop rapide pour la sonde, normal : la
  borne humaine est 6-8 clics/s → ≈ 6–8 R/s + 1,5 → **≈ 1,5–2 min** (sous la cible 3–6 min → H3 : les coûts ou le multiplicateur
  de clic devront monter ; à mesurer au run 10 avec la politique humaine, pas la borne).
- **Idle** (amorçage 10 clics, puis production : 0,5 → 1 → 1,5 → 2,25 (jardin) → 3 R/s) : ≈ 770 / 1,6 moyen ≈ **8 min** — dans la cible.
- Après prestige (+25 %) : mêmes coûts, revenus ×1,25 → **−20 %** de durée ; avec 2 cœurs −33 %. Hypothèse H4 : c'est assez pour
  « sentir » la portée 2 ; si le HumanGate dit non, passer à +35 %.
- Décision niveau 1 à 30 R (2ᵉ seuil) : A adopter (chaton 2 : +0,5 R/s) vs B améliorer (20 R : clic ×2). Idle : A seul rapporte.
  Actif 6 clics/s : B = +6 R/s ≫ A = +0,5 R/s. **Non-dominance attendue : A en idle, B en actif** (H1) — c'est exactement ce que la
  sonde mesure sur `horizon_frames` (300 frames = 5 s : A donne +2,5 R, B donne +30 R en actif / 0 en idle → inversion).

## 4. Ce qui reste NOT_FOUND volontairement
- Niveau 3 et au-delà : hors « plusieurs heures » (interdit P0). L'album complet (3 rares) est l'objectif final visible.
- Audio/feedback : conventions héritées du World Scan via l'Art Bible (Lot A), pas de nombre ici.

## 5. Consommation prévue (qui lit quoi)
design → `tasks.json` s2.7 (tant que `design_intent` n'est pas injecté : Lot D) → GM Opus reprend ces invariants TELS QUELS dans
`game_master.progression_metrics` (contrat s2.7 : « jamais de nombre inventé sans why ni source » ; source = `design:calibration_v1.<id>`)
→ `economy.json` → Builder (lecture registre, gate `economy_bypass`) → Prisme (`target` → `target_frames`) → sonde → HumanGate.
