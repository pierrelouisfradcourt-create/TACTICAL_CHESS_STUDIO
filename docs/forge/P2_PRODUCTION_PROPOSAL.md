# P2 — « Production de matière réelle » : bibliothèque de briques de jeu + jeu laboratoire

- **Date** : 2026-07-12 — source : session Claude Code, sur directive Pierre (reconnecter
  la boucle de validation P1 à une boucle de production concrète).
- **Statut** : **PROPOSED — gate Pierre requis avant toute implémentation.**
- Chaque affirmation est étiquetée **[EXISTE]** (prouvé par inspection/exécution),
  **[DOCUMENTÉ]** (écrit mais non exécuté) ou **[PROPOSÉ]** (n'existe pas encore).

---

## 1. Audit de l'architecture actuelle

### Ce qui existe réellement (vérifié par inspection ce jour)

**[EXISTE] Une usine qui produit des jeux — mais chaque jeu est une île.**
- 4 jeux mjs complets et oracle-verts : `games/breakout`, `games/collect_runner`,
  `games/survival_arena`, `menagerie_tactics` (worktree). Convention de facto stable
  (~11 fichiers) : `game.mjs` (moteur headless pur) · `level.mjs` (génération seedée) ·
  `render.mjs`/`input.mjs`/`index.html`/`server.mjs` (UI sans règles) ·
  `logic.test.mjs`/`properties.test.mjs`/`e2e.mjs`/`solvability.mjs`/`run-oracle.mjs`.
- **Zéro import croisé entre jeux** (grep vérifié) : chaque moteur réinvente RNG seedé,
  boucle step/dt, collisions, statuts ACTIVE/WON/LOST. `breakout/game.mjs` 298 lignes,
  `collect_runner/game.mjs` 247 lignes — recouvrement conceptuel massif, réutilisation 0 %.
- Un seul template partagé : `scripts/forge/templates/solvability.template.mjs`.

**[EXISTE] La couche de confiance P0/P1 (l'acquis de P1) :**
- Pipeline forge : `driver.py` (machine à états), 17 contrats YAML s0→s12, gate mutation
  (`mutation_proof.py`, doctrine triage ratifiée), `is_clean_pass()`, verdict signé.
- Oracles non-LLM 4 volets par jeu (logic/properties/e2e Playwright/solvabilité — garde
  Windows corrigée 2026-07-12, exécution réelle prouvée).
- Capteur qualité advisory `scripts/quality_sensor/` (A1/A2/A3/A5 validés par sondes
  P1.1, fixtures de non-régression `fixtures/p1/` + `check.mjs`).
- Méthode expérimentale complète (contrat → red-team → adjudication → ratification →
  expérience → conclusion limitée) — réutilisable telle quelle pour P2.

**[EXISTE, hors périmètre]** : `lab/chess_fantasy` (Python), `games/leviathan`
(TypeScript/Vite), jeux Godot — trois stacks différentes, non retenues comme socle
(la convention mjs est la seule couverte par les oracles forge).

### Ce qui manque pour produire

| Couche (architecture cible) | État |
|---|---|
| A. Bibliothèque de connaissance (définitions, templates, métadonnées) | **N'EXISTE PAS** — aucun catalogue, aucun data model de brique |
| B. Runtime d'exécution | **EXISTE implicitement** — la convention step(dt,input)/view()/readDebug() est le runtime, mais elle n'est écrite nulle part comme contrat |
| C. Agents de création | **EXISTE partiellement** — s9-build écrit chaque jeu FROM SCRATCH ; aucune sélection/assemblage de composants |
| D. Validation | **EXISTE et fort** — oracles, mutation gate, capteur, fixtures ; c'est l'acquis P1 |

**Diagnostic** : le système valide très bien ce qu'il produit, mais produit chaque fois
à partir de rien. Le risque nommé par Pierre (auto-validation sans matière) se corrige
en donnant à la couche D un flux d'objets **assemblés depuis des composants prouvés** —
pas en ajoutant de la gouvernance.

---

## 2. Proposition P2

### Objectif (une phrase)

> Qu'un nouveau jeu se construise en **assemblant des briques exécutables déjà
> prouvées** au lieu de tout réécrire — mesuré par un taux de réutilisation mécanique,
> validé par les oracles P0/P1 existants sur un premier jeu laboratoire.

### Principes (dérivés des NE PAS de la directive)

1. **Briques = code exécutable importé** (modules `.mjs` purs, testés), PAS un DSL
   déclaratif interprété. Le data model (JSON) décrit la brique, il ne l'exécute pas.
2. **Extraction avant invention** : les 10 premières briques sont extraites du code
   prouvé de breakout / collect_runner / menagerie — pas conçues sur papier.
3. **Aucun nouveau moteur** : le runtime = la convention existante, formalisée en une
   page (contrat d'interface) + 2 briques noyau.
4. **Aucun LLM dans la boucle d'exécution** ; l'agent de création reste l'étape s9-build
   du forge existant, à qui on donne un catalogue à consommer.
5. **Jeux existants GELÉS** : on n'y touche pas, aucune migration rétroactive. La
   non-régression P2 = leurs oracles restent verts, octet pour octet.

### Incréments (ordre de construction)

| Incr. | Contenu | Preuve de sortie | Taille |
|---|---|---|---|
| **P2.0** | Socle : data model de brique + contrat runtime (1 page) + 4 briques noyau extraites + `validate-bricks.mjs` | tests briques verts · catalogue validé · jeux existants intacts (sha) | **M** |
| **P2.1** | 6 briques restantes (entités, comportements IA, level design) | idem + chaque brique a ≥1 exemple exécutable | **M** |
| **P2.2** | **Jeu laboratoire** assemblé depuis la bibliothèque, via le pipeline forge (contrats, mutation gate, verdict signé) | oracle 4 volets vert · solvabilité RÉELLE · mutation 100 %-ou-triage · taux de réutilisation mesuré | **L** |
| **P2.3** | Boucle retour : capteur P1 sur le jeu lab + rapport `P2_RESULTS.md` (métriques honnêtes) | fixtures/p1 vertes aux bornes · rapport avec verdicts séparés | **S** |
| **P2.4** *(gate séparé)* | 2e jeu assemblé (genre différent) — le VRAI test de la bibliothèque : la réutilisation survit-elle au changement de genre ? | reuse_ratio ≥ celui du jeu 1 sur les briques core, ou échec documenté | **L** |

P2.4 est volontairement hors du premier engagement : une bibliothèque « validée » par
un seul consommateur ne prouve rien — mais on ne construit pas deux jeux avant d'avoir
vu le premier.

---

## 3. Design de la première bibliothèque

### Organisation des fichiers [PROPOSÉ]

```
bricks/
  CATALOG.json                 # index généré, jamais édité à la main
  RUNTIME_CONTRACT.md          # le contrat d'interface (1 page) : step/view/readDebug/seed
  core/
    rng_seeded/
      brick.json               # data model (schéma §3.2)
      rng_seeded.mjs           # le code — module pur, zéro dépendance
      rng_seeded.test.mjs      # node --test
      example.mjs              # exemple exécutable minimal (node example.mjs → exit 0)
    fixed_step_loop/ ...
  entity/   ...
  behavior/ ...
  level/    ...
  rules/    ...
scripts/bricks/
  validate-bricks.mjs          # oracle bibliothèque : schéma + tests + exemples + deps acycliques
  reuse-ratio.mjs              # métrique mécanique de réutilisation d'un jeu
```

- Séparation A/B/C/D demandée : **A** = `brick.json` + `CATALOG.json` +
  `RUNTIME_CONTRACT.md` (connaissance) · **B** = les `.mjs` importés par les jeux
  (runtime) · **C** = s9-build forge, dont le contrat est étendu pour recevoir le
  catalogue (« consulte CATALOG.json, importe ce qui convient, n'écris du code
  spécifique que pour ce qui n'existe pas ») · **D** = `validate-bricks.mjs` +
  oracles/capteurs existants, inchangés.

### Schéma de données d'une brique [PROPOSÉ]

```json
{
  "id": "behavior/chase",
  "version": 1,
  "category": "behavior",
  "summary": "Poursuite pas-à-pas déterministe vers une cible sur grille",
  "params": {
    "speed": { "type": "int", "range": [1, 4], "default": 1 },
    "lineOfSight": { "type": "int|null", "default": null }
  },
  "deps": ["core/grid_2d"],
  "constraints": [
    "déterministe : aucun Math.random, RNG injecté uniquement",
    "pur : aucun accès DOM/fs/réseau, état passé en argument"
  ],
  "extracted_from": "menagerie_tactics/bot.mjs (worktree 87e9ec4)",
  "examples": ["example.mjs"],
  "metrics": { "tests": "chase.test.mjs", "mutation_eligible": true }
}
```

`validate-bricks.mjs` (oracle non-LLM) vérifie : schéma complet · `deps` existent et
sont acycliques · tests verts · chaque `example.mjs` sort en exit 0 · aucune brique
n'importe hors de `bricks/` (pureté) · CATALOG.json ≡ contenu du disque.

### Les 10 premières briques (extraction, source prouvée citée)

| # | id | Catégorie directive | Extrait de [EXISTE] |
|---|---|---|---|
| 1 | `core/rng_seeded` | gameplay core | xorshift32 (`breakout/level.mjs`) + mulberry32 (`sensor.mjs`) — dédupliqué 3× |
| 2 | `core/fixed_step_loop` | boucle tour/temps réel | contrat step(dt,input) + machine ACTIVE/WON/LOST (`breakout/game.mjs`) ; mode tour-par-tour (`menagerie/game.mjs`) |
| 3 | `core/grid_2d` | déplacement | grille, occupation, distances (`collect_runner`, `menagerie/level.mjs`) |
| 4 | `core/aabb_physics` | déplacement continu | aabb + cercle-aabb + face touchée (`breakout/game.mjs:34-64`) |
| 5 | `entity/actor` | joueur/ennemi | pos, hp, stats, alive (`menagerie/bestiaire.mjs`) |
| 6 | `entity/pickup` | récompense/objet | collecte + score (`collect_runner/game.mjs`) |
| 7 | `behavior/chase` | poursuite | pas-vers-cible déterministe (`menagerie/bot.mjs`) |
| 8 | `behavior/avoid` | évitement | pas-opposé borné grille (inverse de chase, même source) |
| 9 | `level/spawn_seeded` | génération/placement | placement seedé sous contraintes de distance (`collect_runner/level.mjs`, `menagerie/level.mjs`) |
| 10 | `rules/win_lose` | victoire/défaite/difficulté | conditions paramétrables : collecte N · survie T pas · contact fatal · hp=0 (union des 4 jeux) |

Couverture directive : attaque/défense = `entity/actor` (hp, dégâts) + `behavior/chase`
opportuniste ; ressources = `entity/pickup` ; difficulté paramétrable = params de
`level/spawn_seeded` + `rules/win_lose`. « Obstacle » = cases bloquées de `core/grid_2d`
(pas une brique séparée au départ — YAGNI).

---

## 4. Premier jeu laboratoire : `games/foragers` [PROPOSÉ]

- **Genre** : arène top-down sur grille, **tour-par-tour déterministe** — le joueur
  récolte des ressources pendant que des chasseurs le poursuivent ; obstacles fixes ;
  victoire = N ressources, défaite = hp épuisé au contact.
- **Pourquoi ce choix** :
  1. il consomme **les 10 briques** (aucune brique morte au premier consommateur) ;
  2. tour-par-tour déterministe ⇒ solvabilité par bot triviale à écrire et RÉELLE
     (leçon [[oracle_solvability_lesson]] : un bot doit gagner), capteur P1 applicable ;
  3. genre distinct des 4 jeux existants (pas un re-forge déguisé) mais entièrement
     couvert par du code extrait — le test honnête de l'extraction ;
  4. difficulté paramétrable (nb chasseurs, vitesse, densité ressources) = terrain
     naturel pour `/balance-check` ensuite.
- **Assemblage** : via le pipeline forge normal (driver, s9-build avec catalogue,
  mutation gate, verdict signé HUMANGATE_READY) — pas un chemin spécial.
- **Mesure de son évolution** :
  - les preuves P0 existantes : oracle 4 volets + mutation 100 %-ou-triage ;
  - **`reuse_ratio` [PROPOSÉ]** : part des modules du jeu importés depuis `bricks/`
    vs code spécifique (mesure mécanique par analyse des imports, script
    `reuse-ratio.mjs`) — cible indicative ≥ 40 % des lignes moteur, échec documenté
    sinon (règle Pierre : un échec est un résultat valide) ;
  - solvabilité paramétrique : le bot gagne-t-il encore quand la difficulté monte
    (3 crans mesurés) ;
  - capteur P1 advisory en boucle retour (P2.3).

---

## 5. Plan d'exécution (réaliste, gates inclus)

| Semaine | Incrément | Fichiers principaux | Oracle de sortie | Gate Pierre |
|---|---|---|---|---|
| **S1** | P2.0 socle + 4 briques core | `bricks/` (structure), `RUNTIME_CONTRACT.md`, briques 1-4, `validate-bricks.mjs` | `node scripts/bricks/validate-bricks.mjs` exit 0 · jeux existants intacts (sha avant/après) | **go P2.0** (ce document) |
| **S1→S2** | P2.1 briques 5-10 | 6 dossiers briques + exemples | idem, 10/10 | fin d'incrément : revue catalogue |
| **S2→S3** | P2.2 jeu laboratoire | `games/foragers/` (convention 11 fichiers), extension contrat s9 | oracle 4 volets vert · solvabilité 3 crans · mutation gate · `reuse-ratio.mjs` mesuré | **ratification genre + go build** ; verdict signé → HumanGate |
| **S3** | P2.3 boucle retour | rapport `P2_RESULTS.md`, run capteur | fixtures/p1 vertes aux bornes · métriques honnêtes | revue résultats ; **décision P2.4** |
| *(S4+)* | P2.4 2e jeu (optionnel) | — | reuse_ratio comparé | gate séparé |

**Règles reconduites de P1** : jamais de commit/push sans go explicite · un échec est un
résultat valide, zéro tuning post-hoc · chaque incrément a son oracle non-LLM AVANT le
code (TDD) · fixtures/p1 = borne de non-régression permanente · verdicts séparés.

**Risques nommés** :
- extraction qui dérive en réécriture (mitigation : chaque brique cite sa source
  `extracted_from`, diff de comportement testé contre la source) ;
- bibliothèque à consommateur unique = fausse validation (mitigation : P2.4 planifié,
  conclusion P2 limitée tant qu'il n'a pas eu lieu) ;
- E2/P1.2a en attente de ratification : P2 n'y touche pas, les deux chantiers sont
  disjoints (capteur consommé read-only en P2.3).

---

## Gates Pierre demandés maintenant

1. **Go/no-go P2.0** (socle + extraction 4 briques core) — aucune implémentation avant.
2. Ratification du **genre du jeu laboratoire** (`foragers`, arène récolte/poursuite
   tour-par-tour) — ou contre-proposition.
3. Confirmation du **gel des jeux existants** (aucune migration rétroactive en P2).

```
software_verdict: (aucun — proposition, rien d'implémenté)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (audit §1 = inspection réelle du repo ce jour)
claim_verdict: NO_CLAIM_ALLOWED
```
