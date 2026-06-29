# Orchestration multi-LLM gouvernée — Plans phases 1→5 (PREP, analyse seule)

> **Statut : DRAFT analyse — zéro code de prod, zéro fermeture d'IMP, zéro merge.**
> Prépare la suite après Phase 0 (IMP-192/193/194). Chaque phase = design sketch +
> oracle exact + risques + dépendances. À ratifier par Pierre avant tout build.

## Rappel Phase 0 (livrée cette nuit)

| IMP | Lane | État | Oracle |
|---|---|---|---|
| IMP-192 HMAC compare_digest | SAFE_AUTO | **CLOSED** | pytest 13/13 |
| IMP-193 lock TTL auto-release | SAFE_AUTO | **CLOSED** | pytest 13/13 |
| IMP-194 single-writer ledger | AUDIT_REQUIRED | **commit local, OPEN** (gate Pierre) | pytest 12/12 |

## DAG de dépendances (IMP-195→202)

```
192,193,194 ─► 195 (state machine) ─┬─► 196 (event log) ─┬─► 199 (SOA router) ─┬─► 197 (factory) ─► 198 (council)
                                    │                    │                    └─► 200 (WRA)
                                    ├────────────────────┴─► 201 (oracle sémantique HumanGate)
                                    └──────────────────────► 202 (error_journal)
```
> Note ledger : les `blocked_by:` sont déclarés en `notes`, pas dans le champ `blocked_by: []`.
> **Action Pierre suggérée** : matérialiser ces deps dans le champ `blocked_by` (sinon
> `is_actionable` les considère actionnables trop tôt). Candidat IMP "ledger: backfill blocked_by ECG".

---

## PHASE 1 — IMP-195 : State machine 7 états, transitions gardées (AUDIT_REQUIRED)

- **Acceptance** : schéma JSON + pytest transitions
  `PROPOSED→PLANNED→TEST_SPECCED→IN_PROGRESS→ORACLE_PENDING→VERDICT_SIGNED→CLOSED`.
- **Design sketch** : `governance/imp_state_machine.py` (code pur, déterministe, style governor) :
  - `STATES` (7) + `TRANSITIONS: dict[state, set[state]]` (graphe dirigé, pas de saut).
  - `can_transition(src, dst) -> Decision` (ALLOW/BLOCK + reason), fail-closed sur état inconnu.
  - schéma JSON `schemas/imp_state.schema.json` validant `{imp_id, state, history:[{from,to,ts,actor}]}`.
  - chaque transition garde une condition (ex. `ORACLE_PENDING→VERDICT_SIGNED` exige un report HMAC valide).
- **Réutilise** : pattern `governor.check`/`Decision` (gel, fail-closed). Le ledger porte déjà
  `status: OPEN/CLOSED/...` — mapping à définir (status ledger ⊂ états ECG).
- **Oracle exact** : `pytest scripts/phase0_tests/... (ou tests dédiés hors FORBIDDEN)` —
  transitions légales OK, illégales→BLOCK, replay d'une séquence complète.
- **Risques** : (a) divergence entre `status` ledger (5 valeurs) et états ECG (7) — besoin d'un
  mapping explicite ; (b) qui écrit l'état ? → doit passer par le single-writer IMP-194 ;
  (c) AUDIT → ne pas auto-fermer.

## PHASE 2 — IMP-196 : Event log append-only HMAC + projection (AUDIT) · IMP-199 : SOA router (SAFE_AUTO)

### IMP-196 — Event log + projection
- **Acceptance** : `pytest: replay depuis zéro = même état`.
- **Design** : étendre `lab/events.jsonl` (déjà HMAC + schema-lock IMP-154/155, durci IMP-192) en
  un **event-sourcing** : `state(t) = fold(events[0..t])`. `scripts/project_state.py` (pur) rejoue
  les events → snapshot ; comparé à l'état courant. S'appuie sur `assert_projection_consistency`
  (déjà dans ingest_event.py).
- **Oracle** : replay déterministe = égalité bit-à-bit du snapshot projeté.
- **Risques** : non-déterminisme (timestamps, ordre) ; events legacy pré-IMP-154 (migrate existe) ;
  HMAC append-only — toute réécriture casse la chaîne (souhaité).

### IMP-199 — SOA execution router (anti sur-orchestration)
- **Acceptance** : `pytest: sur-orchestration détectée → refus`.
- **Design** : `scripts/soa_router.py` (pur) : décide, pour une tâche, le **plus petit** exécuteur
  suffisant (inline vs sous-agent vs council), MCP-registry aware. Heuristique de coût : refuse de
  spawner un council pour une tâche triviale (seuil tokens/complexité).
- **Oracle** : tâche triviale routée vers council → `OverOrchestrationError`.
- **Risques** : seuils arbitraires (à calibrer/fog) ; registry MCP indisponible en headless.

## PHASE 3 — Factory (197) · WRA (200) · error_journal (202) · oracle sémantique (201)

### IMP-197 — Agent Factory capabilities.lock.json + 5 templates (SAFE_AUTO, blocked_by 199)
- **Acceptance** : schéma valide + instanciation testée (Planner/Executor/RedTeam/Explorer/Reviewer).
- **Design** : voir `agent_templates.md` (déjà drafté) → sérialiser en `capabilities.lock.json` +
  `schemas/capabilities.schema.json` + loader `scripts/agent_factory.py` qui instancie un rôle
  borné (tools_allow / write_globs / forbidden_globs / close_imp).
- **Oracle** : schéma valide + 5 rôles instanciables + un rôle ne peut pas écrire hors write_globs.
- **Risques** : drift entre lock.json et la doctrine FORBIDDEN ; garder une source unique.

### IMP-200 — WRA web research read-only inject (SAFE_AUTO, blocked_by 199)
- **Acceptance** : `pytest: source non vérifiée → rejet`.
- **Design** : `scripts/wra.py` : injecte du contexte GitHub/HN/arXiv **read-only** AVANT le PLAN,
  avec vérification de source (allowlist domaines + hash/etag). Source non vérifiée → rejet dur.
- **Oracle** : URL hors allowlist / sans preuve → `UnverifiedSourceError`.
- **Risques** : réseau en headless (cf MCP) ; fraîcheur vs cache ; ne jamais laisser une source
  externe influencer un verdict (reste fog→Pierre).

### IMP-202 — error_journal pattern matcher + IMP auto-propose (SAFE_AUTO, blocked_by 195,196)
- **Acceptance** : `pytest: erreur inconnue → IMP créé`.
- **Design** : `scripts/error_journal.py` : matche les erreurs récurrentes (logs/oracle FAIL) contre
  des patterns connus ; erreur inconnue → propose un IMP (via kaizen_loop add, **pas auto-close**).
- **Oracle** : injecter une signature d'erreur inconnue → un IMP PROPOSED est créé.
- **Risques** : bruit (sur-proposition) → cap + dédup ; l'ajout d'IMP mute le ledger → single-writer.

### IMP-201 — Oracle sémantique HumanGate design/balance (AUDIT, blocked_by 195,196)
- **Acceptance** : checklist JSON schema validée + gate Pierre.
- **Design** : `schemas/semantic_oracle.schema.json` : pour design/balance (non mécanisable), une
  checklist structurée FORCE le passage HumanGate. Pas de verdict auto.
- **Oracle** : `oracle_type=humangate` — la checklist valide la *forme*, Pierre valide le *fond*.
- **Risques** : confondre validation de forme et de fond ; rester NO_CLAIM_ALLOWED.

## PHASE 4 — IMP-198 : Council Claude+Qwen14B+Gemini async PLAN→CONSENSUS (AUDIT, blocked_by 197,199)

- **Acceptance** : 3 rôles tournent + output schema valide ; désaccords → HumanGate ; fallback.
- **Design** : **étendre le skill `council` existant** (Gemini + Qwen14B) + ajouter Claude ; exécution
  async PLAN→CONSENSUS ; matrice de vote formalisée ; désaccord non résolu → HumanGate. Le scaffold
  `scripts/council.py` (ce PREP) en pose la structure.
- **Oracle** : 3 rôles produisent un output schema-valide ; désaccord → escalade (pas de merge auto).
- **Risques** : LM Studio :1234 down (fallback) ; Gemini indispo en headless ; coût/latence (caps) ;
  le council **recommande**, ne décide jamais (souveraineté oracle+Pierre).

## PHASE 5 — Intégration & durcissement

- Câbler SOA(199) → Factory(197) → Council(198) → Reviewer(verdict/smoke-check/gate).
- Brancher error_journal(202) sur les FAIL d'oracle réels.
- Matérialiser les `blocked_by` ECG dans le ledger (cf note DAG).
- Reprendre les **résidus red-team** Phase 0 :
  - router `autopilot.py:1684` via single-writer (IMP-194 gate Pierre) ;
  - `_ingest_imp_closed` honorer rc≠0 (candidat IMP) ;
  - `close_imp` ne pas reporter SUCCESS si la fermeture ledger échoue (candidat IMP) ;
  - grep-guard CI : tout write `IMPROVEMENT_LEDGER` hors `ledger_writer.py` → fail.

---

### Méta-observations (pour la planif Pierre)
- 6 des 8 IMPs ECG dépendent de la state machine (195) et/ou de l'event log (196) : **195 puis 196
  sont le chemin critique**. Les attaquer en premier débloque tout le reste.
- Tout système qui mute le ledger doit passer par le single-writer IMP-194 → **ratifier 194 tôt**.
- Multi-LLM (council/joust) déjà partiellement construit → 198 est une **extension**, pas un greenfield.
