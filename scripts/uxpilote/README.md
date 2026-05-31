# UxPilote Local Read-Only Prototype

Status: UNKNOWN
Scope: scripts/uxpilote candidate-only local console viewer
Claim posture: NO_CLAIM_ALLOWED
HumanGate required: true
No global ready verdict: true

## Purpose

This directory contains a candidate-only local UxPilote console viewer. It renders a French read-only Pilot View from existing `studioctl` JSON outputs and writes nothing by default.

This patch does not register, promote, freeze, discard, or activate `scripts/uxpilote`. The path remains `UNKNOWN` until a later HumanGate registration decision.

## Allowed Commands

Run once from the repository root:

```powershell
python scripts\uxpilote\uxpilote_readonly.py --once
```

The default view is the cockpit. Focused views are available for scripts, decisions, and evidence:

```powershell
python scripts\uxpilote\uxpilote_readonly.py --view cockpit --width 120
python scripts\uxpilote\uxpilote_readonly.py --view scripts --width 120
python scripts\uxpilote\uxpilote_readonly.py --view decisions --width 120
python scripts\uxpilote\uxpilote_readonly.py --view evidence --width 120
python scripts\uxpilote\uxpilote_readonly.py --view cockpit --width 120 --lang fr
```

Print the same cockpit summary as JSON to stdout only:

```powershell
python scripts\uxpilote\uxpilote_readonly.py --json-summary
```

Export one static read-only HTML dashboard to an explicit target path:

```powershell
python scripts\uxpilote\uxpilote_readonly.py --export-html .\00_STUDIO_CONTROL\05_STATUS\UXPILOTE_DASHBOARD_PREVIEW_V0.html
```

The HTML export is a local static preview only. It uses inline CSS, no external assets, no JavaScript, no server, no frontend framework, no Godot, and no auto-refresh. The export writes only the path passed to `--export-html`; it does not create logs, folders, source registrations, route records, runtime files, or canonical truth.

French labels are the default. `--lang fr|en` is accepted for compatibility, but the Pilot View content is French-first. Plain text output is the default. `--no-color` is accepted for terminal compatibility; output is already plain text. The `--width` option defaults to `120` and is intended to remain readable from `100` to `140` columns.

## Read-Only Data Sources

The viewer calls only these `studioctl` JSON commands:

```powershell
python scripts\studioV2\studioctl.py status --json
python scripts\studioV2\studioctl.py evidence board --json
python scripts\studioV2\studioctl.py surface map --json
python scripts\studioV2\studioctl.py uxpilote scripts-control --json
python scripts\studioV2\studioctl.py uxpilote audit-chains --json
python scripts\studioV2\studioctl.py uxpilote graph --json
```

If one command fails, the cockpit reports the failure, renders partial data where possible, and exits without retry loops or mutation.

## Pilot View Sections

The cockpit view now starts with a decision-first `UXPILOTE - PILOT VIEW`. It uses concrete values extracted from the allowed `studioctl` JSON sources and puts the operator's next decision context first:

- Centre d'action: first-screen intent cards shown directly after the header. The cards answer `Je veux` with `Audit recommande`, `Resultat attendu`, `Risque`, `HumanGate`, and copy-friendly `Action immediate` text. They display `REFERENCE SEULEMENT`, `ne lance rien`, `NO_CLAIM_ALLOWED`, and `no_global_ready_verdict: true`; they do not execute chains, launch commands, mutate files, or make HumanGate decisions.
- Priorites graphe: first-screen decision filter from `studioctl uxpilote graph --json`, with top HumanGate decisions, top `BLOCKED` links, top `UNKNOWN` / unsafe links, top source-state gaps, and truth-level counters
- Cartes systemes reelles: CSS-only tabs populated from `studioctl uxpilote graph --json`; planes are `Physique`, `Autorite`, `Preuves`, `Routage`, and `Outils`, each with a compact plane summary before collapsed node and edge details
- Backend graphe: schema version plus node, edge, blocked-edge, unsafe-edge, source-state-gap, and HumanGate question counts from graph JSON
- Liens BLOCKED: blocked graph edges are listed separately and never rendered as active links
- Liens UNKNOWN / dangereux: unsafe or unknown graph edges are listed separately from blocked links
- Trous source-state prioritaires: top graph source-state gaps are shown first with the reminder that a file existing does not mean it is registered, loaded, enforced, or evidenced
- Compteurs truth_level: `Observed`, `Tested`, `Documented`, `Inferred`, `Unknown`, and `Blocked` edge counts are visible before detailed graph tabs
- Decisions HumanGate issues du graphe: top graph HumanGate questions are shown near the decision area
- Quel audit utiliser ?: compact selector that maps an operator problem to the recommended audit/control chain without launching anything
- Outils de controle disponibles: compact non-executing visual tool tiles sourced from `studioctl uxpilote audit-chains --json`, placed directly below the system maps
- A faire maintenant: top three HumanGate questions rendered full-width as compact French action cards, using graph HumanGate questions first when available, with a `+N autres` indicator when more decisions exist
- Blocages critiques: benchmark, gameplay execution, training, dataset reset, model/checkpoint promotion, `latest.json`, `lab/runs`, Git/PR actions, and unknown script execution kept visibly `BLOCKED` with explanations
- Situation summary: repo, worktree, claims, artefacts, routage, and HumanGate counts
- Familles du systeme: French labels for canonical `status_by_surface` values with technical names shown only as small detail
- Scripts Control: real `node_families`, status, surface, risk, path counts, path status, and `Sert a:` / `Effet:` explanations for each script family
- Chemins casses / chemins candidats: real `path_drift` entries with old path, candidate path, and HumanGate route decision context
- Preuves & affirmations: evidence grouped as proved, observed, and not proved / claim blocked
- Outils de controle disponibles: one compact visual tile per audit/control chain from JSON, with short French labels and technical fields collapsed under `<details>`
- LLM / LoRA: explicit blocked/passive posture for training, dataset reset, checkpoint/model promotion, and LLM support

The HTML dashboard displays the same real-data posture as a decision-first card layout:

- header strip titled `UXPILOTE - PILOT VIEW` with branch, head, worktree, claim posture, `candidate-only`, `read_only: true`, and `no_global_ready_verdict: true`
- top `Centre d'action` section with seven operator intents: `Je veux comprendre ce qui est vrai`, `Je veux comprendre les scripts et chemins`, `Je veux voir les contradictions`, `Je veux decider quoi faire ensuite`, `Je veux choisir un outil`, `Je veux verifier LLM / LoRA`, and `Je veux verifier un risque d'activation runtime`
- action cards map each intent to a recommended audit/control chain: `Verite systeme`, `Routage scripts`, `Matrice de fusion`, `Decisions HumanGate`, `Catalogue outils`, `Garde LLM / LoRA`, and `Garde runtime`
- if the audit-chain JSON catalog is unavailable, the dashboard shows `Catalogue des chaines indisponible - fallback statique` and still renders static non-executing action cards
- full-width Pilot View rows: `Cartes systemes`, `Outils de controle disponibles`, `A faire maintenant`, `Blocages critiques`, then lower details
- `Quel audit utiliser ?` decision guide above the tool tiles, with problem-first French rows such as `Je ne sais pas ce qui est vrai` -> `Verite systeme`
- `Priorites graphe` before detailed graph tabs, with `Top decisions HumanGate`, `Liens BLOCKED`, `Liens UNKNOWN / dangereux`, `Trous source-state prioritaires`, and `Compteurs truth_level`
- real CSS-only tabs for graph planes `Physique`, `Autorite`, `Preuves`, `Routage`, and `Outils`; the maps are not stacked vertically by default and dense node/edge lists stay behind native `<details>` controls
- node cards from graph JSON showing label, status, surface/family, path, compact source-state badges, and risk
- edge cards from graph JSON showing `from -> to`, kind, truth level, status, explanation, display style, `unsafe_to_render_as_active`, and evidence count
- truth-level legend for `Observed`, `Tested`, `Documented`, `Inferred`, `Unknown`, and `Blocked`
- compact `A faire maintenant` cards translated into action-oriented French where possible, limited to the top three decisions by default
- visible decision context: one-line status/evidence, one-line importance, and allowed-decision chips
- strong `Blocages critiques` panel kept near the top
- subordinate hero cards for Etat repo, Worktree, Claims, Artefacts, Routage, and HumanGate
- one status card per canonical surface with large visible badges
- one card per real Scripts Control `node_families` entry with `Sert a:` and `Effet:` explanations
- compact comparison cards for `Chemins casses / chemins candidats`
- strong BLOCKED cards explaining why each blocked command class is blocked, the risk if launched, and the required authorization
- `Preuves & affirmations` cards with the sentence: `Un rapport ou un log est une observation, pas une preuve d'activation.`
- compact audit/control tiles for Verite systeme, Routage scripts, Matrice de fusion, Decisions HumanGate, Catalogue outils, Garde LLM / LoRA, and Garde runtime
- simple LLM / LoRA blocked/passive status table
- footer with `read_only: true`, `writes_files: false except explicit --export-html target`, `runtime_authority: NONE`, `candidate-only`, and `NO_CLAIM_ALLOWED`

Lower-detail HTML sections use native `<details><summary>` progressive disclosure where useful. Critical warnings are not hidden.

The audit selector and audit/control tool tiles are references only. They do not execute audits, execute commands, run prompts, mutate files, create logs, create artifacts, or authorize a HumanGate decision. The selector answers `Quel audit utiliser ?` with short mappings from problem to chain and the labels `REFERENCE SEULEMENT`, `ne lance rien`, and `HumanGate requis si mutation`. Tiles keep the first screen short with French display names, `Sert a`, status, risk and utility badges, and `REFERENCE SEULEMENT / ne lance rien`; original labels, authority, `primary_surface`, `safe_to_run_now`, UX targets, HumanGate question, and blocked-action summary stay inside collapsed `<details>`.

The `Centre d'action` is also reference-only. It treats `safe_to_run_now=false` as `REFERENCE SEULEMENT`, not as permission to execute. `Action immediate` text such as `Preparer un audit read-only`, `Ouvrir la vue Routage scripts`, `Lire les contradictions`, `Lister les decisions ouvertes`, `Comparer les outils`, `Garder BLOCKED`, and `Demander une charte HumanGate` is copy-friendly operator guidance, not a clickable execution control.

If one approved `studioctl` JSON command fails, the HTML export renders a partial dashboard with a visible failure card and exits with the same non-zero failure posture as the console mode.

The focused views show:

- `--view scripts`: real node families, paths, path drift, blocked runners, and HumanGate questions
- `--view decisions`: real HumanGate questions, path drift, and blocked runners
- `--view evidence`: real status by surface, evidence sources, source state, route state, runtime claim gate, blocked claims, and surface-map rows

Displayed boundary labels include:

```yaml
read_only: true
writes_files: false
runtime_authority: NONE
HumanGate required for mutation: true
scripts/uxpilote status: UNKNOWN
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```

## Blocked Actions

The viewer must not:

- execute unknown scripts
- run cargo
- run Godot
- run a frontend server
- run gameplay
- run benchmarks
- train
- generate or reset datasets
- create models or checkpoints
- create `lab/runs`
- create `latest.json`
- inspect secrets
- modify `studioctl.py`
- modify runtime code, tests, docs, CI, CODEOWNERS, registries, source indexes, or ROADMAP_INDEX
- delete, move, rename, archive, clean, or clean caches
- stage, commit, push, create branches, or open PRs
- claim readiness, release status, promotion, benchmark proof, model proof, dataset proof, or scientific proof

## Read-Only Proof Expectations

Validation for this candidate should include:

```powershell
python scripts\uxpilote\uxpilote_readonly.py --once
python scripts\studioV2\studioctl.py uxpilote graph --json
python scripts\uxpilote\uxpilote_readonly.py --json-summary
python scripts\uxpilote\uxpilote_readonly.py --export-html .\00_STUDIO_CONTROL\05_STATUS\UXPILOTE_DASHBOARD_PREVIEW_V0.html
Test-Path .\00_STUDIO_CONTROL\05_STATUS\UXPILOTE_DASHBOARD_PREVIEW_V0.html
git status --short --branch
git diff --check
git diff --name-only
Test-Path .\latest.json
Test-Path .\lab\runs
Test-Path .\src\SHOULD_NOT_WRITE.md
Test-Path .\secrets\SHOULD_NOT_READ.md
```

If Python creates `__pycache__` or `.pyc` files, do not delete them during this task. Report them as `PASSIVE` generated artifacts unless HumanGate authorizes cleanup separately.

## HumanGate Boundary

The viewer is a local display aid only. It is not runtime truth, source truth, claim authority, schema authority, prototype promotion, or HumanGate decision execution.

HumanGate remains required for:

- mutation
- activation
- registration
- promotion
- cleanup
- source-index or registry changes
- Git actions
- any claim posture change
