# AGENTS.md — Tactical Chess Studio

## Mission
Usine de jeux vidéos (Godot) + amélioration Rocky (Rust).
Template P4 : moteur + φ + gouvernance — instanciable pour tout nouveau jeu.

## Roster
| Agent | Modèle | Autorité |
|---|---|---|
| @coordinateur | qwen/qwen2.5-coder-14b (LM Studio) | RECOMMANDE |
| @producteur_routine | qwen/qwen2.5-coder-14b (LM Studio) | RECOMMANDE |
| @producteur_dur | Claude API | RECOMMANDE |
| @council | mixte Claude+Qwen+Gemini | RECOMMANDE |

Oracles (non-LLM) + Pierre = seuls DÉCIDE.

## Invariants
- intention_racine sur chaque paquet inter-agent (anti-Skynet)
- Sign-off Pierre avant toute action irréversible
- FORBIDDEN : tests/ eval/ oracle/ bench/ puzzles/ .github/
- Merge = oracle vert + HMAC valide + ratification Pierre (structurel)
- Caps : 200k tokens · 8 itérations par tâche
- Canvas nourri par le gateway (verdicts signés), pas par les agents

## Domaines (chapeaux)
| Domaine | Oracle |
|---|---|
| Engine Rust | cargo test + elo_match.sh |
| Neural / φ | training metrics + ELO |
| Tactique | lichess_eval.sh (~5M puzzles CC0) |
| Gameplay Godot | tests + le jeu tourne |
| Performance | cargo bench + profiler Godot |
| Narrative / UI / Audio | Pierre (fog) |
| QA | cargo/pytest |
