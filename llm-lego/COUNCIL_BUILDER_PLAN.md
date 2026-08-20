# COUNCIL_BUILDER_PLAN — rôles, paramètres, boucles, bloc-note

## ⚠️ Phase 0.2 — ÉCART MAJEUR entre la table de référence et la doc du repo

La règle « la doc du repo fait foi » s'applique : **la table de référence (6 rôles,
4 boucles) ne correspond PAS au Council réellement implémenté dans le repo.**

### Ce que dit le repo (source de vérité)
- `scripts/council.py` (IMP-198), `.claude/skills/council/skill.md`, `lab/council/`.
- Le vrai Council TCS est un **GATE parallèle à 3 voix**, PAS un pipeline itératif :

| Rôle réel (council.py) | Modèle | Temp | top_p | max_tokens | Fonction |
|---|---|---|---|---|---|
| PLAN_REVIEW | Claude proxy :8765 (fallback Qwen) | 0.2 | non défini | défaut modèle | Plan + self-review |
| RED_TEAM | Qwen 2.5-14b :1234 | 0.2 | non défini | défaut modèle | Risques, objections |
| DIVERGENCE | Gemini Flash (fallback Qwen) | 0.4 | non défini | défaut modèle | Hypothèses alternatives (advisory) |

- Flux réel : `IMP(AUDIT_REQUIRED) → 3 revues async parallèles (timeout 120s) →
  synthèse → HumanGate (Pierre)`. **Aucune boucle de rétroaction.**
  Verdicts : APPROUVE / BLOQUE / ESCALADE / DIVERGENCE.
  council.py:11 dit explicitement **« Pas d'auto-résolution v1 »** → tout désaccord
  remonte à Pierre. Pas de tester/reviewer séparés, pas de coder.

### Différences vs la table fournie
| Aspect | Table de réf | Repo réel |
|---|---|---|
| Nombre de rôles | 6 (planner/redteam/explorer/coder/tester/reviewer) | 3 (PLAN_REVIEW/RED_TEAM/DIVERGENCE) |
| Noms | claude-planner, qwen-redteam, gemini-explorer, qwen-coder… | PLAN_REVIEW, RED_TEAM, DIVERGENCE |
| Temp Claude | 0.3–0.5 | 0.2 |
| Temp Qwen redteam | 0.6–0.8 | 0.2 |
| Temp Gemini | 0.7–0.9 | 0.4 |
| top_p / max_tokens | 0.9 / 2000–16000 | non paramétrés (défauts modèle) |
| Boucles | 4 boucles itératives | **0 — c'est un gate one-shot** |
| Auto-résolution | implicite (les boucles ferment) | **explicitement NON (v1)** |

→ La table de référence décrit une **architecture-cible idéalisée** (vision), le repo
   implémente une **v1 = gate**. Les deux sont légitimes mais distinctes.

## Décision (résolue avec Pierre en session) : **(C) Hybride**
Moteur boucles générique + les DEUX jeux de rôles étiquetés dans le builder
(« v1 réel » 3 gate roles aux params council.py ; « cible » 6 pipeline roles aux
params de la table). Exemple `Council ↻ looped` (boucle rapide coder/tester/reviewer)
pour prouver les boucles ; exemple `Council gate v1` fidèle au repo (3 voix, 0 boucle,
note signalant parallèle-vs-séquentiel + « pas d'auto-résolution v1 »).

Options considérées :
- **(A)** Builder représente la **cible idéalisée** (6 rôles + boucles de la table), avec
  cette divergence documentée en tête. Le moteur gagne un vrai support de boucles.
- **(B)** Builder **fidèle au repo v1** (3 rôles gate, 0 boucle). Le support boucles
  moteur reste codé (générique) mais l'exemple Council est un gate, pas une boucle.
- **(C)** Hybride : support boucles moteur + **les deux jeux de rôles** étiquetés
  (« v1 réel » = 3 gate roles ; « cible » = 6 pipeline roles), exemple looped pour
  prouver les boucles + exemple gate pour la fidélité v1.

## Phase 0.3 — Support boucles : approche moteur (vrai quel que soit A/B/C)
Le support de boucles est une capacité moteur générique, utile dans tous les cas.

**Problème structurel identifié :** une boucle `Reviewer → (NOK) → Coder` donne à Coder
une edge entrante → `findStartNode` (qui exige exactement 1 nœud à 0 entrante) lèverait
« exactly one start node ». Donc une boucle ne peut PAS être juste « maxSteps relâché ».

**Approche : edges de boucle de première classe.**
1. `Edge` gagne `loop?: true` + `maxIterations?: number` (défaut p.ex. 10). Une edge de
   boucle porte une `condition` (le verdict qui déclenche le retour, ex `"NOK"`).
2. `findStartNode` : compte les entrantes **en excluant les edges `loop`** → la cible
   d'une boucle reste éligible comme start. Invariant « exactly one start node » conservé.
3. `validateGraph` :
   - sous-graphe des edges **non-loop** doit être **acyclique** → un cycle accidentel
     (sans `loop`+condition) est **rejeté** (différencie boucle intentionnelle vs cycle infini).
   - toute edge `loop` doit avoir une `condition` non vide (sinon rejet).
   - règle « seuls les routers branchent » : ne compte que les edges sortantes
     **non-loop** (un non-router garde ≤1 edge forward + N edges loop).
4. `resolveNextNode` : à un nœud, lire la décision de sortie
   (`output.decision ?? output.routeKey ?? output.intent`). Si une edge loop matche la
   décision ET `count[edge] < maxIterations` → la suivre (incrémente), `reason:"loop-iteration"`.
   Sinon edge forward normale / branchement router / fin. Loop épuisée → `reason:"loop-max-iterations"`,
   sortie propre (pas d'erreur).
5. **Réexécution d'un nœud — choix tranché : state ÉCRASÉ (latest), trace VERSIONNÉE.**
   `state.nodes[id]` garde la dernière sortie (les routers/décisions lisent toujours le
   courant, résolution de path simple). L'**historique** vit dans la trace : chaque
   `TraceStep` gagne `iteration` (1,2,3…). La trace est déjà append-only → c'est le
   registre versionné naturel. On voit la boucle tourner puis s'arrêter.
6. Itération exposée aux adapters : `AdapterFn` gagne un 3e param optionnel
   `meta?: { nodeId, iteration }` (rétro-compatible). Le mock reviewer déterministe lit
   `meta.iteration` + `data.okAfter` → NOK tant que `iteration <= okAfter`, puis OK.

**Tests Vitest :** (a) boucle NOK,NOK,OK s'arrête à l'itération 3 sur OK ;
(b) reviewer toujours NOK + maxIterations=3 → 3 passes puis arrêt propre ;
(c) cycle non-loop sans condition → rejeté par validateGraph.

## Phase 2 — UI
- Nœud `agent` : champ `role` (select), + `model/temperature/top_p/max_tokens` dans
  l'inspecteur, pré-remplis selon le rôle (valeurs de la table OU du repo selon A/B/C),
  éditables. Badge couleur par rôle.
- Nœud `note` : post-it, non-exécutable, **exclu de `toEngineGraph`** (le moteur ne le
  voit jamais), sans effet runtime des handles.
- Edges de boucle : style distinct (pointillé/couleur) + condition éditable + maxIterations.

## Phase 3 — Playwright : prouver une vraie itération moteur (N passes puis stop),
note absente du graphe moteur, params d'agent présents dans le graphe sérialisé,
screenshots Council + trace itérée.

## Hors scope (inchangé) : vrais appels LLM, kaizen_autoloop réel, CLAIM_MATRIX/lanes,
persistance disque, vector DB, coût/monitoring.
