# Studio — Architecture et pipeline

status: CANONICAL
date: 2026-05-27
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
| LLM local | LM Studio (Devstral/Mistral) | EN PLACE |
| LoRA fine-tuning | À planifier | NOT_STARTED |
| UxPilote | scripts/uxpilote/ (untracked) | PROTOTYPE |

---

## Pipeline de dev actuel

```
HumanGate décide
  → Task Charter (YAML)
    → Claude Code exécute (borné)
      → Executor Report
        → Claude (moi) critique/valide
          → HumanGate merge/rejette
```

HumanGates à assouplir (décision en attente) :
- Identifier lesquels peuvent devenir automatiques
- Garder les gates sur : training, benchmark, dataset reset, push main, model promotion

---

## UxPilote — vision

Cockpit de pilotage du studio :

```
UxPilote
├── World Map — état global (surfaces, statuts)
├── Chain Builder — composer des chaînes de dev
│   ├── Cartographer → HygieneAgent → TruthAgent
│   ├── FusionAuditor → CartographerRedTeam
│   └── HumanGate (décision finale)
├── Requêtes avancées
│   ├── Red Team (challenge les décisions)
│   └── Fusion (synthèse multi-sources)
└── Evidence Board (preuve par surface)
```

Statut actuel : uxpilote_readonly.py existe (non tracké).
Phase 1 : cockpit lecture seule.
Phase 2 : chaînes de dev interactives.

---

## Agents — activation progressive

Agents passifs (documentés, pas activés) :
- Cartographer — cartographie du repo
- HygieneAgent — nettoyage
- TruthAgent — vérification de vérité
- FusionAuditor — synthèse multi-sources
- CartographerRedTeam — challenge

Règle d'activation : HumanGate + code + tests avant activation.
Aucun agent autonome sans gate.

---

## LLM local — plan d'intégration

```
Phase 1 : LM Studio → decision tree Rocky → coaching/explication
Phase 2 : LM Studio → pilotage tâches studio (review L1 packs)
Phase 3 : LoRA fine-tuning sur corpus studio
```

L1 packs (pack du 2026-05-25) : prêts pour review Devstral/Mistral.
Workflow : L1 → review LLM → fusion → HumanGate → L2 (exécutable Codex).

---

## Matrices de tâches

Surfaces contrôlées :
- active_runtime_code
- tests
- artifacts_runtime_outputs
- canonical_docs
- roadmap_docs_only
- inference

Statuts autorisés :
- IMPLEMENTED / TESTED / DOCUMENTED_ONLY / PASSIVE / BLOCKED / NOT_FOUND / UNKNOWN

Lane matrix :
- SAFE_AUTO : docs, fixtures, specs
- AUDIT_REQUIRED : learning, puzzle, train code
- HUMAN_REQUIRED : scripts, CI, runtime wiring
- FORBIDDEN : training, benchmark, dataset reset, latest.json, push main

---

## Docs maîtres — structure cible

```
00_STUDIO_CONTROL/00_MASTER_DOCS/
├── 00_VISION.md          ← ce fichier (vision + modèle commercial)
├── 01_ROADMAP.md         ← phases + décisions ouvertes
├── 02_ROCKY.md           ← état Rocky + dataset + puzzles
├── 03_JEUX.md            ← tous les jeux + design
├── 04_STUDIO.md          ← pipeline + agents + UxPilote (ce fichier)
├── 05_KNOWN_ISSUES.md    ← bugs actifs
└── ARCHIVE/              ← tout l'ancien
```

Docs à archiver :
- AAA_TACTICAL_CORE_ARCHITECTURE.md → ARCHIVE/
- HYBRID_GAME_AI_PLATFORM_PLAN.md → ARCHIVE/
- LOCAL_HISTORY_ROADMAP_STATUS.md → ARCHIVE/
- 02_ROADMAP_90D.md → ARCHIVE/
- docs/control-plane/ENGINE_SEARCH_NEURAL_*.md → ARCHIVE/
- repos/games/studioV2_MIGRATED_HOLD/ → décision suppression
