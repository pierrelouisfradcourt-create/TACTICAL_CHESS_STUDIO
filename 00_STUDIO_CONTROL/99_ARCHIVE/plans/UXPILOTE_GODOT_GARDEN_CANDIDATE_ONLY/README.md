# UxPilote Godot Garden Candidate

Task ID: UXPILOTE-GODOT-GARDEN-TRUTH-REFLECTION-V0

Layer patch: UXPILOTE-GODOT-GARDEN-ARCHI-ROADMAP-LAYERS-V0

Layer reading patch: UXPILOTE-GODOT-GARDEN-LAYER-READING-CONTROLS-V0

Architecture view switch patch: UXPILOTE-GODOT-GARDEN-ARCHITECTURE-VIEW-SWITCH-V0

Agentic pyramid passive visual patch: UXPILOTE-GODOT-GARDEN-AGENT-PYRAMID-LAYER-V0

System map binding patch: UXPILOTE-GODOT-GARDEN-SYSTEM-MAP-BINDING-V0

This directory contains a local Godot 4.x visual prototype candidate for a UxPilote cognitive garden map. It is routed as a candidate-only artifact under `00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY` pending HumanGate review.

## Master Scene Readability Redesign (V0)

- Main root anchor is explicit: `Studio Root` and `C:/TACTICAL_CHESS_STUDIO`.
- Main visible labels are short: `Studio Control`, `Sorties`, `Runtime`, `Scripts`, `Données`, `Modèles`, `Secrets`, `PureLab`, `Build`, `Archive`, `Rocky IA`, `Merle`, `Feedback`.
- District bands are grouped for rapid reading:
  - Studio Control / HumanGate / Feedback
  - PureLab component
  - Sorties / Runtime / Evidence
  - Scripts / Outils
  - Données / Modèles / Secrets verrouillés
  - Build / Archive / hors système
  - Rocky IA / Engine / Search / Neural
- Default map keeps only primary flows visible (5):
  - Feedback -> Studio Root
  - Studio Root -> truth districts
  - Merle -> data locks
  - Runtime -> Evidence
  - Build -> Archive (outside system)
- Secondary links are hidden by default and appear with selected-zone context.
- Key `7` remains a separate architecture room (`Salle des pyramides`) and is hidden from the main garden views.

## Current Map Reading

- System map binding: `C:/TACTICAL_CHESS_STUDIO — racine système` is the Studio Root anchor. Meaning: `racine réelle du jardin/studio`.
- Provenance links connect Studio Root to outputs, runtime_outputs, scripts, datasets, models, secrets, TacticalChessPureLab as component, and PureLab legacy triage. Labels include `lien système`, `preuve names-only`, `bloqué HumanGate`, and `non inspecté`.
- The inspector shows `Chemin réel`, `chemin réel`, `Rapport source`, `rapport source`, `Niveau de preuve`, `Statut`, `Surface`, `Actions bloquées`, and `Question HumanGate`.
- Inspector notice: `Cette carte ne lit pas le disque en direct.`
- PureLab legacy triage is bound to `C:/Users/Studio-Dev/Desktop/PURELAB_LEGACY_TRIAGE` from `PURELAB_LEGACY_COLLECT_TO_DESKTOP_TRIAGE_REPORT_V0.md` when that report is present.
- This binding layer is hardcoded from truth reports. It is not a live scanner, not filesystem integration, and not a real system toggle.

- `Jardin Studio — C:/TACTICAL_CHESS_STUDIO`: the studio root / full garden. It is a hardcoded visual truth-reflection label only, not a filesystem scan or runtime measurement.
- `PureLab — composant du jardin`: TacticalChessPureLab is shown as one component/tree/massif inside the garden, not as the ecosystem root. Its contents are not inspected.
- `Sorties`: outputs is shown as an artifact/output hygiene candidate zone. The inspector states names-only/docs-only truth, contenu non lu, and no cleanup performed.
- `Sorties runtime`: runtime_outputs is shown as a runtime output hygiene candidate zone. The inspector states names-only/docs-only truth, contenu non lu, and no cleanup performed.
- `Scripts / Outils`: scripts is shown as a tool/script risk zone with one top-level entry observed, no content read, no execution, and execution BLOCKED. It is not an active launcher.
- `Données — sensible / entraînement bloqué`: datasets is shown as sensitive/training-adjacent. Inspector-only names: blocked_future_sensitive, chess, cyberdefense, quarantine, tactical_core, telemetry_sanitized. No content read, no generation, no reset, no training.
- `Modèles — chargement bloqué`: models is shown as sensitive/model-promotion-adjacent. Inspector-only names: chess, lmstudio, quarantine. No content read, no loading, no benchmark, no promotion.
- `Secrets — accès bloqué`: secrets is shown as a locked/unknown zone. No filenames are shown; not inspected; HumanGate only.
- `Merle — Auditeur / Hygiène / Vérité`: the system's passive eyes. It represents observation passive, audit, hygiene, truth, drift detection, and report toward the living human feedback sphere. It is human-launched only and not autonomous.
- `Zone Build — bac à sable`: a symbolic sandbox / branche symbolique / branch-like test area outside the living system. It means `test hors système`, no real Git branch, and no real build execution.
- `Zone Outils — Godot / Codex`: logiciels professionnels / professional software area for Godot, Codex, and future tools. It has no tool launch and no tool execution.
- `Sphère de feedback vivant`: source/reservoir of feedback humain and ancrage réel. It is not an approval engine.
- `Flux entrant`, `flux sortant`, symbolic feedback attenuation, `perte de signal`, and `ancrage réel` are visual reading aids only.
- `Poids des données` / `taille symbolique` is hardcoded sample data only. There is no file-size scan, repo scan, telemetry, real signal measurement, or real metric.
- Passive layer overlays now make the truth-return reading easier without active system controls:
  - `Calque Vérité`: zones réellement observées, outputs, runtime_outputs, scripts, datasets, models, secrets verrouillé, and PureLab composant. Purpose: ce qui existe dans le jardin d'après les audits names-only.
  - `Calque Sensible`: secrets, datasets sensibles, models, quarantine, cyberdefense, and telemetry_sanitized. Purpose: zones à ne pas ouvrir sans HumanGate.
  - `Calque Flux`: flux entrants, flux sortants, perte de signal, feedback humain, and ancrage réel. Purpose: comprendre comment l'information circule et se dégrade.
  - `Calque Build / Archive`: Zone Build, Archive Zone, sorties, sorties runtime, and zones candidates à mise hors système. Purpose: séparer test hors système, artefacts et rangement propre.
  - `Calque Architecture cible`: structure future du jardin, PureLab replacé comme composant, Mistral / Devstral futur noyau possible, Tool Zone, and Studio Control. Purpose: anticiper l'organisation future sans prétendre qu'elle est implémentée.
  - `Calque Roadmap`: prochaines tranches d'audit, zones non inspectées, inconnus, and décisions HumanGate restantes. Purpose: voir ce qu'il reste à faire.
  - `Calque héritage` is preserved as a passive reintegration marker for PureLab composant du jardin and does not become a separate active control.
- These calques are faint rings, bands, contours, labels, inspector text, and local layer-focus emphasis only. They are `mode de lecture`, `visuel passif`, `aucun bouton actif`, and not real layer toggles.
- The architecture switch is a local visual switch only: `switch visuel local — aucun effet système`. `Toutes les architectures` shows all passive overlays at low intensity. `Architecture actuelle / vérité`, `Architecture sensible / verrouillée`, `Architecture des flux`, `Architecture Build / Archive`, `Architecture cible`, and `Architecture roadmap` show one architecture view by hiding or strongly attenuating inactive overlay nodes while keeping the base garden present for orientation.
- `Architecture pyramide agentique`: key `7` adds a passive visual layer: a grande pyramide composée de petites pyramides. HumanGate au sommet; Merle — yeux / hygiène / vérité; Codex — exécuteur borné; ChatGPT — navigateur / critique; Local LLM — assistant futur passif. Tool Zone means professional tools, not launcher. Build Zone means sandbox / branch-like preparation, not real Git/build. Archive Zone means clean storage / anti-duplicate exit. Search remains authority for game decisions. Neural proposes/reranks only. Aucune activation agent. Aucun effet système.

## Scope

- Visual metaphor: serre, jardin, sol, racines, semis, plantes immunitaires, compost, mycélium, merle auditeur, and a living human feedback sphere.
- Truth reflection layer: Jardin Studio root, outputs, runtime_outputs, scripts, datasets, models, secrets, and PureLab component are represented from names-only/docs-only reports using hardcoded data only.
- Structure map: the central TacticalChessPureLab tree remains the current recovered tree, with the living feedback water sphere floating above it.
- Root rule: C:/TACTICAL_CHESS_STUDIO is the garden root / full studio; PureLab is a composant du jardin, not the root.
- Sensitive-zone rule: Données, Modèles, Scripts, and Secrets remain blocked from content reads, execution, training, loading, benchmark, promotion, and secret access.
- Map legend: a static visual/read-only UI panel uses French visible text for `Légende de carte`, `Surfaces`, `Statuts`, `Calques`, `Flux entrant`, `Flux sortant`, `Perte de signal`, `Ancrage réel`, and `Poids des données`.
- Calque Vérité, Calque Sensible, Calque Flux, Calque Build / Archive, Calque Architecture cible, and Calque Roadmap are visible as transparent symbolic garden overlays and passive reading modes. Calque héritage remains visible as a passive legacy/reintegration marker. They are labels, contours, bands, local focus markers, legend text, and inspector text only, not toggles or workflow controls.
- Architecture pyramide agentique is visible as one large pyramid made of smaller primitive pyramids. It is elevated on a distinct foundation so it reads separately from the garden terrain. It represents roles and authority boundaries only, not active agents.
- Layer guide: the legend describes each calque, living system, outside system, build zone, archive zone, tool zone, Godot tool marker, and game forest.
- Outside-system zones are visible beyond the living system boundary: Zone Build, Archive Zone, and Zone Outils.
- Zone Build communicates a sandbox / `bac à sable` / `test hors système`: a branch-like symbolic preparation zone for testing a patch outside the living system, without creating duplicates or pollution.
- Zone Build is not a real Git branch and does not execute builds.
- Archive Zone communicates outside-system storage to avoid duplicates and keep the clean living system uncluttered, without archive execution.
- Zone Outils communicates professional software used by the human/gardener: Godot, Codex, and future tools, without tool launch or execution.
- Video game garden / game forest is visible as one tree per game. TacticalChessPureLab is the main recovered central tree, and future game trees are roadmap/candidate placeholders only.
- Merle audit scout: a primitive blackbird / merle raised near the living feedback sphere as `Merle — Auditeur / Hygiène / Vérité`.
- Merle is the system's passive eyes: observation passive, audit, hygiène, vérité, détection de dérive, and report toward the human feedback sphere.
- Merle is not a Tool Zone object, not autonomous, not a robot, not a drone, and not an execution tool.
- Former Observation Tool ambiguity is relabelled as passive/dormant observation under the Merle meaning; it is not the primary Tool Zone.
- Audit chain link is shown as passive observation trail and report path only; the visible chain uses French meaning labels.
- Readability layer: each main zone has a spaced 3D label, a status marker, a soil-bed grouping, and a simple primitive form tied to its garden role.
- Selection layer: the active zone receives a local soil glow, selected focus ring, focus pin, and inspector focus only.
- The Living Feedback Sphere is rendered as a floating water sphere above the central tree labelled `Sphère de feedback vivant`.
- The sphere is the source/reservoir of human feedback and symbolizes human observation, decision pressure, feedback load / overflow risk, feedback rain, irrigation, observation mist, and feedback return.
- Legacy/static HumanGate wording is secondary and symbolic only; no approval workflow is implemented.
- Human accept signal, block current, revise current, and observe current are symbolic water markers only, not buttons or workflows.
- The surface legend lists active_runtime_code, tests, artifacts_runtime_outputs, canonical_docs, roadmap_docs_only, and inference.
- The status legend lists IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, and UNKNOWN.
- Blocked scope is rendered as fenced blocked soil.
- Readability polish keeps the central TacticalChessPureLab tree as the largest visual anchor, offsets the living feedback water sphere so it does not sit directly over the tree, and reduces flow-label clutter.
- Flow context is rendered as visible root paths, mycelium paths, feedback rain, irrigation, observation mist, and feedback return with shorter flow labels.
- Linked flows: selecting a zone brightens and thickens its related symbolic paths while unrelated paths are softened for map reading only.
- Incoming flow and outgoing flow are visually separated on selected focus paths: incoming markers use cool bright `ENT` labels near the selected zone, while outgoing markers use warmer `SORT` labels near the departure side.
- Human feedback signal from the living feedback sphere now uses hardcoded symbolic attenuation. Water/signal paths become thinner and show smaller attenuation beads as sample signal strength decreases across handoffs.
- Feedback attenuation and `perte de signal` represent message loss, doctrine sanity control, anti-hallucination boundary, `vérité`, and `ancrage réel` only. They are not real measurements.
- The zone inspector reports hardcoded `flux entrant`, `flux sortant`, symbolic signal strength, `perte de signal`, `ancrage réel`, `poids des données`, `taille symbolique`, and doctrine note when that symbolic context exists.
- Data weight is symbolic/hardcoded only. The candidate does not read file sizes, scan repos, create telemetry, or claim real metrics.
- Data source: hardcoded sample data in `scripts/GardenData.gd`.
- Assets: Godot primitives only.
- Runtime authority: none.
- Backend: blocked.
- External dependencies: none.
- Network access: blocked.
- File discovery: blocked.
- Agent activation: blocked.
- Dataset or model output: blocked.
- Real approval workflow: blocked.
- Decision persistence: blocked.
- VCS write operations: blocked.
- Runtime authority change: blocked.
- Real audit execution: blocked.
- Real hygiene scan: blocked.
- Real truth agent: blocked.
- Real build execution: blocked.
- Real archive action: blocked.
- Real tool launch: blocked.

## Open Locally

1. Open Godot 4.x.
2. Import or open this folder as an existing project.
3. Run `scenes/GardenMain.tscn`.

## Validation

Godot executable:

```yaml
godot_executable:
  path: "C:/Users/Studio-Dev/Desktop/Godot_v4.6.3-stable_win64.exe/Godot_v4.6.3-stable_win64.exe"
  status: "USER_PROVIDED"
  allowed_use:
    - "Version check"
    - "Headless/editor import or parse check if supported"
    - "Run the UxPilote Garden candidate only for validation, not benchmark"
  blocked_use:
    - "Do not install anything"
    - "Do not download anything"
    - "Do not export builds"
    - "Do not benchmark"
    - "Do not modify TacticalChessPureLab repo"
    - "Do not create lab/runs"
    - "Do not create latest.json"
```

Replace any `Get-Command godot` or `Get-Command godot4` alias discovery with these bounded checks:

```powershell
Test-Path 'C:/Users/Studio-Dev/Desktop/Godot_v4.6.3-stable_win64.exe/Godot_v4.6.3-stable_win64.exe'
& 'C:/Users/Studio-Dev/Desktop/Godot_v4.6.3-stable_win64.exe/Godot_v4.6.3-stable_win64.exe' --version
Push-Location 'C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY'; & 'C:/Users/Studio-Dev/Desktop/Godot_v4.6.3-stable_win64.exe/Godot_v4.6.3-stable_win64.exe' --headless --import; Pop-Location
```

Validation reporting must include:

- Exact Godot version output.
- Whether the import/parse command exited successfully.
- Stdout/stderr summary.
- `BLOCKED` or `PARTIAL` if Godot opens a GUI or blocks instead of exiting.
- No visual quality claim from CLI validation alone.

## Controls

- Left click: inspect a garden zone.
- `Tab` / `Shift+Tab`: cycle next/previous zone.
- `F`: focus the selected zone without changing data.
- `R`: reset the garden view.
- `A`: cycle architecture views.
- `0`: select `Toutes les architectures`.
- `1-7`: select `Architecture actuelle / vérité`, `Architecture sensible / verrouillée`, `Architecture des flux`, `Architecture Build / Archive`, `Architecture cible`, `Architecture roadmap`, or `Architecture pyramide agentique`.
- `L`: legacy alias for cycling the same local visual architecture switch.
- Mouse wheel: zoom.
- Left drag: orbit.
- Right or middle drag: pan.
- The selected zone shows a passive soil glow, selected focus ring, small focus pin, and brighter label; this is visual feedback only.
- Linked flows brighten around the selected zone; incoming flow, outgoing flow, and linked flows use different selected markers. The architecture switch changes only local visibility/emphasis of Godot overlay nodes and related zone emphasis. This is visual feedback only, not a workflow control.
- The reset view uses a wider, higher default camera angle intended to show the clean living system, outside-system zones, legend, game forest, merle scout, and feedback sphere together.

## Boundary

The prototype has no execute, mutate, scan, connect, approve, run, build, archive, launch, load, train, benchmark, agent, workflow, backend, network, telemetry, or system-control interface. The map legend, surface legend, status legend, layer guide, architecture switch, water sphere, currents, architecture layer, roadmap layer, Architecture pyramide agentique, Build Zone, Archive Zone, Tool Zone, Godot tool marker, video game garden, game forest, and one tree per game markers are passive symbols only. The candidate makes no readiness, performance, promotion, runtime identity, visual quality, or real metric claim.

The truth-reflection zones are hardcoded and candidate-only. They do not read files, inspect contents, scan repos, access secrets, parse datasets, load models, execute scripts, train, benchmark, clean outputs, create latest.json, create lab/runs, or connect to any backend/network.

The merle blackbird is also passive. It symbolizes observe, inspect, hygiene, truth, drift detection, and report only; it does not add repo scanning, execution, mutation, approval, training, benchmark, backend, network, dataset_generation, model, checkpoint, `latest.json`, `latest_json`, or `lab/runs` behavior.

Blocked action keys remain: agent_activation, training, dataset_generation, benchmark, repo_scan, backend, network, telemetry, latest_json, lab/runs, real_build_execution, real_git_branch_creation, real_tool_launch.
