# PLAN DE CONSTRUCTION COMPLET — DE ZÉRO AU AAA TESTABLE

*Snake: Survivor RPG — Genesis. Construction progressive et largement autonome ; tes playtests calibrent.*
*2026-06-28.*

---

## 0. MODÈLE DE TRAVAIL

> Je construis par **slices** jouables. Tu **testes**. Ton retour **calibre** la slice suivante. Tu ne valides pas chaque ligne — tu juges le **ressenti** et les **chiffres**.

- **Autonome (moi) :** code, systèmes, scaffolds, données, sims de balance, intégration des `variants/*.json`, télémétrie, build/export, publish itch (technique).
- **Toi (gates réels uniquement) :** le **fun** (go/no-go par playtest), la **dépense** (Steamworks 100 $), la **publication** publique. Plus le **retour de calibration** après chaque slice.
- **Limite technique :** je n'ai pas l'éditeur Godot ici → j'écris les fichiers, **tu les ouvres et joues**. Le « fun » t'appartient de toute façon (oracle humain).
- **Oracles non-humains :** build vert (export Godot), `headless_sim` (courbes de survie), télémétrie (rétention, abandon/min). Ils tranchent ce qui est mesurable ; toi le fun.

---

## 1. LES SLICES (de zéro au AAA testable)

Chaque slice = un livrable jouable + une question de calibration pour toi.

| Slice | Contenu | Ce que tu testes/calibres | Gate |
|---|---|---|---|
| **S1 — Hook** *(en cours)* | serpent (inertie, braquage ∝ longueur, croissance) + **Constriction** + ennemis encerclables + HUD | **Le hook est-il fun en 2 min ?** Le braquage ? La Constriction est-elle satisfaisante ? | 🔴 fun go/no-go |
| **S2 — Boucle survivor** | orbes XP, level-up (3 cartes), vagues, run 15 min, mort/victoire | Rythme early→late ? Le level-up est-il grisant ? | retour ressenti |
| **S3 — Arsenal** | 2-3 éléments, ~8 armes, 2-3 synergies « game-breaking », 2-3 ascensions | Quelles synergies sont fun/cassées ? (calibre l'équilibrage) | retour + `headless_sim` |
| **S4 — Boss + biome 1** | Aegis multi-phase, Constriction-brise-bouclier, Berceau Brisé fini | Le climax fonctionne-t-il ? Difficulté ? | retour ressenti |
| **S5 — Méta + UX** | Arbre de l'Origine (~12-15 nœuds, Essence), écrans menu/sélection/fin | Donne-t-il envie de rejouer ? UX claire ? | retour |
| **S6 — DA + juice + audio** | DA lisible (<0,1 s), chiffres de dégâts, freeze, SFX/musique | Lisibilité ? Satisfaction (dopamine) ? | retour |
| **S7 — Build + page Steam + démo** | export Win/Web, page Steam (tags/capsule), démo, itch | — | 🔴 dépense + publication |
| **MVP shippable** | = S1→S7 (premium Steam, no IAP, 1 biome) | wishlists/ventes = signal | 🔴 lancement |
| **AAA (Phase 4, étagé)** | biomes 2-5, endless, leaderboards, prestige, codex | **uniquement si le MVP valide** (kill-criteria) | par paliers de revenu |

**Cadence cible :** S1→S2 rapides (le cœur), S3 le plus long (équilibrage), S4-S6 itératifs, S7 court. Le AAA complet n'est **pas** un premier jet — il s'étage sur le succès du MVP (doctrine portefeuille).

---

## 2. CE QU'ON RÉUTILISE (récolte)

- **`variants/*.json`** (10 variants équilibrés) → tables de balance pour S2/S3 (spawn, économie, vitesses).
- **`headless_sim.py`** → oracle de balance pour S3 (générer des courbes de survie avant de te faire tester).
- À mesure : chaque système propre → **`studio_kit/models`** (save, options, audio, télémétrie, spawner, level-up, upgrade_tree, boss_framework) → le **prochain jeu** réutilise 50-70 %.

---

## 3. POURQUOI « SANS QUE TU VALIDES TOUT » EST POSSIBLE ICI

L'autonomie réaliste est **40-60 %** (plafond doctrinal : fun, assets, dépense/publish restent humains). Mais sur la **phase de build**, l'essentiel est automatisable : je peux enchaîner S1→S6 en batches, en m'auto-vérifiant sur les oracles mesurables, et ne te solliciter que pour **le ressenti** (ce que tu as demandé : « c'est le rendu de mes tests qui calibre ») et les **deux gates irréversibles** (S7). Donc oui : je construis, tu joues, tu calibres.

---

## 4. ÉTAT & PROCHAIN PAS

- **S1 en construction maintenant** : projet Godot `games/snake_survivor/` + serpent + Constriction + ennemis + HUD.
- Tu l'ouvres dans Godot 4, tu joues 2 minutes, tu me dis : **le braquage et la Constriction sont-ils fun ?** Ton retour calibre S2 (et décide go/no-go).
- Ensuite j'enchaîne S2 (boucle survivor) sans nouvelle validation de plan.
