# Contexte courant TCS

## Session 2026-07-19 (chat studio/méta) — AUDIT « déclaré ≠ exécuté » : 3 strates mortes trouvées
- **Déclencheur** : Pierre colle une évaluation ChatGPT d'ECC (Everything Claude Code) et de
  Donchitos/Claude-Code-Game-Studios, demande la comparaison avec le studio réel. Résultat de
  l'inventaire : TCS a DÉJÀ les greffes recommandées (mémoire, hooks, search-first via
  `knowledge_base/` + `reuse_ratio.mjs`, tiering `escalate.py`) et une couche qu'aucun des deux
  n'a — la **falsifiabilité** (oracles non-LLM, mutation, verdict HMAC). Manquent réellement :
  skill library exécutable + `/learn-project`.
- **3 dérives DÉCLARÉ↔EXÉCUTÉ prouvées** (le vrai résultat de la journée) :
  1. `.claude/agents/*.md` (15) — **jamais chargés** : `description:` (champ REQUIS) absent partout ;
     aucun code du repo ne les lit ; `deploy_studio.sh` les ÉCRIT sans jamais les relire.
     `role:`/`domain:`/`escalates_to:`/`forbidden_paths:` = champs custom lus par RIEN. 4 `domain:`
     pointent vers des dossiers disparus (`design/`, `assets/godot/`, `src/neural/`, `src/search/`).
  2. `lab/agent_policy/tool_permission_matrix.json` (62 règles, 5 schémas, mai 2026) — **câblée mais
     l'application ignore `agent_id`** (`autopilot.py:843-854` autorise dès qu'UNE règle quelconque
     autorise l'outil) et **échoue en mode ouvert** (matrice absente → ALLOW), contredisant son
     propre `deny_by_default: true`.
  3. **3 taxonomies d'agents** qui ne se parlent pas : `producer/code/qa/review/docs` (matrice) ·
     `producteur-dur/qa-lead/...` (.claude/agents) · `builder/architect/...` (contrats Forge).
- **Lecture** : ce n'est pas du vide, c'est de la SÉDIMENTATION. Le mort date de mai-juin, le vivant
  (Forge, contrats, oracles, `knowledge_base`) de juillet. La V1 n'a jamais été débranchée.
- **RÉPARÉ (non commité)** : 13 fiches d'agents — `description:` ajoutée, `model:` en ALIAS
  (`sonnet`/`haiku`, jamais d'ID daté), champs custom supprimés (info reversée dans le CORPS, qui
  est le vrai system prompt), **`disallowedTools: Write, Edit` sur les 13**. Prouvé empiriquement :
  les 13 se chargent à chaud ET le harness affiche « All tools except Write, Edit » → `description`
  manquante ÉTAIT la cause, et `disallowedTools` EST honoré. `gameplay-programmer` et
  `godot-shader-specialist` laissés INTACTS (rôles possiblement sans objet — décision Pierre).
  Règle tenue : **aucun chemin de remplacement inventé** → « périmètre à déterminer ».
- **CRÉÉ (non commité)** : capteur `Declared → Referenced` — `scripts/forge/declaration_readers.mjs`
  + `declaration_watchlist.json` + 25 tests verts. Exit 0 (mesure, pas garde). Détecte les 3 cas
  ci-dessus ; **témoin négatif prouvé sur le repo réel** (`studio_expectations.json` = 0 constat).
  A redécouvert SEUL le défaut `agent_id`. Limite assumée et imprimée : **mention ≠ lecture**
  (garantit seulement « aucune mention ⇒ aucune lecture »). Ne prétend ni Executed ni Verified.
- **Doctrine dégagée** (échange Pierre×ChatGPT) : la vraie question n'est plus « réparer les agents »
  mais « **empêcher qu'un mécanisme déclaré reste inexécuté pendant des mois sans être détecté** ».
  Échelle `Declared → Referenced → Executed → Verified` ; le barreau 2 est peu coûteux et capture
  l'essentiel. Principe : **la force de la garantie doit être proportionnée au rayon d'explosion** ;
  garde CENTRAL (settings.json, indexé sur `agent_type`), jamais garde auto-porté par la fiche.
- ⏸️ **4 décisions Pierre en attente** : (a) correctif `autopilot.py` = lane STUDIO ; (b) sort des
  2 agents inertes ; (c) convergence des 3 taxonomies (prérequis à tout compilateur de politique) ;
  (d) `games/auto_battler/` — chantier ACTIF — n'est le domaine d'aucun agent.
- ⚠️ **Fiabilité des sous-agents** : sur 6 rapports, **1 citation de doc FABRIQUÉE** (sur le point le
  plus décisif) + 2 erreurs de comptage, toutes attrapées par re-vérification. La règle « confronter
  chaque rapport au réel » a payé 3 fois aujourd'hui. Ne jamais bâtir sur un rapport non recoupé.

## Session 2026-07-19 (chat auto battler, suite) — Incrément 2 forgé + mergé, calibration Forge
- **Calibration Forge** : doc corrigée (hook dur `pretool_forge_guard` ACTIF depuis 2026-07-10,
  pas différé — 2 docs stales corrigées) ; `FORGE_FORMATS_REFERENCE.md` créé (formats réels
  wiremap/triage/blueprint oracle/verdict, exemples tirés du run i1) ; `COMBAT_GATE_PREP.md`
  créé (prérequis incrément Combat, ne tranche rien). Committé+poussé `501491f`.
- **Gates infra Combat posés** (ratifiés Pierre en session) : profil Forge `increment` ajouté
  à `scripts/forge/dispatch.py` (test dédié, suite verte 432 passed), convention run_dir
  `auto_battler_i<N>`, valeurs v0 (Board 8×8 miroir, Mana→0 après Cast, `tick_limit=50`
  calculé sourcé TFT). Committé+poussé `da15b37`.
- **QB-6 ratifiée** (anéantissement mutuel = match nul, aucune perte de Life) et **DP-9 ajoutée**
  (Bench plein → Buy refusé, gap signalé par 05_ECONOMY_BIBLE.md lui-même, comblé avant build) —
  verbatim dans `HUMANGATE_2026-07-19_QB6.md` / `HUMANGATE_2026-07-19_DP9.md`.
- **Incrément 2 « preparation + economy » FORGÉ EN RÉEL** (`auto_battler_i2`, profil `increment`,
  s3→s12 exécutés réellement — decompo/archi/wiremap/red-team-plan Qwen/build/oracles/
  mutation/red-team-code Opus/verdict signé). Red-team code a trouvé HIGH-1 (compteur
  module-global cassant le déterminisme replay, INV-19) → **corrigé et prouvé** avant merge.
  Verdict `HUMANGATE_READY_WITH_OBJECTION`, authentique (`forge.verify_run` exit 0).
  **HumanGate Pierre : MERGE ratifié** → committé `e72a0e4`. Petite itération déléguée pour
  les 4 findings MED (réservation Pool réelle, Buy lié à la Shop, payloads Events alignés
  bible, faux Event Spawn retiré) → **corrigés, re-vérifiés indépendamment** (92/92 tests,
  91/98 mutants=92.9%, 4 oracles verts), committé `bccbef9` (inclut aussi `shop/shop.mjs`
  oublié du commit de merge — repéré par re-vérification indépendante, pas par le sous-agent).
  **Rien poussé** (gate séparé, non demandé).
- Reste ouvert : incrément 3 Combat toujours bloqué sur l'incrément « economy » côté
  bibles/gate (celui-ci est maintenant FAIT — débloque potentiellement la suite), LOW-6
  (biais mineur tirage Shop, non traité, non demandé).

## Session 2026-07-18 (archivée)
Archive complète : `journal/context-archive-2026-07-18.md` — architecture 16 bibles auto_battler
RATIFIÉE, 4 HumanGates, corpus 00–07, run Forge `auto_battler_i1` s0→s12 mergé (`44592b3`).

## Historique 2026-07-09 → 2026-07-15 (archivé)
Archive complète : `journal/context-archive-2026-07-14-15.md` — mémoire qui compose (Forge),
shmup run1, pipeline 3D, factory contractuelle mergée master.

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Aucune session d'optimisation moteur sans HumanGate explicite.
- **Lane STUDIO : GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`, `scripts/studioV2/`, lanceurs.
  Lire OK, modifier = HumanGate. Hors gel : `tests/studioV2/`, `studioV2_MIGRATED_HOLD/`.
  ⇒ `lab/agent_policy/` + taxonomie `producer/code/qa` = **legacy de fait** ; plus que 2 taxonomies
  vivantes (`.claude/agents/` + contrats Forge). Détail : [[lane_studio_frozen]].
- **Factory réorientée** : jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun).
- Actions pendantes : re-triage ledger (IMP Rocky → FROZEN, revue HumanGate avant écriture) ; spec produit Belote
  (IA à niveaux, défi-par-seed, PWA mobile-first) ; étage 2 = table WebRTC, multi public gated.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
