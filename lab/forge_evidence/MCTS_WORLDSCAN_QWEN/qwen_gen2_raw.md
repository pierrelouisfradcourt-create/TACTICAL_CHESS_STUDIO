Pour ce World Scan, nous allons observer deux jeux comparables à Pac-Man : "Pac-Man" lui-même et "Ms. Pac-Man". Ces jeux partagent des mécaniques similaires de labyrinthe, collecte d'objets et évasion de poursuivants.

### Jeu 1: Pac-Man

**Sources:**
- [Video](https://www.youtube.com/watch?v=04sJGfVZKdA) - "Pac-Man Gameplay" (timestamp : 2023-05-17)
- [Wiki](https://en.wikipedia.org/wiki/Pac-Man) - Pac-Man Wiki
- [Article](https://www.ign.com/articles/2021/04/06/pac-man-history-and-facts-you-must-know) - IGN Article

**Boucles:**
- **Minute 1:** Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes.
- **Minute 10:** Les niveaux deviennent plus difficiles avec une augmentation du nombre de fantômes et de leur vitesse. Le joueur doit gérer sa stratégie pour rester en vie.
- **Heure 5:** À long terme, le joueur cherche à améliorer ses scores et à atteindre des paliers spécifiques comme les bonus spéciaux (cherry, strawberry).
- **Endgame:** La victoire est obtenue par la collecte de toutes les pastilles du labyrinthe. La défaite survient lorsque le joueur est attrapé par un fantôme.

**Objectifs:**
- **Mode Solo:**
  - `has_win_state`: true
  - `victory_condition`: Collecter toutes les pastilles du niveau.
  - `has_defeat_state`: true
  - `defeat_condition`: Être attrapé par un fantôme.
  - `player_goal`: Survivre le plus longtemps possible et collecter des points.

### Jeu 2: Ms. Pac-Man

**Sources:**
- [Video](https://www.youtube.com/watch?v=5cQZJzr6v8M) - "Ms. Pac-Man Gameplay" (timestamp : 2023-10-19)
- [Wiki](https://en.wikipedia.org/wiki/Ms._Pac-Man) - Ms. Pac-Man Wiki
- [Article](https://www.gamefaqs.com/classic/arcade/game/faqs/54786) - GameFAQs FAQ

**Boucles:**
- **Minute 1:** Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes.
- **Minute 10:** Les niveaux deviennent plus difficiles avec une augmentation du nombre de fantômes et de leur vitesse. Le joueur doit gérer sa stratégie pour rester en vie.
- **Heure 5:** À long terme, le joueur cherche à améliorer ses scores et à atteindre des paliers spécifiques comme les bonus spéciaux (cherry, strawberry).
- **Endgame:** La victoire est obtenue par la collecte de toutes les pastilles du labyrinthe. La défaite survient lorsque le joueur est attrapé par un fantôme.

**Objectifs:**
- **Mode Solo:**
  - `has_win_state`: true
  - `victory_condition`: Collecter toutes les pastilles du niveau.
  - `has_defeat_state`: true
  - `defeat_condition`: Être attrapé par un fantôme.
  - `player_goal`: Survivre le plus longtemps possible et collecter des points.

### Pourquoi le joueur revient ?
Dans ces jeux, la répétition de l'expérience avec une augmentation progressive de la difficulté maintient l'intérêt du joueur. Les bonus spéciaux et les paliers à atteindre offrent un objectif clair pour chaque session de jeu.

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
        "minute_10": "Les niveaux deviennent plus difficiles avec une augmentation du nombre de fantômes et de leur vitesse. Le joueur doit gérer sa stratégie pour rester en vie.",
        "hour_5": "À long terme, le joueur cherche à améliorer ses scores et à atteindre des paliers spécifiques comme les bonus spéciaux (cherry, strawberry).",
        "endgame": "La victoire est obtenue par la collecte de toutes les pastilles du labyrinthe. La défaite survient lorsque le joueur est attrapé par un fantôme."
      },
      "objectives": [
        {
          "mode": "Solo",
          "has_win_state": true,
          "victory_condition": "Collecter toutes les pastilles du niveau.",
          "has_defeat_state": true,
          "defeat_condition": "Être attrapé par un fantôme.",
          "player_goal": "Survivre le plus longtemps possible et collecter des points."
        }
      ],
      "retention_answer": "La répétition de l'expérience avec une augmentation progressive de la difficulté maintient l'intérêt du joueur. Les bonus spéciaux et les paliers à atteindre offrent un objectif clair pour chaque session de jeu."
    },
    {
      "game": "Ms. Pac-Man",
      "sources": [
        {"url": "https://www.youtube.com/watch?v=5cQZJzr6v8M", "type": "video", "timestamp": "2023-10-19"},
        {"url": "https://www.gamefaqs.com/classic/arcade/game/faqs/54786", "type": "article"},
        {"url": "https://en.wikipedia.org/wiki/Ms._Pac-Man", "type": "wiki"}
      ],
      "loops": {
        "minute_1": "Le joueur parcourt le labyrinthe, collecte des pastilles et évite les fantômes.",
        "minute_10": "Les niveaux deviennent plus difficiles avec une augmentation du nombre de fantômes et de leur vitesse. Le joueur doit gérer sa stratégie pour rester en vie.",
        "hour_5": "À long terme, le joueur cherche à améliorer ses scores et à atteindre des paliers spécifiques comme les bonus spéciaux (cherry, strawberry).",
        "endgame": "La victoire est obtenue par la collecte de toutes les pastilles du labyrinthe. La défaite survient lorsque le joueur est attrapé par un fantôme."
      },
      "objectives": [
        {
          "mode": "Solo",
          "has_win_state": true,
          "victory_condition": "Collecter toutes les pastilles du niveau.",
          "has_defeat_state": true,
          "defeat_condition": "Être attrapé par un fantôme.",
          "player_goal": "Survivre le plus longtemps possible et collecter des points."
        }
      ],
      "retention_answer": "La répétition de l'expérience avec une augmentation progressive de la difficulté maintient l'intérêt du joueur. Les bonus spéciaux et les paliers à atteindre offrent un objectif clair pour chaque session de jeu."
    }
  ],
  "advisory": true
}
```

[usage: prompt=1087 completion=1742 total=2829]
