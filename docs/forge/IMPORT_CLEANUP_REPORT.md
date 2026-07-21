# IMPORT / CLEANUP REPORT — références cassées, orphelins, systèmes non branchés

- **Date** : 2026-07-19 · **Statut** : AUDIT (photo à cette date) · `claim_verdict: NO_CLAIM_ALLOWED`
- **Méthode** : (1) exécution de `node scripts/forge/studio_selfaudit.mjs` (déterministe, read-only, conçu pour ça) ; (2) compilation des références cassées déjà confirmées cette session (audit YAML + audit décision layer) ; (3) balayage ciblé complémentaire déclenché par la classification documentaire (Livrable 2).

---

## 1. `studio_selfaudit.mjs` — résultat frais

```
Derive doc<->realite : 0 finding(s)
Connecteurs : 1 note — lab/reports/forge_bible_proposals.jsonl : jamais utilisé (informatif)
VERDICT : STUDIO ALIGNE ✅  (exit 0)
```

**Lecture** : ce script ne surveille que les affirmations déclarées dans `studio_expectations.json` (les 3 cartes compagnon `docs/forge/STUDIO_ARCHITECTURE.md` / `STUDIO_AGENT_ATLAS.md` / `STUDIO_MASTER_SCHEMA.html`). Son périmètre est étroit et volontaire — il ne couvre ni `00_STUDIO_CONTROL/`, ni `docs/control-plane/`, ni les fichiers non commités trouvés cette session. "Aligné" ne veut donc dire que "aligné sur ce qu'il surveille", pas "aucun problème dans le repo".

---

## 2. Imports / inventaires TERMINÉS (confirmés fonctionnels)

| Système | Preuve | Session |
|---|---|---|
| Contrat → dispatch → hook-guard (Forge) | chargement réel 16/16 contrats OK, marqueurs `FORGE_DISPATCH` signés HMAC dans `lab/forge_runs/shmup_slice/artifacts/` | précédente + confirmée ce tour (lecture code) |
| `knowledge_base/roles/*.yaml` → `role_sim.mjs` → `catalog.json` → `search.mjs` | logs de validation datés, tests réels | précédente |
| `FILE_ROUTING_MANIFEST.yaml` → `doc_hygiene_chain.py`/`studio_context_builder.py` | tests réels (`test_doc_hygiene.py`) | précédente |
| `openclaw/{capabilities,providers}.yaml` → `control_plane/registry.py` → `autopilot.py` + `scripts/forge/contract.py` | import direct confirmé | précédente + ce tour |
| Panel Prisme (WFL-02 promu) | `scripts/forge/panel.py` implémente exactement le design de `PRISM_SCOPING.md` | ce tour |
| Escalade de modèle (haiku→sonnet→opus) | `scripts/forge/escalate.py`, borné `MAX_ESCALATIONS=2` | ce tour |

## 3. Imports / inventaires BLOQUÉS — références cassées

| Référence cassée | Où | Raison | Depuis quand |
|---|---|---|---|
| `LAB_POLICY_BOOTSTRAP.md` (racine) | `.github/workflows/canonical-ci.yml`, job `trust-root-presence-check` | fichier absent de la racine, existe seulement archivé sous `repos/games/studioV2_MIGRATED_HOLD/` | confirmé session précédente, revérifié présent ce tour |
| `00_STUDIO_CONTROL/03_REGISTRIES/` et `05_STATUS/` | `scripts/studioV2/studioctl.py:102-106,126,1182-1193` | dossiers inexistants depuis la réorg du 2026-05-25 ; le vrai chemin est `01_SYSTEM/registries/` et `99_ARCHIVE/records/` | confirmé session précédente, revérifié ce tour |
| `lab/model_registry.yaml` | `scripts/learning_loop.sh:8,9,84` (commentaires) | le script prétend piloter compare/deploy ELO depuis ce fichier ; le code réel ne le lit/écrit que dans une ligne de log dry-run | confirmé session précédente |
| `lab/chains/phi_schema.yaml` | `lab/chains/studio_end.py:32` | chemin déclaré (`SCHEMA_PATH`), jamais ouvert/parsé | confirmé session précédente |
| `infrastructure/ports.yaml` | `studio/openclaw-workspace/skills/monitor.md:20` | le skill pointe vers une copie **untracked et périmée** (manque `cockpit_server:8770`) au lieu du `ports.yaml` racine, canonique et tracké | confirmé session précédente |

## 4. Fichiers orphelins (code ou doc sans consommateur, trouvés ce tour)

| Fichier | Constat |
|---|---|
| `scripts/forge/contracts/redteam-artdirector.yaml` | contrat valide mécaniquement mais **jamais chargé** par `dispatch.py`/`ORDER`/`PROFILES` — 0 référence dans `scripts/forge/*.py`. Seul contrat des 17 dans ce cas sans auto-disclaimer. |
| `governance/agent_factory.py` + `governance/capabilities.lock.json` | **trouvé ce tour, absent de tout audit précédent.** Système "Agent Factory" (IMP-197, CLOSED 2026-06-29) réellement construit et testé (`scripts/phase2_tests/test_imp197_factory.py`) — mais **zéro appelant** trouvé dans le repo aujourd'hui, et **CLAUDE.md ne mentionne jamais `governance/`**, ni comme lane vivante ni comme lane gelée. C'est un TROISIÈME système de résolution de "capability" (après `openclaw/capabilities.yaml`+`roles.yaml` côté Forge, et `lab/agent_policy/*.json` legacy côté STUDIO gelé) — construit, validé une fois, puis abandonné en place sans être raccroché nulle part. Complète directement la dimension `capability` de `STUDIO_RUNTIME_MODEL.yaml` (classée DISPERSED) : la dispersion est pire que ce qui avait été cartographié — 3 systèmes, pas 2. |
| `docs/forge/forge-live.html` | dashboard "FORGE LIVE — le fil du run" (coloré par tier Fable/Opus/Haiku/Qwen/non-LLM), **non commité**, wiring JS non vérifié cette session — à tester avant de le classer CANONICAL_RUNTIME ou de le jeter. |

## 5. Index potentiellement incomplets

| Index | Constat |
|---|---|
| `studio_brain/workflow/skills-catalog.md` | daté 2026-07-03 — le repo compte aujourd'hui (07-19) une trentaine de skills actifs (`.claude/skills/`) dont plusieurs créés ou modifiés après cette date (ex. `forge`, `world-scan`, `council`, `audit-daily`) ; catalogue probablement en retard. Non revérifié champ par champ. |
| `docs/forge/MASTER_INDEX.generated.md` | auto-généré 07-15 — devrait déjà couvrir `AUDIT_DECISION_LAYER.md`/`DOCUMENT_CLASSIFICATION.md`/`IMPORT_CLEANUP_REPORT.md` (créés ce tour) puisqu'il est généré, pas édité à la main ; **à régénérer**, ne pas éditer manuellement (hors périmètre de cette session — pas de branchement runtime sans décision explicite). |

## 6. Systèmes décrits mais non branchés

| Système | Description | Statut réel |
|---|---|---|
| Agent Factory (`governance/agent_factory.py`) | résoudre des rôles d'agent vers des templates (`capabilities.lock.json` + 5 templates) | **construit, testé, jamais raccroché** (cf. §4) — coexiste sans lien avec le registry Forge (`openclaw/capabilities.yaml`) qui fait un travail voisin |
| Orchestration multi-LLM gouvernée (Phases 1-5) | `docs/orchestration/PHASES_1-5_PLAN.md`, `agent_templates.md`, `skills_reuse_map.md` — tous auto-déclarés "PREP, non câblé, zéro code de prod" | confirmé jamais construit au-delà de la Phase 0 (IMP-192/193/194, docs/phase0/, hors périmètre de cet audit) ; Agent Factory (ci-dessus) semble être un fragment de cette vision qui A été construit isolément, sans le reste du plan |
| `docs/architecture/STUDIO_OS_ARCHITECTURE_v0.1.md` | vision "Studio OS" v0.1, `authority: HumanGate (ratification pending)` | jamais ratifiée à notre connaissance ; aucune trace de mise en œuvre |
| Control-plane StudioV2 (`docs/control-plane/` + `scripts/studioV2/control_plane/`) | dry-run/smoke harness pour un pipeline de review PR automatisé (StudioPilot) | code présent, testé en dry-run, mais **gelé par décision Pierre** (2026-07-19) — pas un cas de "jamais branché", un cas de "branché puis mis en pause" |

## 7. Pattern répété — travail réel non commité

Retrouvé dans 3 clusters indépendants cette session-ci et la précédente, jamais signalé comme thème avant :

- `lab/forge_runs/{breakout,collect_runner,auto_battler_i2_5}/` — jeux **réellement produits** (`games/breakout/`, `games/collect_runner/` existent), preuves d'exécution non commitées (session précédente)
- `docs/forge/` — **15 des 41 fichiers** non commités (P1.2A, S13, KB ingestion, arbitrage runtime, protocole workflow lab) (ce tour, §3 du Livrable 2)
- `studio_brain/` — 4 fichiers non commités dont `decisions/DOSSIER_ARBITRAGE_FLAGSHIP_2026-07-19.md` (ce tour, §4 du Livrable 2)

**Lecture** : ce n'est pas 3 incidents isolés, c'est une habitude de travail (produire, puis ne pas committer) suffisamment répétée pour être structurelle. Aucune action proposée ici — juste le constat, pour que Pierre décide s'il veut un geste de commit de rattrapage ou si c'est un mode de travail assumé (brouillon local avant décision).

## 8. Divergence "documenté vs code-enforced"

`docs/adr/ADR-002-forge-studio-integration.md` s'auto-déclare encore `Status: DOCUMENTED_ONLY … Runtime authority: NONE … HumanGate: REQUIRED`, alors que le code réel (`contract.py`, `dispatch.py`, `runtime.py` — tous relus cette session) cite "ADR-002 gate 1/2/4" comme doctrine **ratifiée et opérante** dans les commentaires. Le champ de statut du document lui-même n'a jamais été mis à jour pour refléter que sa doctrine est appliquée en production Forge depuis probablement le 10 juillet. C'est la divergence documenté↔réalité la plus nette trouvée cette session — `studio_selfaudit.mjs` ne la voit pas parce qu'elle est hors de son périmètre surveillé (3 cartes seulement).

---

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
Pas de verdict global. État des surfaces uniquement, à cette date.
