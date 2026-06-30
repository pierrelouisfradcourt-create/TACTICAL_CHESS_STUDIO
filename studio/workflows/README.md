# studio/workflows — Workflow Store v1 (IMP-221)

Magasin de processus du studio. Un processus = une connaissance opérationnelle
réutilisable, capturée sous forme de fichier markdown versionné. C'est la mémoire
*procédurale* du studio (par opposition au LEDGER qui est la mémoire des tâches).

## Invariant

> Un workflow = un fichier markdown. `oracle_type: structure`.

`oracle_type: structure` signifie qu'on prouve l'EXISTENCE et la STRUCTURE du fichier
(sections présentes, format respecté), jamais un effet fonctionnel. Aucun workflow
ici ne « revendique » un résultat — `claim_verdict: NO_CLAIM_ALLOWED`.

## Rôle de chaque dossier

| Dossier | Rôle (1-2 lignes) |
|---|---|
| `workflow_store/` | Index/catalogue des workflows existants. Point d'entrée pour découvrir ce qui existe déjà avant d'en réinventer un. |
| `playbooks/` | Procédures séquentielles « quand X, fais ces étapes » (ex : failure harvest, kickoff). Pipeline reproductible. |
| `protocols/` | Contrats d'interaction stricts entre agents / lanes / outils (qui parle à qui, dans quel ordre, avec quelles garanties). |
| `ceremonies/` | Rituels récurrents datés (tick du soir, revue de sprint, audit quotidien). Cadence du studio. |
| `contracts/` | Templates de contrat de mission — ce qu'un IMP/agent s'engage à faire et à ne pas faire avant exécution. |
| `checklists/` | Listes de vérification actionnables `- [ ]` à cocher avant/pendant une action à risque (ex : audit moteur). |
| `policies/` | Règles permanentes et invariants de gouvernance (ce qui est interdit, ce qui requiert une gate). |
| `metrics/` | Définitions de métriques de processus (quoi mesurer, comment, seuil). Pas les valeurs — les définitions. |
| `process_mining/` | Analyses dérivées des logs (`events.jsonl`, `error_journal`) : frictions détectées, répétitions, goulots. |

## Comment ajouter un workflow

1. Choisir le bon dossier ci-dessus.
2. Un seul fichier markdown, nommé en `snake_case.md`.
3. Header minimal en tête : titre + `oracle_type: structure` + posture `NO_CLAIM_ALLOWED`.
4. Référencer l'IMP d'origine s'il y en a un.
