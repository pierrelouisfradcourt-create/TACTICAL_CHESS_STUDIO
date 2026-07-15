# TACTICAL CHESS STUDIO — Context for Claude Code

## Regles absolues

* Jamais git commit/push sans demande explicite
* claim\_verdict: NO\_CLAIM\_ALLOWED dans tous les rapports
* Separer software\_verdict / evidence\_verdict / claim\_verdict
* HumanGate decide merge/reject/freeze — pas Claude Code

## Stack par lane

### Lane STUDIO (autopilot.py)

* Fichier unique : autopilot.py (\~5200 lignes)
* Serveur Flask + HTML inline dans les strings Python
* Modele principal : Qwen2.5-14B (LM\_MODEL ligne 27)
* Qwen3.6 INTERDIT pour JSON — thinking mode vide le content
* LM Studio local port 1234
* Boutons HTML dans les strings Python — pas de fichier HTML separe
* Ne jamais creer de nouveaux fichiers pour cette lane
* Ne jamais toucher src/ pour cette lane

### Lane ROCKY\_MOTEUR (Rust)

* Moteur principal : src/chess/
* Ne jamais toucher autopilot.py pour cette lane
* Validation : cargo build --release \&\& cargo test

### Lane IA\_APPRENTISSAGE (Python/ML)

* Dossier : ml/ et lab/
* venv : .venv312\\Scripts\\python.exe
* Ne pas toucher autopilot.py ni src/

### Lane JEUX (Python prototype)

* Dossier : lab/chess\_fantasy/
* Tests : .venv312\\Scripts\\python.exe -m pytest lab/chess\_fantasy/tests/ -v
* Ne pas toucher src/ pour cette lane

### Lane FORGE (usine à jeux — /forge)

* Rôle : GÉNÈRE DES JEUX (pas des IMP — le ledger/kaizen est la lane STUDIO, distincte).
* Skill : `/forge` · orchestrateur = Fable (mode superpowers), spawn via la porte uniquement.
* Code : scripts/forge/ (dispatch.py, driver.py, oracle.py, gate.py, verdict.py, static\_oracles.py, studio\_link.py).
* Contrats d'agent : scripts/forge/contracts/<etape>.yaml (schéma SCHEMA.md, 17 champs).
* Jeux produits : games/<jeu>/ · bibliothèque : knowledge\_base/ · preuves/état : lab/forge\_runs/ + lab/forge\_evidence/.
* **Invariants durs (ADR-002)** — non négociables :
  - Aucun sous-agent sans **contrat validé** : porte `forge.dispatch.prepare_dispatch` + hook `pretool_forge_guard` (ACTIF dans .claude/settings.json — fail-closed en périmètre Forge).
  - Oracles = **déterministes non-LLM** (code/archi/wiremap + mutation + solvabilité) ; verdict **signé HMAC**, re-vérifié par `forge.verify_run`.
  - `software_verdict` vient UNIQUEMENT des reçus d'oracle vérifiés ; red-team = **advisory** (jamais juge du code).
  - **HumanGate (Pierre) décide** merge/reject/freeze — jamais la Forge. Écritures durables (ledger, projets, memory/) = propose-only, ratifiées par Pierre.
  - `claim_verdict: NO_CLAIM_ALLOWED` toujours.
* Cartes de référence (companions, statut PROPOSED) : docs/forge/STUDIO\_ARCHITECTURE.md · STUDIO\_AGENT\_ATLAS.md · STUDIO\_MASTER\_SCHEMA.html.
* Auto-audit de la lane (dérive doc↔réalité, connecteurs dormants) : `node scripts/forge/studio_selfaudit.mjs`.
* Ne jamais toucher autopilot.py ni la lane STUDIO pour cette lane.

## Fichiers cles

* autopilot.py : studio UI + API
* lab/chains/IMPROVEMENT\_LEDGER.yaml : ledger IMPs
* lab/chains/golden\_examples.jsonl : corpus LoRA (ne pas supprimer)
* lab/chains/prompt\_chain\_map.json : carte agents

## Architecture CEO — separation volontaire

* /api/ceo-lane-assignment : algorithme greedy deterministe (graph-coloring sur LEDGER)
  - Aucune inference LM — lecture seule du LEDGER
  - Cache invalide par age > 60s ou mtime LEDGER change
  - Consomme uniquement les IMPs OPEN SAFE\_AUTO
* /api/ceo-brief : appel LM (Qwen2.5-14B) — genere une narrative par lane
  - Ecrit dans \_ceo\_brief\_cache mais NON lu par ceo-lane-assignment
  - Les deux endpoints sont intentionnellement decouples
* NE PAS fusionner ces deux systemes sans decision HumanGate explicite
  - Raison : ceo-lane-assignment doit rester deterministe et offline-capable

## Routing

Table de correspondance intention → skill à invoquer. Utiliser `/skill-name` dans la session.

| Intention | Skill |
|---|---|
| générer un jeu / forge | /forge |
| oracle / vérification | /smoke-check |
| IMP status | /sprint-status |
| IMP pickup | /imp-readiness |
| architecture | /architecture-review |
| code | /code-review |
| plan | /plan |
| brainstorm / idéation | /brainstorm |
| design | /design-review |
| balance gameplay | /balance-check |
| release | /release |
| audit hygiène | /audit-daily |
| verdict signé | /verdict |
| gate humain | /gate |

## Avant toute implementation

### 1. Quels sont les comportements évidents de ce type de composant ?
Exemples :
- Un terminal       → Backspace, Ctrl+C, encodage UTF-8, reconnexion, historique
- Un bouton         → route backend, état loading, réponse affichée, état erreur
- Un formulaire     → validation, feedback erreur, submit désactivé si vide
- Un websocket      → reconnexion auto, timeout, message queue si déconnecté
- Un endpoint API   → codes d'erreur, timeout, payload vide, auth manquante
- Un fichier écrit  → chemin relatif, encoding='utf-8' explicite, rollback si échec
- Un process lancé  → stdout capturé, stderr capturé, exit code vérifié, timeout
- Un commit         → lane détectée, verdicts générés, pas de push
- Un parser         → input vide, caractères spéciaux, UTF-8, invariants validés
- Un algo search    → timeout actif, hash correct, convention score cohérente
- Un script Python  → chemins repo-relatifs, pas de path absolu, encoding explicite
- Une carte/UI      → état vide, état erreur, état loading, debug non exposé
Liste-les tous. Implémente-les tous dès le départ.

### 2. Qu'est-ce qui peut casser en premier ?
Pense au pire cas immédiat. Pas les edge cases rares —
le premier truc qu'un utilisateur va faire et qui va casser.
Implémente la protection avant le happy path.

### 3. Comment je prouve que ça marche ?
Si je peux tester seul → je le fais et je montre l'output.
Si c'est impossible → je liste les étapes exactes que Pierre
doit tester, dans l'ordre, avec le résultat attendu à chaque étape.

## Règles dérivées des incidents réels
- Debug Rust    → toujours derrière TCS\_DEBUG, jamais inconditionnel
- Chemins       → relatifs au repo root, jamais absolus ni utilisateur
- Encodage      → encoding='utf-8' explicite sur tout open() Python
- search.rs     → timeout + Zobrist + convention score avant tout ajout
- Validation    → vérifier file vs dir, invariants FEN, en entrée de fonction

## Avant software\_verdict: OK
Montre la preuve d'exécution — pas la preuve d'existence.
"J'ai implémenté X" ≠ "X fonctionne".

## Rapport obligatoire fin de charter

software\_verdict: OK|FAIL|BLOCKED
evidence\_verdict: MECHANICAL\_VALIDATION\_ONLY
claim\_verdict: NO\_CLAIM\_ALLOWED

## Jamais

* Modifier IMPROVEMENT\_LEDGER.yaml via l'outil kaizen\_loop.py de préférence. Exception : création/clôture d'IMP en session active sur go explicite Pierre.
* Supprimer golden\_examples.jsonl
* Push = gate Pierre explicite dans la conversation — attendre le go avant tout push
* Creer des fichiers tmp qui restent
* Utiliser API Anthropic externe

## Mémoire persistante — règles de session

Trois référents, trois rôles distincts. Ne pas les confondre ni les fusionner.

| Rôle | Fichier canonique | Nature |
|---|---|---|
| Faits durables — « ce que je sais » | `memory/MEMORY.md` (+ fichiers `memory/`) | auto-chargé au boot, géré par le mécanisme auto-mémoire (machine) |
| Handoff session — « où on en était » | `studio_brain/00_CURRENT_CONTEXT.md` | un seul fichier, humain/agent, < 100 lignes |
| Référence humaine — « doctrine/vision » | `studio_brain/` (doctrine/, decisions/, gamedesign/, architecture/) | tier-2, chargé à la demande seulement |

### Au démarrage de CHAQUE session
1. `memory/MEMORY.md` est auto-chargé — c'est l'index des faits durables. Ne pas le dupliquer à la main.
2. Lis `studio_brain/00_CURRENT_CONTEXT.md` — état courant du studio (handoff inter-sessions).
3. Le ledger canonique est `lab/chains/IMPROVEMENT_LEDGER.yaml` (244+ IMPs). PAS à la racine.
4. Ne charge les sous-dossiers de `studio_brain/` QUE si le sujet de la session les concerne (tier-2).

### En fin de CHAQUE session
1. Mets à jour `studio_brain/00_CURRENT_CONTEXT.md` : dernière session (date), en cours,
   décisions récentes (ratifiées Pierre uniquement), prochaine étape, impasses.
2. Faits durables nouveaux (préférences, contraintes projet, incidents) → mécanisme auto-mémoire (`memory/`).
3. Si un IMP a été touché : entrée dans `lab/chains/IMPROVEMENT_LEDGER.yaml`.
4. Garde `00_CURRENT_CONTEXT.md` sous 100 lignes. Archive le vieux contexte dans `studio_brain/journal/`.

### Règles
- Notes brutes de Pierre : jamais réécrites. Synthèse IA vit à côté.
- Toute doc générée : date + source.
- Décisions = uniquement ce que Pierre a explicitement ratifié.
- Référents retirés (ne plus lire ni écrire) : `AI_MEMORY/`, `STUDIO_CONTEXT_LIVE.md`, `COWORK_CONTEXT.md`.
