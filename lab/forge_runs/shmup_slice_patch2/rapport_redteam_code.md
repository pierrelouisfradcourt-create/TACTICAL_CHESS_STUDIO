# Rapport Red-Team CODE — shmup_slice_patch2-20260718a (s11-redteam-code)

> **Auditeur AVEUGLÉ.** Chaque faille cite une **ancre non-LLM** (fichier:ligne,
> reçu d'oracle existant, grep, ou harnais déterministe à exécuter en aval).
> Aucune faille sur simple suspicion (garde-fou du contrat).
>
> **Ré-audit daté 2026-07-18.** Un rapport red-team antérieur existait dans ce
> `run_dir` : il auditait un **état plus ancien** du build (passe rendu brute,
> gate mutation encore `BLOCKED`, `render.mjs:314 = Date.now()`, `size` mort dans
> `drawEnemy`). J'ai **confronté chacune de ses failles au code actuel** avant de
> la reporter. Trois d'entre elles sont désormais **PÉRIMÉES/CORRIGÉES** (le code
> a été réécrit depuis) — je les retire explicitement §RÉTRACTATIONS pour ne pas
> propager une preuve morte. Ce fichier remplace le précédent après vérification,
> pas par écrasement aveugle.
>
> **Périmètre effectif du build courant** (artefacts amont = `wiremap.json`
> horodaté 2026-07-18 + `evidence/mutation_shmup_slice_patch2-20260718a.json` +
> `artifacts/s9-build.txt`) : passe de **durcissement des tests** refermant le
> gate mutation SANS toucher la logique — delta = `logic.test.mjs` +
> `mutation_triage.json` + `wiremap.json`. Le livrable `render.mjs` (bugs visuels
> ci-dessous) fait partie du même projet `shmup_slice_patch2` et reste expédié.

---

## Tableau de synthèse

| # | angle | sévérité | statut ancre |
|---|-------|----------|--------------|
| **T1** | Triage mutant `and->or@L24` (bot/solver) — **équivalence CONFIRMÉE** par ré-analyse indépendante | — (OK) | reçu mutation + analyse de chemin |
| **T2** | Triage mutant `le->lt@L55` (dodge) — **équivalence CONFIRMÉE** par ré-analyse indépendante | — (OK) | reçu mutation + analyse de chemin |
| **D1** | Zone morte : `validateEsquivability` importé mais jamais appelé | LOW | grep |
| **D2** | Zone morte : `createBot()` exporté mais jamais appelé | LOW | grep |
| **D3** | Zone morte / dérive de contrat : statut `'BOSS'` déclaré + branché partout mais **jamais assigné** | LOW–MED | grep |
| **L1** | Couverture bornée-par-seed : `computeBotInputs` couvert par empreinte-trace snapshot, pas en isolation | fog | reçu mutation + lecture |
| **L2** | `main.mjs` L42 : mutant tué par **timeout**, pas par assertion (fragile vu l'histoire timeout Windows) | LOW advisory | test:1040 + reçu |
| **R-F1** | Feature juice cassée : explosions sur **tout ennemi ayant bougé**, pas sur la mort | **HIGH** | inter-fichiers + harnais (non exécuté) |
| **R-F2** | Barre HP boss `maxHp=25` codé en dur → boss_1/2 à 60 %/80 % au spawn | MEDIUM | inter-fichiers (vérifié) |
| **R-F3** | `drawBoss` ignore `boss.width` (centre codé `x+40`) → boss_1/2 décentrés | LOW | inter-fichiers (vérifié) |
| **R-F4** | Distinction visuelle tir boss/ennemi par distance ±100 px (projectiles non tagués) | LOW advisory | statique |

---

## T1 — Mutant trié `and->or@L24` (bot/solver.mjs) : équivalence **CONFIRMÉE** (ré-analyse indépendante)

- **angle** : preuve de non-régression du gate — un mutant trié « équivalent » est
  une porte à surclaim s'il est en fait tuable. Je l'ai ré-instruit à charge.
- **vérification** : `solver.mjs:24` `else if (state.bossActive && state.boss)`
  muté en `||`. Ils ne divergent que si exactement l'un de `{bossActive, boss}`
  est truthy. J'ai tracé **tous** les sites d'écriture de ce couple :
  - `state.mjs:42,38` `createInitialState` → `{bossActive:false, boss:null}` (co-faux) ;
  - `step.mjs:17-18` `spawnBossIfReady` → `{bossActive:true, boss:{…}}`, gardé par
    `if (bossTemplate)` — `BOSSES[level]` toujours défini pour level∈[1,3], et le
    cas `level` hors table sort en `WON` avant (`step.mjs:50-53`) → co-vrai ;
  - `progression.mjs:22-23` `resetMapState` → `{bossActive:false, boss:null}` (co-faux).
  `computeBotInputs` ne lit l'état qu'aux **frontières de `step`** (`solver.mjs:55`
  appelle `step` APRÈS lecture) où l'invariant `bossActive ⟺ boss` tient toujours.
  `&&` et `||` sélectionnent donc la même branche pour toute entrée que `runBot`
  peut fournir.
- **conclusion** : triage **sound**, pas un surclaim. Anti-ancre empirique : le reçu
  mutation tue **13/14** autres mutants de `solver.mjs` par divergence de trace ; seul
  celui-ci survit → cohérent avec l'équivalence.
- **ancre** : `state.mjs`/`step.mjs`/`progression.mjs` (sites d'écriture) +
  `evidence/mutation_…json` (`bot/solver.mjs killed 13/total 14`, survivor `and->or@L24`).

## T2 — Mutant trié `le->lt@L55` (dodge.mjs) : équivalence **CONFIRMÉE**

- **vérification** : `dodge.mjs:55` `if (last && seg[0] <= last[1])` (fusion de
  segments bloqués) muté en `<`. Ne diffère que quand deux segments **se touchent
  exactement** (`seg[0] === last[1]`, trou de largeur 0). Un trou de largeur 0 ne
  satisfait jamais `>= SHIP_WIDTH` (=30) dans `hasSafeCorridor`/`findSafeX`
  (`dodge.mjs:67,82`). Les trois consommateurs (`hasSafeCorridor`, `findSafeX`,
  `isSafeAt`) traitent `merged` en **sémantique d'union d'ensembles** : fusionner
  `[a,b]+[b,c]` en `[a,c]` ou les garder adjacents donne le même ensemble couvert
  (vérifié pour `isSafeAt` : le point `b` est inclus des deux côtés). Aucune sortie
  observable ne diffère.
- **conclusion** : triage **sound**. Ancre : `dodge.mjs:53-58,63-71,77-100,105-109`
  + reçu mutation (`dodge.mjs 10/11`, survivor `le->lt@L55`).

---

## D1 — Zone morte : `validateEsquivability` importé mais jamais appelé

- **faille** : `logic/step.mjs:9` `import { validateEsquivability } from './dodge.mjs';`
  — la fonction (définie `dodge.mjs:111`) n'est **jamais invoquée** dans `step.mjs`
  ni ailleurs. Import mort + export partiellement mort (`hasSafeCorridor` fait le
  vrai travail dans `solvability.mjs`).
- **sévérité** : LOW (bruit ; aucun effet fonctionnel).
- **reproduction (grep, non-LLM)** :
  `grep -rn "validateEsquivability" games/shmup_slice` → **exactement 2 lignes** :
  `dodge.mjs:111` (déf) et `step.mjs:9` (import). **0 site d'appel**. Un linter
  `no-unused-vars` sur `step.mjs` échoue sur cet import.

## D2 — Zone morte : `createBot()` exporté mais jamais appelé

- **faille** : `bot/solver.mjs:74` `export function createBot()` (« compat rétro »)
  n'a **aucun call-site** dans le dépôt.
- **sévérité** : LOW.
- **reproduction (grep)** : `grep -rn "createBot" games/shmup_slice` → seulement le
  commentaire `solver.mjs:73` + la déf `solver.mjs:74`. **0 appel.**

## D3 — Zone morte + dérive de contrat : statut `'BOSS'` jamais assigné

- **angle** : le modèle d'état documente un statut que le moteur ne produit jamais
  → branches mortes disséminées + `state.mjs:25` ment sur les états atteignables.
- **faille** : `state.mjs:25` déclare `status: 'ACTIVE' // 'ACTIVE','BOSS','WON','LOST'`.
  Le statut `'BOSS'` est **comparé** dans 6 endroits (`step.mjs:43`, `solver.mjs:50`,
  `render.mjs:615`, `properties.test.mjs:54,59`, `e2e.mjs:65`) mais **jamais
  affecté** : il n'existe **aucun** `status = 'BOSS'`. La phase boss est suivie par
  le booléen `bossActive`, pas par le statut. Donc chaque clause
  `|| status === 'BOSS'` / `&& status !== 'BOSS'` est **vestigiale** : `=== 'BOSS'`
  est toujours faux, `!== 'BOSS'` toujours vrai.
- **sévérité** : LOW–MEDIUM (logique morte + doc d'état fausse). *Note mutation* :
  ces demi-conditions mortes seraient des mutants équivalents pour un opérateur qui
  les toucherait ; le jeu d'opérateurs actuel ne mute pas les littéraux de chaîne
  (le reçu montre `step.mjs 21/21`, aucun survivant) → pas de trou de gate **aujourd'hui**,
  mais surface fragile si le jeu d'opérateurs s'élargit.
- **reproduction (grep)** : `grep -rn "'BOSS'" games/shmup_slice` → toutes les
  occurrences sont des **comparaisons** ou le **commentaire** `state.mjs:25` ;
  `grep -rn "status = 'BOSS'" games/shmup_slice` → **0**.

---

## L1 — Couverture de `computeBotInputs` bornée par seed (snapshot), pas en isolation — **fog**

- **angle** : épistémique. Le gate est refermé sur `bot/solver.mjs` via l'empreinte
  de trace `R22` (`logic.test.mjs:870-892`), qui fige des valeurs EXACTES
  (`finalScore`, `steps`, `finalLives`) **mesurées sur le bot livré** pour seeds 1-5.
  C'est un test de **caractérisation/snapshot** : il tue 13/14 mutants car ils font
  diverger la trace sur ces 5 seeds, mais il **ne peut structurellement pas** détecter
  une mutation qui laisse la trace seeds-1-5 inchangée tout en changeant le
  comportement ailleurs. `computeBotInputs` est non exporté (couvert « par
  comportement observable, pas en isolation » — reconnu par le build).
- **statut** : **PAS une faille prouvée.** Empiriquement, sur le jeu d'opérateurs
  utilisé, seul L24 (prouvé équivalent, T1) a survécu — je ne dispose d'aucune
  reproduction d'un mutant échappé, et le garde-fou m'interdit la suspicion nue.
- **fog → HumanGate** : est-ce que la couverture snapshot bornée-par-5-seeds d'une
  fonction de navigation non exportée est acceptable en régime permanent, ou faut-il
  exporter `computeBotInputs` pour un test d'isolation ? (jugement Pierre).
- **ancre** : `logic.test.mjs:870-892` + reçu mutation (`bot/solver.mjs 13/14`).

## L2 — `main.mjs` L42 : mutant tué par **timeout**, pas par assertion — advisory

- **faille** : le test `R26 L42` (`logic.test.mjs:1040-1050`) tue le mutant
  `minuseq->pluseq` de l'accumulateur (boucle `while` infinie) en s'appuyant sur le
  **timeout du harnais** (« le while ne terminerait jamais => timeout = mutant tué »).
  Légitime, mais **dépendant de la config timeout** — fragile vu l'historique de ce
  run (pré-mortem `s9-build` réparé 2× pour timeout ; incident mémoire « faux BLOCKED
  par bug timeout Windows »). Si le timeout par-test est désarmé, ce mutant **fige**
  la run au lieu d'être marqué tué.
- **statut** : empiriquement OK cette fois (run exit 0, `main.mjs 18/18`). Advisory.
- **ancre** : `logic.test.mjs:1040-1050` + reçu mutation (`main.mjs 18/18`).

---

## R-F1 — Explosions déclenchées sur tout ennemi ayant BOUGÉ, pas sur la mort (**HIGH**)

- **angle** : la feature de feedback « juice » (explosion à la destruction) est le
  cœur du livrable rendu de patch2 ; elle est mal déclenchée.
- **faille** : `render.mjs:545-548` détecte les morts par comparaison image-à-image :
  ```js
  for (const oldEnemy of renderState.lastEnemies) {
    const stillAlive = state.enemies.some(
      e => e.x === oldEnemy.x && e.y === oldEnemy.y && e.hp === oldEnemy.hp);
    if (!stillAlive) { addExplosion(oldEnemy.x + 15, oldEnemy.y + 12); }
  }
  ```
  La clé de match inclut `x` **et** `y`. Or `logic/enemies.mjs` `updateEnemyMovement`
  mute la position **chaque pas** (`invaders_descent` : `y += 20*dt`, `x += vx*dt` ;
  `sine_weave` : `y += 15*dt`). À la frame N+1, un ennemi vivant qui a bougé n'a plus
  le même `(x,y)` qu'au snapshot N → `stillAlive === false` → une explosion est
  empilée à son ancienne position **à chaque frame**. La vraie mort (retrait de
  `state.enemies`) est noyée dans ce bruit permanent.
- **sévérité** : **HIGH** — le livrable de ce patch EST le rendu ; la feature centrale
  de feedback est visuellement cassée (traînée d'explosions fantômes).
- **reproduction** : ancre statique = `render.mjs:546` (clé `x,y,hp`) vs
  `logic/enemies.mjs` (mutation `x/y` chaque pas) — **mécaniquement démontrable**.
  Confirmation runtime = harnais headless (stub `ctx` enregistrant les appels ;
  `Image` stub forçant le fallback ; `render(S1)` puis `render(S2)` avec **un seul
  ennemi vivant qui a bougé** `S1={x:100,y:100,hp:1}` → `S2={x:100,y:120,hp:1}` ;
  assertion : aucun appel d'explosion). **NON exécuté** (`run=aucun`, et aucun oracle
  de rendu headless n'existe dans le dépôt) → magnitude runtime = **fog**.

## R-F2 — Barre HP boss : `maxHp=25` codé en dur (MEDIUM)

- **faille** : `render.mjs:508` `const maxHp = 25; const hpRatio = state.boss.hp / maxHp;`.
  Vérifié dans `data/bosses.mjs` : `BOSS_1.hp=15` (L5), `BOSS_2.hp=20` (L16),
  `BOSS_3.hp=25` (L27). Au spawn plein PV : boss_1 → `15/25 = 0.60` (barre à **60 %**),
  boss_2 → `20/25 = 0.80` (**80 %**), boss_3 → 100 % (correct). `fillWidth = 180*hpRatio`
  (`render.mjs:518`) ment sur 2 des 3 boss.
- **sévérité** : MEDIUM — induit le joueur en erreur (boss semble déjà entamé). Le
  commentaire L508 admet la dette.
- **reproduction (inter-fichiers, vérifié par moi)** : littéral `render.mjs:508` (25)
  vs `data/bosses.mjs:5,16,27` (15/20/25) → assertion `maxHp == hp_spawn` FAUX pour
  boss_1 et boss_2.

## R-F3 — `drawBoss` ignore `boss.width` (LOW cosmétique)

- **faille** : `render.mjs:192` `const cx = x + 40`, yeux `x+30`/`x+50` (L208), moue
  à `cx` (L227), explosion boss `x+40` (L555) — offsets codés pour une largeur ~80,
  indépendants de `boss.width`. Vérifié : `BOSS_1.width=60` (centre attendu `x+30`),
  `BOSS_2.width=70` (`x+35`), `BOSS_3.width=80` (`x+40`, correct). Sprite des boss 1
  et 2 décalé de +10/+5 px et surdimensionné vs la hitbox (`resolveBossHits` utilise
  `boss.width`).
- **sévérité** : LOW — cosmétique, aucune conséquence mécanique.
- **reproduction (inter-fichiers)** : offsets `drawBoss` (max `x+50` → largeur
  implicite ~80) vs `data/bosses.mjs:7,18,29` (60/70/80).

## R-F4 — Distinction visuelle tir boss/ennemi par distance ±100 px (LOW advisory)

- **faille** : `render.mjs:576`
  `if (state.boss && Math.abs(proj.x - state.boss.x - state.boss.width / 2) < 100)`
  classe un projectile « tir boss » selon sa proximité horizontale au boss. Aucun
  projectile ne porte de champ `source` (`logic/projectiles.mjs`/`spawnProjectile`
  ne taguent pas l'origine) → un tir d'ennemi de vague passant à < 100 px du boss est
  rendu comme tir boss (et inversement). Purement visuel.
- **sévérité** : LOW advisory.
- **reproduction (statique)** : `projectiles.mjs` n'a aucun champ `source` sur les
  projectiles → la distinction repose sur une supposition de position.

---

## RÉTRACTATIONS (failles du rapport antérieur, désormais PÉRIMÉES — confrontées au code courant)

> Devoir de vérificateur indépendant : ne pas propager une preuve morte. Les trois
> failles suivantes du rapport antérieur **ne tiennent plus** contre le code actuel.

- **Prior F2 « gate mutation BLOCKED / s9 surclaime OK »** → **RÉSOLU par ce build même.**
  Le build courant a **rejoué la mutation** : `evidence/mutation_shmup_slice_patch2-20260718a.json`
  existe (`killed 110/total 112`, `gate.passed=true`, `exception=true`, 2 survivants
  triés). Le `wiremap.json` courant liste bien `logic_files`. Le `s9-build.txt` courant
  **ne surclaime pas** : il refuse un OK propre (survivants triés → `exception=True`,
  route HumanGate) et déclare honnêtement ne pas pouvoir signer le reçu HMAC lui-même.
  La cause racine du BLOCKED antérieur (aucun `logic_files`/`wiremap`, mutation
  héritée d'un autre run) **n'existe plus**.
- **Prior F3 « fond non déterministe (`Date.now()` render.mjs:314) »** → **RÉSOLU.**
  `grep -nE "Date\.now|Math\.random|performance\.now" render.mjs` = **0 occurrence
  de code** (uniquement des commentaires affirmant leur absence, L309/L333). Le fond
  a été réécrit en positions codées en dur (`CANDY_DECOR`). Plus de flaw.
- **Prior F5 « zone morte `size` dans `drawEnemy` »** → **RÉSOLU.** `drawEnemy` courant
  (`render.mjs:118+`) ne déclare plus de `const size` inutilisé (réécrit en cx/cy/grad).

---

## RAPPORT FINAL (software / evidence / claim séparés)

**Portée de restitution** : je CRITIQUE ; les oracles PROUVENT. Je ne me substitue à
aucun oracle. Vocabulaire de verdict : **OK / FAIL / BLOCKED** uniquement.

### software_verdict : **FAIL** (scopé au livrable rendu) — le delta gate-mutation, lui, est **OK**
Appuyé par des ancres mécaniques :
- **R-F1** (HIGH) — ancre inter-fichiers `render.mjs:546` (clé `x,y`) vs
  `logic/enemies.mjs` (position mutée chaque pas) : la logique de détection de mort
  du rendu est **mécaniquement défectueuse**. La *magnitude* runtime reste fog (pas
  d'oracle headless). C'est le motif racine du FAIL du livrable rendu.
- **R-F2** (MEDIUM) — `render.mjs:508 (maxHp=25)` vs `data/bosses.mjs (15/20/25)` :
  barre HP fausse pour boss_1/boss_2 (mécaniquement prouvé, inter-fichiers).
- **R-F3/R-F4/D1/D2/D3** — ancres statiques (décentrage, heuristique, zones mortes).
- **En regard, le delta réellement audité (durcissement tests + gate mutation) est OK** :
  reçu `evidence/mutation_…json` (110/112, `passed=true`), reçu `evidence/oracle_…log`
  (logic/properties/solvabilité 5 seeds/e2e), et ma **ré-confirmation indépendante** des
  2 survivants triés comme réellement équivalents (T1, T2). Aucune violation d'ownership
  (`logic/`, `data/`, `bot/`, `main.mjs` non modifiés dans ce delta ; seuls
  `logic.test.mjs` + `mutation_triage.json` + `wiremap.json` touchés) ; aucun test
  tautologique (assertions `==`/`strictEqual` exactes, conditions AND/OR isolées).

### evidence_verdict : **MECHANICAL_VALIDATION_ONLY**
Toutes les affirmations ci-dessus s'appuient sur des ancres non-LLM déjà matérialisées
(reçus `mutation`/`oracle`, contenu source `render.mjs`/`data/bosses.mjs`/`logic/*.mjs`,
greps reproductibles). Aucune n'est un jugement esthétique.

### claim_verdict : **NO_CLAIM_ALLOWED** + fog → HumanGate (Pierre)
- **R-F1 (magnitude runtime)** : l'ancre du défaut de logique est statique et tient,
  mais la confirmation « explosions fantômes à chaque frame » exige un **oracle de
  rendu headless qui n'existe pas** dans le dépôt. *Rapporté ≠ démontré* pour la
  magnitude : **fog** = écrire/exécuter cet oracle headless.
- **L1** : acceptabilité de la couverture snapshot bornée-par-seed de `computeBotInputs`
  (non exporté) — jugement Pierre.
- **Conformité artistique** (esprit kawaii/TwinBee) : hors oracle — fog playtest Pierre.

### Besoins HumanGate remontés
1. **Oracle de rendu headless manquant** — sans lui, R-F1 (et la validation visuelle
   en général) restent non mécaniquement prouvés. Levier durable pour la lane Forge
   « visuel » (déjà pointé par la mémoire « oracle Forge ne teste QUE la mécanique »).
2. **Zones mortes D1/D2/D3** — décision : nettoyer (`validateEsquivability`,
   `createBot`, statut `'BOSS'`) ou ratifier comme dette assumée. D3 corrige aussi
   le commentaire d'état `state.mjs:25` qui documente un statut inatteignable.
3. **Décision merge/reject/freeze** — le gate mutation est franchi **avec survivants
   triés** (`exception=True`) : jamais un OK propre en aval. Combiné au **FAIL du
   livrable rendu** (R-F1/R-F2), la décision revient à HumanGate.
