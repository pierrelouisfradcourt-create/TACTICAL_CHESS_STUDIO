# Chantier unique — GAMEPLAY CONTRACT : fermer la boucle (G → H → I → J → H')

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. TDD strict, fixtures RÉELLES
> (Prisme/loop.json/build du run 7 = baseline), jamais de commit par un sous-agent, un seul commit de clôture (gate Pierre).
> Aucun système nouveau : `loop.json` RESTE la projection déterministe du Prisme ; on étend ses rôles, ses prédicats et
> ses gates. Aucun chantier parallèle (vocabulaire STANDARD/Prisme, reuse, red-team, profondeur : hors périmètre).

*Date : 2026-08-22 · Source : validation Pierre après le run 7 (`kitten_clicker-20260821g`, commit `3843d7b`).*

**Ce que le run 7 a démontré (mesuré, par l'écran seul)** : A PLAYER_GOAL affiché → B/C clic sur `pelote` (ronrons 0→5) →
B/C `acheter_amelioration` (Prod/s 0→0,5) → D production passive (15,5→30,5 sans clic) → E récompense (31→91) →
F `acheter_chaton` (Prod/s 0,5→0,7). **Arrêt mesuré : G NEXT_GOAL** (`objectif` déjà « Refuge accompli : ronronne à
l'infini ! » — chaîne à un maillon) ; I META_LOOP non atteint ; H et J n'existent pas encore comme maillons.
**Question du chantier** : *après avoir terminé une boucle, le joueur a-t-il une raison et un moyen concret d'en commencer
une autre, dans un état différent ?*

## Le contrat (10 maillons — `loop.json`, projection déterministe de `prisme.json`)
```text
A PLAYER_GOAL      observe objectif nonempty
B PLAYER_ACTION    affordance + observe (hud, increases|changes)
C AFFORDANCE       (porté par B : nœud Control groupe `affordance`, name = affordance)
D GAME_RESPONSE    observe OBLIGATOIRE
E REWARD           observe OBLIGATOIRE
F UNLOCK           affordance + observe ; preuve Progression : observe.appears = <group>
G NEXT_GOAL        observe objectif new_distinct  (≠ TOUS les objectifs déjà vus)   ×2 minimum
H REPEAT           replay: [refs de B…F] — rejoués et tous PASS dans le nouvel état
I META_LOOP        affordance prestige + observe (reset visible : hud ronrons decreases|resets)
J ADVANTAGE        replay d'une B après I : delta strictement > delta initial (increases_more_than:<ref>)
```
Verrous : `GOAL_2 ≠ GOAL_1 ≠ GOAL_3` (prédicat `new_distinct`, mémoire des valeurs vues par hud) ; H est une étape à
part entière, pas une convention ; J prouve l'avantage par la mesure d'un delta, pas par un texte.

## Quatre preuves « jeu complet » (inchangées)
1. **Runtime** `runtime_alive` OK · 2. **Player loop** `player_loop` atteint J par les seules entrées du jeu ·
3. **Progression** au moins un `appears:<group>` satisfait (nouvelle affordance / HUD / contenu après F) ·
4. **HumanGate** Pierre : « je comprends spontanément quoi faire et j'ai envie de continuer ». Critère logiciel ≠ HumanGate.

---

### T1 — `loop_spec.mjs` + `upstream_schema.mjs` : les 10 rôles, `observe` partout, chaîne distincte, H et J
**Files:** `scripts/forge/loop_spec.mjs` (+`.test.mjs`), `scripts/forge/upstream_schema.mjs` (additif), `scripts/forge/contracts/s1-prisme.yaml`.
- `LOOP_ROLES` += `REPEAT`, `ADVANTAGE` (ordre A…J, `NONE` conservé) ; `PREDICATES` += `new_distinct`, `appears:<group>`,
  `increases_more_than:<ref>`, `decreases`, `resets`.
- `deriveLoopSpec` : step REPEAT porte `replay: [refs]` (depuis `ex.replay`, liste d'ids d'exigences B…F) ; step ADVANTAGE
  porte `replay_ref` + `observe.predicate: increases_more_than:<ref>`.
- `checkLoopSpec` (le Gameplay Contract check) : **`observe` obligatoire pour TOUS les rôles ≠ NONE** ; A ≥ 1 ; B ≥ 1 avec
  affordance ; D, E ≥ 1 ; F ≥ 1 avec affordance ET `observe.appears` ; **G ≥ 2**, tous `new_distinct` sur le même hud ;
  H ≥ 1 avec `replay` non vide dont chaque ref existe et est de rôle B…F ; I ≥ 1 avec affordance ; J ≥ 1 avec
  `replay_ref` de rôle B et prédicat `increases_more_than`. Problèmes nommés par maillon.
- Baselines : `loop.json` du run 7 → FAIL nommant : REWARD sans observe (EX04), G = 1 (< 2), H absent, J absent,
  F sans `appears`. Fixture synthétique A–J complète → OK ; déterminisme (hash identique).
- Contrat s1 (ajouts) : les 10 rôles, `observe` obligatoire, ≥ 2 NEXT_GOAL distincts, REPEAT (`replay`) et
  ADVANTAGE (`replay_ref`), F avec `appears`. Tâche s1 (`tasks.json`) alignée.

### T2 — Grey Blocks / WireMap liée par maillon (pas de nouveau schéma)
**Files:** `scripts/forge/check_decompo.mjs` (+test), `scripts/forge/check_wiremap_contract.mjs` (+test), contrats s3/s5.
- `check_decompo` : les exigences G (NEXT_GOAL) et F (UNLOCK avec `appears`) doivent avoir une feuille d'EFFET
  (`file_write`/`visual`) ET, pour F, une feuille d'ENTRÉE `bot_action` depuis main.tscn (règle existante étendue aux
  rôles H/I/J : une action rejouée ou un prestige = entrée + effet).
- `check_wiremap_contract` : toute ligne `provides: ["affordance:<x>"]` doit avoir `requires` non vide résolvant une ligne
  qui `provides` la capacité système du maillon, et le `couvre` de cette ligne aval doit contenir la feuille d'EFFET de
  la même exigence → chaîne `affordance → input → système → effet` vérifiée par résolution d'ids, sans champ nouveau
  (`provides`/`requires`/`couvre` existent en v2). Finding `maillon_non_lie: affordance '<x>' n'atteint aucune règle`.
- Baseline : WireMap du run 7 — mesurer combien des 4 lignes `input.*` satisfont la liaison (attendu partiel).

### T3 — Sonde `player_loop.gd` : nouveaux prédicats, REPEAT, mémoire des deltas
**Files:** `scripts/forge/godot_probes/player_loop.gd`, `scripts/forge/product_oracle_godot.py` (+tests).
- `new_distinct` : mémoire `seen[hud]` ; PASS ssi `after ∉ seen` ; `appears:<group>` : `get_nodes_in_group(group).size()`
  avant/après, PASS ssi strictement plus ; `decreases` / `resets` (after < before / after == valeur initiale du hud) ;
  `increases_more_than:<ref>` : delta du step courant > delta enregistré du step `<ref>` ; REPEAT : rejoue la liste
  `replay` (mêmes affordances, mêmes prédicats) et PASS ssi tous passent ; `data.deltas[ref]`, `data.seen`.
- Toujours rien d'autre que `InputEvent` + lecture des groupes `affordance`/`hud` (test statique inchangé).
- Baselines sur le build du run 7 : avec le `loop.json` du run 7 → `reached_role: GAME_RESPONSE` (inchangé) ; avec
  un contrat A–J synthétique → attendu : F PASS, G FAIL `new_distinct` (texte déjà vu), rapport `reached_role: UNLOCK`.

### T4 — Gates non contournables (prérequis, pas un chantier parallèle)
**Files:** `scripts/forge/driver.py` (+tests).
- `loop_dead` entre dans `final = "FAIL"` (3 points d'agrégation, comme `runtime_dead`).
- Le bloc produit/runtime (`runtime_alive`, `player_loop`, `loop_bypass`) devient **inconditionnel dès que
  `project.godot` porte `run/main_scene`** — il ne dépend plus de `proof:` ni de `has_godot_capacity` (mesuré : 3 runs
  sur 3 ont sauté le bloc faute de `proof:`). Absence de `proof:` = BLOCKED mutation comme aujourd'hui, mais la boucle
  est mesurée quand même.
- `03_WORLD/loop.json` absent ou sha ≠ run_dir = FAIL (déjà), désormais gaté.

### T5 — Contrat s9 + tâche s9, puis run 8
- s9 (ajouts) : réaliser les 10 maillons ; G = au moins deux objectifs **textuellement distincts** affichés
  successivement ; F fait **apparaître** un nouvel élément (groupe `affordance` ou `hud` ou contenu) ; I = prestige
  visible (reset) ; J = après prestige, la première action rapporte strictement plus ; `proof:` + `09_WIREMAP` déposés.
- Run 8 `kitten_clicker-20260821h`, `full_godot_content`, sans `--charter`, depuis la session (≈ 40-60 $).
- **PASS** : les 4 preuves + `checkLoopSpec` OK sur le Prisme (sans override) + `player_loop` jusqu'à J sans override.
  Toute rupture est localisée (spec / décompo / wiremap / build / runtime) et reste une rupture — jamais un succès.

## Hors périmètre (explicitement) : durée de jeu, vocabulaire STANDARD/Prisme, reuse_ratio, red-team Qwen, nouvelles
familles de preuve, nouvelle station, refonte WireMap. V3.1 n'est pas un chantier parallèle : sa part « sonde
inconditionnelle » est absorbée par T4 comme prérequis de gate ; le reste (dépôt `proof:`) = T5 contrat.
