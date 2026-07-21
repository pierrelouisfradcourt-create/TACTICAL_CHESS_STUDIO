# MASTER PROMPT — Reprise Claude Code · Tactical Chess Studio (Studio V2)

Tu reprends le projet **Tactical Chess Studio** (repo `C:\TACTICAL_CHESS_STUDIO`). Lis ce prompt en entier, puis demande à Pierre sur quoi attaquer. Ne lance rien d'irréversible sans son go.

## Qui tu es / doctrine (non négociable)
- **HumanGate** : Pierre tranche tout irréversible (publier, dépenser, écraser une prod, merge master, marque). Tu recommandes.
- **Oracles non-LLM seuls juges** : `cargo test`, `pytest`, exports/builds, télémétrie. Aucun LLM ne valide un merge/ship. `NO_CLAIM_ALLOWED` : montre la preuve d'exécution, pas d'existence.
- **Lanes** : SAFE_AUTO < AUDIT_REQUIRED < HUMAN_REQUIRED < FORBIDDEN. Zones FORBIDDEN : `tests/ eval/ oracle/ bench/ puzzles/ .github/` sans gate.
- **Jamais** : git commit/push sans demande explicite ; éditer `lab/chains/IMPROVEMENT_LEDGER.yaml` à la main (passer par `kaizen_loop.py`) ; API LLM externe payante.

## Où on en est (2026-06-28)
**Pivot Studio V2** acté : on ne fait plus « un moteur d'échecs », on fait une **micro-usine de petits jeux Steam vendables**, solo + IA, budget < 2k€, distribution-first. Doctrine produit : **IA invisible** (code/outils/loc oui ; art IA brut visible NON — −53 % reviews, non protégeable). Premium Steam, pas de F2P.

**Jeu prioritaire = le HTML, pas le Godot.** Base décidée : `games/snake_genesis/snake_genesis.html` (survivor-snake auto-fire, 2 biomes, boss, level-up, dash+nova, audio génératif, mobile). Enrichi en v10 : méta-progression (localStorage), shop d'upgrades permanents, déblocages, biome « The Void », mode Endless, balance. **Avantage : testable au navigateur en 2 s** (boucle de feedback instantanée). Le Godot (`games/snake_survivor/`) est en retard et bugogène (codé sans éditeur) → **archive/secondaire**, ne pas y remettre d'énergie sauf décision Pierre. Encerclement/Constriction = abandonné.

**Infra studio = faite, testée, sous oracle :**
- Cockpit UX unique : `studio_v2_ux/studio_cockpit.html` (System Map, Build Board, Memory Graph, IMP/Ledger, Ideas, Kaizen/Loops, Memory/Fusion, Config). Lit le live via autopilot `:7331`. Repli hors-ligne.
- `autopilot.py` (`:7331`, ~40 endpoints) = cerveau/serveur. Endpoint `GET /api/projects` lit `studio_state/projects.json` (3 vrais jeux : snake-survivor, snake-genesis, chess-blitz).
- Oracle de l'UX : `studio_v2_ux/oracle/test_cockpit_oracle_v2.py` (50 tests, **verts** — déplacé hors zone FORBIDDEN `tests/`) — schéma projects.json, routes câblées, garde-fou anti-régression vis-network, hook mémoire, HMAC, + panels live :8766 / modal gate / SSE meta stream.
- Vérif live : `tools/verify_live.ps1` (ALIVE/DOWN, 30 endpoints). 26 ALIVE confirmés ; DOWN = 3 services externes optionnels (`:18789` OpenClaw, `:8765` claude_proxy, `:8766` canvas_gateway) — **non utilisés par le cockpit**.
- Mémoire : vault Obsidian `studio_brain/` + MCP filesystem branché dans `claude_desktop_config.json`. `scripts/loop_memory_hook.py` (in-process) logge les loops fermés. Tâche planifiée hebdo de MAJ mémoire (dimanche 18h).
- `start_studio.ps1` lance claude_proxy + canvas_gateway + autopilot.

## Pièges connus (lis avant de coder)
- **PowerShell : tout `.ps1` doit être ASCII PUR** (pas d'accent, pas d'em-dash). PS 5.1 sans BOM mal-décode le non-ASCII → fausse erreur `MissingEndCurlyBrace`. Écrire via heredoc ASCII + vérifier `grep -nP '[^\x00-\x7F]'` vide et accolades équilibrées. Pas de backtick de continuation.
- **Code écrit à l'aveugle** (HTML/JS/GDScript) : TOUJOURS valider avant de rendre — `node --check` sur le JS inline extrait, `py_compile` sur Python, Godot ouvre le projet pour le GDScript. Un sous-agent a déjà introduit un retour-ligne littéral dans une string JS (cassait tout le cockpit) et un `Transform2D` mal construit (ennemis 18× trop gros).
- **Cockpit** : ne pas réintroduire de faux jeux (Hex Survivors, Dungeon Draft…). L'UI doit refléter `/api/projects`.
- **IMP-178** (Obsidian MCP) à clore via `kaizen_loop.py` après 1er lancement de Claude Desktop.
- IMPs chess/ML + autonomie OpenClaw = **gelés** (zéro ROI pré-revenu) : ne pas y travailler sans go.

## Skills projet
33 skills dans `.claude/skills/` (plan, sprint-status, code-review, smoke-check, balance-check, playtest, verdict, gate, etc.). Les invoquer quand pertinent. `/plan` avant tout patch non trivial.

## Priorités (proposer à Pierre, ne pas présumer)
1. **LE JEU (revenu)** : améliorer `snake_genesis.html` — équilibrage/feel (début pas punitif, courbe XP), contenu, polish. Tester au navigateur, itérer vite. C'est le seul axe qui fait de l'argent.
2. (Optionnel UX) Converger : autopilot sert le cockpit sur `/` (1 seule app, fix pastille `/api/health`). 
3. (Optionnel) Rendre live les 4 panneaux mock du cockpit (Memory Graph depuis le vrai vault, etc.).
4. (Plus tard, P3) Graphify — graphe de connaissances du dépôt (code offline + docs sur Qwen local). Cf. `RECO_GRAPHIFY.md`.

Doc complète : `docs/studio_v2/` (00 vision → 13 plan de construction, + CERFA/roadmap/reco). Mémoire de supervision : voir `studio_brain/` et l'index mémoire Cowork.

**Commence par : `git status`, lire `docs/studio_v2/00_SYNTHESE_VISION_STRATEGIE.md`, lancer l'oracle `pytest studio_v2_ux/oracle -q`, puis demander à Pierre la cible.**
