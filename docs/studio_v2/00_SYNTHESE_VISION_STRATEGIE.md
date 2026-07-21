# STUDIO V2 — VISION & STRATÉGIE

*Date : 2026-06-27 · Auteur : Cowork (supervision) · Validation : Pierre (HumanGate)*
*Légende confiance : **[CODE]** confirmé par le repo · **[WEB]** recherche 2025-26 sourcée · **[PROPO]** proposition architecturale.*

---

## 0. Profil opérationnel (verrouillé par Pierre, 2026-06-27)

| Contrainte | Valeur | Conséquence stratégique |
|---|---|---|
| Développeur | Solo | Tout doit être faisable par une personne + IA |
| Temps | Plein (40h+) | Vélocité élevée possible → on mise sur le volume d'itérations |
| Capital 12 mois | **< 2 000 €** | Zéro marketing payant, zéro art payant, zéro UA. Tout organique. |
| Audience | Aucune | Le flywheel wishlists/Discord part de zéro → priorité n°1 |
| Compte Steam | Aucun | 100 $/jeu à budgéter ; ouvrir Steamworks tôt |
| Moteur Rocky | **Relégué R&D/vitrine** | Sunk cost neutralisé. On garde la compétence, pas le produit. |

Ce profil impose une doctrine simple : **zéro cash, zéro art visible payant, vélocité maximale, apprentissage du go-to-market avant tout.**

---

## 1. La thèse brutale (CTO + VC)

Le projet actuel optimise la mauvaise variable. Il a construit une **usine autonome sophistiquée** dont le seul produit est un **moteur d'échecs à ELO ~1200** qui échoue à son propre gate qualité. Or :

- Un moteur d'échecs maison a une **valeur commerciale ≈ 0 [WEB]** : Stockfish est gratuit, open-source, à 3500+ ELO ; le marché est verrouillé par chess.com et lichess. Personne n'achète un moteur à 1200.
- L'infrastructure « 15 agents autonomes / IR universel / Kaizen » est de la belle ingénierie qui **ne génère aucun euro** et crée de la dette de maintenance. C'est l'anti-pattern que le projet a lui-même diagnostiqué : *« surface affichée > surface câblée »*.
- Le **vrai actif** n'est ni l'échiquier ni le compilateur universel. C'est : **(a)** un dev solo full-time compétent en **Rust + Godot**, **(b)** une **doctrine d'orchestration IA rigoureuse** (oracles non-LLM, gates, lanes, NO_CLAIM) directement réutilisable comme discipline de production, **(c)** une stack **LLM locale gratuite** (Qwen) utile pour générer du contenu sans coût d'API.

**Verdict VC : pivot.** On ne vend pas un moteur. On construit une **micro-usine de jeux Steam vendables**, pilotée par un solo, où l'IA compresse le pipeline de production et de marketing — pas où l'IA « génère le jeu ».

---

## 2. Le contre-pied stratégique (l'edge)

La recherche 2025-26 donne un edge clair et contre-intuitif :

> **L'IA générative *visible* est punie par le marché. L'IA *invisible* est un multiplicateur 10×.**

Preuves [WEB] :
- Jeux taggés IA : **−53 % de reviews** (étude ~10 000 jeux, 2025) ; estimation −40 à −60 % de ventes pour les gros studios.
- **85 %** des joueurs négatifs envers l'IA générative, 63 % « très négatifs » (Quantic Foundry, déc. 2025) — pire que la blockchain.
- Output IA pur = **non protégeable par le droit d'auteur** (USCO Part 2 2025 ; Thaler v. Perlmutter, cert. refusée mars 2026) → n'importe qui peut copier tes assets IA.
- Steam (révision janv. 2026) **exempte les outils de productivité dev** (Copilot, debug) de toute déclaration ; seul le contenu IA *vu par le joueur* ou dans les assets de store doit être déclaré.

**Donc l'edge de TCS = mettre l'IA là où elle est exemptée, protégeable et sans stigmate :** code, tooling, localisation, itération de variantes privées. Et garder **art/musique humains, licenciés, ou minimalistes** sur la surface visible. Pour un studio Rust+Godot, **Claude Code / Cursor sur le moteur et la logique = l'investissement au plus haut ROI et plus bas risque [WEB]**.

Avantage concurrentiel défendable = **vitesse de production + maîtrise totale du pipeline de distribution automatisé**, pas « génération magique de jeux » (que Rosebud/Ludo ne savent faire qu'au stade prototype [WEB]).

---

## 3. Choix de genre (décision)

Critère : **revenu par unité d'effort**, sous contrainte zéro-budget-art.

| Genre | Verdict | Pourquoi |
|---|---|---|
| **Idle / Incremental** | ✅ **Tête de pont (Titre 1)** | Le moins cher à produire, **systèmes > art** (zéro budget art, zéro stigmate IA), joue Rust/Godot+code IA, public fidèle, vrais earners (IdleOn 22M$, Farmer Was Replaced 4,5M$) [WEB]. Idéal pour roder le pipeline à bas risque. |
| **Survivor-like / Bullet-heaven** | ✅ **Moteur de revenus (Titres 2-3)** | Modèle petit-budget/fort-retour prouvé ; plafond élevé. Mais fenêtre « quick-win » fermée → exige **un hook fort** [WEB]. |
| **Co-op horror court** | 🟡 Option opportuniste | Catégorie streamable qui surperforme (R.E.P.O. 147M$) mais variance extrême, co-op = complexité réseau [WEB]. |
| **Cozy/automation niche** | 🟡 Plus tard | Sim+roguelite = meilleurs revenus médians, mais cœur cozy saturé → viser un sous-mécanisme sous-servi [WEB]. |
| **Roguelike deckbuilder** | ❌ Éviter | Fatigue post-Balatro ; éditeurs fuient le genre en 2026 [WEB]. |
| **Mobile hypercasual** | ❌ Exclu | Dépendant du capital UA payant que tu n'as pas [WEB]. |
| **Tout jeu à art IA visible** | ❌ Interdit | −53 % reviews, non protégeable [WEB]. |

**Séquence produit :** Titre 1 (idle) = construire et prouver la *machine* (build→ship→wishlist→télémétrie) à risque minimal. Titres 2-3 (survivor-like) = exploiter la machine pour viser le plafond, une fois l'audience (Discord/wishlists) amorcée.

---

## 4. La réalité du marché (cadre de sobriété)

À garder en tête à chaque décision [WEB] :

- 20 282 jeux sortis sur Steam en 2025 ; **~3 % seulement** atteignent 1 000 reviews (le seuil du « vrai argent », ~150k$+).
- Revenu **médian ≈ 249 $** ; 66 % font < 1 000 $ ; **40 % ne récupèrent pas les 100 $** de frais Steam ; 47,5 % vendent < 100 copies.
- **Les wishlists sont la variable qui gate tout**, pas le genre. Zone de lancement confortable : **25k-50k wishlists**. Plancher de visibilité « Popular Upcoming » : ~7 000 WL sur une fenêtre serrée.
- Conversion wishlist→vente : ~15 % (<5k WL) à 25 % (100k+). Première semaine ≈ 0,15× les wishlists.

**Implication :** la production n'est pas le goulot — **la distribution l'est**. Un solo zéro-budget doit traiter le *marketing organique* et le *flywheel wishlists* comme le produit principal, et le jeu comme le munition. C'est pour ça que le Titre 1 (idle, bas risque) sert d'abord à apprendre ce jeu-là.

---

## 5. Principes directeurs du Studio V2

1. **€ d'abord.** Tout composant qui n'aide pas à *vendre plus de jeux* est supprimé ou reporté. (Phase 3 du mandat.)
2. **Distribution > Production.** Le pipeline marketing/wishlists est prioritaire sur la sophistication technique.
3. **IA invisible.** IA à fond sur code/tooling/localisation/itération ; jamais sur l'art visible shippé.
4. **Oracles réels.** Les seuls juges valides ne sont pas des LLM : compilation/tests (cargo/pytest), **vélocité de wishlists**, **conversion de démo**, **télémétrie de rétention**. Le « fun oracle » = données joueurs, pas l'avis d'un LLM. (Hérite de la doctrine anti-Skynet, recâblée sur des signaux business.)
5. **Portefeuille = ferme à tickets de loterie.** Aucun jeu unique n'est un pari ; on multiplie les tentatives bon marché dans 1-2 genres et on double sur ce qui prend.
6. **HumanGate sur l'irréversible.** Publier, dépenser, renommer une marque, écraser une prod = décision Pierre.
7. **Zéro dette gratuite.** On câble et on assainit avant de construire du neuf (philosophie héritée, maintenue).

---

## 6. Ce qu'on garde du projet actuel

| Actif existant | Sort | Raison |
|---|---|---|
| Compétence Rust + moteur Rocky | **R&D/vitrine** | Réutilisable comme démo technique et brique de logique de jeu ; pas un produit. |
| Doctrine oracles/gates/lanes/NO_CLAIM | **KEEP (allégée)** | Discipline de production de grande valeur, recâblée sur signaux business. |
| Ledger IMP (Kaizen) | **KEEP (léger)** | Bon traceur d'unités de travail. On vire les daemons morts. |
| Qwen local (LM Studio) | **KEEP** | Inférence **gratuite** pour génération de contenu/itération → clé en mode bootstrap. |
| Autopilot 7331 + cockpit | **IMPROVE/réduire** | Devient un **Portfolio/Revenue dashboard**, pas un orchestrateur autonome. |
| IR universel / compilateur de jeux | **DELETE** | Cimetière confirmé (P0-C + marché). |
| 15 agents autonomes / council gates | **DELETE/défer** | Zéro ROI pré-revenu, risque anti-Skynet. |
| Entraînement neural échecs / dataset | **DELETE (commercial)** | R&D chess sans revenu ; la discipline MLOps sera réutilisée pour la *balance de jeu* plus tard. |

Détail complet dans `01_AUDIT_DE_LAUDIT.md`. Architecture cible dans `02_GAME_FACTORY_V2_ARCHITECTURE.md`.

---

## 7. Énoncé de vision (1 phrase)

> **Studio V2 est une micro-usine de jeux Steam opérée par un solo + IA, qui transforme la vélocité de production et l'automatisation totale du pipeline de distribution en un portefeuille de petits jeux rentables — en mettant l'IA partout où le joueur ne la voit pas, et la qualité humaine partout où il la voit.**
