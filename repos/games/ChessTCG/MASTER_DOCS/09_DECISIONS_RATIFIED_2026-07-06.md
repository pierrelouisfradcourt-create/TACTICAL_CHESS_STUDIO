# Chess TCG — Décisions ratifiées HumanGate (2026-07-06)

status: RATIFIED (Pierre, en session) · claim_verdict: NO_CLAIM_ALLOWED
Append-only. Ratifie/complète `07_OPEN_DECISIONS.md` sans l'écraser.

## Identité produit
| Décision | Réponse Pierre | Effet |
|---|---|---|
| **Priorité projet** | **Chess TCG = LE projet principal** (plus « produit n°2 ») | pas de kill-criteria ; on n'arrête pas |
| Lignée canon | **T (« Tactical Chess »)** ; Crown = v1 historique superseded | HP/ATK/ARM, traversée/BRAWL/pression |
| Boucle de jeu | **jouer une carte → bouger une pièce → brawl** (tour-par-tour) | — |
| Durée de partie cible | **20-40 minutes** | dimensionne rythme, pression, fatigue |

## Périmètre v1 (Q1)
- **Le générateur (matrice) EST branché dès v1.**
- On **gèle 1 set par faction au fur et à mesure** : le générateur produit → on fige un set canonique par faction, itérativement.
- Le **moteur de règles pur reste la fondation** (tranches T0-T5) ; le générateur se branche par-dessus et alimente les sets gelés.

## Frontière socle (Q4) + moteur
- **On repart au propre.** Le nouveau moteur de règles NE réutilise PAS le socle Rust d'échecs existant (Rocky reste GELé, lecture seule). Codebase Chess TCG autonome.
- **Moteur = Godot 4 (GDScript)** — Pierre : « je veux du godot/unreal, un jeu premium ». Choix Godot (doctrine studio par défaut, solo dev, genre 2D/2.5D tactique ; Unreal surdimensionné). Godot 4.6.3 déjà sur le poste.
- **Architecture** : cœur de règles = **classes GDScript pures, sans dépendance de scène, testables headless** (méthode TDD conservée) ; présentation (scènes/nodes) séparée. Projet sous `games/chess_tcg/` (convention `games/snake_survivor/`).
- La décision moteur étant prise, les **spécialistes moteur Godot sont ajoutés à l'équipe** (prévu « à ce moment-là »).

## Condition de victoire — C8 (Q5)
- **Victoire si : le roi n'a plus de PV (king kill) OU son seuil de pression est dépassé (pressure collapse).**
- Les deux conditions sont actives. **Pas de mat strict** en v1.

## C5 — formule de dégâts (working canon, à vétoter si besoin)
- Non ré-abordée explicitement par Pierre ; on retient le **canon documenté validé sur 50 parties** :
  `directDamage = max(1, ATK − ARM)` (idem riposte/traversée/BRAWL). **Veto Pierre possible avant tranche 1.**

## Gaps restants (non bloquants pour tranche 1)
C1/C2 fusion · C6 BRAWL (variante) · C7 pression (calibration) · C13 summon cleanup · C14 stacking · C15 event ordering.
→ tranchés au fil des tranches T3-T5.

## Expérience joueur — partiellement ouvert
Durée 20-40 min = ✅. **Restent à préciser** (non bloquants) : solo (vs IA) et/ou PvP ; plateforme (PC / tabletop numérique / web).
