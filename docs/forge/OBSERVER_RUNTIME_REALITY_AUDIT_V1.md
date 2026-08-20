# OBSERVER_RUNTIME_REALITY_AUDIT_V1

*2026-08-04. **Audit en lecture seule.** Aucun observateur créé, aucun agent, aucun runtime
modifié, `roles.yaml` non touché. Question posée : l'Observer existant peut-il devenir la
source de vérité d'exécution de la Forge ?*

**Réponse : oui. La couche `Runtime Reality Layer` ne doit pas être écrite.**

---

## OBSERVER_LOCATION

| | |
|---|---|
| moteur | `scripts/observer/` — 24 modules Python (~700 Ko), dont `events.py` (taxonomie), `sources.py` (collecte), `facts.py`, `correlate.py`, `evidence.py`, `views.py` |
| console | `scripts/observer/console.html` (205 Ko, autonome) |
| sorties | `lab/reports/observer/<projet>/` — `events.jsonl`, `observer_run.json` (`schema: observer.run.v0`), `decisions_normalized.jsonl`, `wiremap_LIVING.json`, `benchmark.json` |
| sources lues | transcripts de session `~/.claude/projects/<slug>/**.jsonl` · `lab/forge_runs/<projet>/` · `lab/forge_evidence/` · logs d'oracle · `git` |
| couverture mesurée | **7 645 événements**, 4 projets (`breakout_v2`, `pong`, `tetris`, `p5_gridnav`), 32 types d'événement |

---

## DATA_ALREADY_CAPTURED — table de couverture

Mesurée, pas supposée. `n` = occurrences réelles sur les 4 projets.

| Donnée recherchée | Observer actuel | n | proof | Preuve |
|---|---|---|---|---|
| `run_id` | présent sur **tous** les événements | 7 645 | — | `events.jsonl` |
| `timestamp` | `ts` · `ts_iso` · `ts_format` | 7 645 | — | `events.jsonl` (`ts_format: absent` déclaré pour 103) |
| runtime appelé | `actor.capability_role` | 51 | **SIGNED** | `dispatch.prepared` ← `lab/forge_evidence/dispatch_audit.jsonl` |
| modèle utilisé | `actor.model` + `actor.provider` | 51 | **SIGNED** | idem, + `llm.usage` (transcripts) |
| **prompt hash** | `payload.payload_prompt_sha256` | 73 | **SIGNED** | `dispatch.context_manifest` |
| **input hash** | `payload.sources[].sha256` (par fichier lu, avec `role`) | 73 | **SIGNED** | idem |
| fichiers lus | `payload.path` | 432 | MECHANICAL | `file.read` ← transcripts |
| fichiers écrits | `payload.path` | 167 | MECHANICAL | `file.write` / `file.edit` |
| commandes exécutées | `payload.command` | 315 | MECHANICAL | `shell.exec` |
| tests lancés | `payload.passed` / `failed` / `files` | 3 | MECHANICAL | `test.result` ← logs d'oracle |
| oracle appelé | `payload.oracle_id` + `status` | 20 | **SIGNED** | `oracle.result` ← `verdict.json` |
| résultat | `payload.decision` + **hmac** + `git_head` | 5 | **SIGNED** | `verdict.signed` |

**12/12 couvertes. Aucun NOT_FOUND.** `tool_calls` l'est aussi (`tool.call` / `tool.result`,
1 262 événements) — la Forge voit les appels d'outils, pas seulement leurs effets.

---

## RUNTIME_REALITY_COVERAGE

`EXECUTION_TRACE` tel que la couche voulait l'ajouter, ligne à ligne :

```
run_id          COUVERT      timestamp      COUVERT      runtime_id    COUVERT (SIGNED)
model_id        COUVERT      prompt_hash    COUVERT      input_hash    COUVERT (SIGNED)
tool_calls      COUVERT      files_read     COUVERT      files_written COUVERT
oracle_calls    COUVERT      decision       COUVERT (SIGNED + hmac)
```

**11/11 = 100 %.** Le seuil de la règle était 80 %.

### Les critères de Phase 4, un par un

| critère | verdict | preuve |
|---|---|---|
| données issues de l'exécution réelle | **OK** | transcripts de session + reçus de dispatch + logs, jamais un résumé d'agent |
| pas d'auto-déclaration | **OK** | taxonomie de preuve : **95,2 % MECHANICAL · 3,9 % SIGNED · 0,9 % SELF_DECLARED** — et l'auto-déclaré est *étiqueté comme tel* (`artifact.self_declared`) |
| preuve physique | **OK** | chaque événement porte `source.path` + `fmt` + `line` : on peut rouvrir la ligne d'origine |
| hash / identité vérifiable | **OK** | `contract_sha256`, `payload_prompt_sha256`, `sources[].sha256`, `hmac`, `event_id` |
| timestamp / run identifiable | **OK** | `run_id` partout, `ts_format` déclare honnêtement `absent` quand la source n'a pas de date |

L'Observer ne se contente pas de collecter : **il qualifie ce qu'il collecte**. C'est
exactement la propriété qu'une source de vérité doit avoir, et c'est celle qu'on aurait
ré-inventée moins bien.

---

## MISSING_DATA — deux trous, aucun ne justifie une couche

### 1. `repair_runtime` est invisible — parce qu'il contourne la porte

```
evenements citant « repair » : 0
kind « repair.* » dans events.py : NON
```

Ce n'est **pas** une faiblesse de l'Observer. Regardons comment Qwen est vu ailleurs :

```
qwen2.5-14b-instruct : dispatch.prepared (SIGNED) · dispatch.context_manifest (SIGNED)
                       dispatch.reasoning (SIGNED) · dispatch.executed (SIGNED)
                       telemetry.step (MECHANICAL)
```

Un runtime non-Claude **est** observable — à condition de passer par la porte de dispatch,
qui produit les reçus signés. `run_repair_step()` (`run_real.py:1164`) appelle
`repair_step.mjs` **en direct**, sans passer par la porte. Le bloc de mesure existe
pourtant : il est rangé dans `res["repair"]` et persisté avec l'étape.

**Même cause racine que le problème d'origine** : ce qui n'entre pas par la porte n'est ni
déclaré, ni observé. Correctif : un type d'événement `repair.result`, pas une couche.

### 2. `drift.detected` : un type déclaré, jamais émis

`events.py:106` déclare `drift.detected`. Occurrences réelles sur 7 645 événements : **0**.
Un emplacement prévu pour le signal de dérive — vide. C'est là que le Runtime Drift Oracle
doit écrire, et il existe déjà.

---

## Ce que l'Observer peut déjà répondre — mesuré aujourd'hui

```
rôles DÉCLARÉS  (roles.yaml)                16
rôles OBSERVÉS  (4 projets)                 11

DÉCLARÉ_JAMAIS_OBSERVÉ (5) : art_director · forge_toolsmith · orchestrator
                             repair_runtime · run_orchestrator
OBSERVÉ_JAMAIS_DÉCLARÉ (0) : (aucun)
```

Les deux listes que la couche voulait produire, l'Observer les produit **avec les données
d'aujourd'hui**, sans une ligne de code nouvelle.

Et elles se lisent avec précaution — la démonstration du besoin de fenêtre :
`orchestrator` est déclaré descriptif (aucun code ne le résout, `roles.yaml` le dit) ;
`repair_runtime` a été déclaré **le 2026-08-04** alors que le dernier run observé date du
**2026-07-31**. Non observé ne veut pas dire mort. *Gelé ≠ mort* s'applique ici tel quel.

---

## RECOMMENDATION

**Ne pas écrire `Runtime Reality Layer`.** Brancher l'œil existant sur les contrats :

```
Observer (events.jsonl + observer_run.json)
    │
    └─> Execution Trace Manifest        ← observer_run.json EST déjà ~90 % de ce manifeste
            ├─> Runtime Drift Oracle            (écrit dans `drift.detected`, déjà déclaré)
            ├─> Capability Binding validation   (capabilities.json.executor_status ↔ observé)
            └─> Agent Recipe validation         (agent_recipes.json.runtime_roles ↔ observé)
```

Trois branchements, dans cet ordre de coût croissant :

1. **`repair.result`** — un extracteur pour `res["repair"]` déjà persisté. Rend visible le
   runtime déclaré aujourd'hui. Le moins cher, et il ferme la boucle de cette session.
2. **Runtime Drift Oracle** — comparer `roles.yaml` × `capabilities.json` ×
   `agent_recipes.json` aux `capability_role` observés, et écrire dans `drift.detected`.
   Sortie : deux listes nommées, **jamais un score de santé**.
3. **Fenêtre d'observation** — trancher « jamais observé *depuis quand* » avant que la
   sortie ne serve à décider quoi que ce soit.

Et une décision préalable qui n'est pas technique : **faire passer la réparation par la
porte de dispatch**, ou assumer qu'un runtime déclaré puisse s'exécuter hors porte. Le
premier choix rend l'observation gratuite ; le second demande un extracteur par exception,
pour toujours.

---

## Ce que cet audit ne prouve pas

- Que l'Observer est **exact**. Il est *couvrant* : 12/12 champs présents avec preuve
  physique. La justesse de chaque extracteur n'a pas été re-vérifiée ici.
- Que les 4 projets observés sont représentatifs. Ce sont ceux qui ont tourné — pas un
  échantillon choisi.
- Que « 0 OBSERVÉ_JAMAIS_DÉCLARÉ » vaut absence de runtime clandestin. Cela vaut :
  *aucun rôle inconnu n'est passé par la porte*. `repair_step.mjs` en est la
  contre-preuve vivante — il ne passait pas par la porte, donc il n'apparaît nulle part.
  **L'angle mort de l'Observer est exactement ce qui contourne la porte.**
