# Archive de contexte — 2026-07-23 (capteur branché · métriques · contrat orchestrateur)

> Extrait verbatim de `studio_brain/00_CURRENT_CONTEXT.md`, archivé le jour même : la session
> a été longue et seule sa part VIVE (ratifications, dérives ouvertes, priorité) reste dans le
> handoff. Travail clos décrit ici. Source : session Opus du 2026-07-23.

- **Le capteur de synchronisation est branché et conséquent.** `contract_sync` (Python) est agrégé
  par `studio_selfaudit.mjs` via `auditContractSync` — l'auto-audit du studio le lance à chaque
  exécution, y compris dans le hook `pre-commit`. Le champ `verification.capteur:` du contrat
  désigne enfin l'implémentation réelle + son point d'entrée.
- **Règle de conception tenue** (leçon [[session_lessons]] L17) : un capteur qui NE PEUT PAS tourner
  rend `non_evaluable` — statut DISTINCT de `derive`, qui **fait échouer l'audit**. Jamais de vert
  silencieux. Avant/après mesuré : l'auto-audit sortait **exit 0 « STUDIO ALIGNÉ »** le soir même où
  le contrat dérivait sur 4 règles. Falsifié sur copies hors dépôt : 1 citation retirée → 1 violation.
- **Les 4 violations résorbées — mais elles cachaient plus qu'un défaut de citation.** Comparaison
  skill↔code : (a) le skill listait **3 profils là où le code en a 7** ; (b) il décrivait une escalade
  de modèle **immédiate** alors que le driver **rejoue d'abord le même tier** (`pool_decision`,
  `pool_size=2`) — prose fausse et coûteuse en jetons, même forme que l'incident fondateur ;
  (c) il ignorait **totalement** le profil `standard`, ses 6 oracles et le budget d'empilement ;
  (d) il donnait Fable seul comme orchestrateur alors que `roles.yaml` dit Fable **ou Opus**.
  Corrigé en POINTANT vers les sources, jamais en redécrivant. Capteur vert, 635 tests / 3 échecs
  pré-existants.
- **3 contrats orphelins** (pas 2) : `s10d-oracle-visual`, `s9-build-godot`, `redteam-artdirector` —
  écrits, référencés nulle part. Nommés désormais dans les limites du skill. + défaut attrapé au
  passage : Node lisait en UTF-8 une sortie Python cp1252 → `JSON.parse` réussissant avec des
  **données fausses** (corrigé par `PYTHONIOENCODING` côté appel).
- **EN ATTENTE DE PIERRE** (inchangé) : sort du build Pong — (a) relancer avec `--step-timeout`
  élargi, ou (b) corriger `_salvage_on_timeout` (FIR-02, ratifié ⇒ gate) et faire juger l'existant.
  Ne PAS flipper le BLOCKED en OK dans `state.json`. + ratifications en suspens : retrait de Python
  de l'allow-list, deny mécanique sur `control/`.
- **ÉTAPE 4 (métriques + boucle) — FAITE, sur go Pierre.** L'inventaire a montré que la boucle
  n'avait pas besoin d'une couche : tout est déjà ÉCRIT, il manquait des LECTEURS. Trois branchés :
  (a) `driver.py::_cost_and_effort` → le rapport de fin de run porte enfin `cost` (via `run_cost`)
  et `effort` (escalades / pool / tentatives par étape) — clés AJOUTÉES, aucune renommée ;
  (b) `project_bible()` réellement injectée en s0 (`s0-contrat.yaml:26` la déclarait, aucun code ne
  l'appelait) — motif copié du pré-mortem, rien injecté si la bible est absente, prouvé octet-à-octet ;
  (c) `write_journal_index` appelée en fin de run (n'avait JAMAIS tourné), non bloquante.
  **655 passed, 3 failed pré-existants.** Chiffres inédits sortis d'un run réel : `card_engine` =
  **1,81 M tokens / 12 appels / 8264 s** ; `shmup_slice-20260714a` = 1 escalade, 16 tentatives,
  s9-build rejoué 3×. Ces nombres étaient sur le disque depuis des semaines, invisibles.
- **RÈGLE TENUE : pas de zéro menteur.** `forge_evidence/` est gitignoré, donc la télémétrie est
  absente d'un worktree neuf → `cost.measured: false` + raison explicite, jamais « 0 token ».
- **Défauts trouvés en vérifiant (2 corrigés, 1 signalé)** : (1) `_read` de `studio_link` fait un
  `json.loads` NU par ligne — une ligne tronquée de `forge_telemetry.jsonl` (append concurrent +
  arbres de process tués au timeout, FIR-01) aurait fait **planter le rapport d'un run réussi** dès
  lors que `run_cost` y était branché ; (2) `_load_brick_catalog` promettait « mal formé => None »
  en docstring mais n'attrapait que `OSError` ⇒ oracle de budget qui lève au lieu de dire NON MESURÉ.
  Les deux corrigés + tests montrés en train d'échouer. (3) SIGNALÉ NON CORRIGÉ :
  `generate_journal_index` embarque un chemin ABSOLU dans sa sortie — déterministe à emplacement
  fixe, pas entre deux checkouts.
- **LES 4 FONCTIONS SANS APPELANT — BRANCHÉES** (go Pierre) : `pool_stats` → clé `pool` du rapport
  de fin de run (même règle mesuré/non mesuré) ; `record_playtest` + `record_global_lesson` → deux
  sous-commandes CLI de `forge.studio_link` (leur consommateur, le pré-mortem, existait déjà ; c'est
  l'APPELANT qui manquait, et il est humain par nature — aucun appelant automatique fabriqué) ;
  `propose_bible_entry` → 4e file de `pending_review.mjs` + CLI. **La boucle Project Bible est
  refermée** : proposer → Pierre voit → Pierre promeut → `project_bible()` la relit en s0.
  Promotion automatique volontairement NON codée. **670 passed, 3 failed pré-existants.**
- **ÉTAPE 5 FAITE — `scripts/forge/contracts/orchestrator.yaml`** (PROPOSED) : 17 champs, passe la
  porte, se dispatche bien qu'il soit hors de tout `ORDER` et de tout profil (il n'est pas une étape,
  il joue la chaîne). Contrat de RETENUE : 7 garde-fous en négatif (la chaîne est la loi · un rouge
  n'autorise pas à coder · `state.json` ne se retouche jamais · tu ne décides rien · proportionnalité
  · un manque se remonte · jamais « zéro » pour du non mesuré). Portée honnête écrite DANS le
  fichier : la porte + le hook garantissent le passage par contrat, PAS le respect des permissions.
- **2 défauts de mesure trouvés en vérifiant, les deux corrigés** : (1) `roles.yaml` — j'avais écrit
  « Fable OU Opus » en commentaire alors que le registre prend le PREMIER modèle déclarant le rôle
  ⇒ Fable, toujours. Cause : un seul nom pour deux choses. Séparé en `orchestrator` (la SESSION,
  descriptive, Fable, choix de Pierre — inchangé) et **`run_orchestrator`** (l'AGENT spawné, résolu
  par le registre, **Opus** — à RATIFIER, ça change quel modèle consomme). (2) `builder_id` du
  journal de builders n'est pas normalisé (id complet à la 1re tentative, nom court après escalade)
  ⇒ `by_builder` éclatait un même tier en deux entrées. Ajout de **`by_tier`** (champ `tier`, lui
  normalisé) ; `by_builder` conservé brut, documenté comme non concluant.
- **Chiffre réel remonté par le nouveau `by_tier`** sur `shmup_slice-20260714a` : haiku FAIL×2 →
  sonnet FAIL×2 → opus OK×1. L'échelle d'escalade a réellement grimpé, et seul le sommet a produit.
