# STUDIO_BRAIN_AUDIT — Tactical Chess Studio
Date audit : 2026-06-03
Périmètre  : C:\TACTICAL_CHESS_STUDIO — lecture seule, zéro mutation
Auditeur   : Claude Code READ-ONLY
**claim_verdict : NO_CLAIM_ALLOWED**

---

## 1. CARTE REPO — ce qui existe réellement

### 1.1 Dossiers actifs et dimensions

| Dossier | Fichiers | Taille | Statut |
|---------|----------|--------|--------|
| `src/` | 106 .rs + 28 tests | 1 MB + 0.5 MB | **ACTIF** — 36 713 lignes Rust total |
| `ml/` | 33 fichiers Python | 0.7 MB | **ACTIF** — pipeline ML complet |
| `lab/` | 615 fichiers | ~4 607 MB | **ACTIF** — dominé par `lab/runs/` 3 426 MB + `lab/puzzles/` 1 046 MB |
| `models/` | 5 fichiers | ~17 944 MB | **ACTIF** — best.pt (35 MB) + latest.pt (35 MB) + LLMs GGUF |
| `tools/` | 108 fichiers | 110 MB | **ACTIF** — Stockfish exe + src C++ |
| `scripts/` | 95 fichiers | 1.5 MB | **ACTIF** — control-plane Python + PS |
| `00_STUDIO_CONTROL/` | 282 fichiers | 2.7 MB | **ACTIF** — docs pilotage, registries, forms |
| `docs/` | 210 fichiers | 0.8 MB | **ACTIF** — contrats architecture, plans |
| `schemas/` | 35 fichiers | 0.1 MB | **ACTIF** — 35 JSON Schemas validation |
| `repos/apps/BullshitKiller/` | 1 115 | 46.5 MB | **DORMANT** — app Python standalone packagée |
| `repos/games/studioV2_MIGRATED_HOLD/` | 1 050 | 36.4 MB | **DORMANT** — ancienne v2 studio |
| `repos/agents/CyberSentinel/` | 1 | ~1 KB | **STUB** — README seulement |
| `repos/apps/StudioLauncher/` | 1 | ~1 KB | **STUB** — README seulement |
| `repos/shared/` | 1 | ~1 KB | **STUB** — README seulement |
| `datasets/` `runs/` `tmp/` `AI_MEMORY/` | 0 | 0 | **VIDE** — sentinelles |

### 1.2 Pool datasets (lab/datasets/pool/)

| Fichier | Lignes | Taille | Statut |
|---------|--------|--------|--------|
| `pool_2400.jsonl` | 43 342 937 | 6.2 GB | OK — draw_rate=8.8% ✓ |
| `dataset_c_elite.jsonl` | 500 000 | 65 MB | OK |
| `dataset_b_quality.jsonl` | 8 105 | 12 MB | OK |
| `dataset_a_rocky.jsonl` | 7 002 | 9.9 MB | OK — draw_rate=0% ✓ |
| `pool_sf.jsonl` | 6 272 | 3.4 MB | ⚠ draw_rate=94% — critère <30% non atteint |
| `dataset_d_puzzles.jsonl` | 6 081 | 2.3 MB | OK |

`ACTIVE_DATASET.txt` pointe encore sur `lab/datasets/teacher_samples.jsonl` — corrompu (100% draws, 553 lignes). Redirection vers pool_2400 : **HumanGate requis** (IMP-008 FORBIDDEN).

### 1.3 Checkpoints entraînement (lab/runs/)

| Run | Date | .pt | dataset_fitness | Cause rejet |
|-----|------|-----|----------------|-------------|
| run_20260527_203322 | 2026-05-27 | 20 epochs | reject_for_ab | no_white_wins + hard_cap_draw_ratio_too_high |
| run_20260527_205249 | 2026-05-27 | ~20 | reject_for_ab | too_few_loaded_samples + idem |
| run_20260527_215807 | 2026-05-27 | ~20 | reject_for_ab | hard_cap_draw_ratio_too_high |
| run_20260528_111109 | 2026-05-28 | ~20 | reject_for_ab | ? |
| run_20260601_173953 | 2026-06-01 | 20 epochs | reject_for_ab | hard_cap_draw_ratio_too_high (79.3% des hard-cap rows draws) |

**100 checkpoints .pt au total — tous marqués `exploratory_only`, `reject_for_ab`.** Aucun run éligible à l'A/B car tous les datasets sources contenaient trop de draws (dataset teacher_samples corrompu). Modèles dans `models/best.pt` et `models/latest.pt` (35 MB chacun) sont les artefacts les plus récents mais issus de données corrompues.

### 1.4 Fichiers root non trackés (git status ?)

| Fichier | Statut git |
|---------|-----------|
| `STUDIO_CONTEXT_LIVE.md` | untracked — mis à jour par `_log_lm_call()` |
| `AUDIT_REPORT.md` | untracked — produit audit 2026-06-03 |
| `00_STUDIO_CONTROL/05_AUDIT/` | untracked — dossier local |
| `lab/tmp_imp036_diag.py` | untracked |
| `lab/datasets/teacher_samples.jsonl` | modifié (non stagé) |

---

## 2. LEDGER — état backlog

### 2.1 Métriques globales

| Statut | Nombre | % |
|--------|--------|---|
| CLOSED | 38 | 93% |
| OPEN | 2 | 5% |
| DEFERRED | 1 | 2% |
| IN_PROGRESS | 0 | — |
| BLOCKED | 0 | — |
| **Total** | **41** | — |

Dernière session ledger : `2026-06-02-humangate`
Spec coverage : 90% | Delta depuis session précédente : +0 fermetures

### 2.2 IMPs OPEN (backlog actionnable)

| IMP | Lane | ROI | Titre | Fichiers cibles |
|-----|------|-----|-------|----------------|
| IMP-038 | AUDIT_REQUIRED | **4.0** | sf_dataset_generator.py → Pool-SF Stockfish depth 14 | `ml/sf_dataset_generator.py`, `lab/datasets/pool/pool_sf.jsonl` |
| IMP-008 | **FORBIDDEN** | 0.8 | Dataset rebuild (teacher_samples corrompu) | `lab/datasets/teacher_samples.jsonl` |

### 2.3 IMP DEFERRED

| IMP | Lane | ROI | Titre | Blocage |
|-----|------|-----|-------|---------|
| IMP-011 | AUDIT_REQUIRED | 0.6 | Value head inutilisée #NEW-04 | Bloqué par IMP-008/NEW-03 (dataset corrompu) |

### 2.4 Chronologie CHAIN_HISTORY (10 dernières exécutions)

| Timestamp | IMP | Lane | Status |
|-----------|-----|------|--------|
| 20260531_213324 | IMP-004 | SAFE_AUTO | SUCCESS |
| 20260601_083606 | IMP-006 | AUDIT_REQUIRED | SUCCESS |
| 20260601_085925 | IMP-012 | SAFE_AUTO | SUCCESS |
| 20260601_090731 | IMP-013 | SAFE_AUTO | SUCCESS |
| 20260601_091457 | IMP-007 | AUDIT_REQUIRED | SUCCESS |
| 20260601_143019 | IMP-014 | AUDIT_REQUIRED | SUCCESS |
| 20260601_195539 | IMP-021 | AUDIT_REQUIRED | SUCCESS |
| 20260601_203016 | IMP-015 | AUDIT_REQUIRED | SUCCESS |
| 20260602_011304 | IMP-031 | SAFE_AUTO | **FAIL** (puis relancé) |
| 20260602_011644 | IMP-031 | SAFE_AUTO | SUCCESS |

Toutes les exécutions via `kaizen_autoloop.py` standalone — l'UI n'a pas encore lancé ces chains.

---

## 3. LORA — état réel

### 3.1 Configuration (ml/lora_config.yaml)

| Paramètre | Valeur |
|-----------|--------|
| **STATUS** | **PENDING** |
| Raison blocage | 19 exemples / 50 requis |
| Modèle base | devstral-small-2507 |
| Cible | devstral-tcs-v1 |
| Adapter | LoRA rank=8, alpha=16, dropout=0.05 |
| Target modules | q_proj + v_proj |
| Epochs | 3 |
| Batch size | 4 |
| Learning rate | 2e-4 |
| draw_rate_max gate | ≤ 15% |
| HumanGate requis | OUI — obligatoire avant tout lancement |

### 3.2 Corpus disponible

| Fichier | Exemples | Source |
|---------|----------|--------|
| `lab/datasets/ux_finetune_20260603.jsonl` | 10 | mode_claude_run (ancien backend Claude — sorties = 401 ERREUR) |
| `lab/datasets/ux_finetune_autodev_20260603.jsonl` | 9 | session autodev IMP-010/025/027 |
| **Total** | **19** | — |

**Problème critique** : les 10 exemples `ux_finetune_20260603.jsonl` proviennent d'appels `/api/claude-mode-run` qui ont tous retourné `[ERREUR API] 401 — invalid x-api-key`. Les `output` de ces exemples sont des messages d'erreur, pas des outputs valides. Ces 10 exemples sont **inutilisables pour le fine-tuning** en l'état.

**golden_examples.jsonl** : NON TROUVÉ — `golden_collector.py` existe (220 lignes) et peut archiver les charters des IMPs fermés, mais la commande `collect` n'a jamais été lancée. 38 IMPs CLOSED = 38 exemples potentiels à collecter.

### 3.3 Prêt à lancer ?

**NON.** Trois blocages :
1. **Corpus insuffisant** : 19 exemples, dont 10 corrompus (sorties = erreurs API) → effectivement ~9 exemples valides
2. **draw_rate_check** non passé : `draw_rate_pool: null` dans lora_config.yaml — smoke benchmark requis
3. **HumanGate** explicite requis (training = FORBIDDEN sans HumanGate)

**Ce qui manque** : collecter les golden_examples depuis les 38 charters CLOSED (`python lab/chains/golden_collector.py collect --imp IMP-XYZ`), accumuler 41+ exemples supplémentaires valides, passer le smoke benchmark.

---

## 4. PIPELINE KAIZEN — connexions réelles

### 4.1 Architecture pipeline

```
kaizen_loop.py          — CLI (recall / propose / close / metrics / add)
    ↓ importé par
kaizen_autoloop.py      — boucle complète standalone (--once / --lane / --dry-run)
    ↑ NON câblé dans autopilot.py

autopilot.py            — UI web + API
    └── /api/run-chain → run_chain(cmd) → subprocess
             ↑
        CHAINS_DEF JS = 7 chaînes hardcodées :
        recall / audit / propose / metrics (SAFE_AUTO)
        smoke / coach / tests (AUDIT_REQUIRED)
        — kaizen_autoloop.py absent de CHAINS_DEF —
```

### 4.2 Charters existants (lab/chains/charters/)

13 charters créés : IMP-004, IMP-005, IMP-006, IMP-007, IMP-012, IMP-013, IMP-014, IMP-015, IMP-016, IMP-021, IMP-031, IMP-032, IMP-036

**Charters manquants pour IMPs OPEN/actifs** :
- IMP-038 (prochaine action prioritaire) — pas de charter
- IMP-008 (FORBIDDEN, pas nécessaire immédiatement)

### 4.3 FUSION_LOG.jsonl

**NOT_FOUND** — le handler `/api/fusion-cmd` dans autopilot.py écrit dans `lab/chains/FUSION_LOG.jsonl` à chaque appel Devstral réussi, mais le fichier n'existe pas encore (fusion Devstral jamais déclenchée avec succès depuis la migration, ou fichier non commité).

### 4.4 Autoloop vs UI

| Aspect | kaizen_autoloop.py (standalone) | autopilot.py (UI) |
|--------|--------------------------------|-------------------|
| Exécution chains | OUI — CLI complet | OUI — `/api/run-chain` |
| Boucle complète recall→close→metrics | OUI | NON — pas câblé |
| Gestion lanes FORBIDDEN | OUI — STOP immédiat | OUI — modal + garde JS |
| Trace CHAIN_HISTORY.jsonl | OUI — écrit directement | NON — run_chain() n'écrit pas CHAIN_HISTORY |
| golden_collector.py intégration | OUI — `archive_closed_imp()` prévu | NON |

**Note importante** : `run_chain()` dans autopilot.py exécute la commande en subprocess et retourne stdout/stderr dans `log_buffer`. Il **n'écrit pas** dans `CHAIN_HISTORY.jsonl`. Seul `kaizen_autoloop.py` alimente CHAIN_HISTORY.

---

## 5. IDÉES DISPERSÉES — inventaire

### 5.1 Idées JS hardcodées dans autopilot.py (non persistées)

**Studio/control-plane** (chain:'studio') :
1. 🔴 `Chaîne Red Team + Fusion` — interroger blocages des 3 pipes (roi:high, lane:audit)
2. 🟡 `Mode éphémère` — sessions de réflexion sans persistence (roi:med, lane:safe)
3. 🔴 `Hygiène automatique : doc → vérité → commit → push` (roi:high, lane:human)
4. 🔴 `LM Studio pilote les 3 lanes en local` — Phase 2 LLM documentée (roi:high, lane:human)
5. 🟡 `Interface UxPilote consolidée` — cockpit lecture seule Phase 1 (roi:med, lane:human)

**IA/ML** (chain:'ia') :
6. 🔴 `Mode éphémère dataset` — tourner sans sauvegarder, conserver métriques only (roi:high, lane:audit)
7. 🟡 `LoRA sur corpus studio` — contrôle flambée datasets, purge auto runs ratés (roi:med, lane:audit)
8. 🟡 `Cartes variantes Rocky` — plan Search-only / +Neural / +Neural+LLM (roi:med, lane:safe)
9. 🔴 `Stats, télémétrie et triage dataset` — draw_rate/phase, ELO delta/run, freeze baselines (roi:high, lane:audit)

**Jeux vidéo** (chain:'jv') :
10. 🔴 `Manifeste création jeu Godot` — deux manifestes = succession prompts (roi:high, lane:safe)
11. 🔴 `Adaptateur Rocky → Godot` — pipeline UCI↔Godot complet (roi:high, lane:human)
12. 🟡 `Matrice cartes/nom → prompt Godot` — (nom+type+faction+budget) → modèle 3D (roi:med, lane:safe)

*Ces 12 idées sont en mémoire JS uniquement — perdues au refresh, jamais persistées côté serveur.*

### 5.2 Décisions HUMANGATE_DECISION_LOG.yaml

| ID | Titre | Zone | Date |
|----|-------|------|------|
| HGD-001 | IMP-001 valide — detect_lane lit manifest | lab/chains | 2026-05-31 |
| HGD-002 | IMP-001 close — IMP-009 débloqué | lab/chains | 2026-05-31 |
| HGD-003 | Formule dégâts : max(0, ATK-ARM) | Chess Fantasy | 2026-06-01 |
| HGD-004 | kingPressure support : +1 par pièce qui soutient | Chess Fantasy | 2026-06-01 |

*Note : HGD-003/004 sont des décisions Chess Fantasy — preuve que le projet Chess Fantasy avance côté design même si aucun code n'est encore écrit.*

### 5.3 Idées dans docs/control-plane/ (plans non démarrés)

| Fichier | Contenu |
|---------|---------|
| `CHESS960_CAMPAIGNPLAN_DRAFT_V0.md` | Plan d'activation Chess960 |
| `CHESS960_PATCHPLAN_APPROVAL_V0.md` | Approbation patches Chess960 |
| `CONTROL_PLANE_VISION_MAP_V0.md` | Vision map control-plane |
| `ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_V0.md` | Contrat routage search/neural |
| `PATCHPACK_CAMPAIGN_PLAN_V0.md` | Plan campagne patchpack |
| `STUDIOPILOT_CONTROL_PLANE_V0_AUDIT.md` | Audit control-plane |

### 5.4 Roadmap Phase 3 (01_ROADMAP.md)

Non démarrées, déclarées :
- Coaching IA rétro-engineering
- Snake autour du monde
- Belote
- LoRA sur LLM local
- App seniors (guidage vocal/visuel)
- Ligue / selfplay avancé

### 5.5 ux_claude_runs.jsonl — traces migration Claude

10 lignes, toutes 2026-06-03 — 3 appels `/api/claude-mode-run` avec réponse `[ERREUR API] 401 — invalid x-api-key`. Preuve de la tentative d'utilisation de l'ancienne API Claude avant sa suppression (commit 078589d).

---

## 6. SURFACES MANQUANTES — gaps critiques

| Surface | Statut | Impact | Cause |
|---------|--------|--------|-------|
| `golden_examples.jsonl` | NOT_FOUND | HAUT — bloque corpus LoRA réel | `golden_collector.py` jamais appelé sur les 38 IMPs CLOSED |
| `FUSION_LOG.jsonl` | NOT_FOUND | MOYEN — pas de trace des fusions Devstral | Fusion via UI jamais déclenchée avec succès (ou fichier non commité) |
| `studio_state.json` | NOT_FOUND | FAIBLE — remplacé par STUDIO_CONTEXT_LIVE.md | Jamais créé — STATE_FILE Python = 07_CURRENT_STATE.md |
| IMP-038 charter | ABSENT | HAUT — bloque exécution propre | Charter non généré, nécessaire avant lancement autoloop |
| ELO post-17 IMP | NOT_MEASURED | HAUT — force fallback 1424/1200/975 dans UI | Smoke benchmark jamais relancé depuis les 17 améliorations Rocky |
| `updateNextAction()` dynamique | NOT_IMPLEMENTED | MOYEN — next action hardcodée dans UI | Hardcoded 'Recall → Audit', ne lit jamais le ledger |
| Issues HIGH bloc UI | STALE | MOYEN — NEW-02/NEW-05 résolus mais toujours affichés | HTML statique, jamais mis à jour |
| page-ideas persistance | NOT_IMPLEMENTED | FAIBLE — idées perdues au refresh | Pas de /api/ideas |
| kaizen_autoloop câblé dans UI | NOT_WIRED | MOYEN — boucle complète non accessible depuis le dashboard | Absent de CHAINS_DEF et de tout endpoint |
| ux_finetune_20260603.jsonl qualité | CORRUPTED | HAUT — 10/19 exemples LoRA = sorties erreur 401 | Générés pendant l'ancienne API Claude avec clé invalide |

---

## 7. PROCHAINES ACTIONS RECOMMANDÉES

Classées par ROI réel, avec lane et fichiers cibles.

---

### ACTION 1 — Collecter golden_examples.jsonl (ROI effectif : ★★★★★)

**Lane** : SAFE_AUTO | **Fichier** : `lab/chains/golden_collector.py`

```bash
for IMP in IMP-001 IMP-002 ... IMP-041; do
  .venv312/Scripts/python.exe lab/chains/golden_collector.py collect --imp $IMP
done
```

**Pourquoi en premier** : Génère immédiatement ~38 exemples valides pour LoRA depuis les charters existants. Débloque l'accumulation corpus sans dépendre d'IMP-038 ni du benchmark. Coût : 10 minutes d'exécution.

---

### ACTION 2 — IMP-038 : refaire pool_sf avec Stockfish depth 8-10 (ROI=4.0)

**Lane** : AUDIT_REQUIRED — HumanGate requis | **Fichier** : `ml/sf_dataset_generator.py`

Problem : SF depth 14 = trop défensif → draw_rate=94%. Solution : depth 8-10 produit des parties plus décisives.
Critère d'acceptance : 500+ parties, draw_rate < 20%.

**Pourquoi en deuxième** : Plus haute ROI du backlog actionnable. Débloque indirectement la redirection ACTIVE_DATASET + training.

---

### ACTION 3 — Rediriger ACTIVE_DATASET.txt vers pool_2400.jsonl (ROI cascade)

**Lane** : HUMAN_REQUIRED (contournement IMP-008 FORBIDDEN via pool pipeline)
**Fichier** : `lab/ACTIVE_DATASET.txt`

```
lab/datasets/pool/pool_2400.jsonl
```

**Pourquoi en troisième** : Débloque IMP-011 (value head) + tout futur run d'entraînement. Pool_2400 est propre (draw_rate=8.8%, 43M lignes). HumanGate requis — pas automatisable.

---

### ACTION 4 — Smoke benchmark Rocky post-17 IMP (ROI mesure)

**Lane** : AUDIT_REQUIRED | **Commande** :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\studioV2\run_benchmark.ps1 -Smoke -RunClass exploration_only
```

**Pourquoi** : L'ELO affiché dans l'UI (1424/1200/975) est le fallback hardcodé issu du dernier benchmark (2026-05-30). 17 améliorations Rocky ont été faites depuis. Le vrai ELO post-améliorations est inconnu. Un benchmark smoke mesure cette progression et écrit un rapport JSON que `get_metrics()` peut lire.

---

### ACTION 5 — Câbler kaizen_autoloop dans l'UI (ROI automatisation)

**Lane** : SAFE_AUTO | **Fichier** : `autopilot.py` JS CHAINS_DEF (ligne 1856)

Ajouter :
```js
autoloop_once: {
  label: 'Autoloop (once)',
  lane: 'AUDIT_REQUIRED',
  cmd: '.venv312/Scripts/python.exe lab/chains/kaizen_autoloop.py --once'
}
```

Et ajouter l'écriture dans CHAIN_HISTORY.jsonl depuis `run_chain()` ou via un wrapper.

**Pourquoi** : Actuellement la boucle complète (recall→charter→execute→close) n'est accessible qu'en CLI. Câbler en UI + traçabilité CHAIN_HISTORY permettrait de piloter tout le cycle depuis le dashboard.

---

## BLOC 7 — Inventaire surfaces (statut exact)

| # | Surface | Statut | Notes |
|---|---------|--------|-------|
| 1 | `autopilot.py` | **EXISTS** | 3164 lignes, 100% Devstral |
| 2 | `kaizen_autoloop.py` | **EXISTS** | `lab/chains/`, opérationnel standalone |
| 3 | `kaizen_loop.py` | **EXISTS** | `lab/chains/`, CLI complet |
| 4 | `studio_state.json` | **NOT_FOUND** | Remplacé par STUDIO_CONTEXT_LIVE.md (untracked) |
| 5 | `IMPROVEMENT_LEDGER.yaml` | **EXISTS** | 41 IMPs, 38 CLOSED, 2 OPEN |
| 6 | `FUSION_LOG.jsonl` | **NOT_FOUND** | Handler existe dans autopilot.py, fichier jamais créé |
| 7 | `HUMANGATE_DECISION_LOG.yaml` | **EXISTS** | 4 décisions (HGD-001 à HGD-004) |
| 8 | `CHAIN_HISTORY.jsonl` | **EXISTS** | ~15 entrées, dernière 20260602_011644 IMP-031 SUCCESS |
| 9 | `golden_examples.jsonl` | **NOT_FOUND** | Collector prêt (220 lignes), sortie jamais générée |
| 10 | `ux_claude_runs.jsonl` | **EXISTS** | 10 lignes — sorties toutes = erreur 401 (API Claude supprimée) |
| 11 | `lora_config.yaml` | **EXISTS** | `ml/`, STATUS: PENDING — 19/50 exemples |
| 12 | `train_player.py` | **EXISTS** | `ml/`, PyTorch, fonctionnel |
| 13 | `pool_2400.jsonl` | **EXISTS** | `lab/datasets/pool/`, 6.2 GB, draw_rate=8.8% ✓ |
| 14 | `dataset_a_rocky.jsonl` | **EXISTS** | `lab/datasets/pool/`, 7002 lignes, draw_rate=0% ✓ |
| 15 | `lab/runs/ checkpoints` | **EXISTS** | 5 runs × ~20 epochs = 100 .pt, tous `reject_for_ab` |
| 16 | `STUDIO_FULL_MAP.md` | **EXISTS** | Root, généré 2026-06-01 |
| 17 | `BRAIN_REPORT_20260603.md` | **EXISTS** | Root, session autodev 2026-06-03 |
| 18 | `STUDIO_CONTEXT_LIVE.md` | **EXISTS** | Root (untracked), mis à jour à chaque appel Devstral |

---

## Verdicts

| Surface | software_verdict | evidence_verdict |
|---------|-----------------|-----------------|
| Moteur Rust (17 IMP) | IMPLEMENTED | CODE_INSPECTION |
| Pipeline ML (train_player, dataset_builder) | IMPLEMENTED | CODE_INSPECTION |
| Tous les runs lab/runs/ | EXPLORATORY_ONLY / reject_for_ab | CODE_INSPECTION (manifests) |
| Pool datasets (pool_2400, dataset_a/b/c/d) | IMPLEMENTED / AVAILABLE | CODE_INSPECTION |
| LoRA pipeline | PARTIAL — PENDING | CODE_INSPECTION (lora_config.yaml) |
| Corpus LoRA (exemples valides) | ~9 exemples valides / 50 requis | CODE_INSPECTION |
| golden_examples.jsonl | NOT_FOUND | CODE_INSPECTION |
| kaizen_autoloop.py | IMPLEMENTED — standalone | CODE_INSPECTION |
| kaizen_autoloop câblé UI | NOT_WIRED | CODE_INSPECTION |
| CHAIN_HISTORY traçabilité via UI | NOT_IMPLEMENTED | CODE_INSPECTION |
| ELO post-17 IMP | NOT_MEASURED — fallback 1424/1200/975 | CODE_INSPECTION |
| Chess Fantasy | DESIGN_ONLY — HGD-003/004 pris | CODE_INSPECTION |
| Godot bridge | NOT_STARTED | CODE_INSPECTION |

**claim_verdict : NO_CLAIM_ALLOWED** — aucune donnée de performance, force de jeu ou avancement IA ne peut être affirmée depuis cet audit.
