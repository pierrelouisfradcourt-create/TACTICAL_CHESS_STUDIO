# Snake: Survivor — Genesis · build jouable (wave 2)

Plus un proto : boucle survivor complète. Construit en parallèle par 3 sous-agents (perf, feel, systèmes), intégré ici.

## Ce qu'il y a maintenant
- **Serpent** : pilotage relatif (flèches gauche/droite = tourner), inertie, croissance, traînée.
- **Constriction** (le hook) : encercle des ennemis et croise ton corps → la zone explose, ils meurent, tu grandis. Aperçu de boucle (télégraphe) + gate d'aire minimale (les micro-boucles ne déclenchent pas).
- **Ennemis en masse** via MultiMesh + pooling (vise 1000+ sans chuter) → enfin testable à la **densité minute-12**.
- **Boucle survivor** : orbes XP (aimant), barre d'XP, **level-up** (pause + 3 cartes), **wave director** sur 15 min (calme → essaim), **mort** (un ennemi touche la tête) + écran de fin + restart.

## Tester
1. Godot 4.6 → ouvrir `games/snake_survivor/project.godot` → **F5**.
2. **Flèches gauche/droite** = tourner (style analogique, pour dessiner des cercles).
3. Encercle, croise ton corps → Constriction. Monte de niveau, choisis des cartes, survis.

## Ce que je veux savoir (calibration — surtout la minute 12)
- À **densité élevée** (mi/fin de run), le hook tient-il ou ça devient frustrant ?
- Le pilotage analogique : mieux qu'avant ?
- Le télégraphe de boucle aide-t-il à viser la Constriction ?
- Level-up / vagues : rythme bon ? Le jeu est-il *fun* sous pression, pas juste 2 min ?
- FPS quand l'écran est plein ?

Si un bug à l'ouverture : copie-moi le message d'erreur (j'ai codé à l'aveugle, je corrige vite).

## Réglages rapides
- `scripts/Snake.gd` : `speed`, `turn_rate`, `max_points`, `min_loop_area`.
- `scripts/EnemyField.gd` : `capacity`.
- `scripts/SurvivorSystems.gd` : courbe d'XP, cadence des vagues.
