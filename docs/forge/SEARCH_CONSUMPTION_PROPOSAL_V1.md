# SEARCH_CONSUMPTION_PROPOSAL_V1

*2026-08-04. **Proposition seule.** Aucun code, aucun index, aucun embedding, aucun score.*

---

## Correction d'un fait que j'avais énoncé trop vite

Dans `KNOWLEDGE_RUNTIME_AUDIT_V1` j'ai écrit que le seul moteur à similarité du dépôt
« n'a jamais été consulté ». **C'est faux.** Mesure :

```
knowledge_base/search_log.jsonl   29 entrees   du 2026-07-20 au 2026-08-03
  23 recherches avec resultat · 6 sans resultat
  13 requetes distinctes
  par jour : 2026-07-20 (5) · 2026-08-02 (16) · 2026-08-03 (8)
```

Le moteur tourne. Ce qui vaut **zéro**, c'est `search_consulted` **pendant un run** — et
c'est une tout autre affirmation.

## Ce que la mesure dit exactement

`check_search_consulted(since_iso)` (`static_oracles.py:806`) compte les entrées du journal
**postérieures au démarrage du driver**. `count = 0` signifie donc : *aucune recherche
pendant ce run*, jamais *aucune recherche jamais*.

Et la requête la plus fréquente du journal l'explique :

```
"preflight_oracle_registration enregistreme"   x15
```

C'est l'intention de recherche du **pré-vol** (`preflight.py`), qui lance un vrai
sous-processus `node knowledge_base/search.mjs` et dont la journalisation **est** la preuve
qu'il a tourné. Autrement dit :

| appelant | nature | consommé ? |
|---|---|---|
| `scripts/forge/preflight.py` | **sous-processus réel**, mécanique | oui — le journal est sa preuve d'exécution |
| contrats `s9-build-*.yaml` | **consigne de prompt** : « interroger `search.mjs` avant d'écrire » | **jamais mesuré** |
| CLI manuelle | humain | oui, tracé |

**Le trou n'est pas « la recherche est morte ». Il est : le seul appelant mécanique est la
garde de pré-vol ; le builder à qui on ordonne de chercher n'est vérifié par rien.**

C'est le motif que cette lane connaît : une consigne de prompt n'est pas un mécanisme.

## La chaîne à rendre observable

```
question    ->  recherche  ->  resultat  ->  consommation
   ?              journal      matchCount        ?
```

Deux maillons manquent, et ils ne se valent pas :

**Maillon 1 — `question`.** Le journal enregistre la *requête* (`query`), pas **qui**
demande ni **pourquoi**. Impossible aujourd'hui de distinguer une recherche du pré-vol
d'une recherche du builder : c'est ce qui a rendu ma première lecture fausse.

**Maillon 2 — `consommation`.** C'est le vrai trou. `matchCount` dit combien de briques ont
été trouvées ; **rien ne dit si l'une a été utilisée**. Le volet qui devait le mesurer
existe et est mort depuis l'origine :

```
check_reuse_ratio_wired  ->  "run-oracle.mjs absent"
```

Une leçon validée le documente déjà (`forge.reuse_tracking_oracle_dead_since_inception`,
4 runs).

## Proposition — deux branchements, aucun moteur

### A. Attribuer la recherche à son appelant *(coût : un champ)*

`logSearchInvocation(query, matchCount)` reçoit un troisième argument **déclaré**, pas
deviné :

```json
{"query": "...", "matchCount": 3, "ts": "...", "caller": "preflight" | "s9-build" | "cli"}
```

Ce que ça rend possible immédiatement : `check_search_consulted` peut distinguer
*« le pré-vol a cherché »* de *« le builder a cherché »* — la question à laquelle le volet
prétendait répondre depuis le début.

**Ce que ça ne fait pas** : obliger qui que ce soit à chercher. Un builder qui ne cherche
pas produit `caller: absent`, et c'est une information, pas un échec.

### B. Rendre la consommation observable *(coût : rien de nouveau — un câblage)*

Le mécanisme existe : `reuse_ratio.mjs` mesure la réutilisation, `check_reuse_ratio_wired`
vérifie qu'il est invoqué. Il manque **l'invocation** dans `run-oracle.mjs` des projets.

**Rien à écrire côté mesure.** Ce qui reste à décider est côté projet : est-ce que
`run-oracle.mjs` doit appeler `reuse_ratio.mjs` — et si oui, dans quel gabarit de projet,
puisque c'est un fichier produit par le builder.

### Ce que la proposition **refuse** explicitement

- **aucun score de pertinence** — `matchCount` est un compte, il le reste ;
- **aucune obligation de trouver** — 6 des 29 recherches n'ont rien renvoyé, et c'est une
  observation légitime ;
- **aucun embedding, aucun vecteur, aucun second moteur** — le premier n'est pas encore
  attribué ;
- **aucun gate** — les deux volets restent *advisory*, comme aujourd'hui. Une recherche non
  faite ne doit pas bloquer un run : elle doit être **visible**.

## Risques

1. **`caller` est déclaratif.** Rien n'empêche un appelant de mentir. Comme partout
   ailleurs dans cette lane, la parade n'est pas la confiance : c'est que le pré-vol, lui,
   est un sous-processus dont l'exécution est attestée par la trace elle-même.
2. **Attribuer ne fait pas consommer.** Le maillon A rend la question mesurable ; il ne
   remplit pas le maillon B. Faire A seul donnerait l'impression d'avoir avancé.
3. **`reuse_ratio` mesure une réutilisation de briques**, pas une réutilisation de
   *connaissance*. Un builder peut lire une brique et s'en inspirer sans la copier —
   invisible, et ce sera toujours le cas.
4. ~~Le journal est gitignoré ? Non — il est présent dans le dépôt.~~ **FAUX, corrigé le
   2026-08-04** (`SEARCH_LOG_POLICY_PROPOSAL_V1`) : `knowledge_base/search_log.jsonl` est
   ignoré depuis `.gitignore:135`, avec une justification écrite qui distingue
   explicitement le cas des preuves permanentes de `knowledge_base/proofs/*.log`. La
   politique en vigueur **est** celle de l'Option C, appliquée un mois plus tôt. Rien à
   réconcilier ici.

## Décision demandée

☐ **A seul** — attribuer la recherche à son appelant, pour que `search_consulted` réponde
  enfin à sa propre question
☐ **A + B** — attribuer *et* brancher `reuse_ratio.mjs` dans `run-oracle.mjs` *(recommandé :
  A seul mesure l'intention, pas l'usage)*
☐ **Ne rien brancher** — assumer que la consigne de recherche reste une consigne de prompt,
  et retirer les deux volets advisory plutôt que les laisser rouges à perpétuité
☐ **Autre**

Tant qu'aucune case n'est cochée, `search.mjs`, `preflight.py` et les deux volets restent
inchangés.
