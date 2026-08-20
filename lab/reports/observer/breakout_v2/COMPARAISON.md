# Comparaison — rapport humain vs reconstruction Observer

- rapport humain : `C:\TACTICAL_CHESS_STUDIO\docs\forge\BREAKOUT_V2_CAMPAIGN_REPORT_2026-07-31.md`
- reconstruction : 4493 evenements, 6 runs, 42 ecarts

La reconstruction a ete produite AVANT toute lecture de ce rapport : la garde
de cecite d'Observer rend `docs/` structurellement illisible pendant la phase
de collecte. Cette comparaison est donc un test, pas une relecture.

| classe | n |
|---|---:|
| RECONSTRUIT | 18 |
| PARTIEL | 1 |
| CONTRADICTOIRE | 0 |
| NOT_OBSERVABLE | 3 |
| MANQUANT | 1 |

| affirmation | classe | affirme | observe | provenance |
|---|---|---|---|---|
| la campagne compte 3 runs | **RECONSTRUIT** | `3` | `3` | `lab/forge_runs/breakout_v2/_run1_20260731/state.json (document entier)`<br>`lab/forge_runs/breakout_v2/_run2_20260731/state.json (document entier)`<br>`lab/forge_runs/breakout_v2/state.json (document entier)` |
| run 1 aboutit a un verdict signe BLOCKED | **RECONSTRUIT** | `('082705', 'BLOCKED')` | `('082705', 'BLOCKED')` | `lab/forge_runs/breakout_v2/_run1_20260731/verdict.json (document entier)` |
| run 2 aboutit a OK/HUMANGATE_READY | **RECONSTRUIT** | `('101252', 'HUMANGATE_READY')` | `('101252', 'HUMANGATE_READY')` | `lab/forge_runs/breakout_v2/_run2_20260731/verdict.json (document entier)` |
| run 3 aboutit a OK/HUMANGATE_READY | **RECONSTRUIT** | `('111149', 'HUMANGATE_READY')` | `('111149', 'HUMANGATE_READY')` | `lab/forge_runs/breakout_v2/verdict.json (document entier)` |
| mutation finale : 73/73 mutants tues | **RECONSTRUIT** | `(73, 73)` | `(73, 73)` | `lab/forge_runs/breakout_v2/evidence/mutation_breakout_v2-run3-20260731-111149.raw.json (document entier)` |
| mutation run 1 : 59/73 | **RECONSTRUIT** | `(59, 73)` | `(59, 73)` | `lab/forge_runs/breakout_v2/_run1_20260731/evidence/mutation_breakout_v2-run1-20260731-082705.raw.json (document entier)` |
| 305 assertions vertes | **RECONSTRUIT** | `305` | `305` | `lab/forge_runs/breakout_v2/evidence/oracle_breakout_v2.log (document entier)`<br>`lab/forge_runs/breakout_v2/_run2_20260731/evidence/oracle_breakout_v2.log (document entier)` |
| aucun test en echec | **RECONSTRUIT** | `0` | `0` | `lab/forge_runs/breakout_v2/evidence/oracle_breakout_v2.log (document entier)`<br>`lab/forge_runs/breakout_v2/_run2_20260731/evidence/oracle_breakout_v2.log (document entier)` |
| solvabilite R9 : 50/50 parties gagnees | **RECONSTRUIT** | `(50, 50)` | `(50, 50)` | `lab/forge_runs/breakout_v2/evidence/oracle_breakout_v2.log (document entier)`<br>`lab/forge_runs/breakout_v2/_run2_20260731/evidence/oracle_breakout_v2.log (document entier)` |
| verdict ancre sur le commit 2b38702 | **RECONSTRUIT** | `2b38702` | `2b38702` | `lab/forge_runs/breakout_v2/verdict.json (document entier)` |
| software_verdict : OK | **RECONSTRUIT** | `OK` | `OK` | `lab/forge_runs/breakout_v2/verdict.json (document entier)` |
| claim_verdict : NO_CLAIM_ALLOWED | **RECONSTRUIT** | `NO_CLAIM_ALLOWED` | `NO_CLAIM_ALLOWED` | `lab/forge_runs/breakout_v2/verdict.json (document entier)` |
| run 1 : s9 en timeout a 1800 s | **RECONSTRUIT** | `1800` | `1800` | `lab/forge_runs/breakout_v2/_run1_20260731/run1_console.log (document entier)`<br>`lab/forge_runs/breakout_v2/_run1_20260731/salvage_s9-build-godot-standard.json (document entier)`<br>`lab/reports/error_journal/html.jsonl (ligne 58)` |
| 2 captures d'ecran differentes | **RECONSTRUIT** | `2` | `2` | `lab/forge_runs/breakout_v2/playtest/playtest_capture_report.json (document entier)` |
| builder et red-team tournent sur opus-4-8 | **PARTIEL** | `opus-4-8` | `['claude-opus-4-8']` | `<CLAUDE_HOME>\projects\C--TACTICAL-CHESS-STUDIO\a0239956-6003-461d-a672-22a25bb4c4c7\subagents\agent-a563e2758bc267eda.jsonl (ligne 5)`<br>`<CLAUDE_HOME>\projects\C--TACTICAL-CHESS-STUDIO\a0239956-6003-461d-a672-22a25bb4c4c7\subagents\agent-a563e2758bc267eda.jsonl (ligne 6)`<br>`<CLAUDE_HOME>\projects\C--TACTICAL-CHESS-STUDIO\a0239956-6003-461d-a672-22a25bb4c4c7\subagents\agent-a563e2758bc267eda.jsonl (ligne 8)` |
| 1 pool retry sur la campagne | **RECONSTRUIT** | `1` | `1` | `lab/forge_evidence/forge_builder_runs.jsonl (ligne 36)`<br>`lab/forge_evidence/forge_builder_runs.jsonl (ligne 37)`<br>`lab/forge_evidence/forge_builder_runs.jsonl (ligne 38)` |
| 0 escalade de tier | **RECONSTRUIT** | `0` | `0` | `lab/forge_runs/breakout_v2/_run1_20260731/state.json (champ run_status)`<br>`lab/forge_runs/breakout_v2/_run2_20260731/state.json (champ run_status)`<br>`lab/forge_runs/breakout_v2/state.json (champ run_status)` |
| 9+5+6 etapes executees sur les 3 runs | **RECONSTRUIT** | `(9, 5, 6)` | `(9, 5, 6)` | `lab/forge_evidence/dispatch_audit.jsonl (ligne 445)`<br>`lab/forge_evidence/dispatch_audit.jsonl (ligne 447)`<br>`lab/forge_evidence/dispatch_audit.jsonl (ligne 449)` |
| la copie wiremap du run_dir a diverge puis ete preservee | **MANQUANT** | `wiremap_rundir_constats_stale.json` | `None` | — |
| red-team non independant (meme famille que le builder) | **RECONSTRUIT** | `claude-local` | `['claude-local']` | `lab/forge_evidence/dispatch_dryrun_wm1_wiremap_breakout.jsonl (ligne 1)`<br>`lab/forge_evidence/dispatch_dryrun_wm1_wiremap_breakout.jsonl (ligne 2)`<br>`lab/forge_evidence/dispatch_audit.jsonl (ligne 444)` |
| le jeu « se joue a l'ecran », HUD lisible, briques detruites | **NOT_OBSERVABLE** | `affirmation visuelle` | `capture PNG presente, contenu non analyse` | `lab/forge_runs/breakout_v2/playtest/playtest_capture_report.json (document entier)` |
| les causes d'echec sont classees (harnais / enregistrement / carte) | **NOT_OBSERVABLE** | `harnais` | `non mecanisable` | — |
| 5 lecons L1-L5 proposees | **NOT_OBSERVABLE** | `5` | `non mecanisable` | — |

## Remarques

- **aucun test en echec** —  affirmation implicite du rapport (« ALL CHECKS PASSED »)
- **builder et red-team tournent sur opus-4-8** — valeur concordante, mais etablie par inference de portee de session : le run_id n'est pas porte par chaque message
- **9+5+6 etapes executees sur les 3 runs** —  compte les activations d'agent (dispatch.executed), pas les etapes distinctes du pipeline — le rapport et Observer doivent parler de la meme unite avant de se contredire.
- **la copie wiremap du run_dir a diverge puis ete preservee** — aucune trace lue ne porte cette donnee ANGLE MORT D'OBSERVER, pas une erreur du rapport : l'adaptateur V0 ne lit pas ce fichier (hors de sa table de sources). Le fichier existe bien sur disque.
- **le jeu « se joue a l'ecran », HUD lisible, briques detruites** —  Observer constate l'existence de captures, pas ce qu'elles montrent. Lire une image releve d'un capteur visuel, pas d'un correlateur de traces.
- **les causes d'echec sont classees (harnais / enregistrement / carte)** —  une CAUSE est une interpretation ; les traces portent l'evenement, pas son explication.
- **5 lecons L1-L5 proposees** —  une lecon est un jugement porte sur l'experience ; aucune trace ne l'atteste ni ne l'infirme.

## Ce qu'Observer a vu et que le rapport ne dit pas

- `tools_used_without_declaration` — run `breakout_v2-wm1-20260731-021904` etape `wm1-wiremap-breakout` : l'agent a utilise des outils alors qu'aucune liste d'outils n'est declaree dans la trace de dispatch
- `tools_used_beyond_declared` — run `breakout_v2-run1-20260731-082705` etape `s11-redteam-code` : des outils observes dans le transcript ne figurent pas dans tools_effective declare par la Forge
- `tools_used_beyond_declared` — run `breakout_v2-run1-20260731-082705` etape `s9-build-godot-standard` : des outils observes dans le transcript ne figurent pas dans tools_effective declare par la Forge
- `tools_used_beyond_declared` — run `breakout_v2-run2-20260731-101252` etape `s11-redteam-code` : des outils observes dans le transcript ne figurent pas dans tools_effective declare par la Forge
- `tools_used_beyond_declared` — run `breakout_v2-run2-20260731-101252` etape `s9-build-godot-standard` : des outils observes dans le transcript ne figurent pas dans tools_effective declare par la Forge
- `tools_used_beyond_declared` — run `breakout_v2-run3-20260731-111149` etape `s11-redteam-code` : des outils observes dans le transcript ne figurent pas dans tools_effective declare par la Forge
- `tools_used_beyond_declared` — run `breakout_v2-run3-20260731-111149` etape `s9-build-godot-standard` : des outils observes dans le transcript ne figurent pas dans tools_effective declare par la Forge
- `model_audit_differs_from_transcript` — run `breakout_v2-wm1-20260731-021904` etape `wm1-wiremap-breakout` : le modele declare dans l'audit signe de la Forge n'apparait dans aucun message du transcript : la signature protege la declaration, elle ne mesure pas l'execution
- `token_accounting_below_measured` — run `breakout_v2-run1-20260731-082705` etape `None` : la telemetrie de la Forge declare nettement moins de tokens que les transcripts n'en mesurent — la lecture de cache n'est meme pas comptee
- `token_accounting_below_measured` — run `breakout_v2-run2-20260731-101252` etape `None` : la telemetrie de la Forge declare nettement moins de tokens que les transcripts n'en mesurent — la lecture de cache n'est meme pas comptee
- `token_accounting_below_measured` — run `breakout_v2-run3-20260731-111149` etape `None` : la telemetrie de la Forge declare nettement moins de tokens que les transcripts n'en mesurent — la lecture de cache n'est meme pas comptee

claim_verdict: NO_CLAIM_ALLOWED