# CERFA — SNAKE: SURVIVOR RPG — GENESIS (passe 1)

*Instancié depuis le GDD AAA + recherche marché 2026 + doctrine Studio V2. Le 2026-06-28.*
*États : `[auto]` pré-rempli · `⟦à creuser⟧` passe 2 · `[scope]` arbitrage de périmètre.*

---

## 0. ARBITRAGE DE SCOPE — LE POINT CRITIQUE

Le GDD décrit une **vision complète AAA** (5 biomes, battle pass, leaderboards, codex, prestige, 3 variantes, mobile F2P + live-ops). C'est **pluriannuel et multi-équipe**. On garde ça comme **étoile nord**, pas comme premier livrable.

**Le produit réel = MVP « Genesis: Core »**, basé sur la **variante 2 du GDD** (premium Steam roguelite, **aucun achat in-app**), réduit à une **tranche verticale shippable par un solo**.

| | Vision GDD (nord) | MVP « Genesis: Core » (à shipper) |
|---|---|---|
| Biomes | 5 + boucle infinie | **1** (Le Berceau Brisé) + 1 boss (Aegis) |
| Armes/éléments | 4 familles, ascensions multiples | **2-3 éléments, ~8 armes, 2-3 ascensions** |
| Ennemis | fodder/zoner/chaser/élite/boss × 5 biomes | **4-5 types + 1 élite + 1 boss** |
| Méta-progression | Arbre constellation complet + prestige | **petit arbre ~12-15 nœuds, 1 monnaie (Essence)** |
| Business | F2P mobile + battle pass + boutique + ads | **premium Steam (~5-8 €), no IAP** |
| Online | leaderboards hebdo, seeds mondiales, codex | **hors MVP** (post-validation) |
| Variantes | casual mobile / hardcore / idle | **hardcore PC only** ; les autres = jamais sans équipe |

**Tout ce qui est « hors MVP » est étagé dans la roadmap (doc 11), déclenché seulement si le MVP valide (wishlists/ventes).** Raison : un solo bootstrap ne peut pas opérer du live-ops F2P (battle pass, boutique rotative, ads, leaderboards) — c'est un autre métier qui exige une équipe + du capital UA.

---

## 1. IDENTITÉ & POSITIONNEMENT
- title_provisional : **Snake: Survivor RPG — Genesis** `[auto]`
- genre / subgenre : survivor-like / bullet-heaven roguelite `[auto]`
- pitch : *« Un serpent cosmique dévoreur dans un bullet-heaven : ton corps est à la fois ton arme et ton pire piège. »* `[auto, GDD]`
- **hook** : le corps du serpent = arme (segments) **et** obstacle mortel ; mécanique de **Constriction** (encercler → explosion). **Innovation mécanique réelle, créneau libre** `[auto, validé recherche]`
- target_audience : core/midcore roguelite PC, joueurs de Vampire Survivors/Brotato/Death Must Die `[auto]`
- platforms : **PC (Steam + itch)** ; mobile = hors scope `[scope]`
- price_eur : **5-8 € (MVP/EA), ~12-15 € version complète** `[auto, doctrine+GDD v2]`
- languages : FR + EN ; autres via loc IA `[auto]`

## 2. MARCHÉ & DISTRIBUTION *(distribution-first)*
- comparables `[auto, recherche]` : Vampire Survivors (genre-definer), Brotato, Halls of Torment, **Megabonk (1M copies/2 sem, 3D VS)**, Death Must Die (hybride ARPG), Deep Rock: Survivor, The Spell Brigade (co-op, 1M EA). Wishlists/titre précis : `⟦à compléter par titre⟧`
- saturation : **genre le plus actif de 2026** → différenciation obligatoire (= notre hook) `[auto]`
- steam_tags (×20) : `⟦à creuser⟧` (seed : Bullet Heaven, Roguelite, Survivor-like, Action Roguelike, Snake, Bullet Hell, Pixel/—, Singleplayer, Difficult, Replay Value…)
- capsule concept : `⟦à creuser⟧` (serpent titanesque encerclant une horde — art humain/retravaillé)
- wishlist_target : ≥ 5 000 (viser 25 000) `[auto, doctrine]`
- **événement cible : Steam Bullet Fest 2026 (été) + un Next Fest** `[auto, recherche]`
- demo_strategy : démo tôt sur page dédiée, ≥ 2 000 WL avant un fest `[auto]`
- canaux : Discord + r/roguelites, r/Survivorslike, r/IndieGaming + 30-50 micro-streamers (genre ultra-streamable) `[auto]`
- page Steam : **mise en ligne le plus tôt possible** `[auto, chemin critique]`

## 3. CORE LOOP
- loop_30s : avancer (direction only) → auto-attaque par segments → ramasser orbes XP → level-up (choix de 3 cartes) → répéter, écran se sature `[auto, GDD]`
- player_goal : survivre 20 min (MVP : **15 min**) puis battre le boss `[auto/scope]`
- win_condition : vaincre Aegis (boss biome 1) `[auto MVP]`
- lose_condition : la tête touche un ennemi / un mur / **son propre corps** `[auto, GDD]`
- mécanique signature : **inertie + rayon de braquage croissant avec la longueur** ; **Constriction** (encercler + croiser sans se mordre → explosion de zone) `[auto, GDD]`
- session_length_min : 15 (MVP) / 20 (full) `[scope]`
- meta_progression : Arbre de l'Origine (petit en MVP) `[auto/scope]`
- difficulty_curve : early traque chirurgicale → mid essaim → late apocalypse bullet-heaven `[auto, GDD]`
- **équilibrage** : `⟦à creuser⟧` (réglé ensuite par télémétrie)

## 4. SYSTÈMES & MÉCANIQUES
- list `[auto/scope]` : déplacement-serpent, auto-attaque par segments, spawn de vagues, XP/level-up, **Constriction**, ascensions d'armes, méta-arbre. (Hors MVP : élites à coffres avancés, modificateurs de run.)
- entités : tête (core stats), segments (armement), fodder, zoner, chaser, élite, boss `[auto, GDD]`
- économie in-run : orbes d'Essence (vert 1 / bleu 5 / violet 20 / doré 100) `[auto, GDD]`
- éléments : MVP **2-3** parmi Cendres(feu)/Givre(glace)/Tempête(foudre)/Vide(gravité) `[scope]` ; lesquels en MVP : `⟦à creuser⟧`
- synergies game-breaking : `⟦à creuser⟧` (cf. les 5 synergies que Gemini propose d'approfondir — à prioriser pour le MVP : 2-3)
- autorité en-jeu : moteur déterministe (Godot/GDScript, Rust si profilé) ; **jamais le LLM en temps réel** `[auto, doctrine]`

## 5. CONTENU (MVP)
- volume : **1 biome, 1 boss, run 15 min** `[scope]`
- enemies : 4-5 types + 1 élite + Aegis `[scope]`
- items/armes : ~8 armes, 2-3 ascensions, quelques reliques d'élite `[scope]`
- événements/variété : `⟦à creuser⟧` (minimal en MVP)
- narration : environnementale, minimale (lore Ouroboros en fragments) `[auto, GDD]`

## 6. PRÉSENTATION & DA
- style : « Minimalisme sombre & or », VFX lisibles, dark sci-fi lovecraftien `[auto, GDD]`
- **règle art** : humain / CC0 (Kenney) / brouillon IA **retravaillé** — jamais d'IA brute shippée `[auto, doctrine]`
- lisibilité : menace comprise en 0,1 s (priorité absolue bullet-heaven) `[auto, GDD]`
- ui_screens (MVP) : menu, sélection de run, HUD épuré, fin de run (stats), arbre de progression `[auto]` → **studio_kit/models/ui**
- feedback/juice : chiffres de dégâts, ASMR de loot, freeze au level-up, gel d'écran sur Constriction `[auto, GDD]` → presets kit
- audio : CC0 / Stable Audio / licencié `[auto, doctrine]`

## 7. TECHNIQUE GODOT
- engine : Godot 4 `[auto]`
- dimension : **2D top-down** (MVP ; le 3D « façon Megabonk » = hors scope) `[scope]`
- résolution/aspect : paysage 16:9 PC `[auto]`
- perf : des milliers d'entités → **point chaud connu** ; profiler ; Rust/GDExtension pour le spawn/collisions **si** le profilage l'exige `[auto]` `⟦à creuser : budget perf⟧`
- reused_models : aucun encore → **ce jeu seed le studio_kit** `[auto]`
- save/export : studio_kit ; Win/Web `[auto]`

## 8. ASSETS REQUIS (statut brouillon→retravaillé→shippable)
- sprites : serpent (tête+segments+skins d'ascension), 5 ennemis, boss, orbes, VFX `⟦liste à creuser⟧`
- sfx : loot, level-up, Constriction, mort, boss `⟦liste⟧`
- musique : menu + 1 thème biome + thème boss `⟦liste⟧`
- sources : CC0/Kenney + atelier IA **retravaillé** `[auto, doctrine]`
- **risque** : un bullet-heaven lisible exige une DA propre → l'art est le poste d'effort #1 d'un solo `⟦à creuser⟧`

## 9. TÉLÉMÉTRIE & ORACLES
- events `[auto]` : run start/end, durée de survie, niveau atteint, cause de mort, arme top-DPS, retry, abandon
- fun_kpis : rétention J1, % qui finissent une 1ʳᵉ run, courbe d'abandon par minute (le « drop-off à 90 s » du prior CR-001) `[auto]`
- balance_thresholds : `⟦à creuser⟧`
- oracle build : export Godot vert + tests `[auto]`
- oracle marché : vélocité wishlists, conversion visite→WL (>4%) `[auto]`

## 10. SCOPE & PLANNING
- vertical_slice : 1 run jouable (15 min) avec hook Constriction + level-up + 1 boss, sur 1 biome `[scope]`
- mvp_definition : cf. §0 `[scope]`
- effort : **L** (échelle Vampire Survivors solo = plusieurs mois temps plein) `[auto, honnête]`
- jalons : proto hook → page Steam → démo → Bullet Fest/Next Fest → EA/launch `[auto]`
- risques spécifiques : perf (milliers d'entités), DA/art solo, saturation genre, scope creep vers la vision AAA `[auto]`
- **kill_criteria** : `⟦à creuser⟧` (proposition : < 1 500 WL à J-30 de la démo → reporter/repenser le hook ; < 1 000 ventes 1ᵉʳ mois → ne pas étager les biomes 2-5)

## 11. BUSINESS
- modèle : **premium Steam, no IAP** `[auto, doctrine + GDD v2]`
- prix : 5-8 € EA → ~12-15 € full `[auto]`
- point mort : ~150 € `[auto]`
- cibles revenu : cf. business plan (conservateur/probable/agressif) `[auto]`
- **explicitement abandonné pour ce profil** : F2P mobile, battle pass, boutique rotative, ads, premium currency `[scope]`

## 12. PRODUCTION (→ seed du /plan, doc 12)
- réutilisé du kit : rien (1ᵉʳ jeu) → on **construit** save/options/HUD/audio/télémétrie comme modèles réutilisables `[auto]`
- nouveau à construire : déplacement-serpent, Constriction, spawn, level-up, méta-arbre, boss Aegis `[auto]`
- modèles à reverser dans la DB : UI kit, save, audio bus, télémétrie, wave_spawner, upgrade_tree `[auto]`

## 13. DESIGN VECTOR v1 (dérivé)
```
players: solo
input_model: keyboard/controller (direction only)
camera_type: topdown
session_length: 0.6 (15-20 min)
loop_length_s: ~continu (auto-attack)
reward_frequency: élevée (orbes constants + level-ups)  → 0.8
enemy_density: très élevée (bullet-heaven)              → 0.95
progression_type: meta + run-build (hybrid)
skill_vs_chance: 0.55 (pilotage + loterie de build)
content_volume: faible en MVP                            → 0.25
failure_punishment: permadeath de run                    → 0.7
pacing_curve: ramp→spike (essaim→apocalypse)
art_complexity: moyenne (lisibilité > détail)            → 0.5
genre_tags: [bullet_heaven, roguelite, survivor_like, snake]
```

## 14. PRIORS CAUSAUX APPLICABLES (mémoire causale, status: prior)
- CR-001 (reward_frequency ↓ → drop-off ~90 s) : **très applicable** → garantir orbes + level-ups fréquents dès l'early game.
- CR-002 (page Steam tardive → WL insuffisants) : page live ASAP.
- CR-003 (art IA brut → −53% reviews) : art retravaillé only.
- nouveau prior à tester : *bullet-heaven lisibilité < 0,1 s → rétention* (à valider par notre télémétrie).

## 15. LES `⟦À CREUSER⟧` CRITIQUES (passe 2, en rebond)
Par ordre de priorité pour débloquer le /plan :
1. **Les 2-3 éléments + 2-3 synergies game-breaking du MVP** (cœur du fun — Gemini propose d'approfondir les 5 synergies : on en garde 2-3).
2. **Budget perf** (combien d'entités cibles → décide Godot pur vs Rust/GDExtension).
3. **Définition exacte de la tranche verticale** (ce qui est dans la démo).
4. steam_tags ×20 + concept capsule.
5. kill_criteria chiffrés.
6. Liste d'assets MVP + plan DA (le poste d'effort #1).

Quand 1-3 sont `[✓ Pierre]`, le **/plan détaillé** (doc 12) peut passer du macro au technique.
