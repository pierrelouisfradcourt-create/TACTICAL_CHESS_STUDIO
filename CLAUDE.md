# TACTICAL CHESS STUDIO — Context for Claude Code

## Regles absolues
- Jamais git commit/push sans demande explicite
- claim_verdict: NO_CLAIM_ALLOWED dans tous les rapports
- Separer software_verdict / evidence_verdict / claim_verdict
- HumanGate decide merge/reject/freeze — pas Claude Code

## Stack par lane

### Lane STUDIO (autopilot.py)
- Fichier unique : autopilot.py (~5200 lignes)
- Serveur Flask + HTML inline dans les strings Python
- Modele principal : Qwen2.5-14B (LM_MODEL ligne 27)
- Qwen3.6 INTERDIT pour JSON — thinking mode vide le content
- LM Studio local port 1234
- Boutons HTML dans les strings Python — pas de fichier HTML separe
- Ne jamais creer de nouveaux fichiers pour cette lane
- Ne jamais toucher src/ pour cette lane

### Lane ROCKY_MOTEUR (Rust)
- Moteur principal : src/chess/
- Ne jamais toucher autopilot.py pour cette lane
- Validation : cargo build --release && cargo test

### Lane IA_APPRENTISSAGE (Python/ML)
- Dossier : ml/ et lab/
- venv : .venv312\Scripts\python.exe
- Ne pas toucher autopilot.py ni src/

### Lane JEUX (Python prototype)
- Dossier : lab/chess_fantasy/
- Tests : .venv312\Scripts\python.exe -m pytest lab/chess_fantasy/tests/ -v
- Ne pas toucher src/ pour cette lane

## Fichiers cles
- autopilot.py : studio UI + API
- lab/chains/IMPROVEMENT_LEDGER.yaml : ledger IMPs
- lab/chains/golden_examples.jsonl : corpus LoRA (ne pas supprimer)
- lab/chains/prompt_chain_map.json : carte agents

## Rapport obligatoire fin de charter
software_verdict: OK|FAIL|BLOCKED
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED

## Jamais
- Modifier IMPROVEMENT_LEDGER.yaml manuellement
- Supprimer golden_examples.jsonl
- Pusher sur git
- Creer des fichiers tmp qui restent
- Utiliser API Anthropic externe
