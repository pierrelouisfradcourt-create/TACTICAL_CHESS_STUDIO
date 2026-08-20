# Archive contexte — session 2026-07-19 (chat studio/méta)

Archivé le 2026-07-19 depuis `00_CURRENT_CONTEXT.md` (rotation < 100 lignes). Contenu verbatim.

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
