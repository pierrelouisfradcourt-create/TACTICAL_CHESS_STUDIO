# SEARCH_USAGE_CONTRACT_V1

*2026-08-04. **Contrat de conception seul.** Aucun code, aucun index, aucun score, aucun
ranking, aucun embedding. `search.mjs`, `preflight.py` et les deux volets advisory restent
inchangés.*

---

## Le principe

```
« Recherche effectuee »  ≠  « connaissance utilisee »
```

Aujourd'hui le dépôt sait dire la première, jamais la seconde. `search_log.jsonl` porte
29 entrées réelles (2026-07-20 → 2026-08-03, 23 avec résultat) : la preuve qu'on cherche.
Aucune trace ne dit qu'un résultat a servi.

## L'état mesuré, maillon par maillon

```
Question          ->  Recherche      ->  Resultat        ->  Consommation
   ?                  journalisee        matchCount           ?
```

| maillon | existe ? | où |
|---|---|---|
| **Question** | **non** — le journal porte la `query`, jamais **qui** la pose ni pourquoi | `logSearchInvocation(query, matchCount)` |
| **Recherche** | **oui** | `search_log.jsonl`, 29 entrées |
| **Résultat** | **oui, partiellement** — `matchCount` compte, ne dit pas **lesquels** | idem |
| **Consommation** | **non** | `check_reuse_ratio_wired` → *« run-oracle.mjs absent »*, mort depuis l'origine |

Le maillon **Question** manquant a une conséquence déjà vécue : j'ai lu `search_consulted = 0`
et conclu « le moteur est mort », alors que 29 recherches avaient eu lieu — dont 15 du
pré-vol. **Un journal qui ne dit pas qui appelle produit des conclusions fausses.**

---

## Le contrat

### 1. `caller` — obligatoire, déclaré, jamais deviné

```yaml
caller:            # OBLIGATOIRE. Valeur d'une liste fermee.
  preflight        # garde de pre-vol (sous-processus reel, preflight.py)
  s9-build         # builder, sous contrat s9-build-*
  cli              # invocation humaine directe
  test             # suite de tests
```

Une valeur hors liste est refusée à l'écriture. **Un appel sans `caller` n'est pas
journalisé silencieusement : il est journalisé avec `caller: undeclared`** — l'absence est
une information, pas un trou.

*Ce que ça rend possible immédiatement* : `check_search_consulted` peut enfin répondre à sa
propre question — « le **builder** a-t-il cherché ? » — au lieu de « quelqu'un a-t-il
cherché ? ».

### 2. `query` — la chaîne exacte, telle que soumise

Aucune normalisation, aucune expansion enregistrée. `expandWithSynonyms` fait son travail
en mémoire ; le journal garde ce que l'appelant a écrit. Sinon on ne peut plus rejouer.

### 3. `results` — les identités, pas seulement le compte

```yaml
match_count: 3                      # deja present
matched_ids: [brick_a, brick_b, …]  # AJOUT : les identifiants renvoyes, dans l'ordre rendu
```

`matched_ids` est ce qui rend la consommation vérifiable : sans lui, « une brique a été
réutilisée » ne peut pas être rapprochée de « cette brique avait été proposée ».

**Ce n'est pas un ranking** : c'est l'ordre déterministe que `search.mjs` produit déjà. On
l'enregistre, on ne le calcule pas, on ne le note pas.

### 4. `consumed_refs` — la consommation, déclarée par le producteur

```yaml
consumed_refs: [brick_a]   # identifiants REELLEMENT reutilisees, sous-ensemble de matched_ids
```

Écrit **par le producteur** (le builder), donc **auto-déclaré**. Le contrat l'assume et le
dit : `consumed_refs` seul est une **intention**, pas une preuve.

### 5. `proof_of_consumption` — ce qui transforme la déclaration en fait

```yaml
proof_of_consumption:
  method: reuse_ratio            # mecanisme NON-LLM existant (reuse_ratio.mjs)
  invoked_by: run-oracle.mjs     # le cablage manquant, mesure par check_reuse_ratio_wired
  status: MEASURED | NOT_WIRED | NOT_MEASURED
```

Trois statuts, jamais deux :

- `MEASURED` — `reuse_ratio.mjs` a tourné, il dit ce qui a été réutilisé ;
- `NOT_WIRED` — le mécanisme existe, personne ne l'invoque *(l'état actuel, tous projets)* ;
- `NOT_MEASURED` — ne pouvait pas être mesuré dans ce mode d'exécution.

`NOT_WIRED` ≠ `NOT_MEASURED` : la première dit « on ne l'a pas branché », la seconde « on
ne pouvait pas ». La leçon `forge.oracle_fail_vs_not_measured_marker` a été payée pour
cette distinction.

---

## Ce que le contrat REFUSE

- **aucun score de pertinence** — `match_count` est un compte, `matched_ids` une liste ;
- **aucun ranking** — l'ordre est celui que `search.mjs` produit déjà, enregistré tel quel ;
- **aucun embedding, aucune base vectorielle, aucun second moteur** ;
- **aucune obligation de trouver** — 6 des 29 recherches n'ont rien renvoyé, et c'est une
  observation légitime, pas un échec ;
- **aucun gate** — les deux volets restent *advisory*. Une recherche non faite doit être
  **visible**, jamais bloquante. Un builder qui n'avait rien à chercher ne doit pas être
  puni.

## Ce que le contrat ne prétend pas régler

1. **`consumed_refs` est auto-déclaré.** Seul `proof_of_consumption.method: reuse_ratio`
   le confirme, et ce câblage n'existe dans aucun projet.
2. **La réutilisation de *connaissance* reste invisible.** Un builder qui lit une brique et
   s'en inspire sans la copier ne laissera aucune trace. Ce sera toujours vrai — le
   contrat mesure la réutilisation d'**artefacts**, pas d'idées.
3. **`caller` est déclaratif.** Un appelant peut mentir. La seule parade est celle qui
   existe déjà : le pré-vol est un sous-processus dont l'exécution est attestée par la
   trace elle-même.

## Ordre d'implémentation proposé

```
1. caller + matched_ids     journal enrichi. Rend la question posable.
2. consumed_refs            declaration du producteur. Rend l'intention lisible.
3. proof_of_consumption     cablage reuse_ratio.mjs -> run-oracle.mjs. Rend l'usage PROUVE.
```

**Faire 1 et 2 sans 3 donnerait l'illusion d'avoir mesuré l'usage.** C'est le risque
principal de ce contrat, et il mérite d'être écrit avant la première ligne de code.

## Décision demandée

☐ **Adopter le contrat entier**, implémenter dans l'ordre 1 → 2 → 3
☐ **Adopter 1 seul** (attribution), en assumant que la consommation reste non mesurée
☐ **Ne rien adopter** — et alors retirer `search_consulted` et `reuse_ratio_wired` plutôt
  que de les laisser rouges à perpétuité : un volet qui ne peut pas devenir vert n'est pas
  une mesure, c'est un décor
☐ **Autre**

Tant qu'aucune case n'est cochée, rien n'est modifié.
