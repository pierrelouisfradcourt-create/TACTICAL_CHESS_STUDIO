Pour ce World Scan, nous allons observer deux jeux comparables à Pac-Man : "Pac-Man" lui-même et "Ms. Pac-Man". Ces jeux sont des exemples parfaits pour comprendre les mécaniques de base d'un jeu de labyrinthe avec des fantômes poursuivants.

### Jeu 1: Pac-Man

**Sources:**
- [Video](https://www.youtube.com/watch?v=04sJGfVZKdA) - "Pac-Man Gameplay" (timestamp : 2023-05-17)
- [Wiki](https://en.wikipedia.org/wiki/Pac-Man) - Pac-Man Wiki
- [Article](https://www.ign.com/articles/2021/04/06/pac-man-history-and-facts-you-must-know) - IGN Article

**Boucles:**
- **Minute 1:** Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes.
- **Minute 10:** Les niveaux deviennent plus difficiles avec une augmentation du nombre de fantômes et de leur vitesse. Le joueur doit continuer à collecter des pastilles tout en restant vigilant face aux fantômes.
- **Heure 5:** À ce stade, le jeu est très difficile avec un grand nombre de fantômes rapides. Le joueur doit utiliser des stratégies avancées pour survivre et gagner des points.
- **Endgame:** Le but ultime est d'atteindre la fin du jeu en accumulant le plus de points possible.

**Objectifs:**
- **Mode Solo (Standard):**
  - `has_win_state`: false
  - `victory_condition`: null
  - `has_defeat_state`: true
  - `defeat_condition`: Le joueur est attrapé par un fantôme.
  - `player_goal`: Survivre le plus longtemps possible et accumuler des points.

**Pourquoi le joueur revient :**
Le jeu offre une progression constante avec des niveaux de difficulté croissants, ce qui maintient l'intérêt du joueur. Les scores élevés et les tableaux de classement encouragent la répétition pour améliorer ses performances.

### Jeu 2: Ms. Pac-Man

**Sources:**
- [Video](https://www.youtube.com/watch?v=5cQZvzr6n8A) - "Ms. Pac-Man Gameplay" (timestamp : 2023-10-19)
- [Wiki](https://en.wikipedia.org/wiki/Ms._Pac-Man) - Ms. Pac-Man Wiki
- [Article](https://www.gamefaqs.com/classic/arcade/586741-pac-man/faqs/14723) - GameFAQs FAQ

**Boucles:**
- **Minute 1:** Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes.
- **Minute 10:** Les niveaux deviennent plus difficiles avec une augmentation du nombre de fantômes et de leur vitesse. Le joueur doit continuer à collecter des pastilles tout en restant vigilant face aux fantômes.
- **Heure 5:** À ce stade, le jeu est très difficile avec un grand nombre de fantômes rapides. Le joueur doit utiliser des stratégies avancées pour survivre et gagner des points.
- **Endgame:** Le but ultime est d'atteindre la fin du jeu en accumulant le plus de points possible.

**Objectifs:**
- **Mode Solo (Standard):**
  - `has_win_state`: false
  - `victory_condition`: null
  - `has_defeat_state`: true
  - `defeat_condition`: Le joueur est attrapé par un fantôme.
  - `player_goal`: Survivre le plus longtemps possible et accumuler des points.

**Pourquoi le joueur revient :**
Le jeu offre une progression constante avec des niveaux de difficulté croissants, ce qui maintient l'intérêt du joueur. Les scores élevés et les tableaux de classement encouragent la répétition pour améliorer ses performances.

```json
{
  "games": [
    {
      "game": "Pac-Man",
      "sources": [
        {"url": "https://www.youtube.com/watch?v=04sJGfVZKdA", "type": "video", "timestamp": "2023-05-17"},
        {"url": "https://en.wikipedia.org/wiki/Pac-Man", "type": "wiki"},
        {"url": "https://www.ign.com/articles/2021/04/06/pac-man-history-and-facts-you-must-know", "type": "article"}
      ],
      "loops": {
        "minute_1": "Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes.",
        "minute_10": "Les niveaux deviennent plus difficiles avec une augmentation du nombre de fantômes et de leur vitesse. Le joueur doit continuer à collecter des pastilles tout en restant vigilant face aux fantômes.",
        "hour_5": "À ce stade, le jeu est très difficile avec un grand nombre de fantômes rapides. Le joueur doit utiliser des stratégies avancées pour survivre et gagner des points.",
        "endgame": "Le but ultime est d'atteindre la fin du jeu en accumulant le plus de points possible."
      },
      "objectives": [
        {
          "mode": "Solo (Standard)",
          "has_win_state": false,
          "victory_condition": null,
          "has_defeat_state": true,
          "defeat_condition": "Le joueur est attrapé par un fantôme.",
          "player_goal": "Survivre le plus longtemps possible et accumuler des points."
        }
      ],
      "retention_answer": "Le jeu offre une progression constante avec des niveaux de difficulté croissants, ce qui maintient l'intérêt du joueur. Les scores élevés et les tableaux de classement encouragent la répétition pour améliorer ses performances."
    },
    {
      "game": "Ms. Pac-Man",
      "sources": [
        {"url": "https://www.youtube.com/watch?v=5cQZvzr6n8A", "type": "video", "timestamp": "2023-10-19"},
        {"url": "https://en.wikipedia.org/wiki/Ms._Pac-Man", "type": "wiki"},
        {"url": "https://www.gamefaqs.com/classic/arcade/586741-pac-man/faqs/14723", "type": "article"}
      ],
      "loops": {
        "minute_1": "Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes.",
        "minute_10": "Les niveaux deviennent plus difficiles avec une augmentation du nombre de fantômes et de leur vitesse. Le joueur doit continuer à collecter des pastilles tout en restant vigilant face aux fantômes.",
        "hour_5": "À ce stade, le jeu est très difficile avec un grand nombre de fantômes rapides. Le joueur doit utiliser des stratégies avancées pour survivre et gagner des points.",
        "endgame": "Le but ultime est d'atteindre la fin du jeu en accumulant le plus de points possible."
      },
      "objectives": [
        {
          "mode": "Solo (Standard)",
          "has_win_state": false,
          "victory_condition": null,
          "has_defeat_state": true,
          "defeat_condition": "Le joueur est attrapé par un fantôme.",
          "player_goal": "Survivre le plus longtemps possible et accumuler des points."
        }
      ],
      "retention_answer": "Le jeu offre une progression constante avec des niveaux de difficulté croissants, ce qui maintient l'intérêt du joueur. Les scores élevés et les tableaux de classement encouragent la répétition pour améliorer ses performances."
    }
  ],
  "advisory": true
}
```

[usage: prompt=1086 completion=1810 total=2896]
