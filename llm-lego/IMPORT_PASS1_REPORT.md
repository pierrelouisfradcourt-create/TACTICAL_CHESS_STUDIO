═══════════════════════════════════════════
Import Passe 1 : Chaînes + Profils LM + 6 agents — Rapport
═══════════════════════════════════════════

Méthode : construit 100 % à la souris via Playwright (`build-pass1-chains-agents.mjs`, calqué
sur `build-idea-pipeline.mjs`). Zéro POST /api/library direct, zéro `window.__setGraph` pour le
contenu ; le texte des prompts est SOURCÉ par lecture locale de `run_chain.py` /
`prompt_chain_map.json` puis entré uniquement via `.fill()` (geste UI). Serveur dédié port 3201
pointé sur la VRAIE `library/` (`isTestLibrary=false`). Idempotent (réutilise par nom, jamais de
doublon). `src/` non touché, 5 fiches `agent_registry` non touchées, aucune brique supprimée.

Phase 0 vérifications :
  • `prompt_chain_map.json` : `agents_a_creer` = **6** (pas 3) — chacun avec model + calibration ;
    `lm_config` = 2 profils (Director qwen2.5-14b-instruct @0.4 / CEO qwen3.6-27b) ; `architecture_ideale`
    (3 étapes) et clé `chain` (5 étapes) portent des `prompt_target` = NOTES de calibration, PAS du
    texte de prompt → le vrai texte = les 4 briques prompt déjà en Bibliothèque (roadmap/redteam/
    fusion/extract). Conséquence : Chaîne A **attache ces 4 briques réelles** (ne fabrique rien).
  • `run_chain.py` : 4 `SYSTEM_*` extraits fidèlement (Translator 2133 / Engineer 1162 / RedTeam
    1732 / Formatter 1410 chars) — vérifié head+tail identiques à la source.
  • `lm_config` vit dans `prompt_chain_map.json` (miroir de `autopilot.py` L36-37 `_route_model` /
    `LM_MODEL_CEO`) → sourceRef CEO = « prompt_chain_map.json (lm_config) + autopilot.py (_route_model, LM_MODEL_CEO) ».

Correction 1 — Chaînes :
  Ancienne chaîne dépréciée (PAS supprimée)                : ✅  (chain-mr3kt9sj → nom « ⚠️ Pipeline idée→IMP (ANCIEN — fictif, voir versions réelles ci-dessous) », maturity draft, badge demo ; payload fictif conservé comme trace)
  Chaîne A (prompt_chain_map) à la souris, prompts ATTACHÉS, exécutée : ✅  (chain-mr4u3pi6 ; 4 nœuds llm avec producerRef → autopilot-prompt-roadmap/redteam/fusion/extract-001 ; 3 edges ; 4 trace-steps sur mockAdapters ; sourceRef=prompt_chain_map.json)
  Chaîne B (run_chain) à la souris, prompts ATTACHÉS, exécutée        : ✅  (chain-mr4u3s6y ; 4 nouveaux prompts créés puis attachés ; 4 trace-steps ; sourceRef=run_chain.py)

  Preuve « attaché ≠ copié » : chaque nœud des 2 chaînes porte `data.producerRef` pointant vers
  la brique prompt (persisté dans le JSON de la chaîne). L'ancienne chaîne fictive n'avait AUCUN
  producerRef — c'était le défaut exact relevé par l'audit.

Correction 2 — Profils LM :
  Director corrigé/confirmé                    : ✅  (agent-mr3kk79n déjà cohérent Director-only : role=director, qwen2.5-14b-instruct, temp 0.4 → INCHANGÉ, aucune mutation superflue)
  CEO créé comme brique séparée                : ✅  (agent-mr4u3mk6 « Profil d'appel LM — autopilot (CEO) » : qwen3.6-27b, temp 0.4, max_tokens 1200, sourceRef précis ; badge demo/draft en parité avec le Director existant)

Correction 3 — 6 agents agents_a_creer :
  6 briques créées, distinctes des 5 seeds     : ✅  (Architecte solo-dev, Avocat du diable, Gardien intention humaine, Juge-décomposeur IMP, CEO Director, Worker Claude Code — chacune : model réel, température-cible parsée de la calibration quand fournie [ex. Architecte 0.4→0.3], calibration/statut/source_id en notes, sourceRef=prompt_chain_map.json (agents_a_creer/<id>), badge real/saved comme les 4 prompts frères)
  5 fiches agent_registry NON modifiées        : ✅  (mtime inchangé)
  Correspondances potentielles signalées (NON fusionnées) :
    • Profil LM (CEO) ↔ agents_a_creer 'agent-ceo' (CEO Director) — preset d'appel vs rôle agent ; concepts proches, à trancher en passe future.
    • agents_a_creer 'agent-worker' (exécution Claude Code) ↔ seeds 'Code'/'Producer' — chevauchement FAIBLE sur l'exécution.
    • Les 4 rôles pipeline (roadmap/redteam/fusion/extract) — AUCUN équivalent 1:1 clair parmi les 5 seeds dev-team (code/docs/producer/qa/review).

Total briques après cette passe : 31 (avant : 18)  — +13 = CEO(1) + 6 agents + 4 prompts run_chain + 2 chaînes ; l'ancienne chaîne dépréciée compte toujours (non supprimée).
  Répartition : agent 14 (7→14) · prompt 8 (4→8) · oracle 6 (inchangé) · chain 3 (1→3).
  Diff disque : 18 originaux tous présents, 0 supprimé, +13 fichiers.

Playwright (build) : 15/15 checks ✅, 0 friction (les champs sourceRef/notes existent désormais — la friction historique de build-idea-pipeline est résolue dans le builder courant).
Régression (run-validators.mjs, 21 validators) : 463/0 ✅
  double-run search/chat [VERT via builder-validate 89/0] · Wire Map [VERT wiremap 22/0] ·
  Bibliothèque tous types [VERT library/prompt/agent/oracle/chain/roadmap/goal-validate] ·
  HumanGate [VERT humangate 19/0] · auto-validation Oracle [VERT selfval 15/0 + oracle-brick 20/0] ·
  carte d'identité Agent [VERT agent-card 28/0] ·
  isolation tests [RECONFIRMÉE à la nouvelle échelle : réelle library before=31, sentinelle
  survécue, restaurée à 31, aucune brique perdue — isolation_result.json]
Vitest : 39/39 ✅

software_verdict: OK
evidence_verdict: INCLUDES_UX_VALIDATION
claim_verdict: NO_CLAIM_ALLOWED

Suggestions notées mais NON implémentées (hors scope — passes futures) :
  • [Qualité badge] Les 2 nouvelles chaînes réelles restent demo/draft (défaut du modal de save) —
    indistinguables par badge de l'ancienne chaîne fictive dépréciée (seul le nom la signale).
    Suggestion : promouvoir Chaîne A & B en badge real (provenance réelle, prompts attachés,
    sourceRef réel), maturity saved — comme les 4 prompts frères. Non fait car les champs
    badge/maturity des nouvelles chaînes n'étaient pas listés dans le périmètre.
  • [Correspondances agents] Trancher les 3 correspondances ci-dessus (CEO profile↔agent-ceo,
    worker↔code/producer) — rapprochement/fusion volontairement laissé à une passe explicite.
  • [Chaîne A vs run_chain] Décider laquelle est canonique (idée→IMP prompt_chain_map semble la
    plus récente/IMP-089 ; run_chain = génération distincte Translator→Engineer→RedTeam→Formatter).
  • Hors passe (rappel priorisation ALL_CHAINS_AUDIT) : Passe 2 = 5 chaînes PowerShell d'audit ;
    Passe 3 = oracles/roadmaps lab/chains (doc_hygiene 4-lanes, fusion_matrix, ROADMAP_PROPOSALS,
    ledger 244 IMP) ; Passe 4 = matrices opérationnelles (CLAIM_MATRIX, AUTHORITY_MATRIX,
    tool_permission_matrix) ; kaizen_autoloop ; UxPilote — TOUS en attente explicite.

Points bloquants : AUCUN.

Artefacts de cette passe : build-pass1-chains-agents.mjs (script de construction),
build_pass1_result.json (checks détaillés), isolation_result.json (preuve d'isolation),
pass1_final.png (capture finale build), captures Bibliothèque 31 briques.
═══════════════════════════════════════════
