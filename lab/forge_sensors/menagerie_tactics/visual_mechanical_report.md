# Capteur qualité mécanique — menagerie_tactics (advisory)

Seed FTUE: `1234` · mode: `seeded_exploration` · 40 inputs (rejouable).

| id | outcome | mesuré | seuil(hyp.) | justification |
|---|---|---|---|---|
| A1_contrast:#turn | signal_absent | 10.69 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#playerCount | signal_absent | 10.69 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#enemyCount | signal_absent | 10.69 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#captures | signal_absent | 10.69 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#objective | signal_absent | 13.44 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#legend | signal_absent | 10.99 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#roster | signal_absent | 15.15 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A3_empty_density | signal_absent | 0.396 | > 0.92 | hypothèse: >92% de fond = écran vide |
| A5_h_overflow | signal_absent | 0 | > 0 | hypothèse: contenu ne doit pas déborder la fenêtre |
| A6_render_alive | signal_detected | 0 | < 0.001 | hypothèse: <0.1% de pixels changés sur 200ms = rendu figé |
| B2_steps_to_first_reward | signal_detected | null | > 20 | hypothèse: une récompense doit arriver en <20 inputs naïfs |
| B1_dead_input_rate | signal_detected | 1 | > 0.5 | hypothèse: >50% d'inputs sans effet = contrôles peu réactifs |
| B3_longest_stall | signal_detected | 40 | > 8 | hypothèse: >8 inputs consécutifs sans effet = blocage |
| A2_target_size:#endTurn | signal_absent | 34 | < 24 | hypothèse: cible interactive >= 24px (min tactile) |
| A1_contrast:#endTurn | signal_absent | 10.18 | < 4.5 | WCAG AA (bouton) |

## Signaux bruts (sans seuil)
- A4_distinct_colors = 716 (signal brut, sans seuil (cohérence palette = P2/art bible))
