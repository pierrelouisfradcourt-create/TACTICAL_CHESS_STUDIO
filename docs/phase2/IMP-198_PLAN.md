# PLAN — IMP-198 : Council multi-LLM async (Claude + Qwen + Gemini)

**Lane:** AUDIT_REQUIRED · **oracle_type:** structure · **blocked_by:** IMP-197, IMP-199 (CLOSED ✓)
**Acceptance:** `3 rôles tournent + output schema valide ; désaccords → HumanGate ; fallback`

> AUDIT_REQUIRED — implémente + teste + commit local, **NE PAS FERMER** (gate Pierre).
> Part du scaffold `scripts/council.py` (PREP Phase 0). Pas de push.

## Spec → design

3 rôles **async en parallèle**, **timeout 120 s/rôle**, chacun part du **brief** :
- **PLAN_REVIEW** — Claude via `claude_proxy:8765` (local, openai-completions) : produit le PLAN +
  sa revue. **Fallback Qwen 14B** si proxy down/timeout.
- **RED_TEAM** — Qwen 14B (LM Studio :1234) : angles morts / objections.
- **DIVERGENCE** — Gemini Flash (`os.getenv("GEMINI_API_KEY")`, **jamais un fichier**) :
  hypothèses alternatives, **ne valide rien** (stance forcée non-APPROUVE). Quota/clé absente →
  **fallback Qwen** (ne saute pas l'exploration).

Entrée = `brief`. Sorties (append-only, figées) : `PLAN.md` (du PLAN_REVIEW) + `CONSENSUS.md` +
liste de **désaccords structurés** (hypothèse A vs B, fichier repo qui tranche si dispo) →
**HumanGate**. **Pas d'auto-résolution v1.**

## Composants `scripts/council.py` (réécrit depuis le scaffold)

- Enums : `ModelId{CLAUDE,QWEN14B,GEMINI_FLASH}`, `Stance{APPROUVE,BLOQUE,ESCALADE}`,
  `CouncilRole{PLAN_REVIEW,RED_TEAM,DIVERGENCE}`.
- `CouncilTask(brief, task_id, context)`.
- `ModelOpinion(model, role, stance, rationale, plan, risks, hypotheses, evidence_files,
  available, fallback_used, timed_out)`.
- `Disagreement(topic, side_a{role,model,claim}, side_b{...}, arbitrating_file|None, route="HUMANGATE")`.
- `CouncilResult(task_id, generated_at, plan_md, consensus, opinions, disagreements,
  requires_humangate, claim_posture="NO_CLAIM_ALLOWED")`.
- **Adapters** (DI/mocks) : `LLMAdapter` Protocol `is_available()->bool` + `complete(prompt,*,timeout)->str`
  (lève `CouncilCallError`). Réels : `ClaudeProxyAdapter` (8765), `QwenAdapter` (1234) — openai-completions
  via `requests` (timeouts) ; `GeminiAdapter` (clé **env only**, `is_available = bool(getenv)`).
- `ROLE_ROUTING = {PLAN_REVIEW:(CLAUDE,QWEN14B), RED_TEAM:(QWEN14B,None), DIVERGENCE:(GEMINI_FLASH,QWEN14B)}`.
- `_call_role(role, adapters, prompt, timeout)` **async** : essaie primary puis fallback ;
  `asyncio.wait_for(run_in_executor(adapter.complete), timeout)` ; TimeoutError/CouncilCallError →
  fallback ; les deux KO → opinion `available=False, stance=ESCALADE`.
- `run_council(task, adapters, *, repo_root, out_dir, timeout=120, now=None, write=True)` :
  `asyncio.gather` des 3 rôles → `synthesize` → `governor.check(write_action)` → écrit artefacts.
- `synthesize(task, opinions, repo_root)` : Gemini ne compte jamais comme APPROUVE ; chaque objection
  RED_TEAM (BLOQUE/risk) et chaque hypothèse DIVERGENCE → un `Disagreement` (A=plan vs B=objection),
  `arbitrating_file` = 1er `evidence_file` existant dans `repo_root`. `requires_humangate = bool(désaccords)
  OR any BLOQUE OR any role dégradé (timeout/unavailable)`.
- `render_plan_md` / `render_consensus_md` ; `_governed_append(path, section, action)` =
  `governor.check` PUIS append (header daté ; jamais d'écrasement → figé).
- `schemas/council_output.schema.json` valide le `consensus` (dict) — `validate_output()`.
- `__main__` : CLI réel (brief) avec adapters réels ; non exécuté par les tests.

## Sécurité / doctrine

- Gemini : clé **uniquement** via `os.getenv("GEMINI_API_KEY")` — **aucune lecture de fichier secret**.
- Claude = **proxy local 8765** (jamais l'API Anthropic externe — doctrine CLAUDE.md).
- `governor.check()` **avant toute écriture** ; bloqué → pas d'écriture (`GovernanceError`).
- `claim_posture = NO_CLAIM_ALLOWED` ; le council **recommande**, ne décide pas ; désaccords → Pierre.
- Artefacts **append-only** (figés) : ré-exécution ajoute une section datée, n'écrase jamais.

## Risques (RED TEAM)

- **R1 timeout** : `wait_for(120)` par rôle ; test avec timeout court + mock lent → fallback/dégradé.
- **R2 fallback** : proxy down → PLAN_REVIEW→Qwen ; Gemini absent/quota → DIVERGENCE→Qwen (exploration
  conservée). Tester les deux ; ne jamais sauter un rôle.
- **R3 Gemini valide** : stance DIVERGENCE forcée non-APPROUVE même si le modèle dit APPROUVE.
- **R4 parsing LLM** : `complete` renvoie du texte ; JSON non parsable → opinion ESCALADE
  "unparseable" (jamais de crash). Mocks renvoient du JSON conforme.
- **R5 clé Gemini fuite** : jamais de fichier ; jamais logguée ; `is_available` ne lit que l'env.
- **R6 écriture non gouvernée** : tout write passe par `_governed_append` ; test action bloquante → pas d'écrit.
- **R7 async/executor** : `complete` sync exécuté en thread ; un mock bloquant ne doit pas figer la suite (wait_for).
- **R8 artefacts** : append-only prouvé (write ×2 → 2 sections, 1re préservée).
- **R9 auto-résolution** : v1 NE résout PAS ; tout désaccord → HumanGate (requires_humangate).

## Oracle pytest exact

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp198_council.py -v
```
Cas (mocks LLM, aucun réseau) : les 3 rôles tournent → 3 opinions ; proxy down → PLAN_REVIEW
fallback Qwen (`fallback_used`) ; Gemini absent → DIVERGENCE fallback Qwen ; timeout (court) → rôle
dégradé/fallback ; Gemini ne valide rien (stance≠APPROUVE) ; désaccords structurés (A vs B +
arbitrating_file existant) → `requires_humangate` ; schéma `council_output` validé ;
`governor.check` bloquant → pas d'écriture ; artefacts append-only (2 sections) ; clé Gemini lue
via env uniquement (monkeypatch getenv) ; pas d'auto-résolution.

---

## RÉVISION RED TEAM (intégrée)

- **RT-198-1 CRITICAL — `never_internal_studio`** : Gemini est restreint (capabilities.yaml :
  never_phi / never_internal_studio / generic_only). **Fix** : `genericize(brief)` strippe les
  marqueurs internes (IMP-\d+, chemins de fichiers, "charter", noms repo) AVANT tout envoi Gemini ;
  `GeminiAdapter.complete` **refuse fail-closed** (CouncilCallError) si un marqueur interne subsiste.
  Claude/Qwen (local, fiables) reçoivent le brief complet ; Gemini uniquement le brief générique.
  Test : payload Gemini sans token interne + refus si marqueur présent.
- **RT-198-2 CRITICAL — `wait_for` ne tue PAS le thread executor** : `requests` reçoit un timeout
  `(connect, read)` **strictement < budget rôle** (sinon thread/socket fuit). Executor borné nommé.
  Documenté : `timed_out` (wait_for) ≠ thread arrêté.
- **RT-198-3 HIGH — collapse mono-modèle** : compter les modèles DISTINCTS ayant produit une
  opinion ; `< 2` → `requires_humangate=True` (reason `council_collapsed_single_model`) + afficher
  les fallbacks dans CONSENSUS.md. `fallback_used` contribue au flag dégradé.
- **RT-198-4 HIGH — fuite clé via exception** : auth **header-only** (jamais `?key=`) ; exceptions
  mappées en chaînes fixes (`call_failed`/`unparseable`/`timeout`), **jamais** `str(exc)`/`repr(exc)`
  dans rationale/artefacts. Test : clé injectée dans une exception → absente du rendu.
- **RT-198-5/6 HIGH/MED — governor** : action explicite `{SAFE_AUTO, council_artifact_write}`
  (artefacts = recommandations NO_CLAIM_ALLOWED). **PLAN.md ET CONSENSUS.md** passent par
  `_governed_append`. Test R6 = action **réellement bloquante** (mission FORBIDDEN) → aucun écrit.
- **RT-198-7 HIGH — race append** : verrou O_EXCL autour du read-append (figé) + test concurrence
  (2 threads → 2 sections, aucune corruption/perte).
- **RT-198-8 MED — sur-escalade Gemini** : séparer `divergences` (exploration, advisory, jamais
  escalade seule) de `disagreements` (conflits réels : RED_TEAM BLOQUE, ou contradiction A/B avec
  arbitrating_file, ou collapse). `requires_humangate = bool(disagreements) OR collapse/degraded`.
- **RT-198-9 MED — arbitrating_file déterministe** : `sorted(set(evidence_files))` puis 1er existant.
- **RT-198-11 HIGH — parser JSON sale** : `_extract_json` tolérant (fences ```json, 1er bloc {…}
  équilibré, virgules traînantes) ; testé sur payloads sales ; compteur parsed/unparseable ;
  100% unparseable = signal dégradé (pas un OK silencieux).
- **RT-198-12 MED — latence 2×** : budget rôle = primary+fallback (2×timeout) — documenté.
- **RT-198-13 MED — Claude jamais → API payante** : `ClaudeProxyAdapter` cible **uniquement**
  127.0.0.1:8765 ; tout échec → unavailable → fallback Qwen ; test : URL localhost, jamais anthropic.com.
- **RT-198-10/14 LOW** : `now` injecté dans les tests (rendu pur) ; scaffold sans importeur (vérifié) → réécriture sûre ; do-not-close (gate).
