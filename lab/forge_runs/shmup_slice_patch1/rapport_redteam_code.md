# Rapport Red-Team CODE — shmup_slice_patch1-20260718a (s11-redteam-code)

> Auditeur aveuglé (contexte vierge). Je n'ai pas lu le raisonnement du builder.
> `run: aucun` — je n'ai exécuté aucune reproduction ; chaque faille cite une ancre
> mécanique (contenu d'artefact, `state.json`, grep/glob disque, ligne source) qu'un
> oracle non-LLM peut rejouer en aval.
> Vocabulaire de verdict : OK / FAIL / BLOCKED.

## Contexte de périmètre (ancre : disque)

Le contrat me demande de red-teamer « le code produit par le Builder (étape 9) ».
**Constat central : l'étape 9 de patch1 n'a produit AUCUN code.** Le livrable s9 est un
plan. Le « diff à auditer » est vide. Les failles ci-dessous portent donc d'abord sur
cette **absence de delta marquée OK** (F1–F3), puis, en advisory, sur les défauts
**pré-existants de la cible** que patch1 était censé corriger et n'a pas touchés (A1–A4).

Note d'honnêteté : `git`/shell refusés (read-only). Je n'ai pas pu produire un `git diff`
isolé ; j'ai audité l'arbre `games/shmup_slice/` **sur disque** + les artefacts du run
patch1. Les ancres ci-dessous sont toutes vérifiables sans git.

---

## FAILLES DU RUN PATCH1 (delta réel)

### F1 — [CRITICAL] Build fantôme : s9 livre un PLAN, zéro code
- **angle** : preuve factice — étape de build marquée OK sans aucun delta.
- **faille** : `artifacts/s9-build.txt` est un document de planification (« 11 Implementation
  Tasks », « saved to docs/superpowers/plans/2026-07-18-shmup-render-patch.md ») qui se
  **termine par une question interactive** : `**Which approach?** 1. Subagent-Driven /
  2. Inline Execution`. L'agent s'est arrêté pour demander, il n'a **jamais exécuté**.
  Aucun fichier de jeu modifié. `render.mjs` est toujours la version primitive
  `fillRect`/`arc` — exactement le défaut « visuellement mort » que le patch ciblait.
- **sévérité** : CRITICAL.
- **reproduction** (déterministe, non-LLM) :
  1. `Read lab/forge_runs/shmup_slice_patch1/artifacts/s9-build.txt` → 0 ligne de code,
     0 diff ; dernière ligne = `**Which approach?**`.
  2. `Grep "drawImage|new Image|preload|sprite|loadImage|\.src\s*="` sur
     `games/shmup_slice/` → **0 match** (render n'a aucun rendu d'asset).
  3. `Glob games/shmup_slice/**/*.{png,svg,webp}` (hors `e2e-shots/` de test) → **aucun
     sprite** ; le `render/` sous-dossier annoncé par le plan n'existe pas.
  4. Les 11 tâches du plan (préload assets, 13 sprites candy, 3 backgrounds, bosses
     expressifs, explosions, HUD) sont **toutes absentes du disque**.
  - **Oracle aval** : `assert sha256(render.mjs) == sha256(pré-patch)`  **OU** assert que
    l'artefact s9 ne contient aucun bloc de code/diff → FAIL si build revendiqué.

### F2 — [HIGH] Gate leak : status OK sur une sortie non-terminale
- **angle** : intégrité de la porte / faux vert.
- **faille** : `state.json → steps["s9-build"].status == "OK"` alors que la sortie de
  l'agent est une **question** (arrêt interactif, delta nul). Un OK sur une sortie
  interactive est un faux vert. Le filet a tenu — `s10a-oracle-code` a correctement mis
  `BLOCKED` — mais un aval qui aurait fait confiance à `s9=OK` aurait avancé sur du vide.
- **sévérité** : HIGH (le faux label n'a pas propagé ici, mais la porte s9 ne l'a pas
  attrapé ; seule l'étape suivante l'a fait).
- **reproduction** : `Read state.json` → `s9-build.status=="OK"` ET
  `s9-build.detail.output_excerpt` se terminant par `**Which approach?**`, sans marqueur
  terminal `FORGE_DISPATCH:s9-build:… ` ni bloc `software_verdict/evidence_verdict/
  claim_verdict`. **Oracle aval** : détecter l'absence du marqueur terminal de dispatch
  dans l'artefact d'une étape marquée OK → FAIL.

### F3 — [CRITICAL] Aucune preuve pour patch1 ⇒ verdict doit rester BLOCKED
- **angle** : absence d'`evidence_path` (pré-mortem [s12-verdict] : reçu sans evidence
  ⇒ exécution non prouvable ⇒ BLOCKED).
- **faille** : le run patch1 n'a **ni** `logic_files`, **ni** `wiremap.json`, **ni** reçu
  mutation, **ni** `evidence/`. `s10a` l'acte : `evidence_path==""`, `returncode==-1`,
  `reason="fichiers logiques inconnus … preuve mutation impossible"`. Émettre OK en s12
  violerait la règle dure.
- **sévérité** : CRITICAL (bloque tout claim de succès).
- **reproduction** : `Glob lab/forge_runs/shmup_slice_patch1/**` → pas de `evidence/`,
  pas de `wiremap.json`, pas de `verdict.json`. `state.json → s10a.detail.evidence_path==""`
  ET `returncode==-1`. Déterministe.

---

## DÉFAUTS PRÉ-EXISTANTS DE LA CIBLE (advisory — NON corrigés par patch1 vide)

> Ces défauts appartiennent au jeu de base (run `shmup_slice-20260714a`). Patch1 ne les a
> ni touchés ni fixés (puisqu'il n'a rien construit). Établis par **analyse statique** ;
> reproduction déterministe fournie pour un oracle aval — je n'ai rien exécuté.

### A1 — [MEDIUM] Score fantôme : un ennemi échappé rapporte +100 sans kill
- **angle** : mécanique de score, kill non-strict (viole R6/R9 « valeur EXACTE » et le
  pré-mortem « kill tue vraiment »).
- **faille** : `logic/step.mjs` ordonne `removeEnemiesBelowScreen` (L91) **avant**
  `updateScoreFromKills` (L94) ; `logic/scoring.mjs:17` compte
  `enemiesKilled = max(0, prevEnemyCount − currentEnemyCount)`. Un ennemi qui **sort par
  le bas sans être touché** fait chuter le compte → +100. Zone morte de test : **tous**
  les tests de scoring passent `prevEnemyCount=0` (`logic.test.mjs:586–629`), le chemin
  de comptage non-nul n'est **jamais** exercé ; « score monotone » ne l'attrape pas
  (fantôme = augmentation, donc monotone).
- **sévérité** : MEDIUM (n'affecte pas la solvabilité — score ≠ condition de
  victoire/défaite — mais faux sur une mécanique notée).
- **reproduction** (unit, node, API publique) :
  ```js
  import { updateScoreFromKills } from './logic/scoring.mjs';
  const s = { enemies: [], boss: null, score: 0 };
  updateScoreFromKills(s, /*prevEnemyCount*/ 1, /*prevBossHp*/ undefined);
  // ATTENDU s.score === 0 (aucun kill) ; RÉEL s.score === 100  → exit 1
  ```
  Intégration équivalente : ennemi à `y=599` pattern `invaders_descent`, `step` sans tir
  → sort de l'écran → `score === 100`. Exit-1 exécutable par oracle aval.

### A2 — [MEDIUM] Le périmètre mutation exclut l'arithmétique de dégâts
- **angle** : preuve mutation à périmètre incomplet + arête d'archi cachée.
- **faille** : `logic/collisions.mjs:12` importe `applyHit`/`effectiveDamage` de
  `../../../knowledge_base/systems/combat/damage_floor.mjs`. Le reçu mutation **signé**
  (`evidence/mutation_shmup_slice-20260714a.json` → `detail.logic_files`) **ne liste pas**
  `damage_floor.mjs`. La math qui tue l'ennemi, décrémente le boss et retire les vies vit
  **hors du périmètre scellé** : « mutation 111/112 » ne prouve **rien** sur elle. De plus
  ce reçu appartient au run `20260714a`, pas à patch1 → périmètre à revérifier. Enfin
  l'arête `logic → knowledge_base` est **invisible** à `check_architecture` (modules =
  `[logic,data,input,render,bot,main]`, `knowledge_base` n'est pas un nœud) → `s10b`
  rapporte `deps_interdites_violées: []` en étant aveugle à ce couplage.
- **sévérité** : MEDIUM (couverture surestimée ; dépendance non auditée).
- **reproduction** (oracle, déterministe) : parser les imports de `collisions.mjs` →
  résoudre `knowledge_base/systems/combat/damage_floor.mjs` → `assert` appartenance à
  `receipt.detail.logic_files` → **ABSENT** ⇒ périmètre incomplet (FAIL). Corollaire :
  recomputer `sha256` des `logic/*.mjs` courants vs `receipt.detail.code_sha256` ; tout
  écart ⇒ le reçu ne décrit pas le code courant ⇒ BLOCKED.

### A3 — [LOW] Test mal-étiqueté : « exactly one projectile per frame »
- **angle** : preuve factice — le nom du test sur-vend son assertion.
- **faille** : `logic.test.mjs:83` s'intitule « Firing creates exactly one projectile per
  frame » mais n'assert que `length > 0` (L93) et `length <= MAX_LIVES*10` (=30, L94).
  Une régression tirant 2–3 projectiles/frame **passerait au vert**. L'exactitude « un
  seul par frame » n'est **pas** vérifiée. (Par ailleurs `MAX_LIVES` comme borne d'un
  compte de projectiles est un couplage sémantique douteux.)
- **sévérité** : LOW (intégrité de test).
- **reproduction** : doubler le `spawnProjectile` dans `ship.mjs:firePlayerShot` → le test
  reste vert. Oracle aval : mutation ciblée sur `firePlayerShot` (spawn ×2) → survivant.

### A4 — [LOW/info] Code mort
- **angle** : zones mortes.
- **faille** : (a) statut `'BOSS'` déclaré (`state.mjs:25`, gardé dans `step.mjs:43` et
  `render.mjs:96`) mais **jamais assigné** — `spawnBossIfReady` met `bossActive=true` sans
  jamais `status='BOSS'`. (b) `scoring.mjs:awardScore` : paramètre `reason` inutilisé +
  branche `if (state.score < 0)` inatteignable (toutes les valeurs sont positives).
  (c) `collisions.mjs:68` filtre `p.y < 700` alors que `enemies.mjs:80` filtre déjà
  `p.y < GAME_HEIGHT+10` (=610, plus strict) → le seuil 700 est effectivement mort.
- **sévérité** : LOW/info.
- **reproduction** : `Grep "status = 'BOSS'"` sur `games/shmup_slice/` → **0 assignation**
  (garde jamais empruntée). Statique.

---

## RAPPORT FINAL (verdicts séparés)

- **software_verdict : BLOCKED**
  Appuyé par ancres non-LLM : `artifacts/s9-build.txt` (plan + question, 0 code),
  `Grep` 0 match d'API de rendu d'asset, `Glob` 0 sprite, `state.json`
  `s10a.evidence_path=="" / returncode==-1`. Le delta patch1 est **vide** et **sans
  preuve** ; verdict cohérent avec `s10a` (BLOCKED). Ce n'est pas FAIL (il n'y a pas de
  code cassé à évaluer) — il n'y a **pas de code**.
- **evidence_verdict : MECHANICAL_VALIDATION_ONLY**
  Ancres = contenu d'artefact, état de disque (grep/glob), champs `state.json`, lignes
  source. Les reproductions A1–A3 sont déterministes et exécutables par un oracle aval ;
  je ne les ai **pas** exécutées (`run: aucun`).
- **claim_verdict : NO_CLAIM_ALLOWED**

### fog → HumanGate (jugement Pierre, pas d'oracle)
1. **s9 a demandé « quelle approche ? » et s'est arrêté.** Le run doit-il être **relancé**
   sur l'option 1 (subagent-driven) ou 2 (inline) — ou patch1 **rejeté** et re-dispatché
   avec un contrat qui interdit à s9 de rendre un plan comme livrable de build ?
2. **s9-build=OK sur une sortie interactive** (F2) : la porte s9 doit-elle refuser tout
   artefact sans marqueur terminal `FORGE_DISPATCH` + bloc verdict ? (durcissement de gate).
3. **A1 (score fantôme) et A3 (test mal-étiqueté)** : faire **exécuter** les reproductions
   (attendu exit 1 / mutant survivant) avant tout futur s12 sur ce jeu, puis trancher le
   fix.
4. **A2 périmètre mutation** : ratifier l'inclusion de `knowledge_base/systems/combat/
   damage_floor.mjs` dans les `logic_files` scellés, ou son inlining dans `logic/`.

**Non falsifié** (revue sans faille trouvée) : `dodge.mjs` (esquivabilité prédictive,
cohérente), `solver.mjs` (joue l'API publique, n'écrit jamais l'état — AI-5), RNG seedé,
séparation logic↛render/input (test R25 réel). Ces éléments **ne compensent pas** F1–F3 :
ils appartiennent au jeu de base, pas au delta patch1 (inexistant).

FORGE_DISPATCH:s11-redteam-code:shmup_slice_patch1-20260718a — BLOCKED (build fantôme, 0 code, 0 evidence) / MECHANICAL_VALIDATION_ONLY / NO_CLAIM_ALLOWED
