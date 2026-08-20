# RUNTIME_DRIFT_ORACLE_CONTRACT_V1 — contrat seul

*2026-08-04. **Contrat, aucune implémentation.** Phase 4 de la mission Observer Runtime
Integration : « ne pas forcément implémenter, faire seulement un contrat ».*

Aucune nouvelle couche : l'oracle décrit ici **lit l'Observer** et écrit dans un type
d'événement qui existe déjà — `drift.detected` (`observer/events.py:106`), déclaré depuis
le début et **jamais émis** (0 occurrence sur 7 645 événements).

---

## Mission

Comparer ce que le studio **déclare** à ce que l'Observer a **vu**, et nommer les écarts.

Il ne corrige rien, ne supprime rien, ne classe rien.

## Entrées

| côté | source | ce qu'on en tire |
|---|---|---|
| **DÉCLARÉ** | `scripts/forge/contracts/roles.yaml` | l'ensemble des `capability_role` + les `runtime_contracts` |
| | `scripts/forge/capabilities.json` | `executor_status`, `runtime_role` par capacité |
| | `scripts/forge/agent_recipes.json` | `runtime_roles[].capability_role` par recette |
| **OBSERVÉ** | `lab/reports/observer/*/events.jsonl` | `actor.capability_role` · `actor.model` · `payload.entrypoint` |

## Sorties

Deux listes nommées. **Rien d'autre.**

```yaml
DECLARED_NOT_OBSERVED:
  - capability_role: <rôle déclaré, jamais vu s'exécuter>
    declared_in:     [roles.yaml, capabilities.json, agent_recipes.json]
    window:          <fenêtre d'observation appliquée>
    last_seen:       null

OBSERVED_NOT_DECLARED:
  - capability_role: <rôle vu s'exécuter, absent des déclarations>
    observed_in:     [<run_id>, ...]
    entrypoint:      <chemin réel>
    first_seen:      <ts>
```

**Interdits absolus** : `score`, `reward`, `ranking`, `fitness`, `health`, `%`. Un rôle
rare n'est pas un rôle mort ; agréger les deux listes en un chiffre détruirait la seule
information qu'elles portent — **lesquels**.

## Destination

`drift.detected`, avec `proof: MECHANICAL` (les deux côtés sont des fichiers relus) et
`link: DIRECT`. Sortie **propose-only** : aucun gel, aucune suppression de rôle. Le
studio a déjà la règle — *gelé ≠ mort*.

---

## Les trois pré-requis, tranchés par cette mission

`RUNTIME_REALITY_LAYER_V0.md` en posait trois. Deux sont désormais réglés :

1. **Ce qui compte comme observation** — ✅ tranché : un événement Observer portant
   `actor.capability_role`, issu d'un reçu signé (`dispatch.prepared` / `spawn_executed`)
   ou d'une trace mécanique (`repair.result`). Pas une entrée de doc, pas un YAML.
2. **La fenêtre** — ❌ **non tranché, et bloquant.** Sans elle, « jamais observé » veut
   dire « jamais cherché ». Preuve concrète produite aujourd'hui : `repair_runtime` était
   `DECLARED_NOT_OBSERVED` à 15 h et ne l'est plus à 18 h. Sur une fenêtre absolue, tout
   run passé compte ; sur 30 jours glissants, `art_director` sortirait de la liste ou y
   entrerait selon le mois. **À trancher avant d'implémenter.**
3. **Où vit la sortie** — ✅ tranché : `drift.detected` dans le flux Observer, jamais un
   fichier de statut à part.

---

## État mesuré au 2026-08-04 (fenêtre = tout l'historique)

```
rôles DÉCLARÉS  16
rôles OBSERVÉS  12   (+1 aujourd'hui : repair_runtime)

DECLARED_NOT_OBSERVED (4) : art_director · forge_toolsmith · orchestrator · run_orchestrator
OBSERVED_NOT_DECLARED (0) : (aucun)
```

`orchestrator` est déclaré **descriptif** par `roles.yaml` lui-même : aucun code ne le
résout. Il sera *toujours* dans la liste. L'oracle devra donc lire `runtime_contracts` /
les commentaires de déclaration, ou accepter des faux positifs permanents — ce qui, à la
longue, apprend à ignorer la liste.

---

## Limite structurelle à écrire noir sur blanc

**L'oracle ne peut pas trouver le prochain `repair_step.mjs`.**

`OBSERVED_NOT_DECLARED` ne détecte que ce qui **passe par la porte**. Un runtime qui
s'exécute sans émettre de reçu n'apparaît dans aucun `events.jsonl` — c'était exactement
le cas de la réparation jusqu'à aujourd'hui, et l'oracle aurait rendu « 0 écart » avec
aplomb.

Trouver ces runtimes-là demande une **seconde source** : un inventaire du code (qui
appelle un modèle ? qui lance un sous-processus ?) confronté aux entrypoints observés.
C'est un autre oracle, avec un autre angle. Le déclarer ici évite de croire que celui-ci
suffit.

## Trou connu, non corrigé

`observer/adapters/forge_evidence.py:93` — `_actor_kind_for_model` rend `llm_agent`
uniquement si le nom du modèle contient « claude ». **Tout modèle local (Qwen) est
classé `unknown`**, y compris dans les reçus signés. Constaté sur les événements
`repair.result` produits aujourd'hui.

Non corrigé volontairement : changer cette fonction re-classerait rétroactivement des
événements historiques de tous les projets — une modification du sens de la sortie de
l'Observer, hors du périmètre « câblage ». **Conséquence pour cet oracle : ne jamais
s'appuyer sur `actor.kind` pour repérer un runtime LLM ; utiliser `actor.model` et
`actor.capability_role`.**
