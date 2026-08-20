# PROJECT BIBLE — <nom du projet>

> Mémoire de DÉCISION d'un jeu, persistante ENTRE les runs Forge (à côté de `state.json`
> dans `lab/forge_runs/<projet>/`). Lue en `mandatory_read` par l'étape 0 (s0-contrat) du
> run suivant : c'est le canal par lequel la vision cesse d'être reconstruite à zéro.
>
> **Gouvernance** : mémoire de RÉFÉRENCE. Un agent Forge n'écrit JAMAIS ici — il *propose*
> une entrée via `studio_link.propose_bible_entry(...)` (dépôt propose-only dans
> `lab/reports/forge_bible_proposals.jsonl`). **Pierre seul ratifie** (promeut la proposition
> dans ce fichier). Instantané daté à chaque édition. `claim_verdict: NO_CLAIM_ALLOWED`.

- **Projet** : <nom>
- **Dernière ratification** : <AAAA-MM-JJ, Pierre>

## 1. Vision
<Une à trois phrases. Ce que le jeu EST, pour qui, la sensation visée. Stable — change rarement.>

## 2. Piliers (3–5, non négociables)
- <pilier 1 — la propriété qui, si on la retire, casse le jeu>
- <pilier 2>
- <pilier 3>

## 3. Contraintes
- <runtime (HTML/2D prouvé) · déterminisme · budget · plateforme · accessibilité…>

## 4. Décisions VALIDÉES (+ raison)
| Date | Décision | Raison | Preuve / source |
|---|---|---|---|
| <AAAA-MM-JJ> | <ce qui est acté> | <pourquoi> | <oracle/verdict/gate Pierre> |

## 5. Décisions ABANDONNÉES (+ raison du rejet)
> Le plus précieux : empêche un run futur de re-proposer une voie déjà écartée.

| Date | Voie écartée | Raison du rejet | Remplacée par |
|---|---|---|---|
| <AAAA-MM-JJ> | <approche abandonnée> | <pourquoi elle échoue / a été refusée> | <la décision retenue à la place> |

## 6. Questions ouvertes (fog HumanGate)
- <ce qui n'est pas encore tranché — reste au jugement de Pierre>
