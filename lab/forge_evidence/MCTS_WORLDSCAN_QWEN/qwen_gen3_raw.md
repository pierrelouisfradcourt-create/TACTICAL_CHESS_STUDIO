Pour ce World Scan, nous allons observer deux jeux comparables à Pac-Man : "Pac-Man" lui-même et "Ms. Pac-Man". Ces jeux partagent des mécaniques de base similaires telles que la navigation dans un labyrinthe en grille, la consommation de pastilles pour gagner des points, et le fait d'éviter ou de capturer des ennemis (fantômes). Cependant, ils présentent également des différences notables qui méritent une analyse approfondie.

### Pac-Man

**Sources :**
- [Video](https://www.youtube.com/watch?v=04aW5nXrjgk) - Timestamp: 2023-10-17
- [Wiki](https://en.wikipedia.org/wiki/Pac-Man)
- [Article](https://www.ign.com/articles/2021/05/26/pacman-history)

**Boucles :**
- **Minute 1:** Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes qui sont en mode "chasse". La tension est élevée car les fantômes peuvent changer de comportement pour poursuivre le joueur.
- **Minute 10:** Les niveaux deviennent plus difficiles avec un nombre croissant de fantômes et une réduction du temps entre chaque niveau. Le joueur doit maîtriser des stratégies avancées pour survivre.
- **Heure 5:** À ce stade, le jeu est très difficile et nécessite une grande habileté et mémoire pour anticiper les mouvements des fantômes. Les joueurs expérimentés cherchent à atteindre de hauts scores en utilisant des techniques spécifiques.
- **Endgame:** Le joueur gagne en vidant le labyrinthe de toutes les pastilles, mais perd s'il est attrapé par un fantôme.

**Objectifs :**
- **Mode Solo:**
  - `has_win_state`: true
  - `victory_condition`: Vider le labyrinthe de toutes les pastilles.
  - `has_defeat_state`: true
  - `defeat_condition`: Être attrapé par un fantôme.
  - `player_goal`: Survivre et collecter des points en évitant les fantômes.

### Ms. Pac-Man

**Sources :**
- [Video](https://www.youtube.com/watch?v=5cQZJzr6v8M) - Timestamp: 2023-10-17
- [Wiki](https://en.wikipedia.org/wiki/Ms._Pac-Man)
- [Article](https://www.ign.com/articles/2021/05/26/ms-pacman-history)

**Boucles :**
- **Minute 1:** Le joueur navigue dans un labyrinthe plus complexe avec des pastilles et des fruits spéciaux à collecter. Les fantômes sont en mode "chasse" mais peuvent être attrapés pour gagner des points bonus.
- **Minute 10:** La difficulté augmente avec une augmentation du nombre de fantômes et un changement dans leur comportement, rendant la navigation plus risquée. Le joueur doit utiliser des stratégies avancées pour survivre.
- **Heure 5:** À ce stade, le jeu est très difficile et nécessite une grande habileté et mémoire pour anticiper les mouvements des fantômes. Les joueurs expérimentés cherchent à atteindre de hauts scores en utilisant des techniques spécifiques.
- **Endgame:** Le joueur gagne en vidant le labyrinthe de toutes les pastilles, mais perd s'il est attrapé par un fantôme.

**Objectifs :**
- **Mode Solo:**
  - `has_win_state`: true
  - `victory_condition`: Vider le labyrinthe de toutes les pastilles.
  - `has_defeat_state`: true
  - `defeat_condition`: Être attrapé par un fantôme.
  - `player_goal`: Survivre et collecter des points en évitant les fantômes.

### Retention Answer

Pourquoi le joueur revient dans ces jeux : Les joueurs sont attirés par la progression constante, l'augmentation de la difficulté et la satisfaction d'atteindre des scores élevés. La mécanique de capture des fantômes offre une récompense immédiate pour les risques pris, ce qui maintient un équilibre entre le danger et la récompense.

```json
{
  "games": [
    {
      "game": "Pac-Man",
      "sources": [
        {"url": "https://www.youtube.com/watch?v=04aW5nXrjgk", "type": "video", "timestamp": "2023-10-17"},
        {"url": "https://en.wikipedia.org/wiki/Pac-Man", "type": "wiki"},
        {"url": "https://www.ign.com/articles/2021/05/26/pacman-history", "type": "article"}
      ],
      "loops": {
        "minute_1": "Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes qui sont en mode 'chasse'.",
        "minute_10": "Les niveaux deviennent plus difficiles avec un nombre croissant de fantômes et une réduction du temps entre chaque niveau.",
        "hour_5": "À ce stade, le jeu est très difficile et nécessite une grande habileté et mémoire pour anticiper les mouvements des fantômes.",
        "endgame": "Le joueur gagne en vidant le labyrinthe de toutes les pastilles, mais perd s'il est attrapé par un fantôme."
      },
      "objectives": [
        {
          "mode": "Solo",
          "has_win_state": true,
          "victory_condition": "Vider le labyrinthe de toutes les pastilles.",
          "has_defeat_state": true,
          "defeat_condition": "Être attrapé par un fantôme.",
          "player_goal": "Survivre et collecter des points en évitant les fantômes."
        }
      ],
      "retention_answer": "Les joueurs sont attirés par la progression constante, l'augmentation de la difficulté et la satisfaction d'atteindre des scores élevés. La mécanique de capture des fantômes offre une récompense immédiate pour les risques pris."
    },
    {
      "game": "Ms. Pac-Man",
      "sources": [
        {"url": "https://www.youtube.com/watch?v=5cQZJzr6v8M", "type": "video", "timestamp": "2023-10-17"},
        {"url": "https://en.wikipedia.org/wiki/Ms._Pac-Man", "type": "wiki"},
        {"url": "https://www.ign.com/articles/2021/05/26/ms-pacman-history", "type": "article"}
      ],
      "loops": {
        "minute_1": "Le joueur navigue dans un labyrinthe plus complexe avec des pastilles et des fruits spéciaux à collecter.",
        "minute_10": "La difficulté augmente avec une augmentation du nombre de fantômes et un changement dans leur comportement, rendant la navigation plus risquée.",
        "hour_5": "À ce stade, le jeu est très difficile et nécessite une grande habileté et mémoire pour anticiper les mouvements des fantômes.",
        "endgame": "Le joueur gagne en vidant le labyrinthe de toutes les pastilles, mais perd s'il est attrapé par un fantôme."
      },
      "objectives": [
        {
          "mode": "Solo",
          "has_win_state": true,
          "victory_condition": "Vider le labyrinthe de toutes les pastilles.",
          "has_defeat_state": true,
          "defeat_condition": "Être attrapé par un fantôme.",
          "player_goal": "Survivre et collecter des points en évitant les fantômes."
        }
      ],
      "retention_answer": "Les joueurs sont attirés par la progression constante, l'augmentation de la difficulté et la satisfaction d'atteindre des scores élevés. La mécanique de capture des fantômes offre une récompense immédiate pour les risques pris."
    }
  ],
  "advisory": true
}
```

[usage: prompt=1087 completion=1874 total=2961]
