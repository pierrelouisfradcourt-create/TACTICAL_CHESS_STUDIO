# ADR-002 — Intégration de /forge dans le studio (contrat = interface)

Status: DOCUMENTED_ONLY
Created at: 2026-07-09
Source: session de conception /forge (Pierre + Claude Code) ; cartographie repo par 4 explorateurs.
S'aligne sur `00_STUDIO_CONTROL/01_SYSTEM/maps/STUDIO_ARCHITECTURE_TRUTH_MAP_V0.md`.
Runtime authority: NONE · Agent activation: BLOCKED · Claim posture: NO_CLAIM_ALLOWED · HumanGate: REQUIRED

---

## 1. Quoi

Le module `/forge` a désormais une **porte de contrat** (`scripts/forge/contract.py`, schéma
`contracts/SCHEMA.md`) : aucun agent ne se lance sans contrat complet, et le contrat borne le
dispatch. Mais `/forge` est encore une **île**. Ce ADR fige comment il se branche sur les
systèmes déjà vivants du studio.

**Thèse : le contrat EST l'interface.** Chaque champ / phase du contrat se relie à un sous-système
existant. Câbler `/forge` = définir ces 6 connecteurs, pas réinventer de la plomberie.

## 2. Pourquoi (le trou)

Sans ces branchements, les champs du contrat sont décoratifs : `modele` hardcodé « au feeling »,
aucun compteur de tokens, un run qui n'apprend rien au studio, un projet forgé invisible dans la
mémoire, des erreurs jamais capitalisées. Exactement le drift qu'on veut tuer.

## 3. Les 6 connecteurs (contrat ↔ studio)

| # | Champ / phase du contrat | Se branche sur (existe déjà) | Point d'ancrage |
|---|---|---|---|
| 1 | `modele` | **Directeurs** — registre capacités | `control_plane/registry.py:get_model_for_role(role)` ← `openclaw/capabilities.yaml` |
| 2 | dispatch de l'agent | **Porte contrat + hook signé** (⚠ MAJ 2026-07-10 : NON câblé sur `dispatch_bridge.py` — mécanisme réel ci-dessous) | `scripts/forge/dispatch.py:prepare_dispatch` (valide le contrat + **audit signé HMAC**) · `scripts/forge/hook_guard.py` + `.claude/hooks/pretool_forge_guard.py` (vérifie la signature de l'audit) |
| 3 | chaque appel LLM (transverse) | **Télémétrie / costguard** | `llm-lego/telemetry.mjs` → `telemetry/llm_calls.jsonl` · `scripts/studioV2/control_plane/ci_costguard_report.py` |
| 4 | `final_report` (verdict) | **Boucle Kaizen** | `lab/chains/kaizen_loop.py` (find/load/save_ledger, lane AUDIT_REQUIRED) · `IMPROVEMENT_LEDGER.yaml` · journal `DREAMS.md` |
| 5 | `memoire` / le projet forgé | **Mémoire projets** | `studio_state/projects.json` (+ `/api/projects` autopilot) · suivi auto-lego (goal/roadmap/artefact) · `studio_brain/` |
| 6 | `mandatory_read` / red-team | **Mémoire erreurs (pré-mortem)** | `lab/chains/` `journal_error()` → `lab/reports/error_journal*.jsonl` + `error_proposals.jsonl` (récurrent → AUDIT_REQUIRED) |

### Détail des liaisons clés

**1 — Directeurs.** Un contrat ne doit pas écrire « Claude Opus » en dur. Il déclare un **rôle
technique** ; le studio résout le modèle via `get_model_for_role(role)`. Rôles déjà enregistrés
dans `capabilities.yaml` : `director, charter_generation, kaizen_autoloop, coordinator,
producer_routine, ceo_brain, strategic_analysis, ceo_brief, lora_base, code_generation`.

**4 — Kaizen.** Le `final_report` d'un run ne s'auto-publie pas. Il **propose** une entrée
ledger en lane `AUDIT_REQUIRED` (jamais d'add auto — doctrine « HumanGate décide »). Le ledger
reste écrit via `kaizen_loop.py`, `save_ledger` protégé par fingerprint.

**6 — Pré-mortem.** Boucle fermée : les erreurs / findings red-team d'un run alimentent
`error_journal` ; au run suivant, l'étape 0 (Contrat) les lit via `mandatory_read` pour un
**pré-mortem** (c'est le « PILOU » du spec). Le studio apprend d'un forge à l'autre.

## 4. Impact modules & risque de régression

- **Zéro modification** des systèmes existants dans ce ADR (c'est un plan d'intégration, DOCUMENTED_ONLY).
- Le seul changement de schéma proposé : `modele` (chaîne libre) → **`role_technique`** (clé résolue
  par le registre) + `modele` devient dérivé/optionnel. Touche `contracts/*.yaml` + `contract.py`
  (`build_dispatch_payload` appellerait `get_model_for_role`). Risque : faible, testable, incrémental.
- Aucune zone protégée (`tests/**`) touchée. `scripts/forge/` reste le seul module en écriture.

## 5. Décisions Pierre — RATIFIÉES 2026-07-09

1. **Modèles → full Claude (phase test).** Le contrat **ne fixe pas de modèle en dur** : il déclare
   `capability_role` + `exigences_cognitives`, le **registry local** résout le runtime. Implémenté
   via `scripts/forge/contracts/roles.yaml` (Forge-scopé, ne touche PAS `capabilities.yaml` SSOT).
2. **Dispatch gouverné.** Le spawn ne part jamais directement de l'agent exécutant : contrat validé
   par `prepare_dispatch` (qui écrit une **ligne d'audit signée HMAC**), puis le hook
   `pretool_forge_guard` **vérifie la signature** avant d'autoriser le spawn. Claude = moteur
   d'orchestration ; le contrat = porte. (⚠ MAJ 2026-07-10 : `dispatch_bridge.py` n'est PAS dans
   cette boucle — il sert l'autoloop IMP, lane distincte. Limite honnête : la porte reste
   fail-open HORS périmètre Forge et l'isolation signataire/producteur exige une séparation OS.)
3. **HumanGate.** Forge **propose** (AUDIT_REQUIRED) ; n'écrit jamais seul ledger/projects.json/mémoires.
   Toute écriture durable passe par validation humaine.
4. **Validation indépendante (phase test).** Claude = agent producteur · **Qwen = red-team / reviewer
   indépendant** (critique les décisions, ne remplace pas les oracles) · oracles techniques = preuves
   externes. Câblé dans `roles.yaml` (`redteam_reviewer` → Qwen).

## 6. Alternatives écartées

- *Forge autonome, îlot sans branchement* : rejeté — reproduit le drift, n'apprend rien au studio.
- *Fusionner Forge dans autopilot.py* : rejeté — viole la séparation de lane (CLAUDE.md) et gonfle
  un fichier de 9000 lignes.

## 7. Verdict

- **[PROCÉDER]** — les 4 gates §5 sont ratifiés (2026-07-09).
- **Fait** : connecteur 1 (rôle→runtime via registry local, `resolve_runtime`) ; chaîne complète des
  10 contrats ; **dispatch gouverné léger** (`scripts/forge/dispatch.py` : `prepare_dispatch`/`plan_chain`,
  audit `lab/forge_evidence/dispatch_audit.jsonl`, aucun spawn) ; **skill `/forge`** (`.claude/skills/forge/skill.md`).
  Prouvé : `pytest scripts/forge/tests/` = 60 passed + dry-run `-m forge.dispatch --dry-run` planifie les 10 étapes.
- **Connecteurs 3/4/5/6 câblés** (`scripts/forge/studio_link.py`, propose-only, prouvé 65 passed) :
  télémétrie (`record_telemetry`/`run_cost`), Kaizen-propose (`propose_ledger_entry` lane AUDIT_REQUIRED),
  mémoire projet (`propose_project_record`), pré-mortem (`record_error`/`premortem`). Le skill `/forge` les
  appelle aux points de cycle.
- **Connecteur 2 (hook + audit signé)** : `pretool_forge_guard` (PreToolUse/Task, `.claude/settings.json`)
  bloque tout spawn Forge (`FORGE_DISPATCH:<etape>:<run_id>`) dont la ligne d'audit **n'a pas de HMAC valide**
  (MAJ 2026-07-10 : ligne forgée à la main = rejetée). Portée honnête : contrôle la **présence d'un dispatch
  signé**, PAS la conformité modèle/outils/prompt ; **fail-CLOSED sur le périmètre Forge**, fail-open hors-forge.
- **Oracles s10b/s10c** : `forge.static_oracles.check_architecture`/`check_wiremap` (AST Python + regex multi-langage,
  .mjs/méthodes de classe/import dynamique couverts depuis 2026-07-10). Non-LLM.
- **Verdict** : provenance vérifiée par reçus signés + évidence RE-LUE (`forge.verify_run`, appelé par `/gate`).
- **Reste** : isolation OS signataire/producteur ; oracle wiremap AST complet (tree-sitter) ; property/mutation testing.
```
software_verdict: OK (document produit, aligné sur la truth map)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
