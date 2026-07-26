# Contexte courant TCS

## Session 2026-07-23 (Opus, worktree `forge-godot-etape0`) — capteur branché, étapes 4 et 5 faites
- **Ordre ratifié de Pierre ÉPUISÉ (1→5)** : contrat de système · surfaces · source de vérité ·
  métriques+boucle · contrat de l'agent orchestrateur. Détail clos :
  `journal/context-archive-2026-07-23-capteur-metriques-orchestrateur.md`.
- En bref : `contract_sync` agrégé dans `studio_selfaudit` (un capteur qui ne peut pas tourner rend
  `non_evaluable` et FAIT ÉCHOUER — jamais de vert silencieux) · 4 dérives skill↔code résorbées ·
  coût/effort/pool dans le rapport de fin de run · `project_bible` injectée en s0 · index des
  journaux régénéré · 4 fonctions sans appelant branchées · `contracts/orchestrator.yaml` (RATIFIÉ).
- Chiffres inédits sortis du disque : `card_engine` = **1,81 M tokens / 12 appels / 8264 s** ;
  escalade réelle sur `shmup_slice` = haiku FAIL×2 → sonnet FAIL×2 → **opus OK×1**.
- 6 défauts silencieux trouvés en vérifiant (tautologie de budget, ligne JSONL tronquée qui aurait
  emporté le rapport d'un run réussi, `builder_id` non normalisé, docstring non tenue, décision en
  commentaire, mojibake `U+FFFD` sur JSON valide). Aucun ne levait d'erreur.

- **RATIFIÉ PIERRE 2026-07-23** : (a) séparation `orchestrator` (session) / `run_orchestrator`
  (agent, Opus) — « intention ≠ exécution » ; réserve NON implémentée : l'orchestrateur devra
  pouvoir descendre de tier. (b) **Aucune décision dans un commentaire** — champ structuré validé
  obligatoire, à appliquer aux contrats/wiremaps/registres. (c) Project Bible : promotion humaine
  gardée, « mémoire active mais pas auto-validée ». (d) Mémoire : cache local agent toléré, mais
  toute décision ratifiée doit avoir une représentation VERSIONNÉE, et une référence doit pointer
  vers une source réellement accessible. Entrées rédigées au format du log dans
  `studio_brain/decisions/PROPOSED_2026-07-23_ratifications.md` — **à promouvoir par Pierre lui-même**
  (le log dit « seul Pierre peut ajouter des entrées »).
- **OPENCLAW = LEGACY** (Pierre 2026-07-23) : « on travaille que claude et forge ». Forge SAINE —
  elle ne lit jamais `openclaw/capabilities.yaml` (toujours `caps_path=roles.yaml`, vérifié) ; ce
  chemin n'est que le défaut de `control_plane/registry.py:15`, consommé par la lane STUDIO gelée.
  MAIS deux skills **vivants** (pas dans les legacy gelés de `CLAUDE.md:128`) pointent dedans :
  **`/gate` écrit ses verdicts HumanGate** dans `studio/openclaw-workspace/DREAMS.md` et
  `/audit-daily` lit un `MEMORY.md` figé au 06-29. + 2 docs Forge étiquettent encore openclaw
  « SSOT studio » (`roles.yaml:3`, `SCHEMA.md:130`) — étiquette devenue fausse. Vérifié :
  `DREAMS.md` propre côté git, dernière entrée 07-09, aucun verdict n'y dort.
  ⚠️ **Collision à trancher** : `/gate` enregistre les décisions ratifiées **dans du legacy**, alors
  que la décision « toute décision ratifiée doit être versionnée dans le repo » exige l'inverse.
- **DÉRIVE STRUCTURELLE TROUVÉE — classée « correction d'architecture », pas un patch** : `CT-4`
  (2026-07-03) nomme `memory/MEMORY.md` comme référent canonique. Ce chemin **n'a jamais existé
  dans le dépôt** (`git log --all -- memory/` vide) : les 68 fichiers vivent hors projet, sans
  historique ni sauvegarde. Symétriquement `STUDIO_MEMORY.md` (racine, figé 06-04) EST versionné et
  CT-4 ne le mentionne pas — seul orphelin réel (l'autre candidat, `studio/openclaw-workspace/
  MEMORY.md`, est du legacy assumé depuis la décision openclaw ci-dessus, pas un référent à
  réconcilier). Le référent vivant est donc hors dépôt et sans sauvegarde, alors que CT-1 du même
  jour versait `studio_brain/` justement contre le bus-factor-1.
- **LA CAPACITÉ D'AUDIT N'EST PAS CONSULTÉE** (mesuré 2026-07-23) : des 5 capteurs déterministes,
  **un seul a un lanceur automatique** — `studio_selfaudit` dans `.claude/hooks/pre-commit`, avec
  `>/dev/null 2>&1 || true` (sortie muette, code de retour jeté). `master_index` — celui qui
  signalait la dérive `memory/` — n'est lancé par RIEN. `pending_review` non plus. Le problème
  n'est pas la perte de la capacité, c'est l'absence de lecteur. Priorité 2 de Pierre.
- **INDEX RÉGÉNÉRÉS** (priorité 1) : `AGENT_CONTEXT_MAP` et `MASTER_INDEX` étaient périmés sur ≥6
  points (3 contrats absents + 3 contrats modifiés depuis, dont `s0-contrat` et ses champs
  design-intent). Régénération idempotente vérifiée. **670 passed, 3 failed pré-existants.**
- **RESTE OUVERT** : promouvoir `pending_review_decisions.jsonl` vers le ledger (écriture durable ⇒
  gate Pierre) ; `generate_journal_index` embarque un chemin absolu (signalé, non corrigé) ;
  `lab/reports/error_journal/INDEX.generated.md` non suivi par git — à tracker ou à ignorer.
- **PRIORITÉ PIERRE POUR LA SUITE** : (1) stabiliser contrats + index + sources de vérité ;
  (2) garder la capacité d'audit ; (3) avancer vers le premier jeu avec la chaîne complète.
- ⚠️ RIEN N'EST COMMITÉ. Gate Pierre. Détail du 2026-07-22 (STANDARD, run Pong, contrat de système) :
  `journal/context-archive-2026-07-22-standard-pong-contrat.md`.

## Sessions 2026-07-19/20 (stratégie · Forge V2 · auto battler) — archivées
Archive complète : `journal/context-archive-2026-07-19-20-strategie-forge-v2.md` — mode commandement,
audit couche décisionnelle, Knowledge Resolver V1, Run A card_engine accepté, mission Forge V2 (§4-A
exécuté, R9/R1/R3/R2/R6/R7/R8), audits R10 et BAS V1/V2, les 8 gates tranchées + 7 commits ;
incrément 2 auto battler forgé et mergé.

## Session 2026-07-19 (déploiement Belote) — 1er build studio PUBLIÉ
**https://belote-claude.onrender.com** live, committé+poussé `8d4145f`, PWA installable Android
confirmée par la joueuse réelle. Détail + limite acceptée (bande de geste Android) :
`llm-lego/experiments/belote-claude/JOURNAL_ERREURS.md` (Partie 4) + mémoire `belote_render_deploy`.

## Sessions 2026-07-18/19 (stratégie · audit méta · auto battler) — archivées
- `journal/context-archive-2026-07-19-strategie.md` — « déclaré ≠ exécuté » au niveau PRODUIT,
  mode figé RATIFIÉ (Fable/Opus/Sonnet), **triage v2 exécuté mais NON COMMITÉ** (gate Pierre ;
  ne pas restaurer le ledger via checkout).
- `journal/context-archive-2026-07-19-audit.md` — 3 strates mortes, capteur `declaration_readers.mjs`,
  doctrine Declared→Referenced→Executed→Verified.
- `journal/context-archive-2026-07-18.md` — architecture 16 bibles auto_battler RATIFIÉE, run Forge
  `auto_battler_i1` s0→s12 mergé (`44592b3`).

## Historique 2026-07-09 → 2026-07-15 (archivé)
Archive complète : `journal/context-archive-2026-07-14-15.md` — mémoire qui compose (Forge),
shmup run1, pipeline 3D, factory contractuelle mergée master.

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Aucune session d'optimisation moteur sans HumanGate explicite.
- **Lane STUDIO : GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`, `scripts/studioV2/`, lanceurs.
  Lire OK, modifier = HumanGate. Hors gel : `tests/studioV2/`, `studioV2_MIGRATED_HOLD/`.
  ⇒ `lab/agent_policy/` + taxonomie `producer/code/qa` = **legacy de fait** ; plus que 2 taxonomies
  vivantes (`.claude/agents/` + contrats Forge). Détail : [[lane_studio_frozen]].
- **Factory réorientée** : jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun).
- Actions du pivot : re-triage ledger FAIT (triage v2 2026-07-19, non commité) ; spec produit Belote
  EXISTE (docs/superpowers/specs/2026-07-06-belote-bloc2-*) et Belote est PUBLIÉE ; reste : étage 2 WebRTC gated.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.

