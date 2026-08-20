# Join / convergence parallèle — conception pour une passe FUTURE dédiée

> Statut : **DOCUMENTED_ONLY — rien n'est construit dans `src/`**.
> Décision de prudence (Phase 5 du rattrapage) : le risque de casser la fondation dépasse
> la valeur d'un ajout partiel. À implémenter dans une passe isolée, avec sa propre suite de tests.
> claim_verdict: NO_CLAIM_ALLOWED.

## 1. Pourquoi le moteur est linéaire aujourd'hui (constat vérifié)

Lecture de `src/core/engine.ts` + `src/runtime/scheduler.ts` :

| Invariant actuel | Emplacement | Conséquence pour un join |
|---|---|---|
| **Un seul nœud de départ** (exactement 1 nœud à 0 arête entrante non-loop, sinon throw) | `engine.ts:findStartNode` (l.42) | Deux producteurs (A et B, tous deux racines) → `findStartNode` **lève une exception**. Un vrai graphe parallèle ne peut même pas démarrer. |
| **Curseur unique séquentiel** (`runLoop` avance nœud par nœud) | `engine.ts:runLoop` / `runGraph` | Impossible de visiter A **et** B avant le Merger : le curseur ne suit qu'un seul chemin. |
| **`resolveNextNode` renvoie UN seul next** | `scheduler.ts:192` | Pas de frontière/queue de nœuds « prêts ». Le fan-out n'existe que via `router`, qui choisit **UNE** branche. |
| **Fan-in non géré** | (aucune logique) | Un nœud à 2 arêtes entrantes est structurellement toléré, mais le moteur ne « converge » jamais — il n'attend pas que tous les prédécesseurs aient produit. |
| **Pause/reprise à curseur unique** (`pausedAt` = 1 nœud) | `engine.ts:resumeGraph` (l.210) | Un ordonnanceur multi-frontière casserait la sémantique HumanGate reprise. |
| **Cycles non-loop rejetés** | `scheduler.ts:validateGraph` (l.161) | Certains motifs de convergence pourraient déclencher ce garde-fou. |

**Merge Engine actuel** : la brique importée (`chain-mr57tuy5`) est explicitement une
*représentation LINÉAIRE* (sourceRef : « représenté avec briques TCS existantes routing/oracle/
artefact »). Ce n'est donc PAS un vrai join — c'est une approximation séquentielle.

## 2. Rayon d'impact d'un ajout naïf (pourquoi on ne code rien maintenant)

Un mécanisme de join correct exige de modifier **le cœur** :
`findStartNode` (multi-racines) + `runLoop` (ordonnanceur à état de préparation) +
`resolveNextNode` (frontière) + `resumeGraph` (multi-curseur) + `validateGraph`.

Or **toute** la surface existante dépend du curseur unique et est verrouillée par les tests :
double-run search/chat, Council gate v1 / looped (loop edges + router), chaîne idée→IMP,
run_chain, Validation Loop, HumanGate pause/reprise. 46 tests Vitest + toutes les validations
Playwright encodent la sémantique séquentielle. Un ajout partiel risque de casser cette fondation.

## 3. Conception minimale proposée (passe future, isolée)

Objectif volontairement restreint : **convergence LOGIQUE**, PAS de vraie concurrence d'exécution
(le moteur reste séquentiel dans son exécution réelle ; les producteurs tournent l'un après l'autre,
mais le join n'exécute qu'une fois TOUS ses prédécesseurs déclarés terminés).

1. **Nouveau type de nœud `join`** (data : `waitFor: string[]` = ids des prédécesseurs attendus).
   Ne consomme rien d'autre ; sa sortie = agrégat `{ inputs: { <predId>: output } }`.
2. **Ordonnanceur à préparation (readiness) derrière un flag** — actif UNIQUEMENT si le graphe
   contient ≥1 nœud `join`. Sinon, `runLoop` actuel inchangé (zéro régression sur l'existant) :
   - Frontière = ensemble de nœuds prêts (tous prédécesseurs non-loop exécutés).
   - Un `join` n'entre dans la frontière que quand `waitFor` est entièrement satisfait ; sinon
     il est mis en attente et le curseur explore les autres branches d'abord (exécution toujours
     séquentielle, ordre déterministe par ordre de déclaration).
3. **`findStartNode` → `findStartNodes`** (liste) UNIQUEMENT en mode join ; l'API mono-racine
   reste le défaut. Les multi-racines ne sont autorisées que si un `join` les réunit en aval.
4. **Pause/reprise** : `pausedAt` devient une frontière sérialisée (liste), reconstruite depuis
   la trace comme aujourd'hui. À concevoir avec soin — c'est le point le plus délicat.
5. **`validateGraph`** : autoriser la convergence vers un `join` sans la confondre avec un cycle
   non-loop ; exiger que chaque id de `waitFor` soit un prédécesseur réel et atteignable.

### Hors scope (à documenter explicitement le jour venu)
- Vraie concurrence d'exécution (threads / Promise.all sur les producteurs) — non couverte :
  « convergence logique supportée, concurrence d'exécution réelle toujours absente ».
- Réconciliation de conflits entre producteurs (rôle d'un Oracle/Merger en aval, pas du join).

## 4. Suite de tests dédiée (condition d'entrée de la passe future)

Avant tout code `src/`, écrire les tests qui verrouillent l'existant ET le nouveau :
- **Non-régression** : les 46 Vitest actuels + double-run + Council loop/gate + toutes les chaînes
  restent verts avec l'ordonnanceur readiness désactivé (graphe sans `join`).
- **Nouveau** : A+B→join→merger produit l'agrégat après A ET B ; join n'exécute pas si un
  prédécesseur manque ; join + HumanGate sur une branche ; join dans une boucle bornée ;
  multi-racines rejetées SANS join en aval.

Tant que cette suite n'est pas verte des deux côtés, **ne pas fusionner**.
