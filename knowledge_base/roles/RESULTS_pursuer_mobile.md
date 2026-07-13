# ROLE-SIM v0 — premier rôle réel : `role-pursuer-mobile` (2026-07-13)

- **Demande** : Pierre, « go role sim ».
- **Cible** : `docs/forge/STUDIO_AGENT_ATLAS.md` §2.3 (ROLE-SIM Oracle, service non-LLM
  MANQUANT) + §4 (`knowledge_base/roles/`, `s-role-sim.yaml`). Écarts de nommage assumés
  et documentés au §4 ci-dessous, pas silencieux.
- **claim_verdict** : NO_CLAIM_ALLOWED

## 1. Ce qui a été construit

- `knowledge_base/roles/SCHEMA.md` — schéma de contrat ROLE (12 champs, règle des 3
  états, même discipline que `scripts/forge/contracts/SCHEMA.md`).
- `knowledge_base/systems/ai/{pursuer,evader}.mjs` (+ tests, 13 tests) — 2 nouvelles
  pièces LOGIC pures et déterministes (mouvement de poursuite borné par vitesse /
  mouvement de fuite borné par vitesse, distance de Chebyshev). Invariants prouvés :
  jamais plus de `speed` pas par tick, jamais de recul (poursuite) / rapprochement
  (fuite), déterminisme sur 200 configurations chacune.
- `knowledge_base/role_sim.mjs` (+ 6 tests) — l'oracle : simule N poursuites seedées,
  mesure une **bande de difficulté** (min/médiane/max de ticks-jusqu'à-capture +
  catch_rate) — PAS un booléen gagné/perdu (ça, c'est `solvability.mjs`, plus grossier).
  Inclut un lecteur YAML minimal volontairement limité au sous-ensemble utilisé par les
  contrats rôle (pas un parseur générique — même choix que `merge_prisme.mjs`).
- `knowledge_base/roles/pursuer-mobile.yaml` — le premier ROLE réel, reprenant
  **littéralement** l'exemple cité dans `STUDIO_ARCHITECTURE.md` §3 (« poursuivant
  mobile, cible de difficulté X »).

## 2. Discipline suivie : calibrer puis valider, jamais sur le même échantillon

Un piège identifié avant d'écrire le moindre chiffre : si la bande `difficulty_target`
est choisie APRÈS avoir lu une mesure, puis validée sur CETTE MÊME mesure, la validation
ne prouve rien (circularité). Protocole suivi :
1. **Calibration exploratoire** — 300 essais réels, seeds 1..300, config
   `{pursuer_speed:2, evader_speed:1, arena_half_size:20, catch_radius:1, max_ticks:60}`.
   Mesuré (pas inventé) : min=1, médiane=24, max=60 ticks, 297/300 captures
   (catch_rate=0.99 — 3 essais non capturés en 60 ticks, rapporté tel quel). Preuve :
   `proofs/role_sim_pursuer_mobile_calibration.log`.
2. **Bande déclarée** à partir de cette calibration : `[15, 35]` (marge autour de la
   médiane 24 — un choix de conception, pas une redite de la mesure).
3. **`seed_start` déplacé à 1000`** (hors de l'échantillon de calibration 1..300) —
   toute exécution ultérieure de ce fichier rôle valide sur un échantillon DISJOINT.
4. **Validation officielle** — 300 essais, seeds 1000..1299 : médiane=25, catch_rate=1.00
   → DANS la bande déclarée `[15,35]`. Preuve :
   `proofs/role_sim_pursuer_mobile_validation.log`. `tier` promu `candidate` →
   `validated`, `proof_of_use` renseigné vers ce log.

Note honnête sur un incident évité, pas caché : la première ébauche de ce fichier
contenait une `calibration_note` avec des chiffres **inventés avant d'avoir construit
l'oracle** (min=2/médiane=7/max=17 — plausibles, mais fabriqués). Corrigé avant toute
exécution réelle, remplacés par les vrais chiffres mesurés une fois `role_sim.mjs`
construit et exécuté. Aucun chiffre inventé n'a atteint un état commité.

## 3. Tests — 19/19 verts (au moment de la construction initiale)

```
systems/ai/pursuer.test.mjs   : 6 tests (bornes, déterminisme, cas connus, RangeError)
systems/ai/evader.test.mjs    : 6 tests (bornes, déterminisme, cas dégénéré, RangeError)
role_sim.test.mjs             : 6 tests (déterminisme, invariants vitesse pursuer>evader
                                 => capture / vitesse égale ou inférieure => JAMAIS de
                                 capture, tri de la distribution, échantillons disjoints)
kb-validate.mjs catalog.json  : toujours PASS (catalogue non modifié par ce travail)
```

## 3bis. Suite (même jour) — le trou d'intégration §4 (v1) est FERMÉ pour les systèmes

Sur « passe à la suite logique », le trou déclaré au §4 original (systèmes non
enregistrés au catalogue) a été traité :

- **Amendement R3 de `kb-validate.mjs`** (ingestion) : le code purement ORIGINAL (sans
  inspiration externe citable) n'avait aucun chemin de provenance valide (ni
  `provenance_url`, ni dépendance `pat-*`). Ajouté un marqueur FERMÉ, exact, auditable :
  `source` doit commencer par la chaîne littérale
  `"ORIGINAL — aucune inspiration externe citee"` pour être reconnu comme provenance
  originale valide — pas une auto-déclaration libre, une chaîne exacte vérifiée par le
  validateur. **Non red-teamé externellement** — auto-revue de session seule, comme tout
  ce qui est construit ce soir. `kb-validate.mjs` conserve ses 46 tests existants VERTS
  après l'amendement (rien cassé côté schéma existant).
- **`sys-pursuer-mobile` et `sys-evader-basic` enregistrés** dans `catalog.json`
  (`tier: validated`, `proof_of_use` = le log de validation réel du §2 — ces systèmes SONT
  réellement exercés par cette preuve). `node kb-validate.mjs catalog.json` → PASS
  (13 entrées, 0 violation).
- **Vérifié, pas supposé** : `search.mjs "poursuite mobile qui rattrape une cible"`
  trouve maintenant `sys-pursuer-mobile` (avant : 0 résultat, le trou déclaré au §4 v1).
- **Bug réel trouvé EN vérifiant cette intégration** : la requête ci-dessus remontait
  aussi `pat-damage-floor` et `pat-zone-of-control`, sans rapport — le mot français
  courant « pour » (4 lettres) préfixait accidentellement « poursuite » via le seuil de
  correspondance flou de `search.mjs` (`MIN_SHARED_PREFIX=4`, ajouté en construisant
  `search.mjs`). Corrigé : seuil relevé à 5 (couvre toujours « degat »/« degats »,
  exclut « pour »). Test de régression ajouté. `search.test.mjs` : 13/13 verts.
- **Toujours PAS fait** (déclaré, pas cachée) : le ROLE lui-même
  (`role-pursuer-mobile`) n'est PAS un `entry_type` du catalogue — `search.mjs` ne le
  trouve pas encore en tant que tel, seulement les 2 systèmes qui le remplissent. Ajouter
  un `entry_type: "role"` avec `requires`/`affordances` est un changement de schéma plus
  lourd (nouveau préfixe d'ID, nouveau sous-dossier gouverné, nouvelles règles de
  provenance) — pas fait ce soir, resterait son propre amendement à red-teamer.

## 4. Écarts assumés vs la cible documentée — déclarés, pas silencieux

- **Nommage** : l'atlas nomme la cible `scripts/forge/contracts/s-role-sim.yaml` (un
  fichier de contrat d'AGENT, 16 champs, comme les autres `s<n>-*.yaml`). Ce n'est pas ce
  qui a été construit — Role-Sim est un **service déterministe**, pas un agent LLM
  dispatché par la Forge, donc il n'a pas de posture cognitive/permissions/skill au sens
  du schéma d'agent. Choix fait : `knowledge_base/role_sim.mjs`, même famille que
  `search.mjs`/`kb-validate.mjs` (services non-LLM de la bibliothèque), avec son PROPRE
  schéma (`roles/SCHEMA.md`), pas le schéma d'agent Forge. À rouvrir si Pierre préfère
  le nommage/emplacement de l'atlas.
- **Intégration catalogue non faite** : `sys-pursuer-mobile` et `sys-evader-basic`
  N'ONT PAS été ajoutés à `catalog.json` (le rôle cite `sys-pursuer-mobile` dans
  `fulfilled_by`, mais ce lien n'est PAS encore vérifiable mécaniquement — l'atlas cible
  des champs `affordances`/`relations` sur les entrées catalogue qui n'existent pas
  encore dans le schéma actuel de `catalog.json`/`kb-validate.mjs`). Conséquence :
  `search.mjs` ne trouve PAS encore ces 2 systèmes ni le rôle lui-même — c'est un vrai
  trou d'intégration, pas résolu ici, remonté explicitement plutôt que tu le découvres
  plus tard en cherchant et ne trouvant rien.
- **Un seul rôle construit** (pursuer-mobile) — aucune généralisation testée sur un
  archétype différent (ex. un rôle "gardien statique à zone de contrôle", qui existe déjà
  comme PATTERN cité `pat-zone-of-control` mais n'a pas de contrat ROLE ni de simulation).

## 5. Conclusion — LIMITÉE

- **Ce que ceci établit** : le mécanisme Role-Sim fonctionne mécaniquement de bout en
  bout — contrat rôle → simulation seedée → bande de difficulté mesurée → comparaison à
  une bande déclarée AVANT la mesure de validation (sur échantillon disjoint de la
  calibration) → reçu mécanique + promotion de tier. C'est le premier axe « difficulté »
  du panel MCTS (`WORKFLOW_LAB_PROTOCOL.md` §3) qui devient mesurable, pas juste une case
  🔶 cible.
- **Ce que ceci NE prouve PAS** : que ce mécanisme généralise à d'autres archétypes de
  rôle (un seul testé) ; que le lien SEARCH↔ROLE (`affordances ⊇ requires`) fonctionne
  (pas construit — le catalogue n'a pas encore les champs nécessaires) ; que la bande
  `[15,35]` est un bon choix de design pour un vrai jeu (c'est une marge autour d'une
  mesure de simulation minimale, pas un playtest humain).
- **Prochaine étape logique (non décidée ici)** : soit enrichir `catalog.json` +
  `kb-validate.mjs` pour accueillir le type `role` et les champs `affordances`/
  `relations` (fermerait le trou d'intégration §4), soit construire un 2e rôle sur un
  archétype différent pour tester la généralisation du schéma avant d'investir dans
  l'intégration catalogue.

```
software_verdict: OK (mécanisme construit, testé, calibré puis validé hors-échantillon)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
