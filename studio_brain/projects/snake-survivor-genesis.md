# Snake: Survivor RPG — Genesis
#project #gamedesign

> Source canonique : `docs/studio_v2/10_CERFA_SNAKE_SURVIVOR.md`, `11_ROADMAP_SNAKE_SURVIVOR.md`, `12_PLAN_BUILD_SNAKE_SURVIVOR.md`
> ~~Titre 1 de la séquence produit.~~ **SUPERSEDED** — voir note 2026-07-12 ci-dessous.

---

## Revue 2026-08-16 — sans changement (6ᵉ semaine consécutive)

**Phase** : inchangée — Phase 0 build complet, **kill-gate P0 toujours non tranché**, 0 playtest
enregistré. Aucun changement de scope. Aucune activité git sur `games/snake_survivor/` depuis le
2026-07-26 (arbre figé au 2026-06-28).

⚠️ **Ne pas confondre avec `games/snake/`** : le commit `bfe7ecb` du 2026-08-16 (« le volet de
preuve pixel DECLARE son mode d'exécution GPU ») porte sur le **jeu Forge `games/snake/`**, une
fixture de la Forge — **pas** sur ce titre. Aucune reprise de Snake: Survivor RPG n'a eu lieu.

Les deux questions posées à Pierre en 2026-07-05 restent **ouvertes** : quel build est canonique
(Godot wave-2 ou HTML genesis), et faut-il archiver formellement ce titre. Sans réponse, cette
fiche reste conservée telle quelle — une fiche SUPERSEDED n'est pas une fiche à supprimer.

---

## ⚠️ SUPERSEDED — 2026-07-12 (revue hebdomadaire mémoire)

**Ce projet n'est plus le Titre 1 actif.** Le [[../decisions/decision-log|pivot produit du 2026-07-05/06]] a gelé Rocky et réorienté la factory vers une gamme de jeux de cartes FR (**Belote = produit 1**, Tarot = produit 2). Snake: Survivor RPG n'a pas été abandonné suite à un échec de kill-gate — **le kill-gate P0 n'a jamais été tranché** (0 playtest enregistré, 2 builds Godot/HTML jamais réconciliés, cf. note 2026-07-05 ci-dessous) — le studio a changé de pari avant résolution.

**Statut** : archivé, pas de reprise sans HumanGate explicite. Les priors CR-001→CR-006 ([[../gamedesign/lessons|Leçons Gamedev]]) restent `prior` (`evidence_n: 0`) — aucune donnée de jeu réel n'a été produite sur ce titre.

---

## Mise à jour — 2026-07-05 (revue hebdomadaire mémoire)

**Aucune activité git sur `games/` depuis le 2026-06-28** — 7 jours. Le kill-gate P0 n'a pas bougé. Aucun résultat de playtest n'a été enregistré nulle part (ni ici, ni en mémoire Cowork, ni en télémétrie).

**Point à réconcilier — deux builds coexistent sans arbitrage écrit :**
- `games/snake_survivor/` (Godot 4, wave 2) — dernier fichier modifié 2026-06-28 11:41. C'est le build décrit ci-dessous (section « État actuel — 2026-06-28 »).
- `games/snake_genesis/` (HTML, `snake_genesis.html` + `snake_genesis_part1.html`) — créé **après**, 2026-06-28 12:38-12:56, à partir du `snake_genesis_v9.html` fourni par Pierre.

La mémoire de session Cowork du 2026-06-28 indique qu'une décision a été prise **le même jour** d'abandonner le build Godot (pas d'éditeur Godot utilisable en Cowork → bugs corrigés à l'aveugle) au profit du HTML (boucle de feedback navigateur instantanée). Cette décision n'a **jamais été écrite dans `decisions/decision-log.md`** ni dans ce fichier — seule la mémoire éphémère Cowork la porte. Les horodatages fichiers corroborent la séquence (Godot fini à 11:41, HTML commence à 12:38) mais **cette note ne remplace pas une ratification HumanGate explicite**.

**Action demandée à Pierre :** confirmer quel build est la base canonique (Godot wave-2 ou HTML genesis) avant toute reprise de travail sur ce titre, et si confirmé, loguer la décision dans `decisions/decision-log.md`.

---

## État actuel — 2026-06-28 (build Godot, non confirmé comme actif)

| Champ | Valeur |
|---|---|
| Phase | **Phase 0 build complet** — en attente kill-gate P0 |
| Build jouable | `games/snake_survivor/` — wave 2 (F5 dans Godot 4.6) |
| Kill-gate P0 | ❌ NON VALIDÉ — Pierre n'a pas encore confirmé le fun minute-12 |
| Playtests internes | Aucun résultat enregistré |
| Priors promus | Aucun (`evidence_n` = 0 sur tous les CR-*) |

### Ce que contient le build wave-2 (confirmé fichier:code)
- Serpent : déplacement inertiel, braquage relatif A/D, traînée
- **Constriction** : encercler → zone explose, gate d'aire minimale active, aperçu télégraphié
- Ennemis (5 types) : Fodder, Chaser, Zoner (projectiles data-oriented), Elite, Boss (2 phases + attaques télégraphiées)
- Performances : MultiMesh + pooling, vise 1000+ ennemis à 60fps
- Boucle survivor : orbes XP, level-up 3 cartes, wave director 15 min, mort + écran fin + restart
- Armes (3 éléments) : Fire (AoE burn), Ice (slow + projectile), Lightning (chain)
- Juice : néon glow, floating damage numbers, screenshake, kill particles, implosion arcs

### Ce qui n'existe pas encore
- Export Godot vert (non vérifié)
- Télémétrie branchée (PostHog / Plausible)
- Page Steam ouverte
- `headless_sim.py` (balance)
- Arbre de méta (constellation / Essence)

### Prochaine action (avant Phase 1)
**Pierre joue wave-2 → verdict kill-gate P0 → itérer ou valider et ouvrir Steam.**

---

## Identité

| Champ | Valeur |
|---|---|
| Genre | Survivor-like / bullet-heaven roguelite |
| Pitch | *Un serpent cosmique dévoreur dans un bullet-heaven : ton corps est à la fois ton arme et ton pire piège.* |
| **Hook (différenciateur)** | Le corps du serpent = arme (segments auto-attaquants) **ET** obstacle mortel. Mécanique de **Constriction** : encercler un groupe → explosion de zone. Créneau libre confirmé par recherche 2026. |
| Plateforme | PC (Steam + itch) — mobile exclu |
| Prix | 5-8 € EA → ~12-15 € 1.0 |
| Modèle | Premium, **no IAP** |
| Langues | FR + EN au lancement |

---

## Scope MVP « Genesis: Core » (ce qu'on shippe)

La vision GDD est **pluriannuelle**. Le MVP est la variante 2 (hardcore PC, premium) réduite à une tranche verticale shippable par un solo.

| Axe | Vision GDD (étoile nord) | MVP à shipper |
|---|---|---|
| Biomes | 5 + boucle infinie | **1** (Le Berceau Brisé) + 1 boss (Aegis) |
| Armes/éléments | 4 familles, ascensions multiples | **2-3 éléments, ~8 armes, 2-3 ascensions** |
| Ennemis | 5 types × 5 biomes + boss | **4-5 types + 1 élite + boss Aegis** |
| Méta | Arbre constellation complet + prestige | **~12-15 nœuds, 1 monnaie (Essence)** |
| Business | F2P mobile + battle pass + boutique | **Premium Steam, no IAP** |
| Online | Leaderboards, seeds mondiaux | **Hors MVP** |

**Tout ce qui est « hors MVP » ne se construit que si le MVP valide (wishlists/ventes).**

---

## Core Loop

```
avancer (direction seule) → auto-attaque par segments
→ ramasser orbes XP → level-up (choix 3 cartes)
→ répéter, écran se sature
```

- **Win** : vaincre boss Aegis (fin biome 1), run ~15 min
- **Lose** : tête touche ennemi / mur / **son propre corps**
- **Méta-sig** : inertie + rayon de braquage croissant avec la longueur

---

## Roadmap par phases

### Phase 0 — Fondations + hook (semaines 1-4)
- P1 : Projet Godot + `studio_kit` (save, options, audio, télémétrie)
- P1 : **Prototype du hook** — serpent (inertie/braquage) + auto-attaque + Constriction
- P2 : Boucle survivor minimale (spawn + orbes + level-up 3 cartes)
- P3 : Télémétrie branchée

**🔴 Kill-gate P0 (Pierre) : le hook est-il fun en 2 min de jeu ?**
Si non → itérer ou abandonner **avant** d'investir dans le contenu.

### Phase 1 — Tranche verticale + page Steam (semaines 5-10)
- P1 : **Ouvrir Steamworks (100 $) + page store** (tags ×20, capsule v1, GIFs)
- P1 : Tranche verticale : 1 biome, 4-5 ennemis, ~8 armes, 2-3 éléments
- P2 : 2-3 synergies game-breaking + 2-3 ascensions
- P2 : Boss Aegis + Constriction-pour-briser-bouclier
- P3 : Petit arbre de l'Origine + DA propre

### Phase 2 — Démo + communauté (semaines 10-16)
- Démo sur page dédiée (≈2,5× wishlists)
- Discord + r/roguelites, r/Survivorslike + 30-50 micro-streamers
- Cible : **Steam Bullet Fest 2026** + un Next Fest (entrer ≥ 2 000 WL)

**Gate business : wishlists J-30 du fest.**
- < 1 500 WL → reporter/intensifier/retravailler le hook
- Ne pas lancer dans le vide

### Phase 3 — Lancement
- EA ou 1.0 à 5-8 €
- Ventes 1ʳᵉ semaine ≈ 0,15× wishlists
- Hotfix/équilibrage J+1 à J+14 via télémétrie

**Kill-criteria** : < 1 000 ventes mois 1 → ne pas étager les biomes 2-5.
Capitaliser l'apprentissage sur le titre suivant.

### Phase 4 — Étagement AAA (seulement si MVP valide)
Par paliers de revenu/wishlists :
1. Biome 2 (Abysse Néon) + 4ᵉ élément
2. Plus de synergies + élites à coffres
3. Mode Endless + seeds + classements
4. Biomes 3-4-5 + arche narrative
5. Codex + prestige (Nœud Ouroboros)
❌ Mobile F2P / battle pass / boutique → hors portée solo (nécessite équipe + capital UA)

---

## Stack technique

| Couche | Choix |
|---|---|
| Moteur | Godot 4 (2D top-down) |
| Logique haute perf | Rust/GDExtension **seulement si profilé** (milliers d'entités = point chaud connu) |
| Balance | `variants/*.json` + `headless_sim.py` (courbes de survie) |
| Télémétrie | Events : run start/end, durée survie, cause mort, arme top-DPS, abandon/min |
| Save/Export | `studio_kit` ; Win + Web |

---

## Priors causaux applicables
- **CR-001** : reward_frequency trop faible → drop-off ~90 s. Garantir orbes + level-ups toutes ~45 s.
- **CR-002** : page Steam tardive → WL insuffisants au lancement. Page live ASAP.
- **CR-003** : art IA brut shippé → −53 % reviews. Art retravaillé uniquement.

---

## Ce jeu seed le studio_kit
Modèles à reverser dans la DB après construction :
- `studio_kit/models/ui` : menu, options, HUD, fin de run
- `studio_kit/models/systems` : save, audio_bus, télémétrie
- `studio_kit/models/gameplay` : wave_spawner, upgrade_tree, economy, boss_framework

---

## Liens
- [[../doctrine/studio-doctrine|Doctrine]]
- [[../gamedesign/lessons|Leçons Gamedev]]
- [[../decisions/decision-log|Decisions clés]]
- Sources : `docs/studio_v2/10_CERFA_SNAKE_SURVIVOR.md`, `11_ROADMAP_SNAKE_SURVIVOR.md`, `12_PLAN_BUILD_SNAKE_SURVIVOR.md`
