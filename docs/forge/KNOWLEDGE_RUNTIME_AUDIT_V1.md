# KNOWLEDGE_RUNTIME_AUDIT_V1

*2026-08-04. **Audit lecture seule.** Aucun index créé, aucun embedding, aucune base
vectorielle, aucun agent RAG. Inventaire de ce qui est **déjà résolu sans vectoriel**.*

---

## Les cinq index demandés — état réel

| index demandé | existe ? | forme réelle | résolution |
|---|---|---|---|
| **mutation_index** | **oui** | `mutation_registry.mjs` — 8 fonctions de recherche | **clé exacte** : `findMutation(id)`, `findByLayer`, `findByWorker`, `findByTarget`, `findByClass`, `findAccepted`, `findRejected(code)`, `findProductionReady` |
| **evidence_index** | **partiel** | `candidate_selector.preuvesPresentes()` | **existence physique** de chaque `evidence_refs` — répond « présente / absente », jamais « proche de » |
| **capability_index** | **oui, implicite** | `execution_binding` + `agent_factory.decrireRuntime()` | **clé exacte** : capacité → statut → rôle runtime → contrat → callable |
| **gameplay_index** | **oui, ailleurs** | `knowledge_base/catalog.json` (50 entrées) + `search.mjs` | **mixte** : `findFulfilling(roleId)` en clé exacte, `search(query)` en **lexical avec synonymes** |
| **lesson_index** | **oui** | `learning_memory.premortem_lessons()` | filtrage + tri **déterministe**, limite 5, testé `test_premortem_lessons_is_deterministic` |

**Quatre index sur cinq résolvent déjà par clé exacte ou par graphe.** Aucun n'utilise de
vecteur.

## La priorité demandée, mesurée sur l'existant

```
1. cle exacte      mutation_registry (8 fonctions) · decrireRuntime · findFulfilling
2. graphe causal   root_problem -> mutation -> capability -> recipe -> runtime -> evidence
                   parcouru de bout en bout par execution_binding et agent_factory
3. similarite      UN SEUL point : knowledge_base/search.mjs (lexical + synonymes)
```

Le graphe causal n'est pas une intention : il est **exécuté** à chaque appel de
`execution_binding.planifier()`, et son échec produit un blocker nommé.

> **Correction du 2026-08-04**, mesurée dans `SEARCH_CONSUMPTION_PROPOSAL_V1` : la section
> ci-dessous affirme que le moteur à similarité « n'a jamais été consulté ». **C'est faux.**
> `knowledge_base/search_log.jsonl` porte **29 entrées du 2026-07-20 au 2026-08-03**, dont
> 23 avec résultat. Ce qui vaut zéro, c'est `search_consulted` **pendant un run** — le
> volet est fenêtré sur le démarrage du driver. Le seul appelant mécanique est
> `preflight.py` ; le builder, à qui un contrat ordonne de chercher, n'est vérifié par
> rien. Le reste de la section tient, mais son argument doit être lu ainsi.

## Le seul recours à la similarité, et ce qu'il coûte

`knowledge_base/search.mjs` — `search(query, catalog)` avec `expandWithSynonyms`. C'est un
appariement lexical sur 50 entrées de catalogue.

**Il est déjà instrumenté** : `logSearchInvocation()` journalise chaque appel, et
`searchLogSince()` permet de vérifier qu'il a servi. Une leçon validée le documente —
`forge.reuse_tracking_oracle_dead_since_inception` : `search_consulted.count = 0` sur
**tous** les runs mesurés. Autrement dit : **le seul composant à similarité du dépôt n'a
jamais été consulté par un run**.

C'est un argument de plus contre l'ajout d'un moteur vectoriel : celui à similarité qui
existe déjà est mort.

## « Aucune preuve connue » — le système sait-il le dire ?

C'est le critère qui sépare un index d'un devin. Réponses **mesurées**, pas déclarées :

| couche | comment elle dit « je ne sais pas » |
|---|---|
| `candidate_selector` | `objective_value: null` + ligne de raisonnement *« aucun candidat ne mesure la métrique objectif »* ; et **ex aequo rendus en entier** plutôt qu'un choix arbitraire |
| `execution_binding` | 9 blockers nommés ; `recipe_missing` / `evidence_missing` sont des réponses, pas des erreurs |
| `agent_factory` | 10 blockers ; `PLAN_NON_EXECUTABLE` ; refuse avant d'appeler quoi que ce soit |
| `execution_proof` | `MISMATCH` avec le maillon nommé ; `stdout_parse_mode: unparseable` quand la sortie est illisible |
| `runtime_inventory_oracle` | `never_observed` **≠** `observed_outside_window` — deux façons distinctes de ne pas savoir |
| `mutation_registry` | `confidence: null` quand un détecteur n'a rien détecté (`TP=0, FP=0`) — refuse de dériver 1,00 d'un silence |
| **mémoire causale** | `lesson_ids` **vide** sur les 4 problèmes : l'absence de lien est le résultat |

**Aucune couche ne répond toujours.** C'est la propriété que le mandat exigeait avant tout
RAG, et elle est déjà tenue — non par prudence rédactionnelle, mais par des champs
structurés que des tests verrouillent.

---

## Ce qu'un RAG apporterait — et ce qu'il coûterait

**Ce qui manque n'est pas la recherche.** Sur les 4 problèmes racines, la chaîne
`root_problem → mutation → capability → runtime → evidence` se résout **entièrement par
clé exacte**, en une commande, sans ambiguïté.

Ce qui manque est ailleurs, et un moteur vectoriel ne le règle pas :

1. **`lesson.layer` n'existe pas** — le lien leçon ↔ problème racine est absent par
   **défaut de déclaration**, pas par défaut de recherche. Un embedding produirait
   exactement le rapprochement par ressemblance que la doctrine interdit.
2. **Le seul moteur à similarité existant n'a jamais été consulté** (`search_consulted = 0`
   sur tous les runs). Ajouter un second moteur avant d'avoir branché le premier
   reproduirait le motif *« déclaré ≠ exécuté »*.
3. **9 mutations sur 13 restent `recipe_missing`** — et c'est le verdict correct. Aucune
   recherche ne crée une recette.

## Recommandation

**Ne rien ajouter.** Les index déterministes couvrent les besoins mesurés ; le point
d'entrée à similarité existe et dort. Le prochain gain n'est pas un moteur — c'est un
champ (`lesson.layer`) et un branchement (`search_consulted > 0`).

Si un RAG devait un jour exister, la règle qui le rendrait acceptable est déjà écrite dans
le comportement des cinq couches ci-dessus : **il doit pouvoir répondre « aucune preuve
connue »**, et ce refus doit être un champ structuré, pas une phrase.
