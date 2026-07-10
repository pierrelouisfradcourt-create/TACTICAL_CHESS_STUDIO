---
name: forge
description: Boucle d'ingénierie Forge — enchaîne les étapes-agents, chacune bornée par son contrat (aucun agent sans contrat validé), oracles non-LLM aux points de preuve, verdict signé → HumanGate. Registry local résout le modèle. NO_CLAIM_ALLOWED.
---

# /forge <projet-ou-objectif>

Enchaîne la chaîne d'ingénierie Forge. **Invariant central : aucun sous-agent n'est lancé sans passer par son contrat validé.** Le contrat est la porte de contrôle ; il borne le rôle, force le runtime (via le registry local), limite les permissions et impose la règle de restitution.

> Règles absolues (CLAUDE.md + ADR-002) : `claim_verdict: NO_CLAIM_ALLOWED` ; séparer `software_verdict`/`evidence_verdict`/`claim_verdict` ; **HumanGate (Pierre) décide** merge/reject ; zones protégées `tests/**` jamais modifiées. Modèles = full Claude (producteurs) + **Qwen = red-team indépendant** ; oracles = déterministes non-LLM.

> **Orchestrateur = Fable (mode superpowers)** (registry rôle `orchestrator`, décision Pierre 2026-07-10). Fable **démarre et pilote** la chaîne : il ne code aucune étape, il spawn les sous-agents via la porte `prepare_dispatch`, aiguille (A2) et décide l'**escalade de modèle**. Fable n'est pas un tier de build.

---

## Entrée

`/forge [--patch|--review] <description du projet ou de l'objectif>`. Si l'objectif est flou (pas de périmètre, pas de « produit fini » imaginable), **arrête-toi et pose 2-3 questions de cadrage** avant de lancer la chaîne (c'est ce que fait l'étape 0, ne la court-circuite pas).

**Profils de chaîne** (`forge.dispatch.PROFILES`) — choisis selon l'usage :
- `full` (défaut) : les 13 étapes, pour un projet greenfield (Prisme → … → WireMap → build → oracles → verdict).
- `patch` : un fix sur un projet **existant** — `s9-build → s10a-oracle-code → s11-redteam-code → s12-verdict`. Les oracles archi/wiremap n'y sont pas applicables : au verdict, émets pour eux des reçus **`SKIPPED`** signés (jamais un faux OK). C'est le mode quotidien.
- `review` : `s6-redteam-plan` seul — critique d'un plan, sans verdict signé.

## Le socle (déjà câblé, à réutiliser — ne pas réimplémenter)

- Contrats : `scripts/forge/contracts/<etape>.yaml` (schéma `SCHEMA.md`, 17 champs).
- Dispatch gouverné : `scripts/forge/dispatch.py` — `prepare_dispatch(etape, run_id)` valide le contrat, fabrique le payload borné, trace l'audit. **Ne spawn pas** : c'est TOI (l'orchestrateur) qui spawnes avec le payload.
- Oracle / gate / verdict : `scripts/forge/{oracle,gate,verdict}.py` (déterministes, HMAC).

## Étape préliminaire — planifier (obligatoire)

```bash
PYTHONPATH=scripts .venv312/Scripts/python.exe -m forge.dispatch --dry-run [--profile patch]
```

Affiche les étapes du profil et leur runtime résolu (13 en `full`, 4 en `patch`). Si une étape lève `ContractIncomplete`/`RoleUnresolved`, **STOP** : un contrat est cassé, corrige-le avant de lancer quoi que ce soit.

## Pré-mortem (avant l'étape 0 — connecteur 6)

Lis les erreurs des runs précédents pour que l'étape 0 en tienne compte (le « PILOU ») :
```python
from forge.studio_link import premortem
rappels = premortem("<projet>")   # dernières erreurs du projet
```
Injecte `rappels` dans le contexte de l'étape 0 (via son `mandatory_read`).

## Boucle d'orchestration

Pour chaque `etape` dans l'ordre `forge.dispatch.ORDER` :

1. **Prépare le dispatch** (la porte) :
   ```python
   # via un court script PYTHONPATH=scripts python :
   from forge.dispatch import prepare_dispatch
   payload = prepare_dispatch(etape, run_id="<projet>-<horodatage>")
   ```
   Si ça lève → le contrat est incomplet → **STOP**, ne lance pas l'agent.

2. **Étape LLM** (`etape` ∉ `forge.dispatch.DETERMINISTIC`) : **aiguille d'abord selon le provider du contrat**, puis exécute. Ne spawne jamais « en dur » sur Claude sans passer par l'aiguilleur — c'est lui qui honore le contrat à l'exécution (A2).
   ```python
   from forge.runtime import route_step, run_qwen_step
   d = route_step(payload)   # décision : qwen | claude | claude-blind | oracle
   ```
   - **`d.runner == "qwen"`** (provider `lmstudio`, LM Studio :1234 UP) : exécute le **reviewer indépendant Qwen** en Python (pas de sous-agent Claude) :
     ```python
     res = run_qwen_step(payload)     # {ok, reviewer, output|reason}
     ```
     Si `res["ok"]` → utilise `res["output"]` comme artefact. Si `res["ok"]` est faux (Qwen a lâché en cours d'appel) → **bascule sur le fallback claude-blind** ci-dessous.
   - **`d.runner == "claude-blind"`** (provider `lmstudio` mais :1234 down) : spawne un sous-agent Claude **en contexte vierge** — prompt adversarial `payload.prompt`, aucun contexte d'auteur du plan, aucune mémoire de run partagée. C'est un fallback assumé, **pas** un reviewer indépendant : `d.reason` dit pourquoi.
   - **`d.runner == "claude"`** (provider `claude-local`) : spawne un sous-agent Claude normal.
   - Dans **tous** les cas de spawn Claude : `prompt` = `payload.prompt` **+ le marqueur `FORGE_DISPATCH:<etape>:<run_id>`** (le hook dur `pretool_forge_guard` bloque tout spawn Forge sans dispatch validé enregistré ; comme tu viens d'appeler `prepare_dispatch`, l'audit contient le dispatch → le spawn passe), et outils = `payload.allowed_tools` uniquement.
   Le producteur (Qwen ou sous-agent) rend l'artefact décrit par le contrat (`output_contract`). Récupère-le.
   **Après le retour** (connecteurs 3+6) : trace le **reviewer réel** (`d.reviewer` ou `res["reviewer"]`, ex. `qwen2.5-14b-instruct` ou `claude-blind (fallback)`), pas le modèle contracté :
   `studio_link.record_telemetry(run_id, etape, reviewer_reel, tokens, duree)`. Ce `reviewer` sera **plié dans le verdict signé** (A3). Si l'agent a échoué/signalé une faille : `studio_link.record_error(run_id, etape, msg, project)`.

   **Escalade de modèle** (builders Claude uniquement — pas Qwen ni oracles) : un sous-agent trop juste pour sa tâche finit son rapport par `ESCALATE_REQUEST: <raison>`. Après le build **et son oracle** (s10a), décide :
   ```python
   from forge.escalate import parse_agent_escalation, escalation_decision
   requested, why = parse_agent_escalation(agent_output)
   d = escalation_decision(payload.model, oracle_ok=code.ok, agent_requested=requested,
                           agent_reason=why, escalations_so_far=n)
   ```
   Si `d.escalate` : **ré-spawne LE MÊME contrat** (marqueur `FORGE_DISPATCH` compris) avec l'outil Agent `model=d.next_model` (haiku→sonnet→opus), incrémente `n`, trace l'escalade (`record_telemetry`). Le verdict signera le **tier réel** qui a produit l'artefact (honnêteté, comme le reviewer). Au sommet (`opus`) avec échec → `d.escalate` est faux et `d.reason` renvoie à HumanGate : **ne boucle pas**, remonte à Pierre. Cap `MAX_ESCALATIONS`.

3. **Étape déterministe** (`etape` ∈ `forge.dispatch.DETERMINISTIC`) : **ne spawne pas d'agent**. Lance l'oracle correspondant :
   - `s10a-oracle-code` → `forge.gate.forge_gate("<projet>")` (commande via `oracles.json`, verdict signé). Garde `code = forge_gate(...)`.
     > **Oracle d'un JEU à UI = click-through Playwright**, pas des tests unitaires. La commande `oracles.json` du jeu lance un e2e qui **clique chaque bouton et parcourt chaque chemin** (déterministe, `returncode` = pass/fail, captures sous `e2e-shots/`). Il mappe 1:1 le Prisme (s1) : *le joueur voit/fait* → clique X, vérifie Y. Harnais de référence : `llm-lego/experiments/belote-claude/web/e2e-lib.mjs` (`startServer` + clics DOM `page.click(...)` + assertions d'état). **Claude-in-Chrome = exploratoire, PAS l'oracle** (LLM, non déterministe).
     > **Oracle d'un JEU = AUSSI la SOLVABILITÉ, pas seulement les mécaniques.** Un jeu aux objectifs inatteignables passe TOUS les tests de mécanique en isolation (« collectCoin marche SI on place le joueur sur la pièce ») tout en étant injouable — prouvé 2× (survival_arena tir/poursuite non testés ; collect_runner pièces hors de portée de saut, 14 tests + e2e verts, injouable au playtest). L'oracle code d'un jeu **inclut obligatoirement** un volet `solvability.mjs` (câblé dans `run-oracle.mjs`) qui : **(1)** mesure l'enveloppe d'action RÉELLE du moteur (ex. hauteur de saut — mesurée, pas hardcodée), **(2)** vérifie que chaque objectif requis y est, **(3)** fait **jouer un bot déterministe qui doit GAGNER**. Modèle à copier : `scripts/forge/templates/solvability.template.mjs` ; réf. vivante : `games/collect_runner/solvability.mjs`. Contractualisé en s9 (`success_criteria`/`tests_oracles`/`output_contract`).
   - `s10b-oracle-archi` → `archi = forge.static_oracles.check_architecture(blueprint, src_root)`.
   - `s10c-oracle-wiremap` → `wire = forge.static_oracles.check_wiremap(wiremap, src_root)`.
   - `s12-verdict` → **agrégation signée** (voir 4).
   Oracle rouge (`ok is False` / `passed is False`) → **STOP**, ne passe pas les étapes suivantes.

4. **Verdict final** (`s12-verdict`) : chaque oracle émet un **reçu signé** (preuve d'exécution, pas narration) ; l'agrégat **vérifie** ces reçus — un `OK` sans reçu valide sur ce `run_id` est **impossible** sans la clé. L'identité réelle du reviewer (A2) et `redteam_ran` (structuré) sont signés — un fallback ne peut pas se faire passer pour Qwen actif :
   ```python
   from forge.verdict import (make_signed_receipt, status_from_passed, sha256_file,
                              build_aggregate_verdict, signed_aggregate_record,
                              current_git_head, new_nonce)
   run_id = "<projet>-<horodatage>"   # LE MÊME que celui des dispatch de ce run
   code_r  = make_signed_receipt("code", run_id, code.verdict.software_verdict,
                                 {"returncode": code.verdict.returncode},
                                 evidence_path=str(code.verdict.evidence_path))  # RE-LU à la vérif
   # ⚠ un reçu code SANS evidence_path => provenance rompue => BLOCKED (exécution non prouvable).
   archi_r = make_signed_receipt("archi",   run_id, status_from_passed(archi["passed"]), archi)
   wire_r  = make_signed_receipt("wiremap", run_id, status_from_passed(wire["passed"]),  wire)
   agg = build_aggregate_verdict(
       project, run_id, code_r, archi_r, wire_r, reviewer_reel,
       redteam_ran=(d.runner == "qwen" and res["ok"]),   # le reviewer INDÉPENDANT a-t-il tourné ?
       redteam_findings=findings, redteam_blocked=redteam_a_bloque,
       git_head=current_git_head(), nonce=new_nonce(),   # anti-rejeu : lie le verdict au run/code
   )
   record = signed_aggregate_record(agg)        # {..., "decision", "provenance_ok", "hmac"} -> verdict.json
   ```
   `software_verdict` vient **UNIQUEMENT** des reçus d'oracle vérifiés ; provenance rompue (reçu absent/altéré/`run_id` discordant) → `software_verdict=BLOCKED`. Le red-team est **advisory** (lève des `humangate_flags`, ne juge jamais le code). `claim_verdict` = `NO_CLAIM_ALLOWED` **toujours**. `decision` ∈ {`HUMANGATE_READY`, `BLOCKED`} n'est **pas** une décision de merge (c'est Pierre).

## Fin de chaîne — restitution studio + HumanGate

Avant de présenter à Pierre, dépose les propositions **propose-only** (connecteurs 4+5, aucune écriture durable) et l'agrégat de coût (connecteur 3) :
```python
from forge.studio_link import run_cost, propose_ledger_entry, propose_project_record
cout = run_cost(run_id)                                   # {calls, total_tokens, total_duration_s}
propose_ledger_entry(run_id, project, verdict)            # lane AUDIT_REQUIRED, PROPOSED
propose_project_record(project, stage, folder)            # PROPOSED
```
**Avant de présenter à Pierre, VÉRIFIE mécaniquement le verdict** — ne dis jamais « HMAC OK » sans avoir lancé la commande :
```bash
PYTHONPATH=scripts .venv312/Scripts/python.exe -m forge.verify_run lab/forge_runs/<projet>/verdict.json
```
Exit 0 = authentique (HMAC re-signé + évidence re-lue + git_head comparé) ; exit 2 = falsifié/altéré → **STOP**, remonte à Pierre le rejet. Puis le verdict signé est présenté à **Pierre**. **Tu ne décides jamais** merge/reject/freeze, et tu ne promeus jamais une proposition en mémoire de référence (ledger, projets) sans son go. Si une étape n'a pas d'oracle pour appuyer une affirmation → remonte un besoin HumanGate (fog), pas un claim (RÈGLE DE RESTITUTION).

## Rapport obligatoire

```
software_verdict: OK|FAIL|BLOCKED
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

---

## Limites v0 (à dire honnêtement, ne pas surjouer)

- **Étapes contractualisées = 13** (s0/s1/s2/s3/s4/s5/s6/s9/s10a/b/c/s11/s12) : chaîne séquentielle complète, chaque étape a une vraie entrée (Prisme→Décompo, World Scan advisory, WireMap isomorphe au blueprint).
- **Connecteurs studio branchés** (ADR-002) : télémétrie (3), Kaizen-propose (4), mémoire projet (5), pré-mortem (6) via `forge.studio_link`, tous **propose-only**. **Reste différé** : le durcissement « hook dur » du dispatch (connecteur 2) — décision infra Pierre (modifie les settings globaux). Aujourd'hui l'enforcement passage-par-contrat = **disciplinaire (ce skill) + la porte Python** `dispatch.prepare_dispatch`.
- Forge **propose**, n'écrit jamais seul dans les mémoires de référence (ledger, projets) : toute écriture durable = HumanGate.
