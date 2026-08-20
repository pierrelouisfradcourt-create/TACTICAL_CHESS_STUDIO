# Rapport red-team CODE — shmup_slice (s11-redteam-code)

> Run : `shmup_slice-20260714a` · Étape : `s11-redteam-code`
> Posture : auditeur AVEUGLÉ (n'a PAS lu les justifications du builder — seulement le code livré + le WireMap contractuel + la suite de tests scellée).
> Périmètre : lecture seule sous `games/shmup_slice/` + module KB partagé consommé. Écrit UNIQUEMENT ce fichier. `run: aucun` → aucune reproduction exécutée par moi.
> Contrat : chaque faille cite une reproduction déterministe, exécutable par un oracle non-LLM en aval. Le red-team CRITIQUE, l'oracle PROUVE. `claim_verdict: NO_CLAIM_ALLOWED`.

---

## Synthèse

3 écarts contrat↔code trouvés, dont **2 sont à la fois un défaut de logique réel ET une zone morte de preuve** (le défaut survit à la suite scellée « mutation 100% » parce que le chemin buggé n'est jamais asserté). Le 3e est une divergence de spécification de faible sévérité.

| # | Angle | Sévérité | Nature |
|---|---|---|---|
| F1 | Consommation de projectile ennemi (R7) | **HIGH** | défaut de logique + zone morte de preuve |
| F2 | Score exact par kill (R6/R9) | **MEDIUM** | défaut de logique + zone morte de preuve |
| F3 | « Une touche = UN tir » (R2) | LOW | divergence de spec (design plausible) |
| F4 | Statut `'BOSS'` déclaré jamais assigné | LOW/info | code mort / mismatch doc-état |

---

## F1 — [HIGH] Le projectile ennemi qui touche le joueur n'est PAS retiré (bullet « immortelle »)

**Angle** : correction — cohérence du prédicat de retrait des projectiles ; R7 (« tir ennemi→joueur : −1 vie », qui implique que le projectile est CONSOMMÉ).

**Faille** : dans `logic/collisions.mjs` `resolveEnemyHits`, le projectile touchant est marqué `proj.y = -100` « pour retrait » (ligne 63), puis le filtre de fin de fonction est :

```js
state.enemyProjectiles = state.enemyProjectiles.filter(p => p.y < 700); // collisions.mjs:68
```

`-100 < 700` est **vrai** → le projectile marqué est **CONSERVÉ**, pas retiré. Le prédicat de retrait est incohérent avec le marqueur : le côté joueur retire correctement avec `filter(p => p.y >= -50)` (`resolvePlayerHits`, collisions.mjs:47), qui élimine bien `y=-100`. Le côté ennemi utilise `< 700` et le rate.

**Conséquence** (impact au-delà de l'assertion prouvable) : le projectile survit, redescend (`vy>0`) et peut re-toucher le joueur après expiration des i-frames — potentiellement en boucle (à chaque toucher il est re-marqué `-100` et repart du haut). Une seule balle peut donc drainer plusieurs vies. Les tirs de boss transitent aussi par `enemyProjectiles`, donc ils sont concernés.

**Reproduction (déterministe, oracle non-LLM en aval)** — assertion falsifiable et minimale (une frame, API publique) :

```js
import { createInitialState, SHIP_WIDTH, SHIP_HEIGHT } from './logic/state.mjs';
import { resolveEnemyHits } from './logic/collisions.mjs';

const s = createInitialState();
s.ship.invincibilityMs = 0;
s.enemyProjectiles = [{ x: s.ship.x + SHIP_WIDTH / 2, y: s.ship.y + SHIP_HEIGHT / 2, vx: 0, vy: 150 }];
const lives0 = s.lives;

resolveEnemyHits(s);

// Attendu contrat R7 : la vie baisse de 1 ET le projectile est consommé.
console.assert(s.lives === lives0 - 1, 'une vie perdue');            // PASSE
console.assert(s.enemyProjectiles.length === 0, 'projectile retiré'); // ÉCHOUE : length===1, y===-100
process.exit(s.enemyProjectiles.length === 0 ? 0 : 1);
```

Attendu de l'oracle : **exit 1** (la 2e assertion échoue) → prouve que le projectile n'est pas consommé.

**Zone morte de preuve associée** : le SEUL test qui observe `enemyProjectiles.length` après `resolveEnemyHits` est le cas INVINCIBLE (`logic.test.mjs:216-226`), qui attend `length === 1` (aucun toucher, projectile normal conservé). **Aucun test n'exerce le cas « touché avec invincibilité=0 » en asserttant le retrait.** La mutation « 100% » sur `collisions.mjs` peut donc être vraie tout en laissant passer ce bug : la mutation tue des mutants sur du code exercé, elle ne révèle pas un comportement de retrait jamais asserté.

---

## F2 — [MEDIUM] Score fantôme : les ennemis qui sortent par le BAS de l'écran sont comptés comme des kills

**Angle** : correction — R6 (« tir joueur→ennemi : destruction + score EXACT ») et R9 (« score : valeur EXACTE »).

**Faille** : `logic/scoring.mjs` `updateScoreFromKills` déduit les kills d'un simple différentiel de comptage :

```js
const enemiesKilled = Math.max(0, prevEnemyCount - currentEnemyCount); // scoring.mjs:17
```

Or `currentEnemyCount` est mesuré APRÈS **deux** retraits dans `step.mjs` : `removeDeadEnemies` (hp≤0) **ET** `removeEnemiesBelowScreen` (`enemies.mjs:87-89`, retire `e.y >= GAME_HEIGHT`). Un ennemi qui descend hors écran **sans avoir été touché** fait baisser `currentEnemyCount` → est compté comme kill → `+100` de score (`SCORE_VALUES.enemyKill`). Le score n'est donc pas « exact par kill » : il est gonflé par les ennemis qui s'échappent. Les ennemis descendent bien (`updateEnemyMovement` : `y += 20*dt` / `15*dt`), donc le chemin est atteignable en jeu réel.

**Reproduction (déterministe, oracle non-LLM en aval)** :

```js
import { createInitialState, GAME_HEIGHT } from './logic/state.mjs';
import { step } from './logic/step.mjs';
import { createRng } from './logic/rng.mjs';

const s = createInitialState();
const rng = createRng(1);
// Un ennemi déjà au bord bas, aucun tir joueur.
s.enemies = [{ x: 100, y: GAME_HEIGHT, vx: 0, vy: 0, hp: 1,
               pattern: 'invaders_descent', fireCountdown: 1e9,
               wave: { fireRate: 1 }, tOffset: 0 }];
const score0 = s.score; // 0
step(s, 0.016, { left:false, right:false, up:false, down:false, fire:false }, rng);

// Attendu contrat R6/R9 : aucun kill, aucun tir → score inchangé.
console.assert(s.score === score0, 'pas de score pour un ennemi échappé'); // ÉCHOUE : score===100
process.exit(s.score === score0 ? 0 : 1);
```

Attendu de l'oracle : **exit 1** (score passé à 100 sans tir).

**Zone morte de preuve associée** : tous les tests directs de `updateScoreFromKills` (`logic.test.mjs:583-630`) appellent la fonction avec `prevEnemyCount = 0` → la soustraction `prevEnemyCount - currentEnemyCount` reste ≤0 (kills=0) dans CHAQUE test ; le chemin de comptage des kills d'ennemis n'est jamais exercé avec un compte non nul. La propriété « score monotone » (properties.test.mjs) n'attrape pas non plus l'écart : un +100 fantôme reste monotone. L'invariant « valeur EXACTE » (R6/R9) n'est donc contraint par aucun oracle contre le chemin d'échappement.

---

## F3 — [LOW] R2 « une touche déclenche UN tir » : pas de cooldown ni de détection de front

**Angle** : conformité de spec.

**Faille** : `ship.mjs:38` `firePlayerShot` spawn un projectile à CHAQUE frame où `inputs.fire` est vrai, sans détection de front (press vs maintien) ni cooldown. Maintenir la touche = flux continu (~60/s, borné seulement par `MAX_PROJECTILES=100`). La lettre du contrat R2 est « UN tir » par touche ; l'implémentation donne un tir par frame. C'est un pattern d'auto-fire courant en shmup — d'où la sévérité faible — mais c'est une divergence de la spec littérale, non asserté.

**Reproduction (oracle non-LLM en aval)** :

```js
import { createInitialState } from './logic/state.mjs';
import { firePlayerShot } from './logic/ship.mjs';
const s = createInitialState(); s.playerProjectiles = [];
firePlayerShot(s, { fire: true }, 0.016); // maintien, pas re-press
firePlayerShot(s, { fire: true }, 0.016);
console.assert(s.playerProjectiles.length === 1, 'un maintien ne doit produire qu\'UN tir'); // ÉCHOUE : 2
```

Note : selon l'intention de design (auto-fire assumé ?), ce point relève d'un **jugement HumanGate** plutôt que d'un défaut dur. Remonté en fog.

---

## F4 — [LOW/info] Statut `'BOSS'` déclaré mais jamais assigné ; défaite gardée sur `'ACTIVE'` seul

**Angle** : code mort / cohérence état-machine.

`state.mjs:25` documente `status ∈ {'ACTIVE','BOSS','WON','LOST'}` et `step.mjs:43` teste `status !== 'BOSS'`, mais **aucun site n'assigne jamais `'BOSS'`** (le spawn de boss met `bossActive=true` sans toucher `status`). Branche morte. `resolveDefeat` (`progression.mjs:5`) ne déclenche que si `status === 'ACTIVE'` : correct tant que `'BOSS'` reste inatteignable, mais la branche `!== 'BOSS'` et la valeur documentée sont trompeuses. Pas de défaut de comportement observable démontré → info, pas de reproduction dure. Nettoyage recommandé.

**Observation connexe (non-défaut, tie-break de design)** : à la frame où le boss 3 tombe ET les vies atteignent 0, `resolveVictory` (step.mjs:101) précède `resolveDefeat` (step.mjs:102) → la victoire l'emporte. Choix de design, signalé pour ratification, pas un bug.

---

## Périmètre de la surface de preuve (ce que je NE conteste PAS)

- L'oracle de solvabilité (`solvability.mjs`) n'importe que `logic/` et `bot/` — **pas** `main.mjs` ni de hook `__game_debug`. La preuve de winnabilité ne passe donc pas par un hook debug (AI-5 respecté). La sonde de contrôle (mur de projectiles → INJOUABLE) exécute le vrai `hasSafeCorridor` : ce n'est pas un placeholder fabriqué. **Non falsifié.**
- Le RNG est bien seedé (`rng.mjs`, xorshift32), aucun `Math.random/Date.now` dans `logic/`. **Non falsifié.**
- Le survivant de mutation `dodge.mjs:55` (`le->lt`) est plausiblement équivalent selon `mutation_triage.json` (écart de fusion de largeur 0 < SHIP_WIDTH) ; je ne le conteste pas.
- Note : F1/F2 démontrent que « mutation 100% » n'est PAS une garantie d'exactitude fonctionnelle ici — la mutation mesure l'exercice de lignes existantes, pas la présence des assertions de retrait/scoring manquantes. La couverture mutation reste un indicateur, pas une preuve d'absence de défaut sur les chemins non assertés.

---

## RAPPORT FINAL (restitution)

- **software_verdict** : je NE peux PAS l'émettre. Mon contrat impose `run: aucun` — je n'ai exécuté aucune des reproductions. F1 et F2 sont des défauts établis par **analyse statique du code livré et de la suite scellée**, mais leur statut mécanique (FAIL) doit être prononcé par l'oracle en aval qui EXÉCUTE les 3 reproductions fournies ci-dessus. Ce sont des artefacts prêts à exécuter, pas des verdicts auto-certifiés.
- **evidence_verdict** : `MECHANICAL_VALIDATION_ONLY` — chaque faille F1/F2/F3 est adossée à une reproduction déterministe exécutable par un oracle non-LLM (node, API publique). F4 = observation statique sans reproduction dure.
- **claim_verdict** : `NO_CLAIM_ALLOWED`. Aucune affirmation auto-certifiée : je remonte, en **fog → HumanGate**, le besoin d'exécuter les 3 reproductions (F1, F2, F3) par l'oracle de code du run avant tout `software_verdict`, et le jugement de design sur F3 (auto-fire assumé ou non) + le tie-break victoire/défaite (F4).

### Besoins HumanGate (fog)
1. Faire exécuter par un oracle non-LLM les reproductions F1 et F2 (attendu : exit 1 des deux) pour confirmer mécaniquement les défauts avant s12-verdict.
2. Trancher l'intention de design de F3 (R2 : tir unique par pression vs auto-fire) — spec à préciser, pas un défaut dur.
3. Ratifier ou corriger la branche morte / valeur `'BOSS'` (F4) et le tie-break victoire>défaite.
