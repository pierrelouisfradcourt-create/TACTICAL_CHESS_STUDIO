# Navigation Index — TacticalChessPureLab Studio

Status: CANONICAL_NAVIGATION
Owner: HumanGate
Last updated: 2026-05-31
Location: `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/navigation/00_NAVIGATION_INDEX.md`

---

## Règle de lecture obligatoire

Ce fichier est le **point d'entrée unique** pour toute session de travail dans ce repo.

Avant toute action :
1. Lire ce fichier.
2. Lire `07_CURRENT_STATE.md` (état réel du repo à ce jour — dernier sprint : 2026-06-02).
3. Lire `06_KNOWN_ISSUES.md` (risques actifs — issues #1–#26 + NEW-01–NEW-05, dernier refresh : 2026-06-02).
4. Ne jamais agir depuis la mémoire conversationnelle — toujours depuis les sources chargées.

---

## Structure du dossier navigation (séquence propre)

| Fichier | Rôle | Fréquence de lecture |
|---|---|---|
| `00_NAVIGATION_INDEX.md` | **Ce fichier** — point d'entrée, carte du repo | Toujours en premier |
| `01_ROADMAP.md` | Feuille de route projet | Début de session planning |
| `02_ROCKY.md` | Spécifications Rocky (agent) | Sessions Rocky |
| `03_JEUX.md` | Jeux et variantes supportées | Sessions gameplay |
| `04_STUDIO.md` | Studio control overview | Sessions studio |
| `05_ARCHITECTURE.md` | Architecture technique détaillée | Sessions code |
| `06_KNOWN_ISSUES.md` | **Registre des risques actifs** — lire avant tout travail code | Toujours |
| `07_CURRENT_STATE.md` | **État courant du repo** — lire avant tout travail | Toujours |
| `08_COMMAND_CHEATSHEET.md` | Commandes PowerShell / cargo opérationnelles | Sessions runtime |
| `09_ROCKY_VARIANT_FREEZE.md` | Freeze des variantes Rocky | Référence frozen |
| `10_AUTOMATION_EVIDENCE_PLANE.md` | Plan d'évidence automation | Sessions automation |
| `11_REPRISE_PROMPT.md` | Prompt de reprise de session | Début de session |

Fichiers sans préfixe numérique = contrats et matrices transversaux, pas des états courants.

---

## Fichiers supprimés — ne pas recréer

Ces fichiers ont été supprimés le 2026-05-31 car ils étaient des doublons obsolètes.
Toute tentative de les recréer est une erreur.

| Fichier supprimé | Remplacé par | Raison |
|---|---|---|
| `01_CURRENT_STATE.md` | `07_CURRENT_STATE.md` | Sous-ensemble daté 2026-05-07, sans sprint 2026-05-30 |
| `02_COMMAND_CHEATSHEET.md` | `08_COMMAND_CHEATSHEET.md` | Identique à l'octet près |
| `03_KNOWN_ISSUES.md` | `06_KNOWN_ISSUES.md` | Sous-ensemble daté 2026-05-27, issues #15–#26 manquantes |

---

## Carte du repo — chemins canoniques

```
C:/TACTICAL_CHESS_STUDIO/
├── 00_STUDIO_CONTROL/
│   ├── 01_SYSTEM/
│   │   └── navigation/          ← CE DOSSIER (index + docs navigation)
│   ├── 01_MAPS/                 ← Topology, agentic pyramid
│   ├── 02_NAVIGATION/           ← Ancien emplacement (vidé — ne pas utiliser)
│   ├── 03_REGISTRIES/
│   │   └── FILE_REGISTRY.yaml   ← Autorité route/owner/status pour fichiers control-room
│   ├── 05_STATUS/               ← Cleanup status, migration status
│   ├── 07_FORMS/                ← Templates YAML (task charter, executor report)
│   └── 10_ROADMAP/              ← Roadmap docs uniquement
│
└── repos/games/TacticalChessPureLab/
    ├── src/                     ← Code Rust actif
    │   ├── engine/engine.rs
    │   ├── chess/search.rs
    │   ├── chess/decision.rs
    │   └── tool/cli.rs
    ├── lab/
    │   ├── reports/             ← Artefacts de sortie (JSON, MD)
    │   └── datasets/            ← Datasets d'entraînement
    ├── scripts/                 ← Launchers PowerShell (source de vérité)
    └── AGENTS.md                ← Règles Codex anchoring
```

---

## État synthétique du repo (à jour au 2026-06-02)

Source complète : `07_CURRENT_STATE.md`

**Runtime :** 14 IMP closées (PST, opening book, quiescence, SEE complet, sécurité roi, futility pruning, etc.). Search timeout thread-local. Draw structurel RÉSOLU (IMP-007/014). EloTable K=24 câblée.

**Neural :** bridge actif depuis c0ebf62. Premier checkpoint sauvé (71df945). ELO baseline pré-améliorations : teacher_uci=1424 / heuristic=1200 / neural=975. ELO post-Rocky : non mesuré.

**Dataset :** teacher_samples.jsonl corrompu (100% draws). Pool pipeline en cours : pgn_to_jsonl.py + sf_dataset_generator.py créés 2026-06-02, non exécutés.

**Prochaine étape :** exécuter pool pipeline IMP-037→040, relancer benchmark.

---

## Registre des blocages permanents (HumanGate requis)

Ces actions sont bloquées sans task charter + approbation humaine explicite :

- Activation Chess960
- Activation DecisionController
- Activation d'agents
- Training / benchmark / dataset reset
- Push / commit / PR / branch création
- Promotion de modèles ou checkpoints
- Toute mutation de fichier control-room sans executor report

---

## Source anchoring — règle en vigueur

Document de référence : `STUDIO_SOURCE_ANCHORING_V0.md` (ce dossier)

```
created ≠ registered ≠ loaded ≠ enforced ≠ evidenced
```

Un document n'est pas opérationnel tant qu'il n'est pas chargé dans la session active ET cité dans le rapport d'exécution. La création seule ne prouve rien.

---

## Règles de non-confusion pour Claude

1. **`07_CURRENT_STATE.md` est l'unique source d'état courant.** Ne pas lire `01_CURRENT_STATE.md` (supprimé).
2. **`06_KNOWN_ISSUES.md` est l'unique registre d'issues.** Issues #1–#26 + sprint closures 2026-05-30. Ne pas lire `03_KNOWN_ISSUES.md` (supprimé).
3. **`08_COMMAND_CHEATSHEET.md` est l'unique référence de commandes.** Ne pas lire `02_COMMAND_CHEATSHEET.md` (supprimé).
4. **Ne jamais inférer l'état du repo depuis la mémoire conversationnelle.** Toujours charger les sources listées ci-dessus.
5. **Ne jamais créer de fichier dans `02_NAVIGATION\`.** Ce dossier est vidé. Le dossier actif est `01_SYSTEM\navigation\`.
6. **`FILE_REGISTRY.yaml` fait autorité** sur route, owner, et status quand les métadonnées locales sont incomplètes.
