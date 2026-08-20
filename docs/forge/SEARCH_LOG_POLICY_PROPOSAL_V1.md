# SEARCH_LOG_POLICY_PROPOSAL_V1

*2026-08-04. **Audit + proposition. `.gitignore` non modifié.***

---

## Correction préalable — j'avais tort deux fois

Dans `SEARCH_CONSUMPTION_PROPOSAL_V1` j'ai écrit que `search_log.jsonl` *« est présent dans
le dépôt »* et posé une « incohérence de politique à trancher ». **C'est faux.** Vérifié :

```
.gitignore:135   knowledge_base/search_log.jsonl
git ls-files     (vide — jamais suivi)
```

Et la ligne porte déjà sa justification, écrite avant moi :

> *« Auto-journalisation search.mjs CLI (preuve mécanique d'appel) — runtime append-only,
> churne, jamais commité (même raisonnement que `lab/events.jsonl`). Distinct de
> `knowledge_base/proofs/*.log` (preuves permanentes, EXCEPTION plus haut) : cette ligne ne
> doit JAMAIS être confondue avec ce cas — `search_log.jsonl` n'est pas une preuve
> versionnée. »*

**La décision existait, elle était motivée, et elle est exactement l'Option C** — appliquée
à `knowledge_base/` un mois avant qu'on l'applique à `lab/forge_evidence/`.

## Cohérence avec la politique Evidence Git

| | `lab/forge_evidence/` (Option C, 2026-08-04) | `knowledge_base/` (décision antérieure) |
|---|---|---|
| bundles de preuve figés | **versionnés** (122 fichiers) | `knowledge_base/proofs/*.log` — **versionnés** (exception explicite) |
| flux append-only qui churnent | **ignorés** (`dispatch_audit`, `telemetry`, `repair_results`…) | `search_log.jsonl` — **ignoré** |

**Même règle, deux endroits, appliquée deux fois indépendamment.** Rien à réconcilier.

## Ce que l'audit trouve quand même

L'incohérence réelle est ailleurs — et elle est plus grosse :

```
239 fichiers .jsonl SUIVIS par git, 95,5 Mo au total
  lab/datasets/teacher_samples.jsonl     9,9 Mo
  lab/datasets/teacher_solid.jsonl       9,0 Mo
  lab/datasets/teacher_tactical.jsonl    8,9 Mo
  lab/reports/observer/*/events.jsonl    (7 645 evenements, versionnes)
```

Des flux volumineux **sont** versionnés, dont les `events.jsonl` de l'Observer — qui sont,
eux aussi, des journaux append-only produits par un outil. **La règle « append-only ⇒
ignoré » n'est donc pas appliquée uniformément dans le dépôt.**

Ce n'est pas un problème de `search_log.jsonl`. C'est une politique globale qui n'a jamais
été énoncée en un seul endroit : chaque cas a été tranché isolément, avec de bonnes
raisons à chaque fois. `search_log.jsonl` est l'un des rares à porter sa justification
dans le fichier même.

## Les trois issues demandées

### 1. Flux append-only hors dépôt — **c'est l'état actuel, et il est correct**

`search_log.jsonl` churne (29 entrées en 2 semaines, réécrites par chaque exécution de
test), ne porte aucune preuve d'expérience close, et n'est référencé par **aucun** fichier
versionné — contrairement aux 57 références qui avaient motivé l'Option C.

Vérifié : `git grep search_log.jsonl` ne renvoie que `.gitignore`, `search.mjs`
(sa constante de chemin) et `static_oracles.py` (son lecteur). **Aucun registre ne le cite.**

### 2. Preuve par bundle avec hash — **applicable, mais pas ici**

Si un jour une expérience devait s'appuyer sur un état daté du journal, la voie existe et
elle est déjà éprouvée : copier l'extrait dans `lab/forge_evidence/<EXPERIENCE>/` avec son
`sha256`, comme `REPAIR_RUNTIME_V1/` le fait pour son entrée. La preuve est alors
**reconstruite et figée**, pas suivie en continu.

C'est la réponse à la seule question qui vaille : *« que fait-on quand un flux ignoré porte
une preuve ? »* — on en extrait un bundle, on ne versionne pas le flux.

### 3. Conservation justifiée — **déjà faite**, dans `.gitignore` lui-même

La justification est dans le fichier, datée, et distingue explicitement le cas de
`knowledge_base/proofs/*.log`. C'est mieux documenté que la ligne 162 que je viens de
remplacer.

---

## Proposition

**Ne rien changer pour `search_log.jsonl`.** La politique en vigueur est celle que
l'Option C aurait décidée, et elle est mieux justifiée.

**Deux réserves à porter séparément :**

1. **Le contrat `SEARCH_USAGE_CONTRACT_V1` change la nature du journal.** Avec `caller`,
   `matched_ids`, `consumed_refs` et `proof_of_consumption`, `search_log.jsonl` cesserait
   d'être une simple preuve d'appel pour devenir la **trace de consommation de
   connaissance** — la seule qui répondrait à *« cette recherche a-t-elle servi ? »*. À ce
   moment-là, la question « bundle avec hash » se reposera, et la réponse sera l'issue 2 :
   extraire un bundle par expérience, pas versionner le flux.
2. **La politique globale des `.jsonl` mérite d'être énoncée une fois.** 239 fichiers
   suivis, 95,5 Mo, dont des journaux d'outil. Ce n'est ni bon ni mauvais en soi — c'est
   **non écrit**, donc non vérifiable. Un chantier distinct, hors périmètre.

## Décision demandée

☐ **Statu quo** — `search_log.jsonl` reste ignoré, justification existante conservée *(recommandé)*
☐ **Versionner** — en assumant qu'un flux qui churne entre dans l'historique
☐ **Ouvrir le chantier « politique des flux »** — énoncer une fois la règle pour les
  239 `.jsonl` suivis, au lieu de la trancher fichier par fichier

Tant qu'aucune case n'est cochée, `.gitignore` reste inchangé.
