# TOOLS.md — Environnement technique

## Providers
| Provider | baseUrl | Modèle | Restrictions |
|---|---|---|---|
| claude-proxy | http://127.0.0.1:8765/v1 | claude-code-cli | Local — via claude --print · CWD=repo |
| LM Studio | http://127.0.0.1:1234/v1 | qwen/qwen2.5-coder-14b | Aucune — local |
| Gemini gratuit | https://generativelanguage.googleapis.com/v1beta/openai/ | gemini-flash | Jamais φ ni internes Rocky |
| Anthropic | https://api.anthropic.com | claude-* | Payant — réservé si proxy indisponible |

## Routage agents → providers
| Agent | Provider | Motif |
|---|---|---|
| @coordinateur | LM Studio (qwen/qwen2.5-coder-14b) | Orchestration légère, faible coût |
| @producteur_routine | LM Studio (qwen/qwen2.5-coder-14b) | Tâches bornées, oracle clair |
| @producteur_dur | claude-proxy | Raisonnement fort, accès repo |
| @council (lignée Claude) | claude-proxy | Red-team, audit hypothèse |
| @council (lignée Qwen) | LM Studio (qwen/qwen2.5-coder-14b) | Délibérations locales |
| @council (lignée Gemini) | Gemini gratuit | Générique uniquement — jamais φ |

## Skills → provider recommandé
| Skill | Provider |
|---|---|
| /architecture_review | claude-proxy |
| /code_review | claude-proxy |
| /gate | claude-proxy |
| /verdict | claude-proxy |
| /plan | claude-proxy |
| /estimate | LM Studio |
| /start /handoff /tick | LM Studio |

## Canvas gateway — endpoints
| Endpoint | Méthode | Usage |
|---|---|---|
| /api/meta | GET | JSON état studio (studio_meta_latest.json) |
| /api/meta/stream | GET | SSE — push live sur modification fichier |
| /api/refresh | POST | Relance studio_meta.py (à appeler après tout oracle) |
| /api/gate/{id} | POST | Décision Pierre {verdict, justification} |
| /health | GET | Liveness check |

## Démarrage
```bash
# Proxy Claude (port 8765) — depuis C:\TACTICAL_CHESS_STUDIO
CLAUDE_PROXY_SYSTEM_FILE=studio/openclaw-workspace/BOOTSTRAP.md \
  python scripts/claude_proxy.py

# Canvas Gateway (port 8766)
python scripts/canvas_gateway.py

# Canvas Pierre — ouvrir dans navigateur
studio/studio_canvas.html
```

## Chemins
- Repo Windows : C:\TACTICAL_CHESS_STUDIO\
- Workspace OpenClaw (WSL) : ~/.openclaw/workspace/
- Worktrees : ~/.openclaw/workspace/worktrees/routine/ et /dur/

## HMAC — stockage sécurisé
STUDIO_HMAC_KEY dans ~/.openclaw/.env UNIQUEMENT.
Jamais dans le repo. Jamais dans un fichier accessible aux agents.

## Canvas — source indépendante
Nourri par le gateway (verdicts HMAC signés depuis les logs).
L agent déclenche un refresh — il ne contrôle pas les données affichées.

## Oracles
cargo test · pytest · ./bench/elo_match.sh · ./bench/lichess_eval.sh
python studio_meta.py IMPROVEMENT_LEDGER.yaml
Signature : echo "$VERDICT" | openssl dgst -sha256 -hmac "$STUDIO_HMAC_KEY"
