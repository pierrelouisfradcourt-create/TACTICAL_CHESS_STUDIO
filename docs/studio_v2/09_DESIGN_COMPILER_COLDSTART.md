# LE COMPILATEUR DE DESIGN EMPIRIQUE — 3 ARTEFACTS (cold-start → learned)

*Formalisation de la boucle fermée proposée par Pierre, en version implémentable dès n=0.*
*2026-06-28.*

---

## 1. CE QU'ON CONSTRUIT (modèle validé)

Un **compilateur de design empirique à mémoire causale** :

```
intention → CERFA (grammaire) → /plan (compilation conditionnelle) → build Godot
   → exécution réelle + télémétrie (oracle) → post-mortem (delta attendu/réel)
   → mise à jour CERFA + mémoire causale + retrieval   ⟳
```

CERFA = grammaire adaptative · /plan = compilation conditionnée par précédents · dataset = espace vectoriel causal · retrieval = sélection de précédents · post-mortem = rétropropagation de structure.

**La seule correction au modèle de Pierre : le séquençage.** La valeur de la boucle ≈ `f(nombre de jeux shippés avec télémétrie)`. Aujourd'hui ce nombre est **0**. Donc on construit les *schémas* maintenant, on les amorce avec des *priors empruntés*, et on n'investit dans les *modèles appris* (embedding, KNN) qu'une fois `n ≳ 8-12`.

---

## 2. LA CONTRAINTE COLD-START (binding)

| Couche | Besoin de données | État à n=0 | Décision |
|---|---|---|---|
| Memory (causale) | jeux + télémétrie | vide | **amorcer avec priors étiquetés** |
| Retrieval (KNN) | vecteurs de jeux | vide | **précédents = web + priors, pas KNN** |
| Vector space | jeux mesurés | vide | **définir le schéma du vecteur, pas l'apprendre** |
| CERFA | — | utilisable | **construire v1 maintenant** ✅ |
| /plan | priors + CERFA | utilisable | **construire maintenant** ✅ |
| Build / Exécution | un jeu | absent | **M1 : shipper le 1ᵉʳ jeu = produit la 1ʳᵉ donnée** |

Règle d'or : **chaque tour de boucle exige un jeu shippé.** Le taux de progression du compilateur est plafonné par la vélocité de ship, pas par la sophistication de l'infra. → priorité absolue inchangée : **M1 (template Godot jouable)**.

---

## 3. PRINCIPE COLD-START → LEARNED

1. **Démarrer savant, pas vide.** Amorcer la mémoire causale avec la connaissance du game design + la recherche marché (ex. « reward frequency ↓ → rétention ↓ »), chaque entrée `status: prior`.
2. **Étiqueter la provenance.** `prior` (emprunté) vs `observed` (vu dans 1 de nos jeux) vs `validated` (confirmé sur ≥ N de nos jeux). Jamais confondre une croyance et une mesure.
3. **Remplacer par la mesure.** À chaque post-mortem, promouvoir/pénaliser les règles selon NOTRE télémétrie. Les priors faux se font corriger ; c'est là qu'est l'apprentissage réel.
4. **Manuel d'abord, appris ensuite.** Similarité et retrieval à la main/heuristique tant que `n` est petit ; embedding entraîné + KNN quand le dataset le justifie.

---

## 4. ARTEFACT 1 — CERFA SCHEMA v1 (machine-readable)

Version structurée du manifeste (doc 08), lisible par le build et par le retrieval. `studio_kit/schemas/cerfa_v1.yaml` :

```yaml
cerfa_version: 1
game_id: ""                      # slug
identity:
  title_provisional: ""
  genre: ""                      # idle | survivor_like | ...
  subgenre: ""
  pitch: ""                      # 1 phrase
  hook: ""                       # différenciateur — CRITIQUE
  target_audience: ""
  platforms: [steam, itch]       # prérempli D
  price_eur: null                # prérempli par genre
  languages: [fr, en]            # prérempli D
market:
  comparables: []                # [{name, steam_appid, wishlists?, revenue_est?}]  ← retrieval web
  steam_tags: []                 # ×20
  wishlist_target: 5000
  demo_strategy: "early_then_nextfest"
core_loop:
  loop_30s: ""
  player_goal: ""
  win_condition: ""
  lose_condition: ""
  progression: ""
  meta_progression: ""           # prestige / meta-upgrades
  session_length_min: null
  difficulty_curve: ""
systems:
  list: []                       # [combat, economy, spawn, upgrades, ...]
  entities: []                   # [{id, type, attrs}]
  economy: {currencies: [], sources: [], sinks: []}
  balance_params: {}             # réglés ensuite par télémétrie
content:
  volume: {}                     # levels/waves/maps counts
  enemies: []
  items: []
presentation:
  art_style: ""
  art_rule: "human_or_cc0_or_reworked_ai"   # D — jamais IA brute shippée
  ui_screens: [menu, hud, game_over, options]   # ← studio_kit/models/ui
  audio: "cc0_or_licensed_or_stable_audio"
tech_godot:
  engine: "godot4"
  dimension: ""                  # 2d | 3d
  reused_models: []              # ← DB studio_kit (artefact lié)
  save_system: "studio_kit"
  exports: [windows, web]
assets:
  required: []                   # [{name, type, status: draft|reworked|shippable, source}]
telemetry:
  events: [session_start, session_end, level_complete, death, rage_quit, retry]
  fun_kpis: {retention_d1_target: 0.25}
  balance_thresholds: {}
scope:
  vertical_slice: ""
  mvp_definition: ""
  effort: ""                     # S|M|L
  kill_criteria: "wishlists < 1000 at D-30 -> defer/kill"
production:
  reused_from_kit: []
  new_to_build: []
  models_to_contribute_back: []
design_vector: {}                # artefact 2, calculé depuis ci-dessus
fill_status:                     # passe 1/2
  critical_fields_validated: false
  pending: []                    # liste des ⟦à creuser⟧
```

Chaque champ porte implicitement une **source** (D/G/K/M/⟦⟧, cf. doc 08) et un état `[auto]` ou `[✓ Pierre]`.

---

## 5. ARTEFACT 2 — DESIGN VECTOR v1

Le vecteur qui place un jeu dans l'espace de design. **v1 = features définies à la main** (interprétables) ; **v2 = embedding appris** quand `n` grandit.

```yaml
design_vector_version: 1
dimensions:                      # normalisées 0..1 sauf catégorielles
  players: enum[solo, coop, pvp]
  input_model: enum[keyboard, mouse, touch, controller]
  camera_type: enum[topdown, side, iso, first_person]
  session_length: 0..1           # log-normalisé (min → 1)
  loop_length_s: 0..1            # durée d'une itération de core loop
  reward_frequency: 0..1         # récompenses / minute
  enemy_density: 0..1
  progression_type: enum[none, linear, prestige, meta, hybrid]
  skill_vs_chance: 0..1          # 0=hasard, 1=skill pur
  content_volume: 0..1
  failure_punishment: 0..1       # 0=doux, 1=punitif
  pacing_curve: enum[flat, ramp, wave, spike]
  art_complexity: 0..1           # 0=minimal (idle), 1=lourd
  genre_tags: [..]               # multi-hot
similarity_v1: "distance pondérée (poids réglés à la main) sur dimensions ci-dessus"
similarity_v2: "embedding appris sur nos jeux + télémétrie (quand n >= ~10)"
note: "v1 est interprétable et suffit au cold-start. Ne PAS entraîner d'embedding avant d'avoir des jeux."
```

Le vecteur se **dérive automatiquement** du CERFA (passe 1). Il sert au retrieval (artefact 3).

---

## 6. ARTEFACT 3 — RETRIEVAL STRATEGY v1

```yaml
retrieval_version: 1
input: design_vector(new_game)   # depuis CERFA passe 1
mode_coldstart:                  # n < ~8 jeux internes
  sources:
    - web_comparables: "recherche Steam des jeux proches du genre/hook -> remplit market.comparables"
    - field_priors: "table de causalités empruntées (artefact 4) filtrée par contexte (genre, vecteur)"
    - claude_reasoning: "Cowork raisonne sur le design space à partir des comparables"
  output:
    - cerfa_prefill_suggestions     # remplit des champs de la passe 1
    - applicable_causal_priors      # règles cause->effet pertinentes
    - anti_patterns                 # erreurs connues à éviter (de l'échec d'autres)
mode_learned:                    # n >= ~8-12 jeux internes AVEC télémétrie
  method: "KNN(design_vector, notre_dataset)"
  returns:
    - nearest_games: [cerfa, plan_used, postmortem_delta, patches_applied]
    - promote: "priors confirmés par >=N de nos jeux -> status: validated"
switch_trigger: "passer en mode_learned quand on a >= 8 jeux shippés avec >= ~100 sessions chacun"
```

**Au cold-start, le « précédent optimal » n'est pas un de tes jeux (tu n'en as pas) — c'est le marché + la connaissance du domaine.** C'est honnête et déjà utile : ça pré-remplit le CERFA et signale les anti-patterns dès le jeu n°1.

---

## 7. ARTEFACT 4 (lié) — MÉMOIRE CAUSALE (seed)

`studio_kit/memory/causal_rules.yaml` — la « mémoire causale » de Pierre, amorcée :

```yaml
- id: CR-001
  context: {genre: [idle, survivor_like], progression_type: [prestige, meta]}
  cause: "reward_frequency trop faible"
  effect: "drop-off ~90 s"
  metric_delta: "session_time -42%"
  correction: "récompense/upgrade toutes les ~45 s"
  status: prior            # prior | observed | validated
  evidence_n: 0            # nb de NOS jeux qui confirment
  source: field_knowledge
- id: CR-002
  context: {all: true}
  cause: "page Steam publiée tard"
  effect: "wishlists insuffisants au lancement"
  metric_delta: "ventes 1ʳᵉ sem ~0,15× WL → base trop basse"
  correction: "page Steam le plus tôt possible"
  status: prior
  evidence_n: 0
  source: web_research
- id: CR-003
  context: {art: ai_generated_visible}
  cause: "art IA brut shippé"
  effect: "review penalty + non protégeable"
  metric_delta: "-53% reviews"
  correction: "art humain / retravaillé"
  status: prior
  evidence_n: 0
  source: web_research
```

Chaque post-mortem ajoute des `observed` et fait monter `evidence_n` ; au-delà d'un seuil → `validated`. Un prior contredit par nos données est pénalisé/retiré. **C'est la rétropropagation de structure, version disciplinée.**

---

## 8. LES 3 PATHOLOGIES (de Pierre) — mitigation

| Pathologie | Mitigation cold-start |
|---|---|
| **Overfitting / clones** | n petit force l'humilité ; règle de **diversité** (un nouveau jeu doit s'écarter d'un voisin sur ≥1 dimension à fort poids) ; le hook reste un champ CRITIQUE humain. |
| **Question explosion** (CERFA trop lourd) | cap sur les **champs critiques** ; on n'ajoute un champ que s'il a apporté de l'info sur ≥2 jeux (info-gain) ; pruning au post-mortem. |
| **False causality** | étiquetage `prior/observed/validated` + `evidence_n` ; **une règle ne devient `validated` qu'après ≥N observations indépendantes** ; corrélation ≠ cause tant que non testée par un patch contrôlé. |

---

## 9. CONVERGENCE & RÉ-ANCRAGE

Bien construit, le système converge (les mauvais jeux deviennent durs à générer, les questions s'affinent, les plans se stabilisent). **Mais la convergence est alimentée par les jeux shippés.** Zéro jeu → zéro convergence, aussi belle soit l'architecture.

Donc l'ordre reste :
1. **Maintenant :** figer ces 4 schémas (CERFA v1, vecteur v1, retrieval v1, causal seed) — c'est fait ici, coût ≈ 0, et ça rend la passe 1 du CERFA plus intelligente dès le jeu n°1.
2. **Ensuite (priorité absolue) :** **M1 — shipper le 1ᵉʳ jeu Godot.** C'est le seul acte qui transforme ce compilateur de « conceptuel » en « apprenant », parce qu'il produit la première ligne du dataset.
3. **Puis :** à chaque jeu, remplir le post-mortem → la mémoire causale gagne des `observed` → au bout de ~8-12 jeux, on passe le retrieval en mode appris (KNN + embedding).

Le compilateur est l'échafaudage. **Le carburant, ce sont les jeux shippés.** Ta première idée de jeu est donc l'étape la plus rentable : elle lance à la fois M1 et la première donnée du système.
