# Archive contexte — sessions jusqu'au 2026-07-12 (avant reprise WFL-01 du 2026-07-13)

Contenu déplacé depuis `00_CURRENT_CONTEXT.md` pour respecter la limite de 100 lignes.
Rien n'est perdu — voir aussi les commits/docs cités inline.

## Session 2026-07-12 — Prompts + revue règles (NON COMMITÉ)
- `docs/prompts/PROMPT_LIBRARY.md` (10 sections) + `docs/audit/REVUE_REGLES_CONTRADICTIONS_2026-07-12.md`
  (14 findings, 4 P0 ; plan de correction en 7 étapes — détail dans les docs).
- **Gates Pierre en attente** : go/no-go plan de correction ; commit des 2 docs.
Avant : 3 gates forge prouvés in vivo (`3e5c000`/`87e9ec4`), /forge mergé master (`e7887ce`).
Historique archivé : `journal/context-archive-2026-07-05/06/08.md`.

## Session 2026-07-11 (suite) — FORGE 2.0 : P0 gelé + P1 falsifié (NON COMMITÉ)
- **Audit Forge 2.0** : cartographie interne (fichier:ligne) × référentiel industrie → `docs/forge/FORGE_2_DESIGN.md`
  (PROPOSED). Constat central : Forge vérifie tout SAUF ce que le joueur voit (Art&Presentation r=0.11 vs mécaniques).
- **P0.1 driver** (`scripts/forge/driver.py`) : machine à états déterministe offline, state.json atomique, reprise
  après kill, escalade bornée EN CODE — remplace la prose skill.md. Ratifié « conservation des preuves ».
- **P0.2 preuve mutation** (`scripts/forge/mutation_proof.py`) : reçu mutation signé lié au run_id + sha256
  (code+tests+harnais e2e+triage). Ferme I1/I2. Revue adversariale (Workflow) : 2 bypass confirmés+reproduits → fermés
  (is_game reprise, sceau tests indirects).
- **P0.3** : baseline verte obligatoire ; `verify_run` redescend dans le reçu mutation (échec dur au /gate) ;
  `is_game` re-dérivé de signaux on-disk non-downgradables. Sweep final adversarial : 3 chemins confirmés → 2 fermés
  en TDD + **doctrine triage ratifiée Pierre** : survivant trié = JAMAIS un OK propre → `HUMANGATE_READY_WITH_OBJECTION`
  + flag (aucun nouveau software_verdict).
- **P0.4** : footgun préfixe (`HUMANGATE_READY` ⊂ `…_WITH_OBJECTION`) → **`forge.verdict.is_clean_pass()` = SEUL
  prédicat de promotion** (égalité stricte + zéro flag) ; consommé par `propose_ledger_entry` (embarque `clean_pass`).
  Audit consommateurs : Forge couvert ; `executor_report`/autopilot = lane IMP distincte (namespace ≠, non étendu).
  Mention : « risque couvert sur les chemins connus », PAS universel.
- **Preuves P0** : 277 tests forge verts · TDD RED→GREEN sur chaque incrément · repros d'attaque réels (node) fermés.
  **P0 GELÉ** (décision Pierre) : pas de P0.5, pas de workflow de conformité, pas d'élargissement autopilot/kaizen.
- **Séparation ratifiée** : intégrité du système Forge (P0) ≠ qualité des jeux générés (gate séparé).
  `menagerie_tactics` = artefact / gate qualité séparé, PAS un bloqueur P0.
- **Tranche P1 mécanique-only : CLOSED, FALSIFIÉE** (`P1_MECHANICAL_RESULTS.md`) : 5 signaux, 0 vrai
  positif ; A1/A2/A3/A5 KEEP · A6 DROP · FTUE doc-only. Leçon : le goulot = l'interprétation, pas la mesure.
- **P1.1 EXÉCUTÉE — SUCCESS (2026-07-12)** : protocole v2 ratifié+red-teamé (14 findings adjugés), phases A→D
  sans déviation → **4/4 défauts détectés, 0 FP, P0 vert 5/5, gels sha vérifiés** (`P1_1_RESULTS.md`).
  Démontré (formulation ratifiée Pierre) : *A1/A2/A3/A5 détectent des défauts synthétiques connus, orthogonaux
  à P0, sur Breakout, sans FP observé dans cette expérience* — ni généralisation, ni subtil, ni exhaustif.
- **Décisions Pierre 2026-07-12** : **P1 OUVERTE** · sondes → fixtures permanentes `fixtures/p1/` ·
  commits séparés FAITS (`a13c262`→`3ac10cc`). **Acquis nommé : le cycle expérimental complet**
  (hypothèse→contrat→red-team→adjudication→ratification→expérience→conclusion limitée).
- **Gates Pierre en attente** : (1) push : **FAIT 2026-07-12** (a13c262..e2e978c → origin ; travail s10d de la
  session NON commité — gate commit séparé) ; (2) premier incrément
  P1 : s10d COMPLET+POUSSÉ (abefcc6..f6bfab8) · P1.2a « ftue-profile-eval » : cadrage v3 **RATIFIÉ Pierre
  + 2 règles** (profil gelé avant 1er test sinon expérience à refaire ; échec = résultat valide, zéro
  retuning) → protocole E2 v1 red-teamé : **sonde comptée FALSIFIÉE pré-run** (T_pre 2,3s mesuré + B2
  absolu bug analysis.mjs + solvabilité breakout VACUEUSE sous Windows F-T2 + balle lente = P0 rouge
  mesuré) → **v2** (`P1_2A_E2_PROTOCOL.md` : sonde level-design B2-null, simulation préalable phase A,
  ANNULATION pré-run = résultat valide, acte de restriction arcade §6) — **RATIFICATION v2 en attente**
  + 2 disclosures (solvability.mjs:127 garde Windows morte repo-wide — **CORRIGÉE 2026-07-12 nuit**, cf. en-tête ; analysis.mjs:76 reward0 mort) ; (3) merge
  menagerie (gate qualité séparé) ; (4) tri des hors-axe restants non commités (oracles.json+games/breakout
  [artefact jeu], leviathan, llm-lego, ledger, agents/skills `??` d'autres sessions).

## Sessions 2026-07-09→11 (archivées) — /forge usine contractuelle MERGÉE master (13 contrats s0→s12,
   dispatch gouverné, ADR-002) + renfort « niveau production » (e2e guard, gel traçabilité, gate mutation).
   Détail : git `a293723`→`87e9ec4` + [[forge_contract_dispatcher]].
