# Chess TCG — Équipe (roster)

status: DOCUMENTED_ONLY · 2026-07-06
Import taillé depuis `Donchitos/Claude-Code-Game-Studios` (clone @ `984023d`, zone temp). **Fusion, pas remplacement.**
Adaptations imposées : verdict **OK/FAIL/BLOCKED** uniquement · `escalates_to: pierre` (HumanGate décide) · posture
**consultant** (Pierre tranche, jamais l'agent) · **mode review « solo » retiré** (nos lanes font ce travail) ·
**spécialistes moteur 3D (Godot/UE) NON importés** (décision moteur non prise — ils s'ajouteront à ce moment-là).

## Tronc ~10 rôles (cible mission)
| Rôle | Statut | Fichier |
|---|---|---|
| game-designer | **existant** (préservé) | `.claude/agents/game-designer.md` |
| systems-designer | **AJOUTÉ** (taillé) | `.claude/agents/systems-designer.md` |
| gameplay-programmer | **existant** (préservé) | `.claude/agents/gameplay-programmer.md` |
| engine-programmer | **existant** (préservé) | `.claude/agents/engine-programmer.md` |
| ui-programmer | **différé** | pas de source dédiée + UI hors scope v1 — à ajouter au besoin |
| qa-lead | **AJOUTÉ** (taillé) | `.claude/agents/qa-lead.md` |
| qa-tester | **existant** (préservé) | `.claude/agents/qa-tester.md` |
| technical-director | **AJOUTÉ** (taillé) | `.claude/agents/technical-director.md` |
| creative-director | **AJOUTÉ** (taillé) | `.claude/agents/creative-director.md` |
| producer | **existant** ≈ `producteur-dur` (préservé) | `.claude/agents/producteur-dur.md` |

## Autres subagents locaux préservés (hors tronc)
`ai-programmer` · `performance-analyst` — inchangés.

## Spécialistes moteur — AJOUTÉS (décision moteur prise 2026-07-06 : Godot 4)
- `godot-specialist` (archi scènes/nodes/signaux) · `godot-gdscript-specialist` (règles pures GDScript + tests headless). Taillés à notre format.

## NON importés (volontairement)
- **Unreal** (`ue-*`) et **Godot avancés** (`godot-csharp/shader/gdextension`) → au besoin, pas pour la tranche 1.
- Rôles latéraux hors scope v1 : art-director, audio-director, narrative-director, level-designer, economy-designer, live-ops-designer, community-manager, network-programmer, security-engineer, devops-engineer, localization-lead, release-manager, tools-programmer, technical-artist, sound-designer, accessibility-specialist, analytics-engineer, prototyper, lead-programmer. → à réévaluer par tranche/besoin.

## 4 fichiers ajoutés cette session
`systems-designer.md` · `qa-lead.md` · `technical-director.md` · `creative-director.md`
(aucun fichier existant écrasé ; clone temporaire non conservé dans le repo).
