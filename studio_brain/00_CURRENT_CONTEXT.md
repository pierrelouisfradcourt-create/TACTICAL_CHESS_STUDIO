# Contexte courant TCS
Dernière session : 2026-07-11 — **Forge axes 1 & 2/3 livrés+poussés** (branche `feat/forge-oracle-gate`, jusqu'à `c75e007`, origin à jour ; **pas mergé master**).
Avant : /forge complet mergé master (`e7887ce`), Chess TCG pivot mobile (`af21a6d`), council-audit (`ebebb59`).
Historique archivé : `journal/context-archive-2026-07-05.md` + `journal/context-archive-2026-07-06.md`.

## Session 2026-07-11 — Forge : renfort « niveau de production » (axes 1 & 2 sur 3)
- **Contexte** : audit de re-forge (`journal/2026-07-10_reforge_experiment.md`) a mesuré que la forge durcie
  BAISSE le niveau de production — e2e perdue **2/2 legacy → 0/3 re-forges**, contenu appauvri, wiremap rouge.
  Objectif ratifié Pierre : « les deux, dans l'ordre », sévérité **bloquer + auto-corriger**, **un axe à la fois**.
  Méthode commune : brainstorm → spec → plan TDD → exécution → revue indépendante (sous-agent) → correctifs → commits.
- **Axe 1 — GATE E2E** (4 commits `a293723`→`1d8b800`) : `check_e2e_harness` rejette e2e absent/non-câblé/coquille
  (strip commentaires anti-gaming) ; `PLAYABLE_CONTRACT.md` ; s9 durci ; skill s10a → `oracle_ok` combiné. Revue :
  3 importants + 5 mineurs tous corrigés. Limite connue : gaming par string-littérale (non fermé, assumé).
- **Axe 2 — GEL TRAÇABILITÉ** (3 commits `3f25bbb`→`c75e007`) : `check_feature_set_frozen` — le jeu de règles
  (features R1..R12) est figé à s5 (`wiremap_frozen.json`) ; WireMap rouge à règles intactes → auto-correction via
  escalade existante ; règle ajoutée/supprimée ou snapshot absent → STOP dur HumanGate. Revue : 4 importants +
  mineurs tous corrigés (faux-vert ensemble vide, `run_dir` s10c, ligne STOP réconciliée e2e+wiremap, flag honnête).
- **Preuve globale** : 202 tests forge verts ; gardes reproduisent les régressions mesurées sur données réelles.
  Spec/plan des deux axes sous `docs/superpowers/`. Verdict : software OK / evidence MECHANICAL / claim NO_CLAIM.
- **Gates Pierre en attente** : (1) re-forge réel avec agents+navigateur (spawn coûteux, prouve les 2 gates in vivo) ;
  (2) **axe 3** = gate mutation + richesse de contenu (`level.mjs`) ; (3) éventuel axe 2-bis (traçabilité jusqu'à la
  preuve-test) ; (4) merge master de la branche. ⚠️ Non commité hors-axe : `scripts/forge/mutation.py` (durcissement
  `.mutbak` anti-crash session précédente) + modifs pré-existantes (leviathan, llm-lego, IMPROVEMENT_LEDGER) — à trier.

## Session 2026-07-09→10 — /forge : usine d'ingénierie contractuelle MERGÉE master
- **Invariant** : chaque étape = un **contrat d'agent** (17 champs, `scripts/forge/contracts/SCHEMA.md`, 3 états rempli/`aucun`/absent). Aucun agent sans contrat complet ; le registry local (`roles.yaml`) résout le runtime — jamais de modèle en dur.
- **Chaîne 13 contrats** (s0 Contrat→s1 Prisme→s2 WorldScan→s3 Décompo→s4 Archi→s5 WireMap→s6 RedteamPlan→s9 Build→s10a/b/c Oracles→s11 RedteamCode→s12 Verdict). Modules : `contract, dispatch, static_oracles, gate, oracle, verdict, studio_link, hook_guard`.
- **Dispatch gouverné** (`prepare_dispatch` + audit) + **hook dur** PreToolUse (`FORGE_DISPATCH:<etape>:<run>`, fail-open, scopé). **Oracles** CODE + ARCHI/WIREMAP **multi-langages** (Python AST + Rust/TS/GDScript regex). **Connecteurs studio** propose-only (télémétrie/Kaizen/projet/pré-mortem). **Skill `/forge`** invocable. **ADR-002** (6 connecteurs, 4 gates ratifiés).
- **1er run réel prouvé** : `chesscolor` (Build Haiku réel + 3 oracles + verdict signé ; a détecté une dérive de spec e4). Démo + logs runtime NON committés (volontaire).
- **Reste** (voir [[forge_contract_dispatcher]]) : A2 exécution modèle réelle (Qwen s6 symbolique) → A3 verdict agrégé → A1 run complet 8 agents ; durcissement oracles (regex→AST), hook, connecteurs→dashboard/ledger réel, world-scan s2, étapes non-agent s7/s8/s13/s14, builder 8/17 facettes.
- ⚠️ Working tree : modifs pré-existantes hors-forge non committées (leviathan, IMPROVEMENT_LEDGER, validators llm-lego, studio_brain) — à trier.

## Session 2026-07-08 — llm-lego board : dashboard télémétrie Phase 3.5 (+ council-verdict-last)
- **Phase 3.5 LIVRÉE** (`GET /api/telemetry` read-only + section « Télémétrie » Accueil) : ferme la boucle
  des Phases 3/4 (capturaient sans afficher). Affichage **honnête du faible volume** (bannière « corpus en
  accumulation », corpus réel = 4 appels/0 verdict), coût = tokens+durée « modèle local 0 € », aucun tarif inventé.
  Preuve `telemetry-dashboard-validate.mjs` **36/0**. Numéro **3.5** volontaire — Phase 6 = Evolution System, dormant.
- **Commit combiné `7527282` (NON poussé — gate Pierre pending)** : bundle avec la feature d'une **session Claude
  parallèle** (working tree partagé, entrelacé dans `telemetry-read.mjs`/`demo-server.ts`/`builder.html`) :
  `GET /api/council-verdict-last` + dernier verdict council par IMP + bouton « Préparer une session ». Vérifiée
  **9/9** (`telemetry-read-validate.mjs`, à lancer via `run-validators.mjs` — échoue en standalone :3000 stale).
- **Régression pleine `run-validators.mjs` 890/0 (46 suites).** `run-validators.mjs` modifié (chess-tcg ×2 → skip
  `NEEDS_REAL_LIBRARY`) = concern chess-tcg **hors** de ce commit (laissé non stagé). ~11 process node stale (non nettoyés).

## Session 2026-07-08 (soir) — Chess TCG : PIVOT CIBLE MOBILE (ratifié Pierre)
- **Décision produit** : Chess TCG continue **sur Godot natif, cible MOBILE** (≠ navigateur, ce qu'écrivait la
  roadmap). Point zéro consigné (`af21a6d`) : proto Godot 3D jouable vs IA (~1800 l. GDScript), moteur de règles
  **pur headless testé (83/83 verts)**, assets CC0 KayKit 33 MB. Roadmap 7 jalons, **seul Jalon 1 audité**.
- **2 IMP AUDIT_REQUIRED ouverts** : **IMP-254** (fiche carte lisible, `ui/hud.gd`) · **IMP-255** (cascade de
  résolution étape-par-étape visible + verdict affichage-vs-règle, `ui/game3d.gd`+`core/rules.gd`, impact HIGH,
  « risque design n°1 lignée T »).
- **Passage borné 7 directeurs** (advisory, **zéro écriture**, aucun IMP créé) : 7/7 pertinents ; 8 exécutants
  hors scope (dont les 3 agents Rust/ML). Fil rouge = le **journal d'événements de `rules.gd`** est l'actif à
  exploiter (graine replay + cascade IMP-255 + check parité affichage↔règle). Risque n°1 = lisibilité/
  prédictibilité (converge IMP-254/255). Delta mobile non absorbé par la roadmap : entrée hover→tap, budget perf 33 MB.

## Session 2026-07-08 — council-audit LIVRÉ (`ebebb59`, poussé sur origin/master)
Bouton **« Auditer via council »** sur les cartes **AUDIT_REQUIRED** du board, **live-only** : graphe council in-file
(3 voix PLAN_REVIEW/RED_TEAM/DIVERGENCE) via `/api/execute` (Qwen :1234), **contexte IMP injecté**. Synthèse =
**règle déterministe** (BLOQUE l'emporte · mixte/unparsed→ESCALADE), **aucun 4e LLM**, parsing ancré sur `VERDICT: X`
final, durci contre l'auto-référence DIVERGENCE (rég. **s6**). **LECTURE SEULE stricte** (n'écrit ni ledger ni
`HUMANGATE_DECISION_LOG.yaml`). Preuve : **39 suites / 794 verts**, 2 audits live réels. Fichiers : `llm-lego/builder.html`.

## Session 2026-07-07 — Migration ledger IMP-256 + board (poussés `1555173`/`4d4d1a9`)
- **IMP-256 CLOSED** (schéma ledger `project`+`theme`, 264 entrées) + **board llm-lego** `GET /api/imp-board`.
  ⚠️ **IMP-247 = vrai trou** : `grep_guard_ledger` ne bloque pas le write-path direct hors `kaizen_loop`
  (mitigation : `settings.json` ask-gate sur `lab/chains/**`, cf. doctrine ci-dessous).

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, session Claude 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Post-mortem à écrire ; branche gelée ; **aucune nouvelle session d'optimisation
  moteur sans HumanGate explicite**.
- **Factory réorientée** : gamme **jeux de cartes FR** — **Belote = produit 1**, **Tarot = produit 2**
  (après extraction d'un **moteur de plis** commun).
- **Prochain cycle — Action 1 (PRÉCÈDE le spec Belote) = RE-TRIAGE du ledger** : les IMP OPEN liés à
  **Rocky / moteur / training** → passés **FROZEN** (motif « pivot 2026-07-06 »). **Revue de la liste
  par HumanGate AVANT toute écriture.**
- **Prochain cycle — Action 2 = spec PRODUIT Belote** : parcours joueur, **IA à niveaux**, hook
  **défi-par-seed**, web statique **mobile-first / PWA**.
- **Étage 2** = table entre amis **WebRTC** ; multijoueur public **gated**.

## État git 2026-07-08 — tout poussé sur `origin/master`
- Poussés ce cycle : IMP-256 `1555173` · board `4d4d1a9` · council-audit `ebebb59` · **pivot mobile chess_tcg
  `af21a6d`** · ce handoff. Rien en attente.
- ⚠️ Non commité (hors périmètre, laissé tel quel) : validateurs `llm-lego/*.mjs` + `*_result.json`,
  `07_CURRENT_STATE.md`, e2e-shots belote — modifs de travail non liées au pivot.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire les IMP via `kaizen_loop.py`
  (exception ponctuelle autorisée : migration schéma IMP-256 en écriture directe, cf. session 07-07).
  **`.claude/settings.json` (`c7ba7e7`, durcissement IMP-247) : `Write/Edit(lab/chains/**)` déplacés de `allow`
  vers `ask`** → toute écriture directe sur le ledger (hors `kaizen_loop`) déclenche désormais une **confirmation**.
  C'est attendu, pas un bug — mitigation du write-path direct que `grep_guard_ledger` ne bloque pas (IMP-247).
- `train.py` gelé (et de toute façon **Rocky = GEL**). `start_studio.ps1` OK (pas le `.sh`).
- Serveur builder : `node demo-server.ts` :3000 (`/api/memory*`, `/api/cockpit`, `/api/imp-board`, `/api/execute`).
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
