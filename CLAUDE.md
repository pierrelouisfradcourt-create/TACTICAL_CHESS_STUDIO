# TACTICAL CHESS STUDIO — Contexte pour Claude Code

## Règles absolues
* Jamais de git commit/push sans GO explicite de Pierre dans la conversation. GO ambigu = redemander.
* HumanGate (Pierre) décide merge / reject / freeze. Jamais Claude Code, jamais la Forge.
* Tout rapport sépare software_verdict / evidence_verdict / claim_verdict ; claim_verdict = NO_CLAIM_ALLOWED.
* Une preuve provient du mécanisme qui a réalisé l'action, sinon elle est marquée AUTO_ATTESTED (ratifié 2026-08-28).
* Écritures durables (ledger, decision-log, projets) = propose-only, ratifiées par Pierre.

## Délégation (doctrine Pierre)
Déléguer garde l'orchestrateur à contexte propre : c'est ce qui le rend capable de valider chaque rapport
comme un œil frais. L'indépendance des contextes EST le mécanisme de vérité.
* Fable = poste de commande (stratégie, découpage, orchestration, synthèse, préparation HumanGate).
  Opus = raisonnement profond (audits, architecture, challenge des hypothèses). Sonnet = exécution.
* Déléguer ce qui est borné, bruyant, résumable. Rester en direct si c'est petit ou couplé.
* Tâche déléguée = commande précise : objectif · entrées · sortie · preuve. Jamais « pense à l'architecture ».
* L'orchestrateur ne lit pas les transcripts bruts et confronte chaque rapport au réel avant d'y croire.
* Un sous-agent ne commite ni ne push. Périmètre Forge : aucun sous-agent sans contrat validé.
* Toute spec de délégation Forge porte `-m "not gpu_window"` ; T-GPU sur GO explicite seul (ratifié 2026-08-30).

## Lane FORGE — la lane active (/forge)
* Rôle : générer des jeux. Code : scripts/forge/ · contrats : scripts/forge/contracts/<etape>.yaml
  (schéma SCHEMA.md) · jeux : games/<jeu>/ · bibliothèque : knowledge_base/ · preuves : lab/forge_runs/ + lab/forge_evidence/.
* Chemin canonique : run_real.py → ForgeDriver → dispatch → contract → runtime → oracles → verdict → verify_run.
* Validation T0 : `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/ -m "not gpu_window"` (~6 min).
  T1 = test_observer_integration_real.py seul autorisé à lancer l'Observer réel. T-GPU = jamais sans GO.
* Invariants durs (ADR-002) : oracles déterministes non-LLM · verdict signé HMAC re-vérifié par verify_run ·
  software_verdict vient UNIQUEMENT des reçus d'oracle · red-team = advisory · toute métrique qui classe,
  génère ou calibre prouve d'abord sa variance.
* Gelés (decision-log 2026-08-28) : île V2 (candidate_selector → execution_proof + registres) et panel
  Prisme multi-lentilles. Lecture autorisée, aucun branchement sans consommateur démontré.
* Auto-audit : `node scripts/forge/studio_selfaudit.mjs`.

## Lanes dormantes
* ROCKY (Rust) : src/chess/ · validation `cargo build --release && cargo test`. Debug derrière TCS_DEBUG.
* IA (Python/ML) : ml/ et lab/ · venv `.venv312\Scripts\python.exe` (partagé avec les tests Forge).
* JEUX (prototype) : lab/chess_fantasy/ · aucune activité depuis 2026-06.
* STUDIO (autopilot.py, scripts/studioV2/, start/stop_studio.ps1) : GELÉE depuis 2026-07-19.
  Lire est autorisé, rien d'autre sans HumanGate. Son étage lab/agent_policy/ est legacy de fait.

## Gates mécaniques (ce qui borne réellement)
* `core.hooksPath` = .claude/hooks/. Pre-commit : refus de tests/ bench/ puzzles/ .github/ ·
  `node --test` bloquant · commit_scope_guard · unwrap() sans `// SAFETY` refusé.
* PreToolUse : pretool_forge_guard (fail-closed en périmètre Forge) · pretool_git_guard
  (sentinelle `.claude/HUMAN_GIT_OVERRIDE.json`, valable 10 min, un geste = une commande).
* tests/** = zone protégée. Toute modification passe par un GO Pierre.

## Fichiers clés
* lab/chains/IMPROVEMENT_LEDGER.yaml : archive vivante des IMP. Lecture libre, écriture sur GO seulement.
* lab/chains/golden_examples.jsonl : corpus LoRA. Ne jamais supprimer.
* studio_brain/decisions/decision-log.md : seule source des décisions ratifiées (écrit par /gate).
* Skills legacy gelés, sur demande explicite seulement : /autoloop /tick /sprint-plan /sprint-status
  /imp-readiness /council /fog /monitor.

## Avant d'implémenter
1. Lister les comportements évidents du composant (états vide / erreur / loading, encodage, timeout,
   exit code, reconnexion) et les implémenter dès le départ.
2. Protéger d'abord ce qui casse en premier, puis le happy path.
3. Prouver par l'exécution : « j'ai implémenté X » ≠ « X fonctionne ». Si intestable seul, donner à
   Pierre les étapes exactes avec le résultat attendu.
* Chemins relatifs au repo root. `encoding='utf-8'` explicite sur tout open(). Aucun fichier tmp qui reste.
* Jamais d'API Anthropic externe.

## Rapport obligatoire en fin de charter
software_verdict: OK|FAIL|BLOCKED · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED

## Mémoire et session
| Rôle | Où | Nature |
|---|---|---|
| Faits durables | mémoire auto (profil utilisateur, MEMORY.md + fiches) | chargée au boot, gérée par le mécanisme auto-mémoire |
| Handoff | studio_brain/00_CURRENT_CONTEXT.md | un seul fichier, < 100 lignes, état courant seulement |
| Décisions ratifiées | studio_brain/decisions/decision-log.md | append-only, via /gate |
| Doctrine / vision | studio_brain/ (doctrine, gamedesign, architecture…) | tier-2, à la demande |

Début de session : lire 00_CURRENT_CONTEXT.md. Charger studio_brain/ seulement si le sujet le concerne.
Fin de session : mettre à jour 00_CURRENT_CONTEXT.md (date, en cours, décisions ratifiées, prochaine
étape, impasses) ; ce qui dépasse 100 lignes part dans studio_brain/journal/. Faits durables nouveaux →
mémoire auto. Pas d'IMP réflexe : le ledger ne bouge que sur proposition Forge ratifiée ou demande Pierre.
Notes brutes de Pierre jamais réécrites. Toute doc générée : date + source.
