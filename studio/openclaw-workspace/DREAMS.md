# DREAMS.md — Journal des décisions ratifiées (HumanGate)

Mémoire institutionnelle des gates franchies. Append-only, daté.
Une ligne = une décision tranchée par Pierre. Ne jamais réécrire l'historique.
claim_posture: NO_CLAIM_ALLOWED

<!--
Format d'entrée (ajouté par /gate, jamais à la main) :

## <date> — <objet> (IMP-XXX / HGD-xxx)
- décision   : RATIFIÉ | REJETÉ | GELÉ
- oracle     : <PASS|FAIL|BLOCKED>  ·  HMAC : <OK|…>
- fichiers   : <liste>
- raison     : <justification Pierre / ce qui débloque si GELÉ>
- ratifié par: Pierre — <date>
-->

---

## 2026-06-29 — RAPPORT NUIT (mission autonome Phase 0 + PREP) [NON RATIFIÉ — attente gate Pierre]

> Entrée automatique de l'orchestrateur (pas une décision /gate). Rien n'est poussé.
> claim_verdict: NO_CLAIM_ALLOWED. Aucun verdict ne vaut ratification — Pierre tranche.

### Fait (preuves d'exécution, oracle non-LLM = pytest .venv312)
- **IMP-192** (SAFE_AUTO) — **CLOSED**. HMAC `compare_digest` + rejet dur (exception
  `EventLogIntegrityError`) dans `scripts/ingest_event.py`. Type-guard anti-`TypeError` sur
  HMAC non-str/non-ascii. Construction HMAC inchangée → events.jsonl réel re-vérifié `True`
  (aucune migration). Oracle : `pytest scripts/phase0_tests/test_imp192_hmac.py` → **13/13**.
- **IMP-193** (SAFE_AUTO) — **CLOSED**. `.autoloop.lock` TTL + auto-release (PID mort / age>30min)
  dans `lab/chains/kaizen_autoloop.py`. Liveness via **psutil** (jamais `os.kill` — voir red team).
  Oracle : `pytest scripts/phase0_tests/test_imp193_lock.py` → **13/13**.
- **IMP-194** (AUDIT_REQUIRED) — **implémenté + testé + commit local, NON FERMÉ**. Single-writer
  gardé `governance/ledger_writer.py` (governor.check + writelock O_EXCL avec TTL + empreinte
  optimiste) ; `kaizen_loop.save_ledger` reroutée. Oracle : `pytest .../test_imp194_single_writer.py`
  → **12/12**. Non-régression : `test_imp060_domain` **13/13**, `governor` **10/10**.
  **ATTEND LA GATE PIERRE** (cf garantie partielle ci-dessous).
- **PREP non-mutante** : `docs/orchestration/{agent_templates,skills_reuse_map,PHASES_1-5_PLAN}.md`
  + `scripts/council.py` (scaffold IMP-198, non câblé, refuse de tourner). Zéro merge, zéro close.
- Total oracle de la nuit : **61 tests verts** (38 phase0 + 13 imp060 + 10 governor).

### Trouvé par le RED TEAM (sous-agent adversaire) — a changé l'implémentation
- **CRITICAL RT-193-1** : `os.kill(pid, 0)` sur Windows = `TerminateProcess` → AURAIT TUÉ le
  runner pytest et des process vivants. Corrigé : liveness psutil + create_time (anti PID-reuse).
- **CRITICAL RT-192-1** : le « hard reject » est avalé en `return 6` et le seul appelant
  (`_ingest_imp_closed`) ignore le rc. Acceptance satisfaite au niveau unitaire ; le fix appelant
  est **hors scope 192** → candidat IMP (ci-dessous).
- **CRITICAL RT-194-1** : `autopilot.py:1684` écrit le ledger en direct → bypasse le writelock.
  Garantie **PARTIELLE** (protège kaizen_loop, détecte mais n'empêche pas autopilot). Décision = gate.
- HIGH corrigés : RT-192-2 (TypeError compare_digest non-ascii), RT-193-2/3 (vol de lock frais /
  lock zéro-octet → grace 10s au lieu de freeze 30min), RT-194-3 (TOCTOU empreinte → cache
  sur octets parsés), RT-194-4 (writelock orphelin → TTL).

### Attend la gate Pierre
- **IMP-194 à ratifier** (`/gate`) : oracle vert, commit local `9af10aa`. Garantie partielle assumée
  (autopilot non routé car hors périmètre nuit). Ratifier = décider si/quand router `autopilot.py:1684`.

### Résidus / candidats IMP surfacés (non créés — décision Pierre)
- `_ingest_imp_closed` doit honorer rc≠0 d'`ingest_event.py` (sinon log tampered → SUCCESS silencieux).
- `close_imp` (kaizen_autoloop) ne doit pas reporter SUCCESS si la fermeture ledger échoue (RT-194-5).
- Router `autopilot.py:1684` + autres writers (golden_collector, ledger_patch_*, roadmap_to_ledger,
  director) via le single-writer ; grep-guard CI « write ledger hors ledger_writer.py → fail ».
- Matérialiser les `blocked_by` ECG (195→…) dans le champ ledger (aujourd'hui en `notes` seulement).
- `--migrate` (ingest_event) re-signe sans vérifier (laundering) — durcir en IMP-196.

### Commits locaux (6, branche master, NON poussés — Pierre relit puis pousse)
- fb84436 IMP-192 impl · 80b64ab IMP-192 close · dcd7255 IMP-193 impl · f008762 IMP-193 close
- 9af10aa IMP-194 impl (NON fermé) · f34162a PREP orchestration

---

## 2026-06-29 — RAPPORT PHASE 1 (ECG kernel : IMP-195 + IMP-196) [NON RATIFIÉ — attente gate Pierre]

> Entrée automatique de l'orchestrateur (pas une décision /gate). Rien n'est poussé.
> claim_verdict: NO_CLAIM_ALLOWED. Les deux IMPs sont AUDIT_REQUIRED et restent OPEN.

### Fait (preuves d'exécution, oracle = pytest .venv312)
- **IMP-195** ECG state machine — **implémenté + testé + commit local, NON FERMÉ** (`28cbe20`).
  `governance/ecg.py` : 7 états gardés (PROPOSED→…→CLOSED), seule arête vers CLOSED =
  VERDICT_SIGNED → l'oracle n'est jamais contournable ; `current_state` fail-closed (FAIL/DONE
  mappés, statut inconnu → UNKNOWN non-transitionable). `schemas/ecg.schema.json`. Matérialisation
  `oracle_type` + `blocked_by` (depuis notes) pour les 11 IMPs 192–202 via le single-writer IMP-194
  (`governance/ecg_migrate.py`, dry-run par défaut). Oracle : **34/34**.
- **IMP-196** event log + projection — **implémenté + testé + commit local, NON FERMÉ** (`f11ff9e`).
  `governance/projection.py` : `state = fold(reduce_event, events)`, vérif HMAC autonome sur un
  snapshot d'octets unique du chemin projeté, réducteur pur (déterministe), last-write-wins par
  entité, ligne partielle finale tolérée (≠ tamper). Oracle : **14/14** (dont replay déterministe).
- Régression : suite complète **109/109** (phase0 38 + phase1 48 + imp060 13 + governor 10).
- **autopilot.py NON modifié.** Reader regex `/api/ledger-status` vérifié sur le ledger migré :
  open=24 closed=187 (inchangé), IMP-200 blocked_by=[IMP-199], 212 blocs parsés.

### Trouvé par le RED TEAM (kernel, sous-agent) — a changé l'implémentation
- **CRITICAL RT-195-1** : `status: FAIL` (IMP-175) → KeyError fail-open. Corrigé : `.get` +
  sentinelle UNKNOWN + FAIL/DONE mappés. Test sur tous les statuts réels.
- **CRITICAL RT-196-1** : `ingest_event.verify_event_log` n'a pas de paramètre path → aurait
  vérifié le mauvais fichier (test tamper = théâtre). Corrigé : projection autonome vérifie le
  chemin qu'elle lit, sur un snapshot unique (corrige aussi la ligne partielle RT-196-2).
- **HIGH RT-195-2** (honnêteté) : « ECG seule autorité » FAUX (close_imp/cmd_close bypassent).
  → ECG **ADVISORY** ; câbler les closes = suivi GATÉ (casserait les closes directs legacy).
- **HIGH RT-196-6** (honnêteté) : aucun producteur n'émet `imp_closed` → projection `imps` vide
  en prod. Périmètre honnête : modèle prouvé par events synthétiques signés ; producteur = suivi gaté.
- MEDIUM intégrés : `blocked_by=none`→[] (regex ancrée IMP-\d+, RT-195-4) ; delta actionable
  rapporté (RT-195-3) ; `_skipped` liste ordonnée + réducteur sans horloge (RT-196-3) ; précondition
  log 100% v1 (RT-196-5) ; idempotence reformulée last-write-wins (RT-196-4).

### Attend ta gate
- **Ratifier IMP-195 et IMP-196** (`/gate` puis close via kaizen_loop). Tous deux AUDIT_REQUIRED,
  oracle vert, commits locaux `28cbe20` / `f11ff9e`.
- **Décisions d'architecture sur la table** (non faites — gate) :
  1. Câbler `cmd_close`/`close_imp` à `ecg.can_transition` + `ledger_writer` (rendre l'ECG
     autorité réelle) — implique un chemin legacy pour les closes directs.
  2. Câbler un producteur d'event `imp_closed` (cmd_close → ingest_event.adapt_imp_closed, déjà
     écrit mais jamais invoqué) pour alimenter la projection `imps`.
  3. La matérialisation a retiré IMP-196–202 de l'actionable autoloop (deps OPEN) — confirmer.

### Commits locaux Phase 1 (2, branche master, NON poussés)
- 28cbe20 IMP-195 (ECG + migration ledger, NON fermé) · f11ff9e IMP-196 (projection, NON fermé)

---

## 2026-06-29 — RAPPORT IMP-203 (ECG enforcing) [NON RATIFIÉ — attente gate Pierre]

> Entrée automatique de l'orchestrateur (pas une décision /gate). Rien n'est poussé.
> claim_verdict: NO_CLAIM_ALLOWED. IMP-203 = AUDIT_REQUIRED, reste OPEN.

### ⚠️ Prérequis NON tenu
- Le prompt annonçait « 195 + 196 ratifiés/CLOSED ». **Faux** : 195 et 196 sont toujours OPEN
  et les commits Phase 1 sont **non poussés**. Je n'ai PAS fermé 195/196 (gate Pierre). Le
  travail dépend de leur CODE committé (`ecg.py`, `projection.py`), présent → implémenté sans risque.

### Fait (preuves d'exécution, oracle = pytest .venv312)
- **IMP-203** enregistré via `kaizen_loop add` puis **implémenté + testé + commit local, NON FERMÉ**.
  - (a) `kaizen_loop.cmd_close` routé via `ecg.can_transition` + single-writer IMP-194 : un IMP
    ECG-managed ne clôt que par transition légale (VERDICT_SIGNED→CLOSED), sinon **refus dur**
    (sys.exit 2). Fail-OPEN : absent/hors-enum/desync → legacy toléré (jamais brické). `--ratify`
    = override gate. `LedgerWriteError` → exit propre.
  - (b) `ingest_event.emit_imp_closed` (additif) : émet un event `imp_closed` signé → la projection
    IMP-196 n'est plus vide. Best-effort LOUD après save (ledger = source de vérité).
  - `autopilot.py:1684` `close_imp` routé via subprocess vers `kaizen_loop close` (.venv312,
    timeout=30) — plus de `write_text` direct. **Seule `close_imp` modifiée** dans autopilot.py.
  - Oracle : **13/13**. Régression complète : **122/122** (phase0 38 + phase1 48 + phase2 13 +
    imp060 13 + governor 10). Vrai events.jsonl non pollué (5 lignes), vrai ledger = seul l'add 203.

### Trouvé par le RED TEAM (kernel) — a changé l'implémentation
- **CRITICAL RT-203-1** : l'enforcement serait **dead code** en prod (rien ne stampe un ecg_state
  intermédiaire → tous les IMPs réels sont legacy). **Pas de surclaim** : le livrable = chokepoint
  de close unique (plus de bypass) + refus dur pour IMPs ECG-managed ; full enforcement par IMP
  = suivi gaté (wiring du cycle de vie). Honnête dans le commit + ici.
- **HIGH RT-203-2/3/4** : brick au reopen / ecg_state corrompu / ratification cassée → règle
  fail-open (`managed = ecg_state∈ECG_STATES ET non desync`) + `--ratify`.
- **HIGH RT-203-5** : `import ingest_event` aurait échoué (scripts/ pas sur sys.path) → emit jamais
  exécuté en prod. Corrigé (sys.path + import) + échec d'emit = ERROR loud.
- **HIGH RT-203-6** : verify post-commit inutile → politique explicite (ledger source de vérité,
  emit best-effort loud, divergence résiduelle documentée).
- **HIGH RT-203-7** : subprocess autopilot sans timeout → Flask hang. Corrigé (timeout=30, .venv312).
- **HIGH RT-203-9** : test du chemin autopilot via subprocess monkeypatché (jamais de vrai close).

### Attend ta gate
- **Ratifier IMP-195, IMP-196, IMP-203** (`/gate` + close via kaizen_loop) — oracle vert pour tous.
- **Décisions d'architecture restantes** (non faites — gate) :
  1. Wiring du cycle de vie (stamper PROPOSED…VERDICT_SIGNED) pour activer l'enforcement par IMP
     en prod — implique le chemin `--ratify` pour les ratifications directes (déjà en place).
  2. Élargissement signalé (RT-203-11) : le cockpit peut désormais fermer un IMP **BLOCKED** via
     le chemin unifié (l'ancienne regex ne fermait que OPEN/DEFERRED/IN_PROGRESS) — confirmer.
  3. Réconciliation des divergences ledger/event (emit échoué) — job de suivi.
  4. Autres writers ledger non gardés (golden_collector, ledger_patch_*) — hors scope, à router.

### Commits locaux IMP-203 (2, branche master, NON poussés)
- e1eeeef IMP-203 register (ledger) · 2362321 IMP-203 impl (kaizen_loop+ingest_event+autopilot, NON fermé)

---

## 2026-06-29 — RAPPORT PHASE 2 (IMP-199 SOA + IMP-197 Agent Factory) [SAFE_AUTO — CLOSED]

> Entrée automatique de l'orchestrateur. Rien n'est poussé. claim_verdict: NO_CLAIM_ALLOWED.
> SAFE_AUTO → fermés via kaizen_loop (pas AUDIT). Le close passe par le chemin ECG-enforcing
> (IMP-203) + émet un event imp_closed signé → la projection IMP-196 le reflète.

### Fait (preuves d'exécution, oracle = pytest .venv312)
- **IMP-199** SOA execution router — **CLOSED** (`10d0bb2` impl + `c59172c` close).
  `governance/soa_router.py` : lit les capacités réelles de `openclaw/capabilities.yaml`
  (statut filtré, skills à provider UNKNOWN/non résolu droppés) ; `route()` calcule le plus
  petit ensemble d'agents (greedy set-cover déterministe) ; **anti sur-orchestration dur** :
  `requested_agents` obligatoire et liant → `requested>min` = OverOrchestrationError,
  `<min` = InsufficientAgentsError, capacité absente = UnavailableCapabilityError. Oracle **14/14**.
- **IMP-197** Agent Factory — **CLOSED** (`806459d` close).
  `governance/capabilities.lock.json` (5 rôles) + `schemas/capabilities.schema.json` (draft-07,
  clés output par rôle, claim_posture const) + `governance/agent_factory.py` :
  `instantiate(role, action)` valide CHAQUE action via `governor.check()` au **runtime** —
  non-tautologique (action HUMAN_REQUIRED/AUDIT-sans-pass/FORBIDDEN → CapabilityViolation prouvé) ;
  ratification Reviewer = gate-only ; `validate_write_target` runtime + `forbidden_globs ⊇` hook
  pre-commit. Oracle **25/25**.
- Régression complète : **161/161** (phase0 38 + phase1 48 + phase2 52 + imp060 13 + governor 10).
- **autopilot.py NON touché** cette phase. Vrai events.jsonl : 5→7 lignes (2 imp_closed émis).

### Preuve end-to-end (chaîne 203→196 sur le système réel)
- Fermer IMP-199 via `kaizen_loop close` a émis `imp_closed:IMP-199:...` signé ; `projection.replay()`
  du vrai log montre désormais `imps: {IMP-199: CLOSED, IMP-197: CLOSED}`. Le producteur (203) et
  la projection (196) fonctionnent bout-à-bout.

### Trouvé par le RED TEAM — a changé l'implémentation
- **CRITICAL RT-199-1** : sans `requested_agents` le garde anti sur-orchestration était sauté →
  rendu **obligatoire + liant** (fail-closed).
- **CRITICAL RT-197-1** : governor.check à l'instanciation = tautologie / bloquerait Reviewer →
  gouvernance **par-action runtime** (default SAFE_AUTO honnête ; vrais BLOCKs prouvés sur actions élevées).
- **HIGH** intégrés : greedy décoratif (registre mono-provider) → test synthétique multi-provider +
  framing honnête ; skills provider UNKNOWN droppés ; schéma trop lâche → if/then par rôle + test négatif ;
  forbidden_globs vs hook (.github absent du hook) → test lock⊇hook + résidu signalé ; DREAMS/ratification gate-only.

### ⚠️ Signalé (décision Pierre)
- **Inversion d'ordre IMP-199** : fermé alors que ses deps déclarées **IMP-195/196 sont encore OPEN**
  (pending ta gate, commits Phase 1 non poussés). SOA est **standalone** (aucun import ecg/projection,
  vérifié) → pas d'impact runtime, mais le ledger montrera 199 CLOSED / 195,196 OPEN jusqu'à ta ratif.
  IMP-197 : dep IMP-199 CLOSED → pas d'inversion.
- Les closes de 199/197 ont **écrit le vrai lab/events.jsonl** (producteur live) — committé avec les closes.

### Commits locaux Phase 2 (4, branche master, NON poussés)
- 10d0bb2 IMP-199 impl · c59172c IMP-199 close · 806459d IMP-197 (impl+close groupés? non : impl séparé) 
- (détail : IMP-197 impl = commit précédent à 806459d ; 806459d = close)
- CORRECTION commits Phase 2 (4) : 10d0bb2 IMP-199 impl · c59172c IMP-199 close ·
  af44c68 IMP-197 impl · 806459d IMP-197 close. (Tous SAFE_AUTO, CLOSED, non poussés.)

---

## 2026-06-29 — RAPPORT IMP-198 (Council multi-LLM async) [AUDIT — NON FERMÉ, attente gate Pierre]

> Entrée automatique de l'orchestrateur. Rien n'est poussé. claim_verdict: NO_CLAIM_ALLOWED.
> Part du scaffold PREP scripts/council.py (aucun importeur — réécriture sûre).

### Fait (preuves d'exécution, oracle = pytest .venv312)
- **IMP-198** Council multi-LLM async — **implémenté + testé + commit local `ccdac34`, NON FERMÉ**.
  3 rôles async (timeout/rôle) : PLAN_REVIEW=Claude(proxy LOCAL 8765)+fallback Qwen / RED_TEAM=Qwen /
  DIVERGENCE=Gemini(clé env)+fallback Qwen (ne valide rien). brief→PLAN.md ; désaccords structurés →
  HumanGate (pas d'auto-résolution v1) ; governor.check avant CHAQUE écriture ; artefacts append-only
  sous verrou O_EXCL. `schemas/council_output.schema.json`. Oracle **20/20**. Régression **181/181**.
  deps 197/199 CLOSED (pas d'inversion).

### Trouvé par le RED TEAM (kernel) — a changé l'implémentation
- **CRITICAL RT-198-1 (doctrine)** : le design envoyait le brief INTERNE à Gemini, violant
  `never_internal_studio`. → `genericize()` strippe les marqueurs internes + `GeminiAdapter` REFUSE
  fail-closed tout prompt interne. Claude/Qwen (local) seuls reçoivent le brief complet.
- **CRITICAL RT-198-2 (async)** : `asyncio.wait_for` ne tue PAS le thread executor → `requests`
  reçoit un timeout (connect,read) < budget rôle + executor borné.
- **HIGH** : collapse mono-modèle (Claude+Gemini down → 3 rôles sur Qwen = chambre d'écho) détecté
  (distinct<2 → requires_humangate) ; fuite clé Gemini via exception → auth header-only + exceptions
  mappées en chaînes fixes (jamais str(exc) dans un artefact) ; governor action explicite + PLAN.md
  AUSSI gouverné ; race append → verrou O_EXCL + test concurrence ; parser JSON sale tolérant ;
  Gemini sur-escalade → divergences advisory (seuls BLOQUE/contradiction/collapse escaladent).
- **MED/LOW** : Claude proxy localhost-only (jamais anthropic.com) ; arbitrating_file déterministe
  (sorted) ; `now` injecté en test ; budget rôle = primary+fallback (2×) documenté.

### Attend ta gate
- **Ratifier IMP-198** (`/gate` + close kaizen_loop). AUDIT_REQUIRED, oracle vert, commit `ccdac34`.
- **Décisions / résidus** (non faits — gate) :
  1. `genericize()` est conservateur ; valider la politique d'exposition Gemini (ou retirer Gemini
     des rôles voyant le brief) avant tout appel Gemini RÉEL.
  2. Oracle = mocks ; un smoke test live (proxy/LMStudio/Gemini réels) reste à gater séparément.
  3. Le CLI `__main__` est câblé mais non branché dans l'automation tant que 198 n'est pas ratifié.
  4. IMP-204 (Graphify) a été ajouté au ledger par une session concurrente (toi) — laissé intact, non committé.

### Commit local IMP-198 (1, branche master, NON poussé)
- ccdac34 IMP-198 Council (council.py + schema + 20 tests + plan, NON fermé)

---

## 2026-06-29 — IMP-200 Web Reality Agent (SAFE_AUTO — auto-close, PAS une gate)
claim_posture: NO_CLAIM_ALLOWED · software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY

- **Quoi** : `governance/web_reality_agent.py` — veille externe GitHub + HackerNews + arXiv,
  READ ONLY, filtrée + scorée, injectée AVANT le PLAN (alimente le council via `to_council_brief`).
- **Oracle** : `pytest scripts/phase2_tests/test_imp200_wra.py` → **26/26**.
- **Garanties prouvées par l'oracle** :
  1. Source non vérifiée (source inconnue / host hors allowlist / champ manquant) → **rejet DUR**
     (`SourceVerificationError`, fail-closed ; `verify_batch` lève au 1er mauvais).
  2. Scoring **déterministe** (now_ts explicite, poids fixes, tri stable `-score/source/id`),
     composantes ∈ [0,1] ; rang identique sur entrée mélangée.
  3. **READ ONLY** : `gather()` écrit 0 fichier ; contenu malveillant (`__import__(...).system`)
     reste une string inerte ; AST du module **sans** `eval/exec/os/subprocess`.
  4. **Borné** : `max_calls` (anti explosion), `timeout` (clock injectable), `max_sources` (troncature).
  5. **Cache gardé** : `write_cache` appelle `governor.check()` d'abord — BLOCK → `CacheWriteBlocked`,
     aucune écriture (side-effect nul). Mission `web_reality_cache` ∉ FORBIDDEN.
- **Architecture** : cœur PUR (verify/score/rank/gather) ; frontière réseau = `fetchers` injectés.
  Fetchers live (`github/hackernews/arxiv`, HTTP GET only via urllib) câblés dans `__main__`,
  **NON** exercés par l'oracle (réseau) et **non** branchés dans l'automation (attend décision).
- **Ledger** : IMP-200 CLOSED via `kaizen_loop close` (event `imp_closed` signé HMAC émis). blocked_by
  IMP-199 = CLOSED → dep satisfaite.
- **Commit local** : `76673c8` (3 fichiers, branche master, **NON poussé**). `autopilot.py` non touché.

### Résidus (non faits — décision Pierre)
1. Smoke test **live** (GitHub/HN/arXiv réels) à gater séparément — l'oracle est offline par design.
2. Branchement du brief WRA dans le pipeline council/PLAN réel (le câblage existe, l'activation non).
3. Décision push.

---

## 2026-06-29 — Lot 3 IMP (orchestration : 202 close, 201 AUDIT, 204 flag)
claim_posture: NO_CLAIM_ALLOWED · Agent Factory (IMP-197) utilisé pour instancier 2 sous-agents RedTeam.

### IMP-202 — error_journal (SAFE_AUTO — auto-close, PAS une gate)
software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY
- **Quoi** : `governance/error_journal.py` — journal append-only + matcher déterministe ; erreur
  connue → fix rappelé ; erreur inconnue → proposition **PROPOSED** (lane AUDIT_REQUIRED, **jamais
  auto-close**, jamais de mutation du ledger réel). I/O gardée par `governor.check()`.
- **RED TEAM** (sous-agent Factory) : 10 findings (1 CRIT/3 HIGH). Corrigés : F1 regex **ancrés**
  (une nouvelle erreur n'est plus faussement « connue » → proposition non supprimée), F3 toutes les
  gates AVANT écriture (`ProposeBlocked`, side-effect nul), F4 verrou fichier dédup, F6 lane
  AUDIT_REQUIRED (non auto-pickable), F7 log corruption, F8 LF, F9 chemins, F10 gating par-mission.
  Résidus assumés : F2 (governor = point de politique central, by-design), F5 (signature fusionne
  les erreurs ne différant que par nombres — dédup voulue).
- **Oracle** : `pytest test_imp202_error_journal.py` → **22/22**.
- **Ledger** : **CLOSED** via kaizen_loop (event `imp_closed` HMAC émis). Commit `3362b57`.
- **Flag** : `blocked_by IMP-195, IMP-196` encore **OPEN** → inversion d'ordre signalée (module
  autonome, aucun import dur — même posture qu'IMP-199). Décision ordering = Pierre.

### IMP-201 — semantic_oracle (AUDIT_REQUIRED — commit, NON fermé)
software_verdict: OK (gating mécanique) · claim final = **HumanGate (Pierre)**
- **Quoi** : `governance/semantic_oracle.py` — checklist JSON-schema + règle « exactement un
  oracle_type ; non-automatable → humangate » + GATE `ORACLE_PENDING→VERDICT_SIGNED` **bloquée sans
  ratification (pas d'auto-pass)**. Compose au-dessus de `ecg` (réutilisé).
- **RED TEAM** : 10 findings (**2 CRITICAL**). Corrigés : **F1** anti-bypass design-déclaré-code
  (HumanGate enforced au gate), **F2/F4** binding `imp_id` (anti-replay cross-IMP), F3 parité
  validateur fallback, F6 items vides, F7 contradiction `ecg_state`/`status`, F9 fail-closed.
- **Oracle** : `pytest test_imp201_semantic_oracle.py` → **31/31**. Commit `16c3df3`.
- **Attend la gate Pierre** :
  1. **Ratifier IMP-201** (`/gate` + close) — AUDIT, oracle vert.
  2. **Résidu F4** (fog) : la preuve « oracle mécanique » code/structure est un booléen **lié à
     l'imp_id** mais **non HMAC** — la vérif signée reste déléguée à `verdict`/`smoke-check`.
     Décider si on couple la vérif HMAC ici (scope creep) ou on garde la délégation.
  3. **Résidu F5** (fog) : `requires_humangate` = heuristique sous-chaîne (évitable). Un champ
     `category` structuré dans le ledger fiabiliserait la règle — décision Pierre.
  4. `blocked_by IMP-195, IMP-196` OPEN.

### IMP-204 — Graphify (SAFE_AUTO — NON installé, NON exécuté, NON fermé : flag)
software_verdict: BLOCKED
- **Due diligence READ-ONLY** : `graphifyy` **v0.9.1** existe sur PyPI (169 releases) MAIS
  `author=None`, `home_page=None` → les signaux reco « 58k★ / 1.2M dl / MIT / graphify.net » **ne
  sont pas corroborés**. **`uv` ABSENT** → la commande d'acceptance `uv tool install graphifyy` ne
  s'exécute pas telle quelle.
- **Décision** : installer + exécuter un tiers v0.9.1 sur tout le dépôt = action supply-chain /
  exécution → **go explicite Pierre requis** (n'invente pas). Détail + plan d'exécution sûr et borné
  dans `docs/phase2/IMP-204_FINDINGS.md`. Commit `0f3b802`.
- **Attend la gate Pierre** : go install ? (`uv` vs venv isolé épinglé `graphifyy==0.9.1`) ;
  accepter l'exécution du tiers malgré ZG-1 ; `graphify hook install` (touche `.git/hooks`) = non par défaut.

### Rien poussé (Pierre pousse) — commits locaux : 3362b57, 16c3df3, 0f3b802

## 2026-06-29 — Ratification pile AUDIT Phase 0+1
- décision   : RATIFIÉ
- IMPs       : 195 (ECG), 196 (event log), 198 (Council), 201 (semantic oracle), 203 (ECG-enforcing)
- oracle     : PASS (tests verts .venv312)
- cockpit    : panel Council + défaut + graphe — commité
- ratifié par: Pierre — 2026-06-29

---

## 2026-06-29 — RAPPORT IMP-205 (single-writer COMPLET, chantier a) [AUDIT — NON FERMÉ, attente gate Pierre]

> Entrée automatique de l'orchestrateur (pas une décision /gate). Rien n'est poussé.
> claim_verdict: NO_CLAIM_ALLOWED. IMP-205 = AUDIT_REQUIRED, reste OPEN. Complète IMP-194.

### ⚠️ Contexte de session — deux mains sur le working tree partagé
- Pendant cette session, **ta session parallèle** a commité `4b7d785` (cockpit final) + `bf1e195`
  (test cockpit) et **ratifié la pile AUDIT 195/196/198/201/203**. Ton `git add` a **emporté ma
  registration IMP-205** (working tree partagé). Bénin ici, mais c'est le garde-fou « une seule
  main » : à confirmer qu'une seule session écrit ledger/autopilot à partir de maintenant.

### Fait (preuves d'exécution, oracle = pytest .venv312)
- **IMP-205** implémenté + testé + **commit local `ffdbfff` (scope-strict 7 fichiers), NON FERMÉ**.
  Tout writer du ledger dans l'arbre principal passe désormais par `guarded_write` :
  - `roadmap_to_ledger.py` (writer ACTIF idée→IMP) : `_write_ledger` routé ; `_load_ledger_guarded`
    capture l'empreinte ; concurrence optimiste threadée dans `inject_approved` ET `inject_staged`.
  - `ledger_patch_2026060{8,25}.py` (one-shots) : `write_text` direct → `guarded_write` + empreinte.
  - `scripts/grep_guard_ledger.py` : garde **AST** (run local + CI-ready, **`.github` NON touché**).
  - `ledger_writer.py` : docstring corrigé (autopilot n'est plus un bypass depuis IMP-203).
- **Oracle** : `test_imp205_single_writer_complete.py` **17/17** ; régression kernel **277/277** ;
  `grep_guard_ledger --root .` = **0 bypass (exit 0)**. Avant routage le garde détectait bien les 3.

### Trouvé par le RED TEAM (sous-agent adversaire) — a changé l'implémentation AVANT impl
- **CRITICAL C1** : grep mono-ligne aveugle à l'idiome atomique `os.replace(tmp, LEDGER)` (la
  convention d'écriture du repo) → garde **AST** détectant la destination de replace/rename.
- **CRITICAL C2** : « primitive + réf ledger » faux-positive `golden_collector` (lit le ledger,
  écrit un AUTRE fichier) → résolution de la **cible** d'écriture ; lectures jamais comptées.
- **H1** parents[2] (one-shots sans REPO_ROOT) · **H2/M1** empreinte threadée partout · **M2**
  width alignée (anti reflow) · **M4** worktrees exclus (documenté) · **M5** docstring corrigé.
- Correction scope vs REPRISE confirmée : `golden_collector` n'écrit PAS le ledger ; énumération
  des writers réels **complète** (aucun manqué dans l'arbre principal).

### Attend ta gate
- **Ratifier IMP-205** (`/gate` + close kaizen_loop) — AUDIT, oracle vert, commit `ffdbfff`.
- **Résidus / décisions** (non faits — gate) :
  1. **Câblage CI du grep-guard** dans `.github/workflows/` (différé sur ta décision — `.github/`
     FORBIDDEN encore en attente). Le script tourne déjà en local ; reste à le rendre bloquant en CI.
  2. **M4** : un merge d'un `worktrees/*` peut réintroduire un bypass non vu — relancer le garde
     sur le résultat de merge (note CI à ajouter avec le point 1).
  3. IMP-194 (single-writer partiel) est désormais **complété** par 205 — confirmer si 194 se ferme
     en même temps que 205 ou reste tracé séparément.

### Commit local IMP-205 (1, branche master, NON poussé)
- ffdbfff IMP-205 (roadmap+ledger_patch×2+grep_guard+test+ledger_writer docstring+domain, NON fermé)

---

## 2026-06-29 — Follow-through ratification : closes ledger pile AUDIT
- objet      : la ratif « pile AUDIT Phase 0+1 » avait laisse 195/196/198/201/203 **OPEN** dans le ledger.
- action     : `kaizen_loop close` des 5 (single-writer garde + event imp_closed signe). ecg_state=None -> close legacy.
- oracle     : projection HMAC verte (events.jsonl 14 lignes) ; regression 229/229 ; ledger 18 OPEN restants.
- commit     : 816ef2f (ledger + events.jsonl). NON pousse.
- par        : orchestrateur, sur go Pierre (« reprends le travail que l'autre a fini »). claim_verdict: NO_CLAIM_ALLOWED

---

## 2026-06-29 — RAPPORT 4 ACTIONS (orchestrateur, directive Pierre)

> Entrées automatiques. claim_verdict: NO_CLAIM_ALLOWED.

### ACTION 1 — Close IMP-205 + push pile [FAIT, POUSSÉ — go Pierre]
- IMP-205 CLOSED (single-writer + event imp_closed signé). Ledger valide (yaml.safe_load OK).
- `git push origin master` : `33c2a2d..c220c61`. **local == origin == c220c61** (la pile amont
  ffdbfff/6e34265/816ef2f/ec4be34 + cockpit était déjà poussée par la session parallèle).

### ACTION 2 — .github/ dans FORBIDDEN [FAIT, NON POUSSÉ — gate push Pierre]
- `.claude/hooks/pre-commit` : `.github/` ajouté aux zones interdites. `bash -n` OK ; stage d'un
  fichier `.github/` -> hook **bloque** (exit 1) vérifié. Commit scope-strict `ccade62` (hook seul).

### ACTION 3 — Council live smoke-test [RAPPORT, pas de commit : genericize() déjà complet]
- `genericize()` (council.py:181) PROUVÉ : IMP-205 / `lab/chains/roadmap_to_ledger.py` / `governance/`
  -> `[REDACTED]`. Aucune fuite interne.
- Services : **claude_proxy 8765 DOWN** (call_failed, FAIL au boot) · **LM Studio 1234 UP** (7.4s,
  JSON valide) · **Gemini Flash DOWN** (no_api_key). Fallback VÉRIFIÉ : proxy DOWN -> PLAN_REVIEW
  bascule sur Qwen (UP). Council dégrade proprement sur Qwen seul (mono-modèle -> requires_humangate).

### ACTION 4 — error_journal -> boucle (chantier d) [FAIT, NON POUSSÉ — gate push Pierre]
- IMP-207 enregistré (SAFE_AUTO, oracle_type=pytest, domain studio), implémenté + testé, commit
  scope-strict `ac3a8e2`. **OPEN** (pas de close demandé par ACTION 4).
- **RÉUTILISE IMP-202** (pas de nouveau module — RED TEAM F). Câblage live 3 sites best-effort LOUD
  dans `kaizen_autoloop.py` (oracle rouge / governor BLOCK anormal / exception non gérée), garde
  réentrance, ne masque jamais l'erreur d'origine.
- `error_journal.py` étendu (additif) : **HMAC réel** par entrée + `verify_journal` par-ligne + scrub
  secrets ; **escalade** sur erreur récurrente (≥3) = bump proposition **AUDIT_REQUIRED** idempotente.
- **DÉCISION Pierre (gate)** : RED TEAM réfute l'auto-add SAFE_AUTO au ledger (verdict B=NON, boucle
  auto-amplifiante prouvée C1) -> Pierre a choisi « réutiliser IMP-202 + escalade proposition ».
  **AUCUNE mutation automatique du ledger réel** (ECG reste seule autorité).
- Oracle : test_imp207 **13/13** + test_imp202 **22/22** régression + kernel **290/290** ; grep-guard 0 bypass.

### Commits locaux NON poussés (2, gate push Pierre)
- ccade62 (.github FORBIDDEN hook) · ac3a8e2 (IMP-207 error_journal live)
  > MAJ 2026-06-29 : ces 2 commits + 5dc6682 (audit) sont POUSSÉS (origin/master en sync).

## 2026-06-29 — Ratification IMP-208 + IMP-210
- décision   : RATIFIÉ
- IMPs       : 208 (council branché kaizen), 210 (cockpit_server.py:8770)
- oracle     : PASS — 56/56 tests verts .venv312
- ratifié par: Pierre — 2026-06-29

## 2026-07-09 — Ratification IMP-252 (verrou de session ledger)
- décision   : RATIFIÉ (MERGE)
- IMP        : 252 — bail exclusif writelock O_EXCL, prouvé deux processus
- oracle     : PASS — 3/3 pytest (refus 1v1 + refus sous contention forcée 6 racers + sérialisation sans corruption) · HMAC : OK (lab/reports/imp252_verdict_latest.json.hmac)
- fichiers   : scripts/phase3_tests/_imp252_worker.py, scripts/phase3_tests/test_imp252_two_process_lock.py
- raison     : contention réelle prouvée (overlap mesuré fenêtre [0.000..0.363]s), anti-corruption octet, mutation-check positif, 42 passed régression single-writer. Aucune zone FORBIDDEN touchée.
- software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED
- ratifié par: Pierre — 2026-07-09

## 2026-07-09 — Ratification IMP-206 (grep_guard os.open)
- décision   : RATIFIÉ (MERGE)
- IMP        : 206 — détection bypass os.open(LEDGER) ajoutée au single-writer guard
- oracle     : PASS — 19/19 pytest suite guard (dont TDD os.open write + anti-faux-positif O_RDONLY) · HMAC : OK (lab/reports/imp206_verdict_latest.json.hmac)
- fichiers   : scripts/grep_guard_ledger.py, scripts/phase2_tests/test_imp205_single_writer_complete.py
- raison     : TDD prouvé RED→GREEN (test échouait AssertionError:[] sans branche) ; acceptance mécaniquement remplie (exit 0 repo propre, exit 1 sur bypass os.open) ; branche distingue O_RDONLY (lecture). Aucune zone FORBIDDEN touchée.
- software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED
- ratifié par: Pierre — 2026-07-09
