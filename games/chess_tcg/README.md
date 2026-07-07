# Chess TCG — moteur (Godot 4)

Jeu premium tactique board-first (lignée T). Canon : `repos/games/ChessTCG/`.
Boucle : **jouer une carte → bouger une pièce → brawl** (tour-par-tour).

## État : jeu 3D jouable vs IA, avec cartes — VERT (83/83)
**Rendu 3D** (`ui/game3d.gd` + `ui/hud.gd`) : plateau en perspective, pièces 3D (primitives stylisées), éclairage + ombres,
picking par **raycast**, **animations Tween** (déplacement en arc, capture qui s'efface). HUD 2D par-dessus (tour, cartes, victoire).
Boucle complète **carte → déplacement → brawl**, adversaire **IA** (1-ply déterministe), 4 cartes (Affûtage/Renfort/Bastion/Frappe),
pression du roi + fatigue.
**Personnages = vrais modèles 3D riggés CC0** (KayKit, cf. `assets/CREDITS.md`) : faction **Ordre** (Chevalier/Barbare/Mage/Rogue) vs **Horde** (squelettes), animations Idle/Course/Mort. Mapping pièce→modèle dans `game3d.gd::_char_name`. Reste hors v1 : générateur procédural en code, deck/pioche, animation d'attaque dédiée, juice avancé.

### Anciennement : Tranches 1-2 (moteur de règles pur) — VERT (54/54)
Cœur de règles en **GDScript pur, sans dépendance de scène, testable headless**. Aucune UI, aucune 3D, aucun générateur.
Architecture : **pipeline de résolution explicite** (Action → étapes ordonnées → journal d'événements), cf. `repos/games/ChessTCG/MASTER_DOCS/10_ARCH_REVIEW_2026-07-06.md`.

```
core/
  piece.gd   # unité HP/ATK/ARM + flags (canAttack/canBrawl/canControl)
  board.gd   # grille 8x8
  moves.gd   # destinations légales + cases contrôlées (menace)
  rules.gd   # pipeline : traversée -> arrivée -> attaque -> riposte -> victoire
tests/
  run_tests.gd   # oracle headless (54 assertions + garde anti-faux-vert)
```

### Tranche 2 (traversée + riposte)
- **Traversée** : contre-attaques case par case sur les cases contrôlées par l'ennemi ; arrêt immédiat si le mover meurt (mouvement annulé). **Cavalier = exception** (saute).
- **Riposte** : si la cible survit à l'attaque, elle riposte (`max(1, ATKcible − ARMmover)`).
- **Journal d'événements** retourné (traversal/attack/kill/retaliation/mover_died) → observabilité + graine de replay pour le futur simulateur de balance.

### Règles implémentées (canon ratifié 2026-07-06)
- Dégâts : `max(1, ATK − ARM)`.
- **Ordre attaque→mort→prise de case** : si la cible meurt → l'attaquant prend la case (+kill) ; si elle survit → pas de prise.
- Promotion : pion en dernière rangée → dame, `canAttack=false` le tour de promotion.
- **Victoire** : roi PV≤0 (king kill) **OU** pression ≥ seuil (collapse). *(Pression = ossature directThreat ; calibration complète = tranche 4.)*

### Lancer les tests (headless)
```
"<Godot>/Godot_v4.6.3-stable_win64_console.exe" --headless --path games/chess_tcg --script res://tests/run_tests.gd
# exit 0 = tous verts
```

## Prochaines tranches
T2 traversée+riposte · T3 BRAWL · T4 pression complète+fatigue · T5 couche cartes.
Voir `repos/games/ChessTCG/BUILD_SLICES_v1.md`.
