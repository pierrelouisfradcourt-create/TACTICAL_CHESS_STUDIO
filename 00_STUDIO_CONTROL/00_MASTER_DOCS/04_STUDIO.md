# Studio — Architecture et pipeline

status: CANONICAL
date: 2026-06-04
authority: HumanGate

---

## Vision studio

Petite entreprise auto-apprenante :
```
Rocky        = employé spécialisé (jeu)
LLM local    = manager opérationnel (pilote le studio)
UxPilote     = tableau de bord direction
HumanGate    = PDG (toi)
Pipeline     = process qualité
```

Référence doctrinale : Paradoxe Skynet — IA-jardinier, pas Skynet-ingénieur.
Le studio s'améliore mais reste ouvert, nourri par du feedback réel.

---

## Stack technique actuelle

| Couche | Techno | Statut |
|---|---|---|
| Runtime jeu | Rust | IMPLEMENTED |
| ML / inference | Python | IMPLEMENTED |
| Scripts / CI | Python + PowerShell | IMPLEMENTED |
| LLM local (Director) | Qwen2.5-14B-Instruct (LM Studio) | ACTIF |
| LLM local (CEO Brain) | Qwen3.6-27B (LM Studio) | DISPONIBLE |
| LoRA fine-tuning | devstral-small-2507 (HF local) | IN_PROGRESS — dry-run validé |
| UxPilote | autopilot.py (3164 lignes, port 7331) | IMPLEMENTED |
| Kaizen autoloop | kaizen_autoloop.py | IMPLEMENTED |

---

## Pipeline de dev actuel

```
HumanGate décide
  → Kaizen Autoloop propose IMP (ROI max)
    → Charter généré
      → Claude Code exécute (borné)
        → Executor Report
          → Claude critique/valide
            → close_imp() → golden_collector
              → HumanGate merge/rejette
```

---

## Architecture agentique — vision pyramide

```
CEO          = Qwen3.6-27B  (raisonnement profond, /api/ceo-brief)
Director     = Qwen2.5-14B  (décisions opérationnelles, kaizen loop)
Router       = À implémenter (IMP-047 OPEN, SAFE_AUTO)
Worker       = Claude Code + kaizen_autoloop.py
```

### Flywheel Kaizen

```
propose → charter → Claude Code → close_imp →
golden_collector → LoRA corpus → training → Devstral amélioré
```

---

## Autopilote — surfaces (port 7331)

| Surface | Endpoint | Statut |
|---|---|---|
| Studio State | /api/studio-state | IMPLEMENTED |
| CEO Brief | /api/ceo-brief | IMPLEMENTED |
| Autoloop start | /api/autoloop-start | IMPLEMENTED |
| Autoloop stop | /api/autoloop-stop | IMPLEMENTED |
| Autoloop status | /api/autoloop-status | IMPLEMENTED |
| Studio OS (cockpit) | / (index) | IMPLEMENTED |

### Kaizen Autoloop — modes par lane

| Lane | Mode d'exécution |
|---|---|
| SAFE_AUTO | Exécution automatique (Claude Code subprocess) |
| AUDIT_REQUIRED | Charter généré + affichage + attente HumanGate |
| HUMAN_REQUIRED | Affichage + STOP |
| FORBIDDEN | STOP immédiat |

---

## LoRA — pipeline golden examples

| Source | Exemples |
|---|---|
| golden_collector_v1 (charters closés) | 38 |
| mode_claude_run | 10 |
| autodev_session | 9 |
| **Total** | **57** |

- **Config** : `ml/lora_config.yaml` (base=devstral-small-2507, rank=8, epochs=3, lr=2e-4)
- **Script** : `ml/lora_train_devstral.py` (--dry-run / --train --model-path)
- **Sortie** : `lab/runs/lora_devstral_tcs_v1/`
- **Status** : READY_FOR_HUMANGATE — dry-run OK (IMP-045 HumanGate approuvé)

---

## Agents — activation progressive

| Agent | Statut |
|---|---|
| kaizen_autoloop | ACTIVE |
| golden_collector | ACTIVE (hook close_imp) |
| studio_context_builder | ACTIVE (IMP-012) |
| fusion_matrix_chain | IMPLEMENTED (IMP-005) |
| scripts_route_chain | IMPLEMENTED (IMP-004) |
| Cartographer / HygieneAgent / TruthAgent | PASSIVE (documentés) |

Règle d'activation : HumanGate + code + tests avant activation.
Aucun agent autonome sans gate.

---

## HumanGates permanents

Les gates suivants ne s'assouplissent jamais :
- Training / benchmark reset
- Dataset reset / ACTIVE_DATASET.txt
- Push main
- Model promotion
- FORBIDDEN lane

---

## Matrices de tâches

Lane matrix :
- **SAFE_AUTO** : docs, fixtures, specs, chains Python
- **AUDIT_REQUIRED** : code Rust, ML scripts, eval
- **HUMAN_REQUIRED** : CI, runtime wiring
- **FORBIDDEN** : training, benchmark, dataset reset, latest.json, push main

---

## Docs maîtres — structure cible

```
00_STUDIO_CONTROL/00_MASTER_DOCS/
├── 00_VISION.md
├── 01_ROADMAP.md         ← phases + décisions ouvertes
├── 02_ROCKY.md           ← état Rocky + dataset + puzzles
├── 03_JEUX.md            ← tous les jeux + design
├── 04_STUDIO.md          ← pipeline + agents + UxPilote (ce fichier)
├── 05_KNOWN_ISSUES.md    ← bugs actifs
├── 06_KAIZEN.md          ← protocole kaizen
├── 07_CURRENT_STATE.md   ← état courant sprint
└── ARCHIVE/
```
