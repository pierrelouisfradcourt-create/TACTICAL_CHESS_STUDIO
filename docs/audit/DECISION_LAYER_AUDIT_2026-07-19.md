# Audit de la couche décisionnelle du studio TCS

Statut : PROPOSED — audit Opus, en attente gate Pierre
Date : 2026-07-19
Source : audit Opus (raisonnement profond, ratifié Pierre 2026-07-19), lecture directe du code. Chaque claim porte sa réf `file:line`. Un « consommateur réel » = code lecteur VU (tests EXCLUS du décompte consommateur). Échelle maison : `Declared → Referenced → Executed → Verified`.

> Périmètre : chaîne **audit/finding → décision → HumanGate → exécution Forge → evidence → mémoire**. Les jeux (Belote, auto_battler) sont cités comme EXEMPLES d'artefacts, aucune action ne porte sur eux. Lanes gelées (autopilot.py, scripts/studioV2/, lab/agent_policy/) en lecture seule. Exclus : worktrees/, node_modules, repos/games/studioV2_MIGRATED_HOLD/.

> **Note de contre-vérification (Fable, 2026-07-20)** : T1 reconfirmé par grep indépendant — aucun appelant non-test de `propose_ledger_entry`/`propose_project_record` dans `scripts/`, aucun promoteur du contenu des `forge_{ledger,project}_proposals.jsonl` (nuance : `studio_selfaudit.mjs` surveille leur FRAÎCHEUR, pas leur contenu). Gabarits `DOCUMENTED_ONLY` : statut vérifié sur pièce (`HUMANGATE_DECISION_TEMPLATE.md:3`). **CORRECTION §3(i)-P1 « ratifier le triage »** : le triage v2 a DÉJÀ été exécuté par Pierre le 2026-07-19 (4 OPEN / 38 FROZEN / 3 REJECTED, vérifié 3 voies) — l'action restante est le COMMIT du lot ledger (avec l'insertion pré-existante IMP-260/261/262).

---

## §1 — Modèle décisionnel canonique

### Schéma texte du flux

```
[1 FINDING]                      [2 DÉCISION]                 [3 HUMANGATE]
sensors non-LLM ─────finding──▶  arbitrage Pierre ──ratif──▶  enregistrement
· studio_selfaudit.mjs           · decision-log.md            · HUMANGATE_*.md (par jeu)
· declaration_readers.mjs        (structural, humain-only)    · verdict.decision (code:
· docs/audit/*.md (humain)                                      HUMANGATE_READY|BLOCKED,
· red-team s6/s11 (advisory)                                     "jamais merge = Pierre")
        │                                                              │
        │  (un run Forge est déclenché par une décision Pierre)        │ ratifié
        ▼                                                              ▼
[4 EXÉCUTION FORGE]  ──────────────────────────────────────▶  [5 EVIDENCE]
run_real.py → ForgeDriver.run()                                lab/forge_runs/<p>/verdict.json
· porte : dispatch.prepare_dispatch + hook pretool_forge_guard   (HMAC signé) + evidence/ + artifacts/
· oracles : gate.forge_gate, static_oracles, mutation_proof     lab/forge_evidence/dispatch_audit.jsonl
· verdict : verdict.build_aggregate_verdict (signé)              lab/forge_evidence/forge_telemetry.jsonl
· re-vérif : verify_run.verify_run                                     │
        │                                                              │
        │ studio_link.propose_* (PROPOSE-ONLY, manuel via skill.md)    │
        ▼                                                              ▼
[6 MÉMOIRE]  ◀── premortem (driver LIT le journal, boucle fermée) ────┘
· memory/MEMORY.md (faits durables, hors repo)      ┌─ TROU : proposals → ledger
· studio_brain/00_CURRENT_CONTEXT.md (handoff)      │  AUCUN lecteur/promoteur code
· lab/chains/IMPROVEMENT_LEDGER.yaml (archive)      └─ promotion = 100% humaine
· lab/reports/forge_{ledger,project}_proposals.jsonl (dépôt advisory, jamais relu par du code)
```

### Brique canonique par maillon

| # | Maillon | Brique canonique retenue (existante) | Fichier source de vérité | Consommateur(s) RÉEL(s) — code lecteur vu | Artefact qui circule vers l'aval |
|---|---|---|---|---|---|
| 1 | Finding | Capteurs déterministes non-LLM + audits humains | `scripts/forge/studio_selfaudit.mjs` · `scripts/forge/declaration_readers.mjs` · `docs/audit/*.md` | `.claude/hooks/pre-commit` exécute selfaudit (grep pre-commit) ; Pierre lit `docs/audit/*.md` | rapport JSON (sensors) / prose datée (docs/audit) |
| 2 | Décision | `studio_brain/decisions/decision-log.md` (structural, humain-only) | `decision-log.md:6` « Seul Pierre peut ajouter/modifier » | Pierre (humain) ; aucun code | entrée datée (décision·contexte·alternatives·critères de révision) |
| 3 | HumanGate | Enregistrement par incrément `games/<jeu>/bibles/HUMANGATE_*.md` (RATIFIÉ + verbatim) + champ `decision` du verdict signé | `verdict.py:247` (`decision` ≠ merge = Pierre) ; ex. `games/auto_battler/bibles/HUMANGATE_2026-07-19_RENDERER.md` | Pierre ; le code Forge N'ÉCRIT jamais la mémoire durable (propose-only) | fiche .md ratifiée / `decision` ∈ {HUMANGATE_READY[_WITH_OBJECTION], BLOCKED} |
| 4 | Exécution Forge | `scripts/forge/driver.py` `ForgeDriver` piloté par `run_real.py` | `run_real.py:822` instancie `ForgeDriver` ; `driver.py:164` `run()` | `run_real.py` (entrée réelle) ; porte `dispatch.prepare_dispatch` (`driver.py:271`,`458`) ; hook `pretool_forge_guard.py:39` | `verdict.json` signé (`driver.py:612` `signed_aggregate_record`) |
| 5 | Evidence | `lab/forge_runs/<projet>/verdict.json` (agrégat HMAC) + `evidence/` + `lab/forge_evidence/dispatch_audit.jsonl` | `verdict.py:421` `signed_aggregate_record` ; `dispatch.py:135` `_append_audit` | `verify_run.py:69` re-lit+re-hashe le verdict et l'évidence ; `hook_guard.py:37` lit dispatch_audit | dict de vérif (`overall`,`hmac_ok`,…) ; (autorisation spawn) |
| 6 | Mémoire | 3 référents (CLAUDE.md / decision-log CT-4) + journal d'erreurs domaine | `memory/MEMORY.md` (hors repo) · `studio_brain/00_CURRENT_CONTEXT.md` · `lab/chains/IMPROVEMENT_LEDGER.yaml` · `lab/reports/error_journal/<domaine>.jsonl` | `driver.py:409` LIT le journal via `premortem` (boucle fermée) ; Pierre édite les référents | pré-mortem injecté au run suivant / entrée ledger (humain) |

**Verdict par maillon (canonique trouvée ?)** : 1 OUI · 2 OUI · 3 OUI (mais forme éclatée) · 4 OUI (le plus solide) · 5 OUI · 6 OUI en LECTURE (premortem), **cassée en ÉCRITURE Forge→ledger** (dépôt sans lecteur).

---

## §2 — Cartographie détaillée (4 catégories)

### 2.1 Ce qui EXISTE réellement (Executed / Verified, avec preuve)

| Brique | Niveau | Preuve (consommateur code vu) |
|---|---|---|
| Porte de dispatch `prepare_dispatch` | Verified | `driver.py:271` et `:458` l'appellent à chaque étape ; `dispatch.py:144` |
| Hook dur `pretool_forge_guard` | Verified | `.claude/settings.json:33` `command: pretool_forge_guard.py` → `pretool_forge_guard.py:39` → `hook_guard.py:56` `hook_decision` → `:24` `check_spawn` lit+vérifie HMAC du `dispatch_audit.jsonl` |
| Machine à états `ForgeDriver` | Verified | `run_real.py:822` (entrée réelle) ; `driver.py:164-192` boucle ; oracles déterministes exécutés par le driver `driver.py:466-482` |
| Oracle code signé `forge_gate` | Verified | `gate.py:46` appelé par `driver.py:492` ; verdict signé `verdict.py:38` |
| Verdict agrégé signé HMAC | Verified | `verdict.py:259` `build_aggregate_verdict` → `driver.py:605` ; écrit `verdict.json` `driver.py:613` |
| Re-vérification mécanique `verify_run` | Executed | `verify_run.py:69` ; invoqué par `/forge` skill.md:196-199 (prose orchestrateur) et CLI `python -m forge.verify_run` |
| `is_clean_pass` (prédicat de promotion propre) | Executed | 1 seul consommateur non-test : `studio_link.py:453` (embarqué dans `propose_ledger_entry`) — `verdict.py:196` |
| Connecteur 3 (télémétrie) | Executed | `driver.py:343` `record_telemetry` → `forge_telemetry.jsonl` ; agrégé `run_cost` `studio_link.py:86` |
| Connecteur 6 (journal + pré-mortem) | Verified | `driver.py:390` `record_error`, `:399` `record_fix`, `:409` `premortem` (LIT ce qu'il écrit) ; `studio_link.py:190,267` |
| Capteur `studio_selfaudit.mjs` | Executed | lit `studio_expectations.json` `studio_selfaudit.mjs:31`, écrit `docs/forge/STUDIO_STATUS.generated.md:24` ; lecteur : `.claude/hooks/pre-commit` |
| Capteur `declaration_readers.mjs` | Executed | `declaration_readers.mjs:416` `runDeclarationAudit`, manifeste `declaration_watchlist.json` ; MESURE (exit 0) |
| Enregistrement HumanGate par jeu | Executed | `games/auto_battler/bibles/HUMANGATE_*.md` (8 fiches réelles, format RATIFIÉ+verbatim) |
| `decision-log.md` | Executed | registre humain vivant, dernière entrée 2026-07-19 (lane STUDIO gelée) |

### 2.2 Ce qui est DOCUMENTÉ seulement (Declared / Referenced, jamais Executed par le pipeline)

| Brique | Niveau | Constat (réf) |
|---|---|---|
| Connecteur 4 `propose_ledger_entry` | Referenced + exécuté À LA MAIN | **NON importé par `driver.py`** (imports `driver.py:61-67` = premortem/record_builder_run/record_error/record_fix/record_telemetry seulement). Seule invocation non-test = **prose** `skill.md:191-194`. 4 dépôts réels dans `forge_ledger_proposals.jsonl` (chesscolor, collect_runner, shmup_slice, auto_battler) = émis manuellement par l'orchestrateur, pas par la chaîne. Déf. `studio_link.py:439` |
| Connecteur 5 `propose_project_record` | Referenced + exécuté à la main | idem — 4 dépôts `forge_project_proposals.jsonl`. Déf. `studio_link.py:473` |
| `propose_bible_entry` (Project Bible) | Declared | **jamais fired** : aucun fichier `forge_bible_proposals.jsonl` sur disque. Déf. `studio_link.py:408` ; caller unique = tests |
| `project_bible()` (lecture bible à s0) | Declared (helper) / Referenced (mécanisme) | helper Python appelé par TESTS seuls (grep). Le mécanisme réel = `mandatory_read` injecté au prompt `contract.py:166` + Read de l'agent — MAIS dans le chemin `run_real.py`, s0-contrat n'a **aucun outil** (`_STEP_TOOLS` `run_real.py:151` sans s0) → bible non lisible par ce chemin. Fonctionne seulement si l'orchestrateur spawn un sous-agent avec Read (runs auto_battler). Déf. `studio_link.py:395` |
| `HUMANGATE_POLICY.md` | Declared | `status: DOCUMENTED_ONLY` (`:3`) ; générique control-plane V0 (auth/MFA/push/CI), pas Forge |
| `HUMANGATE_DECISION_TEMPLATE.md` | Declared | `status: DOCUMENTED_ONLY` (`:3`) ; gabarit à 20 champs jamais utilisé par les gates réels |
| `STUDIO_HUMANGATE_DECISION_RECORD_V0.md` | Declared | codex V0 ; format non employé (les gates réels = format ad-hoc auto_battler) |
| Sortie des capteurs (`STUDIO_STATUS.generated.md`) | Referenced | produite, lue par des HUMAINS/docs, **par aucun code** (dérive documentaire pas ré-injectée) |

### 2.3 Ce qui MANQUE (trous réels de la chaîne)

| # | Trou | Réf |
|---|---|---|
| T1 | **Boucle mémoire-écriture non fermée** : `propose_ledger_entry`/`propose_project_record` déposent dans `forge_{ledger,project}_proposals.jsonl`, mais **aucun code ne LIT ces fichiers** (grep `forge_ledger_proposals` = writer `studio_link.py` + tests + docs, zéro promoteur). La promotion vers `IMPROVEMENT_LEDGER.yaml` est 100 % manuelle. Le dépôt est advisory, sans aval automatisé — et `kaizen_loop.py` n'y apparaît pas (NON TROUVÉ de lecteur). |
| T2 | **Aucun déclenchement finding→run automatisé** : un finding (sensor/audit) ne déclenche aucun run Forge ; le lien 1→4 passe uniquement par une décision Pierre. Voulu, mais à consacrer. |
| T3 | **Pas de registre HumanGate studio-wide unifié** : les décisions vivent dans 2 endroits non liés (`decision-log.md` structural + `HUMANGATE_*.md` par jeu) ; les 3 gabarits `DOCUMENTED_ONLY` prétendent au rôle sans être employés. |
| T4 | **Bible s0 non câblée dans `run_real.py`** : `project_bible` n'est ni injecté par l'exécuteur ni lisible par l'agent s0 (pas de Read) — la « vision reconstruite à zéro » que la bible devait empêcher persiste sur ce chemin. |
| T5 | **`propose_bible_entry` inerte** : mécanisme de mémoire de décision par projet jamais exercé (aucun dépôt). |

### 2.4 DOUBLONS / CONFLITS (brique canonique + sort proposé)

| Rôle disputé | Briques concurrentes | Canonique proposée | Sort des autres |
|---|---|---|---|
| Format d'enregistrement de décision | `decision-log.md` (vivant) · `HUMANGATE_*.md` par jeu (vivant) · `HUMANGATE_POLICY.md` + `HUMANGATE_DECISION_TEMPLATE.md` + `STUDIO_HUMANGATE_DECISION_RECORD_V0.md` (DOCUMENTED_ONLY) | `decision-log.md` (structural) + `HUMANGATE_*.md` (incrément) | archiver/étiqueter LEGACY les 3 DOCUMENTED_ONLY |
| Journal d'erreurs | monolithe `lab/reports/forge_error_journal.jsonl` · `error_journal/<domaine>.jsonl` | journaux par domaine | monolithe = fallback-LECTURE non-destructif (DÉJÀ géré, `studio_link.py:178,310`) — pas d'action |
| Chemin mémoire-écriture Forge | `propose_ledger_entry` (studio_link) vs édition directe ledger (Pierre/kaizen_loop) | trancher T1 (fermer ou assumer manuel) | — |
| Taxonomies d'agents (contexte, hors cœur décisionnel) | `lab/agent_policy` producer/code/qa (legacy gelé) · `.claude/agents/` · contrats Forge | 2 vivantes (`.claude/agents/`, contrats) | `lab/agent_policy` = legacy de fait (decision-log 2026-07-19:170) |

---

## §3 — Actions priorisées

### (i) Décisions Pierre requises (arbitrages / consécrations / gels)

| P | Action | Critère de done |
|---|---|---|
| P0 | **Consacrer le format de décision** : ratifier `decision-log.md` (structural) + `HUMANGATE_*.md` par incrément comme SEULS canoniques ; déclasser les 3 gabarits `DOCUMENTED_ONLY`. | décision inscrite dans decision-log ; les 3 gabarits marqués LEGACY |
| P0 | **Trancher T1 (boucle mémoire-écriture)** : soit câbler un lecteur/promoteur des `*_proposals.jsonl` (avec gate), soit assumer explicitement que le dépôt est advisory et la promotion 100 % manuelle. | choix acté ; si « fermer », contrat de promoteur défini |
| P1 | **Sort de `project_bible`/`propose_bible_entry` (T4/T5)** : câbler la bible à s0 (injection exécuteur) OU acter l'abandon du helper. | décision ; si « câbler », s0 injecte la bible dans `run_real.py` |
| P1 | **Ratifier le triage ledger** `LEDGER_TRIAGE_PROPOSAL_2026-07-19.md` (42 → 37 FROZEN / 1 REJECTED / 4 KEEP) — l'archive vivante est cohérente avec la couche décisionnelle réelle. | go explicite → batch kaizen_loop |
| P2 | **Déclencheur finding→run (T2)** : décider s'il reste manuel (défaut) ou si un sensor rouge doit ouvrir une proposition de run. | décision de doctrine |

### (ii) Sonnet-ready (mécanique pure, exécutable sans jugement)

| P | Action | Critère de done |
|---|---|---|
| P1 | Après ratification P0 : déplacer/étiqueter les 3 fiches `DOCUMENTED_ONLY` (`HUMANGATE_POLICY.md`, `HUMANGATE_DECISION_TEMPLATE.md`, `STUDIO_HUMANGATE_DECISION_RECORD_V0.md`) vers un dossier LEGACY + bannière de statut. | 3 fichiers déplacés/étiquetés, refs mises à jour |
| P1 | **Cohérence doc↔réalité** : corriger les docs qui affirment `propose_ledger_entry` auto-câblé ou `project_bible` lu à s0. Cibles vues : `docs/forge/STUDIO_ARCHITECTURE.md:184`, `STUDIO_AGENT_ATLAS.md:158`, `FORGE_2_DESIGN.md:295`, `MASTER_INDEX.generated.md:12` — reformuler « propose-only, invoqué manuellement par l'orchestrateur (skill.md), sans lecteur automatique ». | diffs appliqués, aucune sur-affirmation restante |
| P1 | Regénérer le snapshot d'audit : `node scripts/forge/studio_selfaudit.mjs` et `node scripts/forge/declaration_readers.mjs`, committer `STUDIO_STATUS.generated.md` à jour. | sortie fraîche, dérives listées |
| P2 | Ajouter les fichiers `forge_ledger_proposals.jsonl` / `forge_project_proposals.jsonl` à la watchlist `declaration_watchlist.json` comme `declaration_doc` (fil-piège « dépôt sans lecteur »). | entrée ajoutée, capteur vert |

---

## §4 — Risques et limites de l'audit

- **Sensors non exécutés** : j'ai LU le code de `studio_selfaudit.mjs`/`declaration_readers.mjs`, je ne les ai pas lancés — les dérives listées par leur sortie live ne sont pas dans ce rapport (preuve d'existence du capteur, pas de son verdict du jour).
- **Recherche de lecteurs = textuelle** : le constat T1 « proposals sans lecteur code » s'appuie sur un grep des noms/constantes littéraux ; un lecteur construisant le chemin dynamiquement serait manqué (même limite structurelle que `declaration_readers.mjs` déclare, `:44`). Confiance haute mais non absolue.
- **`kaizen_loop.py` non ouvert** : NON TROUVÉ de lecture des proposals par kaizen_loop (absent du grep) ; je n'ai pas ouvert le fichier pour confirmer l'absence côté source.
- **Couverture partielle** : 172 fichiers sous `scripts/forge/` et ~80 docs `docs/control-plane/` non lus exhaustivement ; j'ai priorisé les consommateurs du cœur décisionnel. Les endpoints CEO d'`autopilot.py` (lane gelée) non lus en profondeur.
- **Jeux = exemples seulement** : `verdict.json` shmup_slice et `HUMANGATE_*.md` auto_battler cités comme spécimens de format ; aucune conclusion sur la qualité de ces jeux.
- **Deux chemins d'exécution Forge** : `run_real.py` (CLI, exécuteur `claude -p`) vs orchestration directe par Fable (skill.md). Mes constats sur les outils s0 valent pour `run_real.py` ; l'orchestration Fable peut différer (agent avec Read), ce que je n'ai pas pu tracer en code (prose de skill).

---
software_verdict : s'appliquera à toute exécution des actions, pas à ce document
evidence_verdict : MECHANICAL_VALIDATION_ONLY (chaque claim ancré à une réf file:line lue ; dépôts jsonl comptés sur disque)
claim_verdict : NO_CLAIM_ALLOWED
