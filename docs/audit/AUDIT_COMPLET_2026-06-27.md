# AUDIT COMPLET — TACTICAL CHESS STUDIO

**Date :** 2026-06-27 · **Branche :** master @ fd37eef · **Méthode :** audit local read-only, 10 sous-agents spécialisés (Vague 1) + 4 sous-agents de vérification adverse des risques P0/P1 (Vague 2).
**Doctrine :** preuve = code actif + tests. La documentation décrit des *intentions*, jamais l'implémentation. Les artefacts runtime (JSON, logs, rapports) ne sont **jamais** des preuves. Chaque composant porte un statut unique : `IMPLEMENTED / TESTED / DOCUMENTED_ONLY / PASSIVE / BLOCKED / NOT_FOUND / UNKNOWN`.

```
software_verdict: BLOCKED   (un P0 réel non corrigé : gate de déploiement modèle court-circuité)
evidence_verdict: MECHANICAL_VALIDATION_ONLY   (preuves fichier:ligne ; aucune exécution build/test)
claim_verdict:    NO_CLAIM_ALLOWED
```

---

## 0. La vérité du dépôt en 12 points

1. **Le cœur Rust est solide et honnête.** 0 `unsafe` sur chess/engine/core, chemin de production quasi panic-free (2 `lock().unwrap()`), timeout + Zobrist + convention de score negamax cohérents et prouvés. C'est la surface la plus saine du dépôt.
2. **L'IA « neurale » est duale et largement décorative.** La couche `src/ai/` (policy_guide, decision_controller) est **PASSIVE par contrat** (`can_drive_runtime()->false`, 0 appelant runtime). Le `NeuralAgent` réel n'est **actif que dans le harnais de simulation**, et même là sa prédiction est fortement re-rerankée par des heuristiques. Dans la couche décision du moteur, `DecisionMode::Neural` route en réalité vers… la recherche alpha-beta.
3. **Le pipeline d'entraînement ML a un P0 réel** : le « gate ELO » de `learning_loop.sh` ne protège rien — `train.py` écrase `models/latest.pt` (le modèle servi) à chaque epoch, *avant* toute évaluation, et le `candidate.pt` que le gate est censé promouvoir **n'est jamais produit**.
4. **La CI GitHub ne protège pas le code.** Le seul workflow auto-déclenché est filtré sur `docs/**`/`*.md`, déclare lui-même ne rien compiler ni tester, et son trigger `push` vise la branche `main` qui n'existe pas (la branche par défaut est `master`).
5. **Les tests existent mais ne sont quasi jamais exécutés par une gate.** ~501 tests Rust + ~409 tests Python, mais la CI n'en lance aucun et `/smoke-check` n'exécute que `pytest ml/` (2 fichiers). La protection repose entièrement sur l'humain.
6. **Une partie des tests est du théâtre.** ~6 tests-frontière Rust font du *source-grep* (`source.contains("pub enum …")`) ou du *doc-grep* (assert sur des `.md`) : ils figent l'organisation, ne prouvent aucun comportement.
7. **L'« usine autonome » est une capacité, pas un mode courant.** La machinerie kaizen (ledger muté par code, governor fail-closed, run_chain LM) est réelle et testée, mais la boucle pleinement autonome est **dormante** : `CHAIN_HISTORY.jsonl` s'arrête au 2026-06-04 (19 entrées) alors que le ledger est monté à IMP-183.
8. **Le studio affiche une surface bien plus large que ce qui est câblé.** Un CLI d'inspection de 3254 lignes sans aucun importeur, ~40 scripts d'une architecture « Codex » parallèle jamais branchée, 289 fichiers de specs sans `.py`, 3-4 copies de l'arbre (worktrees + MIGRATED_HOLD).
9. **autopilot.py n'est pas du Flask.** C'est un `BaseHTTPRequestHandler` de 7871 lignes (51 % de HTML inline), avec dispatch manuel de 451 lignes et des globals (`REPO`, `LM_*`) réassignés à chaud sans lock sous serveur multi-thread.
10. **La sécurité est correcte sur l'essentiel mais fail-open sur les garde-fous.** Aucun secret commité (historique propre), mais les hooks `.claude/hooks` ne sont **pas câblés à git**, la vérification HMAC des verdicts oracle n'existe qu'en `.md` manuels, et une clé privée RSA est en clair sur disque (hors git).
11. **La documentation est saine au cœur, polluée à la périphérie.** Le squelette canonique (série 00–11 + CLAUDE.md + AGENTS.md) est propre, mais la carte de navigation pointe vers un dossier de code **inexistant** (`repos/games/TacticalChessPureLab/`, référencé par 89 md), un fichier « supprimé/interdit » est ressuscité byte-identique, et 3 maps/audits redondants traînent à la racine.
12. **Violation de doctrine présente mais inerte** : `ml/claude_bridge.py` appelle l'API Anthropic externe (`claude-sonnet-4-6`) — orphelin (0 import live), mais contredit directement CLAUDE.md.

> **Verdict de synthèse :** ce n'est pas du vaporware — le noyau (moteur Rust, gouvernance ledger, gate governor, contrats core) est réel, testé et déterministe. Mais la **surface affichée dépasse nettement la surface câblée**, et trois chaînes critiques (déploiement modèle, CI, exécution des tests) ont des garde-fous qui *semblent* protéger sans protéger. Le risque dominant du dépôt n'est pas l'absence de garde-fous, c'est leur **inertie silencieuse** (fail-open déguisé en fail-closed).

---

## 1. Métriques globales consolidées

| Dimension | Mesure | Source |
|---|---|---|
| Fichiers trackés git | 1494 | `git ls-files` |
| **Rust** | 135 fichiers, **38 010 lignes** | wc |
| **Python** | 224 fichiers, **75 209 lignes** | wc |
| **Markdown (tracké)** | 618 fichiers / **Markdown total disque** : ~2413 fichiers, **724 canoniques** (96 542 L hors worktrees/repos/venv) | git + find |
| **JSON** | 306 fichiers, 233 920 lignes (≈ artefacts runtime) | wc |
| YAML | 51 fichiers, 21 307 lignes | wc |
| Ratio doc/code (lignes, canonique) | **0,84** (≈ 1 ligne doc pour 1,2 ligne code) | calc |
| Plus gros fichier code | `autopilot.py` **7871 L** ; `src/agents/neural_agent.rs` 3412 L ; `scripts/studioV2/studioctl.py` 3254 L ; `src/chess/search.rs` 2800 L | wc |
| Plus gros artefacts trackés | `lab/puzzles/level_all.jsonl` 27 M / 150 000 L ; `teacher_samples.jsonl` 9,7 M | git ls-files |
| Tests Rust | ~501 (233 intégration + ~268 inline ; 28/107 modules ont `#[cfg(test)]` ≈ 26 %) | grep |
| Tests Python | ~409 fonctions `test_` (~36 fichiers) — **13 seulement dans une gate** (`pytest ml/`) | grep |
| `unsafe` (chess/engine/core) | **0** | grep |
| `unwrap/expect/panic` hors test (moteur) | **2** (`search.rs:1303,1323`) ; **3 panic! prod** (`neural_config.rs:15,61,68`) | grep |
| Commits | 234 (conventions feat/fix/docs/chore respectées) | git log |
| Branches | `master` (défaut), `origin/safe/validation`, `worktree/dur`, `worktree/routine` | git |
| `.git` | **1,8 Go** (bloat historique) ; worktrees disque ~262 M | du |
| IMP ledger | **193 total — 181 CLOSED / 11 OPEN / 1 FAIL** (88 % closed) | comptage YAML |
| Secrets commités | **0** (historique propre) | git log -S |
| Workflows CI | **6** (1 auto filtré docs-only, 5 `workflow_dispatch` manuels) | .github |
| Couverture CI automatique du code applicatif | **0 %** | workflows |

> Note de réconciliation : le contexte de session annonce « 13 OPEN » ; le comptage direct du ledger donne **11 OPEN + 1 FAIL**. Le périmètre « 618 md » est le *tracké git* ; le disque réel contient ~2413 `.md` (dont 1650 ≈ 68 % en copies worktree/projets externes).

---

## 2. Cartographie — zones actives vs zones mortes

### Zones ACTIVES (code qui s'exécute, prouvé par import/appel)
- `src/chess/`, `src/engine/`, `src/core/` — moteur + contrats versionnés. **Le socle.**
- `src/agents/` (NeuralAgent + bridge) + `src/simulation/` — actifs **dans le harnais simulation uniquement**.
- `autopilot.py` — serveur studio (UI + API), réellement servi.
- Noyau d'orchestration : `scripts/director.py`, `scripts/dispatch_bridge.py`, `lab/chains/kaizen_autoloop.py`, `lab/chains/kaizen_loop.py`, `governance/governor.py`, `scripts/ingest_event.py`, `control_plane/registry.py` (8 modules câblés).
- `ml/train.py`, `ml/run_selfplay_training.py`, `ml/dataset_loader.py`, `ml/model.py`, `ml/move_vocab.py`, `ml/infer_policy.py` (pont Rust↔modèle).
- Série doc canonique `00_MASTER_DOCS/00–11` + `CLAUDE.md` + `AGENTS.md` + `KAIZEN_LOG.md`.

### Zones MORTES / PASSIVES / REDONDANTES (existent, non câblées)
- `src/ai/` (policy_guide, decision_controller, search_backend) — PASSIVE par contrat, 0 appelant runtime.
- `scripts/studioV2/studioctl.py` (3254 L) — **0 importeur**, read-only/proposal-only.
- ~40 des 42 scripts `scripts/studioV2/control_plane/` — architecture « Codex » (handoff/render/smoke/dry-run) jamais branchée au runtime (qui passe par claude-code CLI).
- `00_STUDIO_CONTROL/` — **289 fichiers, 0 `.py`** (228 md + 37 yaml) : specs/config.
- ~10 gros modules ML sans aucun caller (`adaptive_dataset.py` 53 K, `dataset_phase_builder.py` 35 K, `lab_orchestrator.py` 36 K…).
- `ml/claude_bridge.py` — orphelin + viole « jamais API Anthropic externe ».
- `worktrees/dur`, `worktrees/routine` (~262 M), `repos/games/studioV2_MIGRATED_HOLD/` — 3-4 copies de l'arbre.
- Racine : audits/maps datés non archivés (`AUDIT_2026-05-28.md` 76 K, `AUDIT_REPORT.md`, `STUDIO_BRAIN_AUDIT.md`, `SYSTEM_MAP.md` ≈ `STUDIO_FULL_MAP.md`).
- Dossier parasite `C:TACTICAL_CHESS_STUDIO/` (chemin Windows échappé créé par erreur — untracked).

---

## 3. Verdicts par surface

Légende priorité : 🔴 P0 · 🟠 P1 · 🟡 P2 · 🟢 P3.

### 3.1 Moteur Rust (chess / engine / core) — **statut : IMPLEMENTED + TESTED**
**Preuves :** 0 `unsafe` ; timeout actif (`search.rs:172,189,538`) ; Zobrist répétition (`search.rs:550`, pas `to_fen`) ; negamax cohérent (`INF=1e9` borné anti-overflow `search.rs:35`, mate ply-ajusté `eval.rs:117`). Couverture inline forte (search 45 tests, engine 25, human_gate 19).
**Forces :** constantes nommées exhaustives, core entièrement versionné (`*_VERSION`), fixtures déterministes.
**Faiblesses :** 🟠 **Zobrist en double source** (`search.rs:1104` vs `engine/engine.rs:28`, même seed `0x9e3779b9…` maintenu à la main — commentaire `engine.rs:16` l'admet) → désync silencieuse possible de la détection de nul. 🟡 20 `#[allow(dead_code)]` (diagnostics passifs). 🟡 surface `pub` large (122 items chess/). 🟢 3 fichiers > 2000 L.

### 3.2 IA neurale / simulation (agents / ai / simulation / tournament) — **statut : MIXTE (PASSIVE + IMPLEMENTED cloisonné)**
**Preuves :** `policy_guide.rs:134 can_drive_runtime()->false` ; `decision_controller_adapter.rs:15-33` ignore `policy_result` ; **0 site d'appel** de `.decide()/.guide()` runtime ; `decision.rs:135 DecisionMode::Neural => search_authority`. NeuralAgent réel : `simulation_runner.rs:1277 select_action` → bridge Python `neural_bridge.rs:174`, mais prédiction re-rerankée (`neural_agent.rs:1108` base 0.30 + bonus heuristiques).
**Forces :** cloisonnement testé, bridge Python robuste (timeout, reader thread borné, respawn), RAG `retrieval.rs` réel (mais OFF par défaut `TCS_RETRIEVAL`).
**Faiblesses :** 🟠 3 `panic!` prod (`neural_config.rs:15,61,68`). 🟡 ~600 L de scaffold `ai/` maintenu sans effet. 🟡 mode « Neural » du moteur trompeur. 🟢 efficacité neurale jamais mesurée (prédiction écrasée par rerank, aucun compteur de survie).

### 3.3 Tests — **statut : PARTIEL, sous-exécuté**
**Preuves :** ~501 Rust + ~409 Python ; mais CI=0 test, `/smoke-check`=`pytest ml/` (13 tests). 🔴 `chess-test.yml:22-29` ne lance que 2 tests nommés. ~6 tests-frontière en source/doc-grep (`decision_authority_boundary_current.rs`, `observation_boundary_current.rs` assert sur `.md`). 2 fichiers de test **vides** (`scripts/test_backbone.py`, `lab/chains/test_diagnosis_smoke.py`).
**Surfaces NON testées :** `autopilot.py` endpoints, `ml/train.py`+`model.py` (training), `src/simulation/*`, `src/tournament/elo.rs`, `src/ai/*` (inline).
**Force :** aucun `assert!(true)` trivial ; fixtures déterministes seedées. Zone `tests/` protégée (gate Pierre).

### 3.4 Pipeline ML / datasets — **statut : BLOCKED (P0)**
**Preuves :** 🔴 `train.py:961` écrit `latest.pt` chaque epoch sans condition ; `candidate.pt` introuvable (grep=0, seul `learning_loop.sh:43` le nomme) → gate ELO court-circuité, `latest.pt` écrasé *avant* l'éval. 🟠 2 trainers écrivent `latest.pt` (train.py policy+value vs `run_selfplay_training.py:241` policy-only via CrossEntropy, value head jetée) → lignée ambiguë. 🟠 `pool_selfplay.jsonl top_moves` pollué par debug-strings Rust `Move { unit_id… }` — **nuance vérifiée : pas un bloqueur** (`best_move` reste UCI, `dataset_loader.py:869-872` filtre les non-UCI du soft-target → perte de signal, pas dataset cassé). 🟡 gate admission AM **PASSIVE** (`train.py:668 skip_am_gate=not strict`, défaut False ; 20 tests sans effet en prod).
**Forces :** `move_vocab` (fingerprint SHA256 + self-test), filtre décisif IMP-179 réel+testé, curriculum `rebuild_levels` réel.
**Faiblesses :** 🟢 `print()` 33/33 fichiers (0 `logging`, viole `python-ml.md`). 🟢 ~10 modules volumineux sans caller. tests garde-fous `tests/test_train_*` en drift (chaîne attendue absente du code) + hors gate.

### 3.5 autopilot.py (Studio) — **statut : IMPLEMENTED, dette structurelle lourde**
**Preuves :** **pas Flask** → `BaseHTTPRequestHandler:6995` + `ThreadingTCPServer:7813`. 31 GET + 20 POST + DELETE, dispatch `if/elif` manuel. **Archi CEO vérifiée saine** : `_ceo_assign_lanes:2564` greedy déterministe sans LM, cache invalidé âge>60s/mtime ; `ceo-brief:7781` appelle le LM ; `_ceo_brief_cache` **write-only jamais lu** (découplage confirmé, mais état mort).
**Faiblesses :** 🟠 globals `REPO`/`LM_*` réassignés à chaud `:7550-7556` sous serveur threadé **sans lock** (data race) ; 🟡 `REPO=Path(r"C:\TACTICAL_CHESS_STUDIO")` path absolu hardcodé `:32` (viole règle chemins). 🟡 drift dual-brain (qwen3.6 annoncé `:7235` mais qwen2.5 forcé `:7781`). 51 % HTML inline ; `do_POST` 451 L. 🟢 doc CLAUDE.md « Flask » fausse. 🟢 86 `.innerHTML` (XSS DOM, faible car local).
**Force :** `lm_call:492` défensif (double endpoint, timeout 300 s, sentinelle, gestion thinking-mode) ; encodage utf-8 systématique ; anti-traversal `/static/`.

### 3.6 Control-plane / orchestration — **statut : noyau IMPLEMENTED+TESTED, périphérie PASSIVE**
**Pipeline réel :** `autopilot/director → dispatch_bridge → kaizen_autoloop → governor → claude-code CLI → kaizen_loop(close) → ingest_event → reducer state` (single-writer `update_studio_current_state.py`, `invariant_ok:true`). Tout en **dry-run par défaut** (anti-Skynet) ; boucle complète = `director.py --daemon --dispatch --dispatch-execute`, jamais auto-démarrée.
**Faiblesses :** 🟠 `FORBIDDEN_MISSIONS` dupliqué (`governor.py:37` vs `ingest_event.py`, synchro manuelle). 🟠 arbres dupliqués ×4 (worktrees + MIGRATED_HOLD). 🟡 studioctl 3254 L sans importeur ; 40 scripts Codex non câblés. 🟢 validation succès par signaux texte (cf. 3.7).

### 3.7 Gouvernance IMP / ledger / chaînes — **statut : machine RÉELLE, gates périphériques DOCUMENTED_ONLY**
**Preuves :** LEDGER muté **par code** (`kaizen_loop.py:81 save_ledger`, testé) ; `governor.check()` fail-closed câblé (`kaizen_autoloop.py:437`) ; `run_chain.py` = vraie pipeline LM 4 étages avec pre-check FORBIDDEN + path-safety. Suite : **204 passed / 1 failed** (le fail attrape un vrai drift : IMP-178 OPEN sans `domain`).
**Faiblesses :** 🟠 `validate_report` (`kaizen_autoloop.py:255-287`) juge le succès par **string-match** du texte LM (`"passed"`, `"[ok]"`) → oracle contournable. 🟠 gates PR04/05/07 : READMEs pointent `scripts/check_*.py` **inexistants** (vrai code dans `scripts/studioV2/`), **non câblés** à la boucle kaizen. 🟡 `save_ledger` détruit les commentaires (yaml.dump). 🟡 28/35 schémas sans validateur actif. 🟢 boucle auto dormante (CHAIN_HISTORY 19 lignes, stop 2026-06-04). 🟢 anomalie donnée `lane: CLOSED`.

### 3.8 Build / CI / dépendances — **statut : CI DÉCORATIVE (P0)**
**Preuves :** 🔴 `canonical-ci.yml` (seul auto) filtré `paths: docs/**,*.md` + imprime `RUST_COMPILE_OR_TEST_NOT_RUN_IN_PR01:259` ; 🔴 trigger `push: branches:[main]:14` alors que défaut=`master`. `chess-test.yml` = `workflow_dispatch` + 2 tests. Cargo.lock présent (repro binaire) mais **pas de `rust-toolchain.toml`**.
**Faiblesses :** 🟠 `requirements.txt` **UTF-16 LE + BOM** (octets `ff fe`, pip peut échouer, viole `.gitattributes`) ; `ml/requirements.txt` torch/numpy **non pinnés** ≠ `requirements.txt` (torch==2.11.0). 🟠 `deploy_studio.sh:20` réécrit `CLAUDE.md` **inconditionnellement** (36 L vs 187 L canoniques) → footgun. 🟡 `stop_studio.ps1:13 $pid` (var read-only PowerShell). 🟢 pas de scan supply-chain (cargo audit / pip-audit). 🟢 `DATABASE_URL` Postgres résiduel `.cargo/config.toml`.
**Force :** scripts shell `set -euo pipefail` ; `start_studio.ps1` gate HMAC + health-checks ; CI hardening (`permissions: contents:read`, `persist-credentials:false`).

### 3.9 Sécurité — **statut : socle OK, garde-fous fail-open**
**Preuves :** **0 secret commité** (`git log -S` propre) ; `.gitignore` couvre `.env/*.pem/*.key/secrets/`. 🟠 hooks `.claude/hooks` **non câblés** (`core.hooksPath` non positionné, `.git/hooks` vide) → blocage jamais exécuté. 🟠 HMAC **fail-open** (`bench/*.sh:92` WARN si clé absente) + **aucune vérif en code** des sidecars de verdict (que des skills `.md` manuels ; `ingest_event.py:235` vérifie `events.jsonl`, pas les verdicts). 🟠 clé privée RSA en clair sur disque (`secrets/BullshitKiller/license_private_key.json`, **hors git**). 🟡 5 `shell=True` (`autopilot.py:697,719`…). 🟡 `claude_bridge.py:65` API Anthropic externe (orphelin).
**Force :** deny-list harness active (`rm -rf`, `push --force`, `cat *.env`) ; CODEOWNERS réel ; aucun `eval/exec` non fiable.

### 3.10 Documentation — **statut : cœur sain, périphérie polluée**
**Preuves :** 🔴 `00_NAVIGATION_INDEX.md:71-81` pointe le code en `repos/games/TacticalChessPureLab/src/` **inexistant** (89 md référencent ce chemin mort). 🔴 zombie `02_COMMAND_CHEATSHEET.md` byte-identique à `08` (md5 égal) alors que l'index le déclare « supprimé/interdit ». 🟠 README pointe `DOCS_STATUS.md` archivé. 🟠 3 maps/audits redondants racine (`SYSTEM_MAP`≈`STUDIO_FULL_MAP`). 🟡 77 specs `_V0` intention-only.
**Force :** série canonique 00–11 propre ; `99_ARCHIVE` (93 md) prouve qu'un process de démotion existe — mais non appliqué à la racine.

### 3.11 Performance — **statut : non profilé (UNKNOWN), pas de red flag bloquant**
Pas de benchmark exécuté (hors doctrine read-only). Signaux statiques : moteur sans `unsafe` ni alloc évidente en hot path ; double Zobrist = surcoût mémoire mineur ; bridge Python neural = process spawn par requête (latence). `autopilot.py` ThreadingTCPServer = 1 thread/requête (OK échelle locale). **Aucune mesure → statut UNKNOWN, à instrumenter si la perf devient un objectif.**

---

## 4. Graphes (vue d'ensemble)

### 4.1 Graphe runtime / dépendances (couplage réel)
```
autopilot.py ──import──> control_plane/registry.py
     │
     ├──Popen──> lab/chains/kaizen_autoloop.py ──import──> kaizen_loop.py ──write──> IMPROVEMENT_LEDGER.yaml
     │                          │                                          └──> golden_collector ──> golden_examples.jsonl
     │                          ├──call──> governance/governor.py  (ALLOW/BLOCK)
     │                          └──exec──> claude-code CLI / run_chain.py ──HTTP──> LM Studio :1234
     │
     └──read──> studio_state.json
scripts/director.py ──(opt-in --dispatch)──> dispatch_bridge.py ──> kaizen_autoloop
scripts/ingest_event.py ──> derive_studio_state_delta.py ──> update_studio_current_state.py  (SEUL writer state)

[Rust] src/agents/neural_config.rs ──spawn──> ml/infer_policy.py ──load──> models/latest.pt
  ⚠ COUPLAGE NUL : autopilot.py ⇎ ml/*  (lane STUDIO et lane IA totalement découplées)
```

### 4.2 Graphe IA / décision (où le neural agit — et n'agit pas)
```
Moteur (jeu réel) :  decision.rs  ──DecisionMode::Neural──> search_authority ──> search.rs (alpha-beta)   [NEURAL ABSENT]
                     ai/policy_guide ─(PASSIVE, can_drive_runtime=false, 0 appelant)─✗

Harnais simulation : simulation_runner ──> NeuralAgent.select_action ──> bridge Python ──> modèle
                                              └─ prédiction (base 0.30) re-rerankée par heuristiques + retrieval(OFF)
```

### 4.3 Graphe d'entraînement (la fracture P0)
```
Rust selfplay ──> pool_selfplay.jsonl ──> ml/train.py ──(latest.pt CHAQUE epoch, SANS gate)──> models/latest.pt  ⚠ SERVI
                                              learning_loop stage4 attend candidate.pt ──✗ JAMAIS PRODUIT
                                          ml/run_selfplay_training.py ──shutil.copy──> models/latest.pt  ⚠ 2e writer
```

### 4.4 Graphe documentaire
```
CANONIQUE :  CLAUDE.md · AGENTS.md · 00_MASTER_DOCS/00–11 · STUDIO_CONTEXT(généré) · KAIZEN_LOG
DÉRIVE    :  00_NAVIGATION_INDEX ──pointe──> repos/games/TacticalChessPureLab/  ✗ (mort, 89 md le citent)
BRUIT     :  racine {AUDIT_2026-05-28, AUDIT_REPORT, SYSTEM_MAP≈STUDIO_FULL_MAP, BRAIN_*}  +  1650 md worktrees/repos
ZOMBIE    :  02_COMMAND_CHEATSHEET == 08  (interdit, ressuscité)
```

---

## 5. Registre de risques consolidé (P0 → P3)

Chaque ligne : **vérif adverse** = résultat de la Vague 2 (`CONFIRMED` / `PARTIAL`).

### 🔴 P0 — Critiques (corruption silencieuse / protection illusoire)

| ID | Risque | Preuve | Impact | Solution | Coût | Vérif |
|---|---|---|---|---|---|---|
| **P0-1** | Gate de déploiement modèle court-circuité : `latest.pt` écrasé chaque epoch *avant* éval ; `candidate.pt` jamais produit | `ml/train.py:961` ; `learning_loop.sh:43,109` ; grep `candidate.pt`=1 (script only) | Le modèle servi peut régresser sans aucun garde-fou ELO | `train.py` écrit `candidate.pt` (via `TCS_MODEL_DIR`) et ne touche **pas** `latest.pt` ; seul stage4 déploie après compare | M | CONFIRMED |
| **P0-2** | CI ne compile/teste rien automatiquement | `canonical-ci.yml:7-11,259` | Régression Rust/Python mergée sans détection | Job auto `cargo test --release` + `pytest` sur PR touchant `src/**`/`ml/**` | M | CONFIRMED |
| **P0-3** | Trigger CI `push` sur `main` (branche défaut = `master`) → ne se déclenche jamais | `canonical-ci.yml:14` vs `git symbolic-ref` | Le peu de CI auto est mort | `branches: [master]` | S | CONFIRMED |
| **P0-4** | Carte de navigation pointe le code en `repos/games/TacticalChessPureLab/` inexistant | `00_NAVIGATION_INDEX.md:71-81` ; `ls`→MISSING ; 89 md le citent | Un agent suit une topologie morte → actions erronées | Réécrire la carte (root `src/`+`autopilot.py`) ; auditer les 89 md | M | CONFIRMED |
| **P0-5** | Zombie `02_COMMAND_CHEATSHEET.md` (interdit) ressuscité, identique à `08` | `diff`→IDENTICAL ; index l.51 « supprimé » | Viole règle mémoire, ambiguïté de source | Re-supprimer 02 (gate Pierre) | Trivial | CONFIRMED |

### 🟠 P1 — Majeurs

| ID | Risque | Preuve | Solution | Vérif |
|---|---|---|---|---|
| **P1-1** | 2 trainers écrivent `models/latest.pt` (sémantiques ≠) → lignée non traçable | `train.py:961` vs `run_selfplay_training.py:241` | 1 trainer canonique ; l'autre en run_dir ; registre provenance | CONFIRMED |
| **P1-2** | `pool_selfplay.top_moves` pollué par debug-strings Rust | échantillon l.1 `Move { unit_id… }` | **Impact réduit** : `best_move` UCI OK, soft-target filtre (`dataset_loader.py:869`) → corriger l'export Rust (perte de signal, pas bloqueur) | PARTIAL |
| **P1-3** | Zobrist double-source maintenu à la main → désync nul | `search.rs:1104` vs `engine.rs:28` (cmt `engine.rs:16`) | Module Zobrist unique partagé + test d'égalité de clés | CONFIRMED |
| **P1-4** | `panic!` en chemin prod (résolution paths Python) | `neural_config.rs:15,61,68` | Remonter `Result`/fallback labellé | CONFIRMED |
| **P1-5** | Globals `REPO`/`LM_*` réassignés à chaud sans lock (serveur threadé) | `autopilot.py:7550-7556` + `:7813` | Config immutable après boot, ou lock+validation | CONFIRMED |
| **P1-6** | Hooks `.claude/hooks` non câblés à git (blocage jamais exécuté) | `core.hooksPath` absent ; `.git/hooks` vide | `git config core.hooksPath .claude/hooks` | CONFIRMED |
| **P1-7** | Vérif HMAC des verdicts oracle inexistante en code (fail-open) | `bench/*.sh:92` WARN ; vérif seulement en `.md` | Bloquer en code si `.hmac` absent/invalide | CONFIRMED |
| **P1-8** | Clé privée RSA en clair sur disque | `secrets/BullshitKiller/license_private_key.json` | Chiffrer au repos (DPAPI/vault) + rotation | CONFIRMED |
| **P1-9** | `validate_report` close un IMP sur string-match du texte LM | `kaizen_autoloop.py:255-287` | Adosser à un oracle non-LLM (exit code / verdict signé) | CONFIRMED |
| **P1-10** | Gates PR04/05/07 non câblés + READMEs pointent des chemins inexistants | `lab/gates/README.md:28` ; `scripts/check_*.py`→MISSING | Corriger chemins → `scripts/studioV2/` ou câbler dans l'autoloop | CONFIRMED |
| **P1-11** | `requirements.txt` UTF-16+BOM (pip peut échouer) ; `ml/requirements.txt` non pinné, divergent | octets `ff fe` ; `torch==2.11.0` vs flottant | Réencoder UTF-8/LF + pin + source unique | CONFIRMED |
| **P1-12** | `deploy_studio.sh` réécrit `CLAUDE.md` inconditionnellement (36 L vs 187 L) | `deploy_studio.sh:20` | Guard `[ -f CLAUDE.md ]` ou backup | CONFIRMED |
| **P1-13** | `FORBIDDEN_MISSIONS` dupliqué (gate vs backbone), synchro manuelle | `governor.py:37` vs `ingest_event.py` | Source unique importée des deux côtés | — |

### 🟡 P2 — Moyens
P2-1 Surface `pub` Rust trop large (122 chess/) → `pub(crate)` + façade · P2-2 mode `DecisionMode::Neural` trompeur (route vers search) · P2-3 ~6 tests-frontière = source/doc-grep (théâtre) → renommer `*_architecture_fence` + tests comportementaux · P2-4 gate admission AM passive par défaut (documenter ou activer) · P2-5 `save_ledger` perd les commentaires (→ ruamel.yaml) · P2-6 `claude_bridge.py` API externe (retirer/gater) · P2-7 5× `shell=True` (→ `shlex`/liste) · P2-8 toolchain Rust non pinnée (`rust-toolchain.toml`) · P2-9 `.git` 1,8 Go bloat · P2-10 drift dual-brain doc autopilot · P2-11 `stop_studio.ps1 $pid` read-only · P2-12 28/35 schémas sans validateur actif.

### 🟢 P3 — Améliorations
P3-1 20 `#[allow(dead_code)]` diagnostics passifs · P3-2 3 fichiers Rust > 2000 L · P3-3 `print()` 33/33 ML → `logging` · P3-4 ~10 modules ML sans caller (archiver) · P3-5 `_ceo_brief_cache` write-only · P3-6 86 `.innerHTML` (escaping) · P3-7 3 maps/audits racine redondants (archiver) · P3-8 77 specs `_V0` intention-only (tagger `DOCUMENTED_ONLY`) · P3-9 datasets lourds trackés (Git-LFS) + `tmp_share_*.html` morts · P3-10 worktrees 262 M + dossier `C:TACTICAL_CHESS_STUDIO/` parasite · P3-11 boucle auto dormante (documenter le mode réel) · P3-12 anomalie `lane: CLOSED` ledger · P3-13 efficacité neurale non mesurée · P3-14 pas de scan supply-chain · P3-15 `DATABASE_URL` résiduel `.cargo`.

---

## 6. Top améliorations — classées par ROI

### ⚡ Quick Wins (coût Trivial/S, impact élevé) — faire en premier
1. `canonical-ci.yml:14` → `branches: [master]` (réactive la CI push). **[P0-3]**
2. Re-supprimer le zombie `02_COMMAND_CHEATSHEET.md`. **[P0-5]**
3. `git config core.hooksPath .claude/hooks` (active les garde-fous commit). **[P1-6]**
4. Réencoder `requirements.txt` en UTF-8/LF. **[P1-11]**
5. Guard `[ -f CLAUDE.md ]` dans `deploy_studio.sh:20`. **[P1-12]**
6. Corriger les chemins README `lab/gates/` + `lab/claim_data_gates/` → `scripts/studioV2/`. **[P1-10]**
7. Corriger `lane: CLOSED` + IMP-178 `domain` manquant (rend la suite verte). **[P3-12]**
8. `rust-toolchain.toml` (channel figé). **[P2-8]**
9. `stop_studio.ps1` : `$pid` → `$procId`. **[P2-11]**
10. Retirer `DATABASE_URL` de `.cargo/config.toml` si résiduel. **[P3-15]**

### 🔴 P0 — Avant toute autre feature
11. **Réparer le gate de déploiement modèle** : `train.py` → `candidate.pt`, `latest.pt` intouché, deploy conditionné à l'éval ELO. **[P0-1]**
12. **Ajouter un job CI réel** `cargo test --release` + `pytest tests/ scripts/ lab/chains/ governance/ ml/` sur PR `src/**`/`ml/**`. **[P0-2]**
13. **Réécrire la carte de navigation** vers la topologie réelle ; auditer les 89 md citant le chemin mort. **[P0-4]**

### 🟠 P1 — Sprint suivant
14. Désigner UN trainer canonique + registre de provenance modèle. **[P1-1]**
15. Corriger l'export Rust `selfplay_jsonl` (UCI dans `top_moves`/`aaa_alt_moves`). **[P1-2]**
16. Extraire un module Zobrist unique partagé search/engine + test d'égalité. **[P1-3]**
17. `neural_config.rs` : `panic!` → `Result`/fallback. **[P1-4]**
18. autopilot : config immutable après boot (ou lock). **[P1-5]**
19. Enforcement HMAC en code (verdict non signé → stop). **[P1-7]**
20. Chiffrer la clé privée RSA au repos + rotation. **[P1-8]**
21. `validate_report` adossé à un oracle non-LLM. **[P1-9]**
22. `FORBIDDEN_MISSIONS` : source unique importée. **[P1-13]**
23. Pin + source unique des requirements ML. **[P1-11]**

### 🟡 P2 — Dette structurante
24. Façade `pub(crate)` sur chess/. 25. Renommer/annoter `DecisionMode::Neural`. 26. Renommer les tests source-grep `*_architecture_fence` + ajouter tests comportementaux (autopilot endpoints, selfplay, elo). 27. Documenter ou activer la gate admission AM. 28. `save_ledger` → ruamel.yaml (round-trip). 29. Retirer/gater `claude_bridge.py`. 30. `shell=True` → `shlex`. 31. `git gc` + audit gros blobs. 32. Aligner doc dual-brain autopilot. 33. Câbler ou archiver les 28 schémas inactifs.

### 🟢 P3 — Hygiène & vérité du code
34. Brancher ou supprimer les diagnostics `#[allow(dead_code)]`. 35. Découper search.rs/engine.rs/practical_policy.rs. 36. Migrer ML `print`→`logging`. 37. Archiver les ~10 modules ML sans caller. 38. Consommer/supprimer `_ceo_brief_cache`. 39. `textContent`/escaping sur champs libres UI. 40. Archiver les 3 maps/audits racine redondants. 41. Tagger les 77 specs `_V0` `DOCUMENTED_ONLY` + déplacer en `docs/_intentions/`. 42. Git-LFS pour datasets lourds + untrack `tmp_share_*.html`. 43. `git worktree prune` + supprimer le dossier parasite. 44. Documenter le mode réel (boucle auto dormante). 45. Compteur « prédiction neurale survit au rerank » + test ELO neural vs hybrid. 46. `cargo audit` + `pip-audit`.

### 🏗️ Long terme (architecture)
47. **Décider le destin de la couche `ai/` PASSIVE** : la brancher derrière une gate explicite, ou l'archiver — pas la maintenir en limbe. 48. **Réduire la surface affichée** : archiver explicitement studioctl (3254 L) + l'architecture Codex (40 scripts) ou les câbler. 49. **Unifier les 4 schémas de datasets** sous un registre versionné. 50. **Décider du modèle de concurrence autopilot** : monolithe HTTP maison vs framework (le refactor UI/backend ne peut pas attendre éternellement à 7871 L). 51. **Trancher la question « usine autonome »** : assumer le mode interactif supervisé (et le documenter), ou superviser un daemon réel. 52. **Politique unique d'archivage doc** appliquée à la racine (le `99_ARCHIVE` existe déjà — l'utiliser).

> Le décompte ci-dessus consolide les ~50 risques distincts remontés par les 10 surfaces (chaque ID P0/P1/P2/P3 = une amélioration actionnable). Au-delà de 52, les items deviennent des déclinaisons par fichier des mêmes corrections (ex. découper chaque gros module, tagger chaque spec `_V0`, archiver chaque map) — listées par catégorie plutôt qu'égrenées pour éviter le remplissage.

---

## 7. Le grand écart — surface affichée vs surface câblée

Le motif récurrent, prouvé sur 6 surfaces indépendantes :

| Affiché (doc/structure) | Câblé (preuve code) |
|---|---|
| « IA neurale qui joue » | `NeuralAgent` actif en simulation seulement ; couche `ai/` PASSIVE 0 appelant |
| « Closed-loop training avec gate ELO » | gate court-circuité, `latest.pt` écrasé sans condition |
| « CI / gates de protection » | CI ne teste rien (filtre docs + branche morte) ; hooks non câblés ; HMAC fail-open |
| « Usine autonome » | boucle dry-run par défaut, jamais auto-démarrée, CHAIN_HISTORY figé au 2026-06-04 |
| « Control-plane riche (studioctl, Codex, 35 schémas) » | ~10 % câblé ; 3254 L sans importeur ; 40 scripts Codex non branchés |
| « Flask + dual-brain qwen3.6 » | BaseHTTPRequestHandler ; qwen2.5 forcé, qwen3.6 jamais sollicité |

**Ce n'est pas de la malhonnêteté** : chaque couche a été construite réellement, puis figée (PASSIVE/scaffold) sans être retirée ni branchée. Le risque n'est pas la qualité du noyau — il est dans la **dette d'inertie** : des garde-fous qui rassurent sans agir, et une carte qui ne correspond plus au territoire.

---

## 8. Gates Pierre (décisions humaines requises)

1. **Zone `tests/` protégée** — corriger les 2 fichiers de test vides et les tests en drift exige une gate explicite.
2. **Suppression du zombie `02_COMMAND_CHEATSHEET.md`** et des maps/audits racine — destructif sur fichiers suivis.
3. **Suppression de `repos/games/studioV2_MIGRATED_HOLD/` et `git filter-repo`** (bloat 1,8 Go) — réécriture d'historique.
4. **Modification de `IMPROVEMENT_LEDGER.yaml`** (anomalie `lane: CLOSED`, IMP-178 `domain`) — passe par `kaizen_loop.py`, jamais à la main.
5. **Destin de la couche `ai/` PASSIVE et de l'architecture Codex** — décision d'architecture (brancher vs archiver).
6. **Retrait de `ml/claude_bridge.py`** (API externe interdite) — confirmer.

---

## 9. Statuts par composant (synthèse)

| Composant | Statut |
|---|---|
| `src/chess` + `engine` + `core` | **IMPLEMENTED + TESTED** |
| `src/agents/NeuralAgent` (simulation) | **IMPLEMENTED** (cloisonné) |
| `src/ai/` (policy_guide, decision_controller) | **PASSIVE** |
| `src/simulation`, `src/tournament/elo` | **IMPLEMENTED, NOT tested** |
| Tests (gate effective) | **PARTIEL** (CI=0, smoke=`pytest ml/`) |
| `ml/train.py` closed-loop | **BLOCKED** (P0-1) |
| `ml/move_vocab`, filtre décisif IMP-179 | **TESTED** |
| `ml/claude_bridge.py` | **DEAD + FORBIDDEN** |
| `autopilot.py` (CEO lane-assignment) | **IMPLEMENTED** (déterministe, vérifié) |
| `autopilot.py` (ceo-brief / dual-brain) | **IMPLEMENTED** / drift doc |
| Control-plane noyau (governor, ingest, kaizen) | **IMPLEMENTED + TESTED** |
| studioctl + architecture Codex | **PASSIVE** |
| `00_STUDIO_CONTROL/` (289 fichiers) | **DOCUMENTED_ONLY** |
| CI GitHub | **DOCUMENTED_ONLY** (décorative) |
| Hooks git, HMAC verdict | **PASSIVE** (fail-open) |
| Doc canonique 00–11 | **DOCUMENTED_ONLY** (sain) |
| Carte de navigation (topologie code) | **NOT_FOUND** (chemin mort) |
| Performance | **UNKNOWN** (non profilé) |

---

*Audit produit en lecture seule. Aucun fichier source, dataset, ledger, test ou golden modifié. Aucun git mutant, aucun build/test exécuté. Toutes les allégations P0/P1 ont fait l'objet d'une vérification adverse indépendante (Vague 2). Les preuves sont des références `fichier:ligne` ; elles décrivent l'état du code observé, pas un comportement exécuté.*

software_verdict: BLOCKED · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED
