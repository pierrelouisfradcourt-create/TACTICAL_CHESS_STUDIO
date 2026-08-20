# 20) Local Agent PR Operator

## Objectif du runner

`scripts/agent_pr_operator.py` est le premier runner local d'automatisation mecanique PR pour TacticalChessPureLab.  
Il reduit les copier-coller manuels en centralisant les controles de scope, les verifications JSON, les checks locaux obligatoires et la preparation d'une draft PR, tout en restant strictement control-plane.

## Modes

1. `--mode inspect`
- Lit `git status --porcelain`.
- Lit et parse le task packet JSON.
- Lit et parse les policies agent:
  `tool_permission_matrix.json`, `forbidden_surfaces.json`, `strike_rules.json`, `freeze_rules.json`, `autonomy_levels.json`.
- Lit et parse les schemas:
  `task_packet.schema.json`, `agent_scorecard.schema.json`, `audit_event.schema.json`, `reward_log.schema.json`.
- Ne stage rien, ne commit rien, ne push rien.

2. `--mode validate-staged`
- Verifie les fichiers staged (`git diff --cached --name-only`).
- Refuse tout fichier hors `allowed_files` du task packet.
- Refuse tout fichier touchant `forbidden_files` du task packet et `forbidden_paths` policy.
- Parse les fichiers `.json` staged.
- Execute:
  - `scripts/check_workspace_hygiene.py --pretty`
  - `scripts/report_local_agent_session.py --pretty`
- Ecrit des sorties **non canoniques** sous `lab/agent_runs/operator_latest/`:
  - `audit_event.json`
  - `reward_log.json`

3. `--mode prepare-draft-pr`
- N'est autorise que si la logique de `validate-staged` passe.
- Commit autorise seulement si `task_packet.authorize_commit == true`.
- Push autorise seulement si `task_packet.authorize_push == true`.
- Creation de draft PR autorisee seulement si `task_packet.authorize_create_pr == true`.
- `task_packet.authorize_ready_pr` reste `false` dans cette phase.
- `task_packet.authorize_merge_pr` reste `false` dans cette phase.
- Refuse explicitement merge, ready PR, et edition de branch protection.
- Affiche l'URL de PR si la draft PR est effectivement creee.

## Flags d'autorisation

Le task packet expose 5 flags booleens controles:
- `authorize_commit`
- `authorize_push`
- `authorize_create_pr`
- `authorize_ready_pr`
- `authorize_merge_pr`

Rappel de phase PR #191:
- `authorize_ready_pr` doit rester `false`.
- `authorize_merge_pr` doit rester `false`.
- Si un flag est absent, le runner le traite comme `false`.
- Toute tentative d'action non autorisee echoue avec exit code non zero.

## Modele de surfaces policy

La policy distingue maintenant deux familles:
- `absolute_forbidden_paths`: blocage toujours, sans exception.
- `restricted_human_review_paths`: autorise seulement en exception control-plane sous controle humain.

Conditions obligatoires pour autoriser un fichier `restricted_human_review_paths`:
- `control_plane_exception == true`
- `human_review_required == true`
- `exception_reason` non vide
- fichier present dans `allowed_files`
- `authorize_ready_pr == false`
- `authorize_merge_pr == false`

## Limites

- Runner mecanique local uniquement.
- Pas d'appel API IA.
- Pas de decision autonome de merge/promotion/claim.
- Pas de modification runtime/tests/CI.
- Pas de benchmark et pas de gameplay loop.
- Les artefacts produits restent non canoniques.
- PR #191 reste en dry-run et validation locale.
- `prepare-draft-pr` reste desactive pour PR #191 tant qu'une validation humaine explicite n'active pas les autorisations necessaires.

## Ce qu'il automatise

- Chargement centralise des policies et schemas.
- Verification de scope staged (allowed/forbidden).
- Verification JSON staged.
- Execution des checks locaux repetitifs.
- Production standardisee d'un audit event et d'un reward log locaux.
- Preparation de draft PR sous garde-fous explicites.

## Ce qu'il ne fait pas

- Ne merge jamais.
- Ne marque jamais une PR "ready for review".
- Ne modifie jamais la branch protection.
- N'accorde jamais de claim authority.
- Ne cree aucune preuve canonique.

## Pourquoi il ne merge pas

Le merge est une decision humaine de gouvernance dans le projet.  
Le runner applique un modele deny-by-default et laisse la validation finale au reviewer humain.
Le mode `prepare-draft-pr` reste inactif tant que les autorisations explicites et la validation humaine ne sont pas reunies.

## Reduction des copier-coller

Au lieu d'enchainer manuellement les memes commandes et verifications entre PRs, ce runner:
- consolide les checks dans un flux unique,
- encode les refus de scope/fichiers interdits,
- produit automatiquement des journaux locaux exploitables pour revue.

## Prochaine etape vers GitHub Actions workflow_dispatch

La prochaine evolution naturelle est de reprendre ce flux en job `workflow_dispatch` (toujours avec validation humaine) pour:
- reutiliser les memes controles de scope,
- publier des rapports de controle reproductibles,
- garder `claim_verdict=NO_CLAIM_ALLOWED` tant que la decision n'est pas humaine.
