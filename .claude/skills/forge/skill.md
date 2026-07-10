---
name: forge
description: Boucle d'ingénierie Forge — enchaîne les étapes-agents, chacune bornée par son contrat (aucun agent sans contrat validé), oracles non-LLM aux points de preuve, verdict signé → HumanGate. Registry local résout le modèle. NO_CLAIM_ALLOWED.
---

# /forge <projet-ou-objectif>

Enchaîne la chaîne d'ingénierie Forge. **Invariant central : aucun sous-agent n'est lancé sans passer par son contrat validé.** Le contrat est la porte de contrôle ; il borne le rôle, force le runtime (via le registry local), limite les permissions et impose la règle de restitution.

> Règles absolues (CLAUDE.md + ADR-002) : `claim_verdict: NO_CLAIM_ALLOWED` ; séparer `software_verdict`/`evidence_verdict`/`claim_verdict` ; **HumanGate (Pierre) décide** merge/reject ; zones protégées `tests/**` jamais modifiées. Modèles = full Claude (producteurs) + **Qwen = red-team indépendant** ; oracles = déterministes non-LLM.

---

## Entrée

`/forge <description du projet ou de l'objectif>`. Si l'objectif est flou (pas de périmètre, pas de « produit fini » imaginable), **arrête-toi et pose 2-3 questions de cadrage** avant de lancer la chaîne (c'est ce que fait l'étape 0, ne la court-circuite pas).

## Le socle (déjà câblé, à réutiliser — ne pas réimplémenter)

- Contrats : `scripts/forge/contracts/<etape>.yaml` (schéma `SCHEMA.md`, 17 champs).
- Dispatch gouverné : `scripts/forge/dispatch.py` — `prepare_dispatch(etape, run_id)` valide le contrat, fabrique le payload borné, trace l'audit. **Ne spawn pas** : c'est TOI (l'orchestrateur) qui spawnes avec le payload.
- Oracle / gate / verdict : `scripts/forge/{oracle,gate,verdict}.py` (déterministes, HMAC).

## Étape préliminaire — planifier (obligatoire)

```bash
PYTHONPATH=scripts .venv312/Scripts/python.exe -m forge.dispatch --dry-run
```

Affiche les 10 étapes et leur runtime résolu. Si une étape lève `ContractIncomplete`/`RoleUnresolved`, **STOP** : un contrat est cassé, corrige-le avant de lancer quoi que ce soit.

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

2. **Étape LLM** (`etape` ∉ `forge.dispatch.DETERMINISTIC`) : spawne **un sous-agent** (outil Agent) avec :
   - `prompt` = `payload.prompt` **+ le marqueur `FORGE_DISPATCH:<etape>:<run_id>`** (obligatoire : le hook dur `pretool_forge_guard` bloque tout spawn Forge sans dispatch validé enregistré). Comme tu viens d'appeler `prepare_dispatch`, l'audit contient le dispatch → le spawn passe.
   - modèle visé = `payload.model` (ex. `claude-opus-4-8`, `qwen2.5-14b-instruct`),
   - outils = `payload.allowed_tools` uniquement.
   Le sous-agent produit l'artefact de sortie décrit par le contrat (`output_contract`). Récupère-le.
   **Après le retour** (connecteurs 3+6) : `studio_link.record_telemetry(run_id, etape, payload.model, tokens, duree)` ; si l'agent a échoué/signalé une faille : `studio_link.record_error(run_id, etape, msg, project)`.

3. **Étape déterministe** (`etape` ∈ `forge.dispatch.DETERMINISTIC`) : **ne spawne pas d'agent**. Lance l'oracle correspondant :
   - `s10a-oracle-code` → `forge.gate.forge_gate("<projet>")` (tests via `oracles.json`, verdict signé).
   - `s10b-oracle-archi` → `forge.static_oracles.check_architecture(blueprint, src_root)`.
   - `s10c-oracle-wiremap` → `forge.static_oracles.check_wiremap(wiremap, src_root)`.
   - `s12-verdict` → `forge.verdict` (agrège + signe HMAC).
   Oracle rouge (`ok is False` / `passed is False`) → **STOP**, ne passe pas les étapes suivantes.

4. **Verdict final** (`s12-verdict`) : produit le verdict signé HMAC (`forge.verdict`) séparant software/evidence/claim. `claim_verdict` = `NO_CLAIM_ALLOWED` **toujours**.

## Fin de chaîne — restitution studio + HumanGate

Avant de présenter à Pierre, dépose les propositions **propose-only** (connecteurs 4+5, aucune écriture durable) et l'agrégat de coût (connecteur 3) :
```python
from forge.studio_link import run_cost, propose_ledger_entry, propose_project_record
cout = run_cost(run_id)                                   # {calls, total_tokens, total_duration_s}
propose_ledger_entry(run_id, project, verdict)            # lane AUDIT_REQUIRED, PROPOSED
propose_project_record(project, stage, folder)            # PROPOSED
```
Puis le verdict signé est présenté à **Pierre**. **Tu ne décides jamais** merge/reject/freeze, et tu ne promeus jamais une proposition en mémoire de référence (ledger, projets) sans son go. Si une étape n'a pas d'oracle pour appuyer une affirmation → remonte un besoin HumanGate (fog), pas un claim (RÈGLE DE RESTITUTION).

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
