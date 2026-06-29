# Skills existants → rôles Council / Factory (PREP, analyse seule)

> Quels skills `.claude/skills/` réutiliser pour les rôles d'orchestration, et lesquels
> NE PAS reconstruire. Source : audit read-only des SKILL.md. Non câblé.

## Catalogue compact (oracle? / multi-LLM? / mute l'état?)

| skill | rôle | oracle non-LLM | multi-LLM | mutation |
|---|---|---|---|---|
| council | délibératif Gemini+Qwen sur AUDIT | non (opinion) | **oui** (Gemini + Qwen14B :1234) | ledger sur go Pierre |
| joust | 2 modèles, oracle tranche | **oui** (cargo/pytest/elo/lichess) | **oui** (worktrees isolés) | worktrees + merge gaté |
| autoloop | exécuteur Kaizen autonome | **oui** (studio_meta global_verdict) | oui (subprocess Claude Code) | ferme IMP via kaizen_loop, DREAMS |
| plan | plan avant action | non | non | non (read-only) |
| handoff | GDD→build-order | flag oracle/chunk | assigne agents | non |
| sprint-plan | ledger→sprint DAG | non | non | non |
| estimate | sizing S/M/L | non | non | non |
| scope-check | anti-creep | non | non | non |
| brainstorm | idéation 3-5 | réf. oracle/idée | non | non |
| code-review | revue avant merge | **oui** (cargo/pytest) | non | non |
| design-review | revue design | non | non | non |
| architecture-review | ADR | non | délègue council si irréversible | écrit ADR |
| tech-debt | audit dette | **oui** (clippy -D) | non | non |
| smoke-check | gate oracle 4-en-1 | **oui** (canonique) | non | écrit reports signés |
| verdict | verdict typé + HMAC | **oui** (primitive) | non | lit/vérifie reports |
| gate | HumanGate ratification | consomme verdict | non | append DREAMS.md |
| imp-readiness | READY/NEEDS_WORK/BLOCKED | checks mécaniques | non | non |
| fog | VÉRIFIÉ vs JUGEMENT | lit verdicts | non | read-only |
| gate-check | checklist gates de phase | non | non | non |

## Mapping rôle → skills

| Rôle Factory | Primaires | Secondaires |
|---|---|---|
| **Planner** | plan, handoff, sprint-plan | estimate, scope-check, imp-readiness |
| **Executor** | autoloop | team-feature(stub), hotfix, imp-readiness |
| **RedTeam** | joust, council | code-review, tech-debt, gate-check |
| **Explorer** | brainstorm, fog | architecture-review, design-review |
| **Reviewer** | verdict, smoke-check, gate | code-review |
| **Council** (multi-LLM) | council | joust |

## NE PAS reconstruire (déjà câblé)

- **council** — EST déjà le Council multi-LLM (Gemini + Qwen 2.5-Coder-14B parallèles, table de
  synthèse, escalade Pierre). Objectif = **étendre** (plus de modèles, matrice de vote
  formalisée), pas greenfield. Gap : 2 modèles fixes, pas de pondération, opinion (pas d'oracle).
- **joust** — harness de compétition multi-modèle complet (worktrees isolés, oracle arbitre,
  verdicts HMAC, merge gaté, cleanup). Réutiliser pour tout "2 modèles, le meilleur gagne".
- **autoloop** — boucle Executor autonome complète (sélection déterministe, exec par IMP, gate
  oracle in+out, DREAMS, caps, fail-closed). L'Executor Factory **wrappe** ça.
- **verdict + smoke-check + gate** — colonne vertébrale oracle→ratification déjà doctrinale
  (NO_CLAIM_ALLOWED, HMAC, FORBIDDEN, souveraineté Pierre). Le Reviewer appelle, ne substitue jamais.
- **team-feature** — SEUL skill "factory" non réellement construit (stub 3 lignes). Candidat à
  étoffer/remplacer ; les autres sont câblés.

## Faits transverses à encoder dans la Factory

- Seuls **oracle non-LLM + Pierre** décident ; agents = recommandation.
- FORBIDDEN (jamais d'écriture agent) : `tests/ eval/ oracle/ bench/ puzzles/ .github/`.
- Aucun skill ne fait `git commit`/`push` ; merge = action humaine après `/gate`.
- Multi-LLM concentré dans `council` (délibératif) et `joust` (compétitif). `autoloop`/`team-feature`
  lancent des subprocess Claude Code, pas des LLM externes.
- DREAMS.md (journal institutionnel append-only) : `studio/openclaw-workspace/DREAMS.md`.
