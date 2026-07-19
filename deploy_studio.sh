#!/usr/bin/env bash
# deploy_studio.sh — déploie toute l'infra du Tactical Chess Studio
# Usage (depuis WSL) :
#   cd /mnt/c/TACTICAL_CHESS_STUDIO
#   bash studio/deploy_studio.sh
set -euo pipefail

ROOT="$(pwd)"
C=".claude"
OC="studio/openclaw-workspace"

echo "🦞 Déploiement TCS Studio → $ROOT"
mkdir -p "$C"/{agents,skills,hooks,rules,templates}
mkdir -p "$OC"/{coordinateur,producteur_routine,producteur_dur,council,skills}
mkdir -p studio/docs

# ════════════════════════════════════════════════════════════
# CLAUDE.md — master config Claude Code
# ════════════════════════════════════════════════════════════
if [ -f CLAUDE.md ]; then
  echo "ℹ️  CLAUDE.md existe déjà — non écrasé (protection ajoutée audit 2026-06-27, QW-5)."
else
cat > CLAUDE.md << 'EOF'
# Tactical Chess Studio — Claude Code

## Qui tu es
Tu es le producteur dur du studio. Tu exécutes les tâches escaladées.
Tu **proposes**, tu n'**agis** pas. Plan → go explicite → exécution.

## FORBIDDEN — jamais toucher
tests/ eval/ oracle/ bench/ puzzles/ .github/

## Plan obligatoire avant toute action
```
PLAN : [tâche]
Étapes : [liste + fichiers + oracle + S/M/L]
Gates Pierre : [irréversible → escalade]
Risques : [mitigation]
Go ?
```

## Stack
- Rust : src/ — cargo test obligatoire avant tout commit
- Python : ml/ — dataset BROKEN = bloqueur P4 (3 trous SearchTraceSchema)
- Godot : assets/godot/ — oracle : compile + tourne

## Oracles (ne jamais modifier)
cargo test · pytest · ./bench/elo_match.sh · ./bench/lichess_eval.sh

## Infra studio
- OpenClaw workspace : studio/openclaw-workspace/ → à déployer dans ~/.openclaw/workspace/
- Docs déploiement   : studio/docs/
- Script install     : /openclaw-install pour guider l'installation complète

## Règles
- Pas de unwrap() injustifié, panic!() prod, magic numbers
- Merge = oracle vert + sign-off Pierre
- Fun / feel / roadmap → escalader à Pierre, toujours
EOF
fi

# ════════════════════════════════════════════════════════════
# AGENTS Claude Code — GÉNÉRATION RETIRÉE (2026-07-19)
# ════════════════════════════════════════════════════════════
# Ce script générait ici 7 fiches .claude/agents/*.md par `cat >` (écriture
# TRONQUANTE). Les fiches sont désormais MAINTENUES À LA MAIN et versionnées.
#
# Pourquoi le retrait : les fiches générées étaient cassées et le sont restées
# des mois sans que rien ne le signale —
#   - pas de champ `description:` (REQUIS par Claude Code) => agents JAMAIS chargés
#   - `model: claude-sonnet-4-6` => identifiant de modèle inexistant
#   - `role:`/`domain:`/`escalates_to:`/`forbidden_paths:` => champs custom lus
#     par AUCUN runtime (garanties décoratives, notamment sur `tests/`)
#   - plusieurs `domain:` pointaient vers des dossiers disparus (design/,
#     assets/godot/, src/neural/, src/search/)
# Réparées le 2026-07-19. Ré-exécuter la génération les ÉCRASERAIT en silence.
#
# Si une génération est un jour souhaitée, elle doit être DÉRIVÉE d'une source
# unique (cf. convergence des taxonomies d'agents) et jamais écrite à la main
# des deux côtés. Voir studio_brain/00_CURRENT_CONTEXT.md (session 2026-07-19)
# et le capteur scripts/forge/declaration_readers.mjs.
# ════════════════════════════════════════════════════════════
# SKILLS Claude Code
# ════════════════════════════════════════════════════════════
write_skill() {
  local name="$1" desc="$2" body="$3"
  mkdir -p "$C/skills/$name"
  printf -- "---\nname: %s\ndescription: %s\n---\n%s\n" "$name" "$desc" "$body" \
    > "$C/skills/$name/skill.md"
}

write_skill "plan" "Plan obligatoire avant toute action. Attendre le go." \
'1. Lire le contexte (ledger, fog_map).
2. Décomposer : étapes · fichiers · oracle · S/M/L.
3. Identifier les gates Pierre.
4. Afficher et attendre le go explicite.'

write_skill "start" "Onboarding session → bon workflow." \
'1. Où en es-tu ? (aucune idée / concept / design clair / travail existant)
2. Afficher fog_map depuis studio/openclaw-workspace/MEMORY.md.
3. Guider : /handoff (design) · /design-review (concept) · /sprint-plan (existant).
4. Attendre le choix.'

write_skill "openclaw-install" "Guide l installation complète d OpenClaw + déploiement du workspace studio." \
'## Prérequis
- Windows 11 + WSL2 Ubuntu 24.04
- LM Studio ouvert avec Qwen chargé
- Clés : GEMINI_API_KEY + ANTHROPIC_API_KEY + STUDIO_HMAC_KEY

## Étape 1 — WSL2 mirrored networking
Dans %USERPROFILE%\.wslconfig :
  [wsl2]
  networkingMode=mirrored
  memory=24GB
Dans LM Studio : %userprofile%\.cache\lm-studio\.internal\http-server-config.json
  → networkInterface: "0.0.0.0"
Puis : wsl --shutdown (PowerShell admin)
Test : curl http://127.0.0.1:1234/v1/models (depuis WSL)

## Étape 2 — Node 24 + OpenClaw
Dans WSL :
  sudo apt update && sudo apt install -y python3 make build-essential libvips-dev
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install 24 && nvm use 24
  npm install -g openclaw@latest
  openclaw onboard --install-daemon
  openclaw doctor

## Étape 3 — Variables d environnement
Dans ~/.openclaw/.env (jamais dans le repo) :
  GEMINI_API_KEY=...
  ANTHROPIC_API_KEY=...
  STUDIO_HMAC_KEY=$(openssl rand -hex 32)

## Étape 4 — Déployer le workspace studio
  cp -r /mnt/c/TACTICAL_CHESS_STUDIO/studio/openclaw-workspace/* ~/.openclaw/workspace/

## Étape 5 — Providers Gemini
baseUrl : https://generativelanguage.googleapis.com/v1beta/openai/
Modèle  : gemini-2.5-flash
Test : curl "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" \
  -H "Authorization: Bearer $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '"'"'{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"ping"}]}'"'"'

## Étape 6 — Canvas
Servir studio/openclaw-workspace/../studio_canvas.html comme panneau Canvas OpenClaw.

## Vérification finale
  openclaw --version
  openclaw gateway status
  openclaw doctor'

write_skill "handoff" "GDD → build-order. Porte d entrée de l usine." \
'1. Lire le GDD fourni.
2. Décomposer : moteur règles / données / scènes Godot / audio / UI / tests.
3. Oracle dispo → auto. Pas d oracle → fog → gate Pierre.
4. Produire build-order avec agents assignés.
5. Attendre sign-off Pierre avant de lancer.'

write_skill "sprint-plan" "IMPROVEMENT_LEDGER → sprint actionnable." \
'1. Lire IMPROVEMENT_LEDGER.yaml — SAFE_AUTO + AUDIT_REQUIRED.
2. Vérifier DAG : pas de dépendance bloquée.
3. Caps par tâche : 200k tokens, 8 itérations.
4. Fog → gate Pierre.
5. Attendre le go.'

write_skill "design-review" "Revue design avant implémentation." \
'1. Lire le doc de design.
2. Cohérence interne + faisabilité stack.
3. Vérifiable par oracle vs jugement (fun = Pierre).
4. Risques : scope creep, dette, dépendances.
Verdict : [COHÉRENT] / [RISQUE] / [BLOQUER]'

write_skill "code-review" "Revue code avant merge." \
'1. git diff main...HEAD dans le worktree.
2. Pas de unwrap() injustifié, panic!() prod, magic numbers.
3. Couverture tests sur nouveaux cas limites.
4. cargo test / pytest.
Verdict : [APPROUVER] / [CHANGER] / [BLOQUER]'

write_skill "architecture-review" "Revue architecture. Produit un ADR." \
'1. Documenter : quoi / pourquoi / alternatives.
2. Impact modules + risque régression.
3. Irréversible → @council + gate Pierre.
4. ADR dans docs/adr/.
Verdict : [PROCÉDER] / [MODIFIER] / [GATE PIERRE]'

write_skill "estimate" "Estimation effort avant de lancer." \
'1. Décomposer en sous-tâches.
2. S (<50k) / M (<100k) / L (<200k) + oracle dispo ?
3. Inconnues → fog.
4. Proposer caps adaptés.'

write_skill "scope-check" "Anti-feature-creep." \
'1. Lire GDD + sprint plan.
2. Tâches en cours vs scope validé.
3. Hors-scope → stopper + escalader.
Verdict : [DANS LE SCOPE] / [HORS SCOPE → gate Pierre]'

write_skill "balance-check" "Équilibre gameplay. Mesurable vs feeling." \
'1. Paramètres mesurables : dégâts, coûts, probabilités.
2. Invariants mathématiques : pas de stratégie dominante.
3. Tests de balance si dispo.
4. Feeling → gate Pierre.
Verdict : [ÉQUILIBRÉ] / [DÉSÉQUILIBRE : X] / [FEELING → Pierre]'

write_skill "perf-profile" "Profiling Rocky + Godot." \
'Rocky : cargo bench + cargo flamegraph (100 coups).
Godot : profiler 60s sur scène représentative.
Régression > 5% vs MEMORY.md → stop merge.'

write_skill "tech-debt" "Audit dette technique." \
'grep -rn "unwrap()\|panic!\|TODO\|FIXME" src/ ml/
cargo clippy -- -D warnings
Fonctions Rust > 100 lignes, GDScript > 50 lignes.
Rapport : [CRITIQUE] / [ÉLEVÉ] / [BAS]'

write_skill "playtest" "Test jeu : bugs (oracle) vs feel (Pierre)." \
'1. Build Godot — oracle : compile.
2. Jouer une partie complète, logger erreurs.
3. Bug reproductible → fix auto. Feel / UX → gate Pierre.'

write_skill "team-feature" "Multi-agents en parallèle sur une feature." \
'Variantes : /team-combat /team-narrative /team-ui /team-audio /team-level /team-qa
1. Agents par domaine, worktrees isolés.
2. Caps : 200k tokens, 8 itérations.
3. Tous verts → merge groupé. Rouge → stop ce domaine.'

write_skill "joust" "Même tâche sur deux modèles. Oracle choisit." \
'1. Lancer tâche sur agent A et B (worktrees isolés).
2. Même oracle pour les deux.
3. Oracle tranche → merge du gagnant. Ambigu → gate Pierre.'

write_skill "verdict" "Oracle + HMAC + merge pipeline." \
'1. Oracle du domaine (cargo/pytest/ELO/lichess).
2. Sandbox — hors write-scope.
3. Signer : echo "$VERDICT" | openssl dgst -sha256 -hmac "$STUDIO_HMAC_KEY"
4. FAIL ou HMAC invalide → stop.'

write_skill "hotfix" "Correction urgente. Oracle obligatoire quand même." \
'1. Reproduire le bug.
2. Écrire le test AVANT de corriger.
3. Corriger dans worktrees/hotfix/.
4. cargo test / pytest vert.
5. Gate Pierre si structurel.'

write_skill "release" "Release complète. Gate Pierre obligatoire." \
'1. cargo test + pytest 100% vert.
2. ELO match si release Rocky.
3. Build Godot si release jeu.
4. Changelog depuis dernier tag.
5. Gate Pierre → sur ratification : tag + push.'

write_skill "brainstorm" "Idéation cadrée. 3-5 concepts avec oracle." \
'1. Contexte : type de jeu / contraintes stack ?
2. 3-5 concepts : mécanique · oracle dispo · effort.
3. Plus ancrable ET plus ambitieux.
4. Choix du jeu = gate irréductible Pierre.'

write_skill "tick" "Tick du soir : fog + coût + cycles." \
'python studio_meta.py IMPROVEMENT_LEDGER.yaml
Si exit 1 → rapport anomalies.
Mettre à jour studio/openclaw-workspace/MEMORY.md.'

write_skill "league" "Match ELO Rocky vs panel." \
'./bench/elo_match.sh --panel all --games 50
Baseline heuristique ~1195 ELO.
Hybride < heuristique + 20 → flag "neural pas encore utile".'

write_skill "gate-check" "Checklist gates de phase." \
'P1 (critique) :
[ ] Oracle cargo test sandboxé
[ ] Oracle pytest sandboxé
[ ] Verdicts signés HMAC
[ ] Agent ne peut PAS éditer un test
[ ] Gate Pierre en surface daction Canvas
Verdict : [PRÊT] / [GATES MANQUANTES : liste]'

# ════════════════════════════════════════════════════════════
# HOOKS
# ════════════════════════════════════════════════════════════
cat > "$C/hooks/pre-commit" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
FORBIDDEN="tests/ eval/ oracle/ bench/ puzzles/"
for path in $FORBIDDEN; do
  if git diff --cached --name-only | grep -q "^$path"; then
    echo "❌ FORBIDDEN : $path est un oracle. Non modifiable par un agent."
    exit 1
  fi
done
if git diff --cached -- 'src/*.rs' | grep -E '^\+.*\.unwrap\(\)' | grep -v '// SAFETY'; then
  echo "⚠️  unwrap() sans justification. Ajoute // SAFETY: <raison>."
  exit 1
fi
if git diff --cached -- 'src/*.rs' 'ml/*.py' | grep -E '^\+(.*TODO|.*FIXME)' | grep -v 'IMP-[0-9]'; then
  echo "⚠️  TODO/FIXME sans référence IMP-XXX."
  exit 1
fi
echo "✅ pre-commit OK"
EOF
# chmod +x "$C/hooks/pre-commit"

cat > "$C/hooks/validate-commit-msg" << 'EOF'
#!/usr/bin/env bash
MSG=$(cat "$1")
if ! echo "$MSG" | grep -qE '^(IMP-[0-9]+|feat|fix|refactor|perf|test|chore|docs|hotfix):'; then
  echo "❌ Format : IMP-XXX: description  ou  feat: description"
  exit 1
fi
EOF
# chmod +x "$C/hooks/validate-commit-msg"

# ════════════════════════════════════════════════════════════
# RULES
# ════════════════════════════════════════════════════════════
cat > "$C/rules/rust-src.md" << 'EOF'
---
path: src/**/*.rs
---
- Pas de unwrap() sans // SAFETY: <raison>
- Pas de panic!() en production
- Pas de magic numbers : constantes nommées
- Fonctions > 100 lignes → découper
- Zobrist hash pour répétition (pas to_fen())
EOF

cat > "$C/rules/python-ml.md" << 'EOF'
---
path: ml/**/*.py
---
- Type hints obligatoires sur fonctions publiques
- SearchTraceSchema : 7 scalaires normalisés [0,1]
- Pas de print() → utilise logging
- Dataset BROKEN = bloqueur P4 — priorité absolue
EOF

cat > "$C/rules/godot-scripts.md" << 'EOF'
---
path: assets/godot/**/*.gd
---
- Pas de logique jeu dans les scripts UI
- Fonctions > 50 lignes → découper
- @onready var plutôt que get_node() string
- Signaux préférés aux appels directs
EOF

cat > "$C/rules/tests.md" << 'EOF'
---
path: tests/**
---
ZONE PROTÉGÉE — aucun agent ne modifie ces fichiers.
Toute modification passe par une gate Pierre explicite.
EOF

# ════════════════════════════════════════════════════════════
# TEMPLATES
# ════════════════════════════════════════════════════════════
cat > "$C/templates/GDD.md" << 'EOF'
# GDD — [Nom du jeu]
## Vision (1 phrase)
## Mécanique centrale
## Stack : Godot [version] · Pattern Rocky réutilisé : oui/non
## Systèmes
| Système | Oracle de validation |
|---|---|
## FOG → gate Pierre : fun / feel / UX / audio
## Hors scope v1
EOF

cat > "$C/templates/ADR.md" << 'EOF'
# ADR-[XXX] : [titre]
Date · Statut : PROPOSÉ / ACCEPTÉ
## Contexte
## Décision
## Alternatives écartées
## Conséquences + oracle de validation
## Gate Pierre : oui/non
EOF

cat > "$C/templates/sprint.md" << 'EOF'
# Sprint [N] — [dates]
## Objectif
## Tâches
| IMP | Agent | Oracle | Effort | Statut |
|---|---|---|---|---|
## Fog → gates Pierre
## Done : cargo test vert · pytest vert · ledger mis à jour
EOF

# ════════════════════════════════════════════════════════════
# OPENCLAW WORKSPACE (studio/openclaw-workspace/)
# ════════════════════════════════════════════════════════════

cat > "$OC/AGENTS.md" << 'EOF'
# AGENTS.md — Tactical Chess Studio

## Mission
Usine de jeux vidéos (Godot) + amélioration Rocky (Rust).
Template P4 : moteur + φ + gouvernance — instanciable pour tout nouveau jeu.

## Roster
| Agent | Modèle | Autorité |
|---|---|---|
| @coordinateur | Qwen 14B (LM Studio) | RECOMMANDE |
| @producteur_routine | Qwen 7B (LM Studio) | RECOMMANDE |
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
EOF

cat > "$OC/TOOLS.md" << 'EOF'
# TOOLS.md — Environnement technique

## Providers
| Provider | baseUrl | Modèle | Restrictions |
|---|---|---|---|
| claude-proxy | http://127.0.0.1:8765/v1 | claude-code-cli | Local — via claude --print · CWD=repo |
| canvas-gateway | http://127.0.0.1:8766 | — | API meta/gate/refresh pour Canvas Pierre |
| LM Studio | http://127.0.0.1:1234/v1 | qwen-14b / qwen-7b | Aucune — local |
| Gemini gratuit | https://generativelanguage.googleapis.com/v1beta/openai/ | gemini-flash | Jamais φ ni internes Rocky |
| Anthropic | https://api.anthropic.com | claude-* | Payant — réservé si proxy indisponible |

## Routage agents → providers
| Agent | Provider | Motif |
|---|---|---|
| @coordinateur | LM Studio (Qwen 14B) | Orchestration légère, faible coût |
| @producteur_routine | LM Studio (Qwen 7B) | Tâches bornées, oracle clair |
| @producteur_dur | claude-proxy | Raisonnement fort, accès repo |
| @council (lignée Claude) | claude-proxy | Red-team, audit hypothèse |
| @council (lignée Qwen) | LM Studio (Qwen 14B) | Délibérations locales |
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
| /api/refresh | POST | Relance studio_meta.py |
| /api/gate/{id} | POST | Décision Pierre {verdict, justification} |
| /health | GET | Liveness check |

## Démarrage
```bash
# Proxy Claude (port 8765)
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

## Oracles
cargo test · pytest · ./bench/elo_match.sh · ./bench/lichess_eval.sh
python scripts/studio_meta.py
Signature : echo "$VERDICT" | openssl dgst -sha256 -hmac "$STUDIO_HMAC_KEY"
EOF

cat > "$OC/MEMORY.md" << 'EOF'
# MEMORY.md — Mémoire studio (claimed_until_verdict)

## ELO (baselines vérifiées)
- Heuristique : ~1195 ELO (référence stable)
- Hybride : ~1181 ELO (neural dégrade de 14 pts)
- Neural seul : ~992 ELO + taux de nulle élevé
- Objectif hybride : heuristique + 20 minimum

## Ancres
- Stockfish depth-14 : oracle de distillation
- Lichess puzzles : ~5M CC0 · L1 98% / L2 3.5% / L3 14%
- League (V1/Aggressive/Defensive/Rapid)
- Dernier /reanchor : jamais (à planifier dès P1)

## Stack — état réel
- Rust engine/search/decision-tree : IMPLÉMENTÉ
- Python ML : IMPLÉMENTÉ mais dataset BROKEN
- 3 trous SearchTraceSchema (dont nodes_per_root_move) : bloqueur φ
- φ Encoder / Clustering / LoRA / loss augmentée : NOT_STARTED

## Règle mémoire
CLAIMED = dans les logs journaliers uniquement.
VÉRIFIÉ = oracle vert + HMAC → peut monter dans MEMORY.md.
EOF

# SOUL.md agents
cat > "$OC/coordinateur/SOUL.md" << 'EOF'
# SOUL.md — Coordinateur

## Identity
Tête d'opérations du Tactical Chess Studio — usine de jeux vidéos + Rocky.
Tu décomposes, routes, délègues. Tu ne décides jamais seul.

## Ce que fabrique le studio
- Rocky : moteur d'échecs hybride (Rust + ResNet + LLM coach)
- Jeux Godot : handoff → usine → jeu jouable
- Template P4 : moteur + φ + gouvernance (instanciable)

## Règles non négociables
- RECOMMANDE uniquement. Jamais de verdict.
- intention_racine sur chaque paquet — jamais modifié (anti-Skynet).
- Avant toute tâche : fog_map + table oracle → router en conséquence.
- Fog = pas d oracle → human_gate → Pierre.
- Verdict non signé HMAC → refus immédiat.
- Forbidden : tests/ eval/ oracle/ bench/ puzzles/ .github/

## Quand convoquer @council
- Divergence de confiance basse
- Décision irréversible ou structurelle
- Délibérations impliquant φ : lignées locales UNIQUEMENT (jamais Gemini sur φ)
EOF

cat > "$OC/producteur_routine/SOUL.md" << 'EOF'
# SOUL.md — Producteur Routine

## Identity
Bras mécanique du studio. Tâches bornées avec oracle clair.
Worktree : worktrees/routine/

## Règles non négociables
- RECOMMANDE. Montre les options, attends le sign-off.
- FORBIDDEN : tests/ eval/ oracle/ bench/ puzzles/ .github/
- Caps : 200k tokens · 8 itérations. Dépassement → stop + rapport.
- Oracle rouge → stop total. Pas de contournement.
- intention_racine sur chaque paquet, intact.
EOF

cat > "$OC/producteur_dur/SOUL.md" << 'EOF'
# SOUL.md — Producteur Dur

## Identity
Convoqué pour le code difficile, les refactors structurels.
Worktree : worktrees/dur/

## Règles non négociables
- RECOMMANDE. Jamais un oracle. Jamais un DÉCIDE.
- FORBIDDEN : tests/ eval/ oracle/ bench/ puzzles/ .github/
- Merge : oracle vert + HMAC valide uniquement.
- Décision irréversible → @council avant de proposer.
- Caps : 200k tokens · 8 itérations.
- intention_racine sur chaque paquet, intact.
EOF

cat > "$OC/council/SOUL.md" << 'EOF'
# SOUL.md — Council

## Identity
Voix contradictoire. Trouve ce qui cloche, pas ce qui valide.
AVIS (RECOMMANDE) uniquement — jamais de verdicts.
Lignées mixtes : Claude + Qwen + Gemini Flash.

## Fonctions
- Red-team : attaque l hypothèse principale
- Audit hypothèse : les prémisses tiennent-elles ?
- Angle mort : ce que personne n a regardé

## Règle φ — CRITIQUE
D�libérations impliquant φ(T), traces Rocky, internaux ML :
lignées LOCALES uniquement (Claude + Qwen).
Gemini Flash = générique uniquement (jamais φ ni internes propriétaires).

## Règles
- AVIS uniquement. Jamais de verdicts.
- Divergence interne reportée telle quelle — pas lissée.
- Avis anonyme en délibération, signé HMAC en sortie.
- Lecture seule. Aucun fichier de production touché.
- intention_racine sur chaque paquet, intact.
EOF

# BOOTSTRAP.md — contexte studio pour claude-proxy
# Ne pas écraser si déjà présent (contient l état courant)
if [ ! -f "$OC/BOOTSTRAP.md" ]; then
cat > "$OC/BOOTSTRAP.md" << 'EOF'
# BOOTSTRAP.md — Contexte studio pour claude-proxy
# Fichier généré par deploy_studio.sh — à enrichir manuellement après /start
# Voir studio/openclaw-workspace/BOOTSTRAP.md pour la version complète.

Tu es @producteur_dur du Tactical Chess Studio.
Tu opères via claude --print depuis C:\TACTICAL_CHESS_STUDIO.
FORBIDDEN : tests/ eval/ oracle/ bench/ puzzles/ .github/
Plan → go explicite Pierre → exécution.
Canvas gateway : http://127.0.0.1:8766 — POST /api/refresh après tout oracle.
EOF
else
  echo "  BOOTSTRAP.md déjà présent — non écrasé"
fi

# Skills OpenClaw (version compacte)
for skill in start handoff sprint_plan design_review code_review \
             plan brainstorm estimate scope_check balance_check perf_profile \
             tech_debt playtest team_feature joust verdict hotfix release \
             tick fog gate league reanchor gate_check architecture_review; do
  cat > "$OC/skills/${skill}.md" << SKEOF
---
name: /${skill//_/-}
---
Voir .claude/skills/${skill//_/-}/skill.md pour la version Claude Code.
Ce fichier active le skill dans OpenClaw.
SKEOF
done

# Doc d'installation dans studio/docs/
cat > "studio/docs/INSTALL.md" << 'EOF'
# Installation du studio — ordre P0 → P5

## P0 — Claude Code (maintenant)
1. bash studio/deploy_studio.sh (depuis la racine du repo)
2. claude → /start

## P0 — OpenClaw (jour 1 sur la machine)
Lancer /openclaw-install dans Claude Code pour le guide complet.
Ou manuellement :
  - WSL2 + mirrored networking + LM Studio 0.0.0.0
  - npm install -g openclaw@latest
  - openclaw onboard --install-daemon
  - cp -r studio/openclaw-workspace/* ~/.openclaw/workspace/

## P1 — L ancre (avant toute autonomie)
  - Oracles sandboxés + HMAC
  - studio_meta.py opérationnel
  - Gate Pierre en surface d action (Canvas)
  - Test : l agent ne peut PAS éditer un test

## P2-P5 — voir studio/docs/deploiement_studio.md
EOF

# ════════════════════════════════════════════════════════════
# RÉSUMÉ
# ════════════════════════════════════════════════════════════
echo ""
echo "✅ Déploiement terminé dans : $ROOT"
echo ""
echo "Claude Code (.claude/) :"
echo "  agents   : $(ls $C/agents/ | wc -l)"
echo "  skills   : $(ls $C/skills/ | wc -l)"
echo "  hooks    : $(ls $C/hooks/  | wc -l)"
echo "  rules    : $(ls $C/rules/  | wc -l)"
echo "  templates: $(ls $C/templates/ | wc -l)"
echo ""
echo "OpenClaw (studio/openclaw-workspace/) :"
echo "  SOUL.md  : $(find $OC -name 'SOUL.md' | wc -l) agents"
echo "  skills   : $(ls $OC/skills/ | wc -l)"
echo "  docs     : AGENTS.md · TOOLS.md · MEMORY.md"
echo ""
echo "Étapes suivantes :"
echo "  1. claude          ← ouvre Claude Code"
echo "  2. /start          ← onboarding"
echo "  3. /openclaw-install ← guide installation OpenClaw"
