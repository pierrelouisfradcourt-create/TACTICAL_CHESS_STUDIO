# CERFA — Chess TCG (fiche d'identité de jeu, brouillon)

status: DOCUMENTED_ONLY · claim_verdict: NO_CLAIM_ALLOWED
Gabarit : `docs/studio_v2/08_GAME_MANIFEST_CERFA.md`. **Passe 1** pré-remplie (2026-07-06) depuis la récupération Phase 1.
Sources : `D`=doctrine · `R`=récupération (canon ChessTCG + machine + ChatGPT) · `⟦⟧`=à creuser · `[GATE]`=décision Pierre.

> **Nature** : produit **n°2** du studio (Belote = n°1 en arbitrage). Lignée retenue par défaut : **T (« Tactical Chess »)**
> — Crown Tactics (C) = 1ʳᵉ version historique, superseded (confirmé Pierre). Boucle confirmée : **jouer une carte → bouger une pièce → brawl** (tour-par-tour, pas autobattler).

## 1. Identité & positionnement
| Champ | Valeur | Src |
|---|---|---|
| Titre provisoire | Chess TCG (nom def à trancher : « Tactical Chess » vs autre) | R |
| Genre | Échecs tactiques × TCG × attrition/siège (board-first) | R |
| Pitch | Un échiquier 8×8 où l'on **joue des cartes, déplace des pièces (HP/ATK/ARM) et résout des brawls**, siège progressif du roi. | R |
| Hook | Le plateau reste la vérité ; les cartes enrichissent sans remplacer la lisibilité des échecs. **Génération de cartes name-driven** (option). | R |
| Public cible | ⟦à creuser⟧ (joueurs échecs + tacticiens + TCG draft) | ⟦⟧ |
| Plateformes | ⟦à creuser⟧ — PC d'abord (défaut doctrine) | D |

## 2. Boucle de jeu (core)
| Champ | Valeur | Src |
|---|---|---|
| Core loop | **jouer 1 carte → bouger 1 pièce → brawl** → résolution → tour adverse | R (Pierre) |
| Objectif | mettre le roi adverse en échec/collapse **ou** annihilation | R |
| Victoire/défaite | **[GATE C8]** king kill / pressure collapse / mat strict / par mode | R |
| Stats de base | HP / ATK / ARM (lignée T) | R |
| Ordre de résolution | pipeline 17 étapes (traversée→arrivée→attaque→riposte→cleanup→BRAWL→cleanup→pression→victoire) | R |
| Durée session | ⟦à creuser⟧ (baseline sim ≈ 65 tours ; viser 50-65) | R |

## 3. Systèmes & mécaniques (canon stable, récupéré)
| Système | État | Src |
|---|---|---|
| Plateau 8×8, placement 2 rangées, symétrique | stable | R |
| Mouvement type échecs sauf modif carte | stable | R |
| Combat : `directDamage=max(1,ATK-ARM)`, riposte, traversée | **[GATE C5]** (formule à ratifier) | R |
| BRAWL (attrition locale) | **[GATE C6]** (variante finale) | R |
| Pression du roi + collapse + fatigue | **[GATE C7]** | R |
| 13 statuts (burn/poison/root/freeze/stun/charm…) + hard-control | stacking **[GATE C14]** | R |
| Cartes = données, pas branches runtime | principe | R |
| Draft 25 pts, 1 roi gratuit, max 1 élite | stable | R |
| Promotion / fusion / sorts | **[GATE C1/C2]** (matrice + coûts fusion) | R |
| Summon cleanup / event ordering | **[GATE C13/C15]** | R |
| Générateur de cartes | design candidat unifié (`08_GENERATOR_UNIFIED_CANDIDATE`) — **hors chemin critique moteur** | R |

## 4. Contenu
| Champ | Valeur | Src |
|---|---|---|
| 6 factions (lignée T) | Pirates/Nuée/Sylvestres/Barbares/Empire/Maréchalat | R |
| Volume cible cartes | ~300-400 équilibrées (théorique 2376→430 après filtre) | R |
| SET de départ | lignée C : 50 cartes fixes (Crown) existent ; lignée T : à générer | R |

## 5. Technique & frontière
| Champ | Valeur | Src |
|---|---|---|
| Moteur de règles | **[GATE frontière]** neuf, déterministe. Réutilise-t-on le socle Rust échecs existant ? | R |
| Autorité décision en-jeu | moteur déterministe ; jamais le LLM en temps réel | D |
| Oracle | **P0-E : aucun oracle hors échecs/Snake** → chaque tranche moteur DOIT apporter son oracle (TDD) | R |

## 6. Scope & planning
| Champ | Valeur | Src |
|---|---|---|
| Vertical slice | moteur de règles pur (plateau+pièces+carte/mouvement/brawl+victoire) SANS 3D ni générateur | R |
| Kill-criteria | **[GATE]** ⟦à définir⟧ | ⟦⟧ |

---

## ★ Les 5 questions HumanGate (à trancher avant tout code)
*(raffinées post-récupération ; certaines sont quasi-résolues — à confirmer)*

1. **Périmètre v1** — On code le **moteur de règles pur lignée T** (6 pièces, HP/ATK/ARM, carte→mouvement→brawl→pression) avec un **set main-crafted minimal** pour tester, et le **générateur (graphe sémantique + budget) vient en Phase ultérieure** ? OU tu veux le générateur dès v1 ? *(reco : moteur pur d'abord, générateur après — il est hors chemin critique.)*
2. **Critères d'abandon (kill-criteria)** — à quel signal on arrête/reporte Chess TCG ? (les audits priorisent Snake/revenu et déconseillent le deckbuilder — donc un critère explicite est sain.)
3. **Expérience joueur cible** — durée de partie visée, **solo (vs IA) et/ou PvP**, plateforme (PC ? tabletop numérique ?). Détermine l'UI et le besoin d'IA.
4. **Frontière socle-commun / TCG** — le moteur de règles TCG **réutilise-t-il le socle Rust d'échecs existant** (mouvement/plateau) ou repart-il propre ? (impacte lane/GEL Rocky.)
5. **Ratification du canon** — je confirme **Crown = v1 historique / lignée T = canon** ; et on tranche les **9 gaps P1** (C5 damage, C6 BRAWL, C7 pression, C8 victoire, C1/C2 fusion, C13 summon cleanup, C14 stacking, C15 event ordering). Pour la **tranche 1 du moteur**, seuls **C5 + C8** sont bloquants (les autres arrivent plus tard).

> Une fois ces 5 tranchées → le CERFA passe en « spec de build » et la Phase 3 (code, tranche 1) démarre.
