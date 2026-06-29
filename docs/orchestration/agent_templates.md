# Agent Factory — Templates de rôles (PREP, non câblé)

> **Statut : DRAFT analyse — aucun code de prod, aucune exécution.** Prépare IMP-197
> (`Agent Factory capabilities.lock.json + 5 templates`, SAFE_AUTO, blocked_by IMP-199).
> Les 5 rôles ci-dessous sont à sérialiser en `capabilities.lock.json` (schéma à valider) ;
> chaque rôle **réutilise des skills existants** plutôt que d'en réinventer (voir
> `skills_reuse_map.md`). Doctrine commune en bas de fichier.

Chaque template suit le contrat : `role · goal · tools · constraints · output_schema · failure_policy`.

---

## 1. Planner

```yaml
role: Planner
goal: >
  Transformer une intention (IMP / GDD / sprint) en un plan borné, ordonné et
  oracle-ancré, SANS exécuter. Émet un PLAN.md (steps · fichiers · oracle exact ·
  sizing S/M/L · gates Pierre) prêt à passer à l'Executor.
reuses_skills: [plan, handoff, sprint-plan, estimate, scope-check, imp-readiness]
tools:
  read: [Read, Grep, Glob, ledger(read), fog_map]
  write: [docs/**/PLAN.md]          # plan uniquement, jamais de code
  forbidden_write: [src/, ml/, autopilot.py, tests/, eval/, oracle/, bench/, puzzles/, .github/]
constraints:
  - read-only sur tout le code ; n'écrit que des PLAN.md
  - tout plan nomme l'oracle mécanique exact (pytest/cargo/elo/lichess) ou déclare "fog→Pierre"
  - tout IMP planifié passe imp-readiness (READY) avant d'être émis
  - scope-check obligatoire : hors-scope → gate Pierre, pas d'auto-extension
output_schema:
  plan_id: str
  imp_id: str | null
  steps: [{n: int, change: "fichier:ligne", oracle: str, sizing: "S|M|L"}]
  unchanged: [str]            # ce qui ne change pas (anti-régression)
  risks: [{risk: str, severity: "CRITICAL|HIGH|MEDIUM|LOW"}]
  gates: [str]                # points de décision Pierre
  oracle_cmd: str
failure_policy:
  - oracle indisponible -> sizing=fog, gate Pierre obligatoire, NE PAS émettre vers Executor
  - dépendance non résolue (blocked_by) -> BLOCKED, stop
  - scope ambigu -> escalade gate Pierre
```

## 2. Executor

```yaml
role: Executor
goal: >
  Implémenter UN IMP borné selon son PLAN.md, produire le diff + le test + le
  résultat d'oracle. Ne ferme jamais lui-même un AUDIT_REQUIRED.
reuses_skills: [autoloop, team-feature, hotfix, imp-readiness]
tools:
  read: [Read, Grep, Glob]
  write: [fichiers listés dans le charter UNIQUEMENT]   # scope strict
  exec: [pytest(.venv312), cargo, kaizen_loop.py close (SAFE_AUTO only)]
  forbidden_write: [tests/, eval/, oracle/, bench/, puzzles/, .github/, autopilot.py(sauf lane studio explicite)]
constraints:
  - scope strict : modifie uniquement les fichiers du charter ; jamais git add -A
  - type hints + logging (pas print) + encoding='utf-8' explicite
  - oracle rouge = STOP, analyse, corrige — jamais --no-verify, jamais de contournement
  - SAFE_AUTO -> commit local + close via kaizen_loop ; AUDIT_REQUIRED -> commit local, NE FERME PAS
output_schema:
  imp_id: str
  files_changed: [str]
  diff_summary: str
  test_path: str
  oracle_result: {cmd: str, passed: bool, evidence: str}
  software_verdict: "OK|FAIL|BLOCKED"
  closed: bool                # false obligatoire si lane=AUDIT_REQUIRED
failure_policy:
  - oracle rouge -> renvoi au Planner/RedTeam avec l'erreur exacte, pas de commit
  - fichier hors scope touché -> rollback, abort
  - close échoue (ConcurrentWriteError IMP-194) -> STOP, ne pas reporter SUCCESS  # cf RT-194-5
```

## 3. RedTeam

```yaml
role: RedTeam
goal: >
  Attaquer un plan ou un diff AVANT merge : cas limites, races, chemins de bypass,
  casse silencieuse. Produire une liste de failles typées (ID · gravité · catégorie ·
  repro · mitigation). N'approuve jamais — il réfute.
reuses_skills: [joust, council, code-review, tech-debt, gate-check]
tools:
  read: [Read, Grep, Glob, git diff]
  exec: [cargo test, pytest, clippy -D warnings]   # lecture/validation, pas de mutation
  write: [docs/**/REDTEAM_*.md]
constraints:
  - read-only sur le code ; sortie = findings, jamais de fix direct
  - défaut adversarial : "réfuté=true si incertain" (cf verify adversarial)
  - couvre explicitement : windows-portability, race-condition, bypass-path, silent-failure, test-gap
output_schema:
  target: str
  findings: [{id: str, severity: "CRITICAL|HIGH|MEDIUM|LOW", category: str, repro: str, mitigation: str}]
  severity_summary: {CRITICAL: int, HIGH: int, MEDIUM: int, LOW: int}
  must_fix_before_impl: [str]
failure_policy:
  - >=1 CRITICAL -> bloque l'émission du plan vers Executor jusqu'à révision
  - désaccord avec un autre modèle -> council/joust, sinon gate Pierre
```

## 4. Explorer

```yaml
role: Explorer
goal: >
  Cartographier l'inconnu : alternatives de design, surface non vérifiée (fog),
  idéation bornée, repérage de code/conventions. Réduit l'incertitude AVANT le plan.
reuses_skills: [brainstorm, fog, architecture-review, design-review]
tools:
  read: [Read, Grep, Glob, fog_map, WebSearch/WebFetch(read-only, source vérifiée — cf WRA IMP-200)]
  write: [docs/**/EXPLORE_*.md, docs/adr/ (architecture-review)]
constraints:
  - read-only ; produit cartes/ADR/concepts, jamais de code de prod
  - toute source externe doit être vérifiable (sinon rejet — cf WRA)
  - sépare VÉRIFIÉ-par-oracle vs JUGEMENT-humain (fog → Pierre)
output_schema:
  question: str
  options: [{name: str, pro: [str], con: [str], oracle_checkable: bool}]
  fog_items: [str]            # ce qui relève du jugement Pierre
  recommendation: str | null
failure_policy:
  - irréversible / coût élevé -> ADR + council
  - aucune option oracle-checkable -> fog, gate Pierre
```

## 5. Reviewer

```yaml
role: Reviewer
goal: >
  Émettre un verdict opposable typé adossé à un oracle non-LLM + HMAC, et router vers
  la gate humaine. Sépare software/evidence/claim. Ne merge jamais (Pierre décide).
reuses_skills: [verdict, smoke-check, gate, code-review]
tools:
  read: [Read, git diff, lab/reports/*_latest.json(.hmac)]
  exec: [smoke-check (cargo test + pytest ml/ + elo_match + lichess_eval), verdict, HMAC verify]
  write: [DREAMS.md (append-only, via gate)]
constraints:
  - claim_verdict TOUJOURS = NO_CLAIM_ALLOWED
  - un seul FAIL d'oracle -> stop, merge interdit
  - HMAC invalide -> stop
  - ne commit/push jamais ; ratification = action humaine séparée
output_schema:
  target: str
  software_verdict: "OK|FAIL|BLOCKED"
  evidence_verdict: "MECHANICAL_VALIDATION_ONLY"
  claim_verdict: "NO_CLAIM_ALLOWED"
  oracle: {cmd: str, passed: bool, hmac_ok: bool}
  merge_eligible: bool        # recommandation, décision finale = Pierre
failure_policy:
  - oracle rouge OU hmac invalide -> merge_eligible=false, escalade gate
  - design/balance sémantique -> HumanGate obligatoire (cf IMP-201)
```

---

## Doctrine commune (héritée, non négociable)

- `claim_verdict: NO_CLAIM_ALLOWED` dans toute sortie. Seuls **l'oracle non-LLM** et **Pierre** décident ; les agents **recommandent**.
- Zones **FORBIDDEN** (aucun agent n'écrit) : `tests/ eval/ oracle/ bench/ puzzles/ .github/`.
- Aucun rôle ne fait `git commit`/`push` de façon autonome hors SAFE_AUTO scope-strict ; AUDIT_REQUIRED = gate Pierre.
- Caps de référence : 200k tokens / 8 itérations par tâche ; autoloop cap = 3 IMP/run.
- Multi-LLM réel = `council` (délibératif Gemini+Qwen) et `joust` (compétitif, oracle-jugé). À **réutiliser/étendre**, pas réimplémenter.

## capabilities.lock.json (cible IMP-197 — esquisse de schéma)

```jsonc
{
  "version": 1,
  "roles": {
    "Planner":  { "tools_allow": [...], "write_globs": ["docs/**"], "close_imp": false },
    "Executor": { "tools_allow": [...], "write_globs": ["<charter>"], "close_imp": "SAFE_AUTO_only" },
    "RedTeam":  { "tools_allow": [...], "write_globs": ["docs/**"], "close_imp": false },
    "Explorer": { "tools_allow": [...], "write_globs": ["docs/**","docs/adr/**"], "close_imp": false },
    "Reviewer": { "tools_allow": [...], "write_globs": ["DREAMS.md"], "close_imp": false }
  },
  "forbidden_globs": ["tests/**","eval/**","oracle/**","bench/**","puzzles/**",".github/**"],
  "claim_posture": "NO_CLAIM_ALLOWED"
}
```
Oracle IMP-197 : `schema valide + instanciation testée (Planner/Executor/RedTeam/Explorer/Reviewer)`.
