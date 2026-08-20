# /PLAN DE BUILD (macro) — SNAKE: SURVIVOR RPG — GENESIS

*La compilation CERFA → plan de construction. Macro pour l'instant : le /plan technique détaillé par système attend la passe 2 des `⟦à creuser⟧` critiques (CERFA §15).*
*2026-06-28. Pas de code ici — un plan de production exploitable.*

---

## 0. STATUT & RÈGLE

Ce /plan est **macro** : il découpe le build en modules, ordre, et oracles. Le **/plan détaillé par module** (le vrai « avant patch ») se fait module par module, en rebond (Qwen → red team → Pierre), **après** que ces 3 `⟦à creuser⟧` sont `[✓ Pierre]` :
1. les 2-3 éléments + 2-3 synergies du MVP ;
2. le budget perf (nombre d'entités cible → Godot pur vs Rust/GDExtension) ;
3. la définition exacte de la tranche verticale (contenu démo).

Règle maintenue : **no-plan-no-patch** — aucun module n'est codé sans son /plan approuvé.

---

## 1. ORDRE DE CONSTRUCTION (par risque décroissant)

On construit **d'abord ce qui peut tuer le projet** (le fun du hook, la perf), pas le happy path.

```
M-A  Hook isolé (serpent + Constriction)        ← go/no-go fun
M-B  Boucle survivor (spawn, XP, level-up)      ← le cœur jouable
M-C  Perf de masse (milliers d'entités)          ← go/no-go technique
M-D  Armes / éléments / synergies / ascensions   ← le theorycrafting (rétention)
M-E  Boss Aegis + Constriction-anti-bouclier     ← climax
M-F  Méta-arbre (Essence) + écrans UX            ← raison de revenir
M-G  DA / lisibilité / juice / audio             ← conversion & reviews
M-H  Build/export + page Steam + démo            ← distribution
```

---

## 2. MODULES — objectif · oracle · seed kit · effort

| Module | Objectif (MVP) | Oracle (non-LLM) | Reverse dans studio_kit | Effort |
|---|---|---|---|---|
| **M-A Hook** | serpent (inertie, braquage ∝ longueur), auto-attaque segments, **Constriction** (encercler+croiser→explosion) | jouable 2 min ; **Pierre juge « fun ? »** (go/no-go) | controller serpent | M |
| **M-B Boucle** | spawn fodder, orbes XP (1/5/20/100), level-up 3 cartes, run chronométrée 15 min | run complète sans crash ; télémétrie remonte | wave_spawner, xp/levelup, run_timer | M |
| **M-C Perf** | soutenir N entités cibles à 60 fps | **profilage : 60 fps @ N entités** ; sinon Rust/GDExtension | pooling/perf utils | M/L |
| **M-D Armes** | 2-3 éléments, ~8 armes, 2-3 synergies, 2-3 ascensions | chaque arme s'instancie + DPS mesurable ; build « game-breaking » atteignable | upgrade_tree, weapon_system | L |
| **M-E Boss** | Aegis multi-phase, télégraphie zones rouges, Constriction brise bouclier | boss battable + perdable ; pas de soft-lock | boss_framework | M |
| **M-F Méta+UX** | Arbre Origine ~12-15 nœuds, Essence ; écrans menu/sélection/HUD/fin/arbre | progression persistée (save) ; 1 nœud achetable change une run | ui_kit, save, meta_tree | M |
| **M-G DA/juice** | DA lisible (<0,1 s), chiffres dégâts, freeze level-up, gel Constriction, SFX/musique | lisibilité validée en playtest ; pas d'art IA brut | feel/juice presets, audio_bus | M/L |
| **M-H Distrib** | export headless Win/Web, page Steam, démo, butler itch | export vert en CI ; page live ; démo téléchargeable | export scripts, telemetry | M |

**Note effort global : L (échelle Vampire Survivors solo = plusieurs mois temps plein).** Honnête, pas pessimiste.

---

## 3. JALONS & GATES

| Jalon | Contenu | Gate |
|---|---|---|
| J1 — Hook prouvé | M-A jouable | 🔴 Pierre : « fun ? » go/no-go |
| J2 — Core jouable | M-A+M-B+M-C | 🟠 run 15 min stable + perf OK |
| J3 — Page Steam | capsule+tags+GIFs du hook | 🔴 dépense 100 $ + publication |
| J4 — Tranche verticale | +M-D+M-E+M-F | 🟠 démo-ready |
| J5 — Démo publique | +M-G+M-H | 🔴 publication démo |
| J6 — Fest | Bullet Fest/Next Fest | 🔴 entrer ≥ 2 000 WL |
| J7 — Lancement | EA/1.0 | 🔴 wishlists ≥ seuil |

---

## 4. CE QUE CE JEU SEED DANS LA DB (`studio_kit/models`)

Premier jeu = il **construit** la bibliothèque réutilisable : `ui_kit`, `save`, `audio_bus`, `telemetry`, `wave_spawner`, `xp_levelup`, `upgrade_tree`, `weapon_system`, `boss_framework`, `feel/juice presets`, `export scripts`. → le **titre suivant** (idle ou survivor #2) réutilise ~50-70 % et coûte beaucoup moins.

---

## 5. ORACLES & DISCIPLINE

- **Build** : export Godot vert + tests (git hooks locaux gratuits).
- **Fun** : télémétrie (drop-off/min, rétention, % runs finies) — pas l'avis d'un LLM.
- **Marché** : vélocité wishlists, conversion visite→WL.
- **Gates** : Pierre sur fun (J1), dépense (J3), publications (J5/J7).
- **Rebond** : chaque module → /plan (Qwen) → red team (Cowork + Gemini Flash) → Pierre → code (Claude Code) → oracle. No-plan-no-patch.

---

## 6. PROCHAINE ÉTAPE CONCRÈTE

Avant de coder quoi que ce soit, on **creuse les 3 `⟦à creuser⟧` critiques** (§0) en rebond. Le plus important et le plus fun à creuser : **les 2-3 éléments + 2-3 synergies game-breaking du MVP** — c'est le cœur du theorycrafting et donc de la rétention.

Dis-moi par lequel on commence : (a) creuser les éléments/synergies du MVP, (b) le budget perf (Godot pur vs Rust), ou (c) figer la définition exacte de la tranche verticale (démo). Une fois ces trois validés, je rédige le **/plan technique détaillé du module M-A (Hook)** — le premier qu'on construira.
