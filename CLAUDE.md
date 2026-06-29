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

# TACTICAL CHESS STUDIO — Context for Claude Code
* 
* \## Regles absolues
* \- Jamais git commit/push sans demande explicite
* \- claim\_verdict: NO\_CLAIM\_ALLOWED dans tous les rapports
* \- Separer software\_verdict / evidence\_verdict / claim\_verdict
* \- HumanGate decide merge/reject/freeze — pas Claude Code
* 
* \## Stack par lane
* 
* \### Lane STUDIO (autopilot.py)
* \- Fichier unique : autopilot.py (\~5200 lignes)
* \- Serveur Flask + HTML inline dans les strings Python
* \- Modele principal : Qwen2.5-14B (LM\_MODEL ligne 27)
* \- Qwen3.6 INTERDIT pour JSON — thinking mode vide le content
* \- LM Studio local port 1234
* \- Boutons HTML dans les strings Python — pas de fichier HTML separe
* \- Ne jamais creer de nouveaux fichiers pour cette lane
* \- Ne jamais toucher src/ pour cette lane
* 
* \### Lane ROCKY\_MOTEUR (Rust)
* \- Moteur principal : src/chess/
* \- Ne jamais toucher autopilot.py pour cette lane
* \- Validation : cargo build --release \&\& cargo test
* 
* \### Lane IA\_APPRENTISSAGE (Python/ML)
* \- Dossier : ml/ et lab/
* \- venv : .venv312\\Scripts\\python.exe
* \- Ne pas toucher autopilot.py ni src/
* 
* \### Lane JEUX (Python prototype)
* \- Dossier : lab/chess\_fantasy/
* \- Tests : .venv312\\Scripts\\python.exe -m pytest lab/chess\_fantasy/tests/ -v
* \- Ne pas toucher src/ pour cette lane
* 
* \## Fichiers cles
* \- autopilot.py : studio UI + API
* \- lab/chains/IMPROVEMENT\_LEDGER.yaml : ledger IMPs
* \- lab/chains/golden\_examples.jsonl : corpus LoRA (ne pas supprimer)
* \- lab/chains/prompt\_chain\_map.json : carte agents
* 
* \## Avant toute implementation
* 
* \### 1. Quels sont les comportements évidents de ce type de composant ?
* Exemples :
* \- Un terminal       → Backspace, Ctrl+C, encodage UTF-8, reconnexion, historique
* \- Un bouton         → route backend, état loading, réponse affichée, état erreur
* \- Un formulaire     → validation, feedback erreur, submit désactivé si vide
* \- Un websocket      → reconnexion auto, timeout, message queue si déconnecté
* \- Un endpoint API   → codes d'erreur, timeout, payload vide, auth manquante
* \- Un fichier écrit  → chemin relatif, encoding='utf-8' explicite, rollback si échec
* \- Un process lancé  → stdout capturé, stderr capturé, exit code vérifié, timeout
* \- Un commit         → lane détectée, verdicts générés, pas de push
* \- Un parser         → input vide, caractères spéciaux, UTF-8, invariants validés
* \- Un algo search    → timeout actif, hash correct, convention score cohérente
* \- Un script Python  → chemins repo-relatifs, pas de path absolu, encoding explicite
* \- Une carte/UI      → état vide, état erreur, état loading, debug non exposé
* Liste-les tous. Implémente-les tous dès le départ.
* 
* \### 2. Qu'est-ce qui peut casser en premier ?
* Pense au pire cas immédiat. Pas les edge cases rares —
* le premier truc qu'un utilisateur va faire et qui va casser.
* Implémente la protection avant le happy path.
* 
* \### 3. Comment je prouve que ça marche ?
* Si je peux tester seul → je le fais et je montre l'output.
* Si c'est impossible → je liste les étapes exactes que Pierre
* doit tester, dans l'ordre, avec le résultat attendu à chaque étape.
* 
* \## Règles dérivées des incidents réels
* \- Debug Rust    → toujours derrière TCS\_DEBUG, jamais inconditionnel
* \- Chemins       → relatifs au repo root, jamais absolus ni utilisateur
* \- Encodage      → encoding='utf-8' explicite sur tout open() Python
* \- search.rs     → timeout + Zobrist + convention score avant tout ajout
* \- Validation    → vérifier file vs dir, invariants FEN, en entrée de fonction
* 
* \## Avant software\_verdict: OK
* Montre la preuve d'exécution — pas la preuve d'existence.
* "J'ai implémenté X" ≠ "X fonctionne".
* 
* \## Rapport obligatoire fin de charter
* software\_verdict: OK|FAIL|BLOCKED
* evidence\_verdict: MECHANICAL\_VALIDATION\_ONLY
* claim\_verdict: NO\_CLAIM\_ALLOWED
* 
* \## Jamais
* \- Modifier IMPROVEMENT\_LEDGER.yaml manuellement
* \- Supprimer golden\_examples.jsonl
* \- Push = gate Pierre explicite dans la conversation — attendre le go avant tout push
* \- Creer des fichiers tmp qui restent
* \- Utiliser API Anthropic externe



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

