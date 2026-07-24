# Capteur qualité mécanique — kb_tactics (advisory)

Seed FTUE: `1234` · mode: `seeded_exploration` · 40 inputs (rejouable).

| id | outcome | mesuré | seuil(hyp.) | justification |
|---|---|---|---|---|
| A1_contrast:h1 | signal_absent | 9.08 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:.hint | signal_absent | 7.42 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A3_empty_density | signal_absent | 0.099 | > 0.92 | hypothèse: >92% de fond = écran vide |
| A5_h_overflow | signal_absent | 0 | > 0 | hypothèse: contenu ne doit pas déborder la fenêtre |
| A6_render_alive | signal_detected | 0 | < 0.001 | hypothèse: <0.1% de pixels changés sur 200ms = rendu figé |
| B2_steps_to_first_reward | signal_absent | 1 | > 20 | hypothèse: une récompense doit arriver en <20 inputs naïfs |
| B1_dead_input_rate | signal_absent | 0 | > 0.5 | hypothèse: >50% d'inputs sans effet = contrôles peu réactifs |
| B3_longest_stall | signal_absent | 0 | > 8 | hypothèse: >8 inputs consécutifs sans effet = blocage |
| A2_target_size:#restart | signal_absent | 33 | < 24 | hypothèse: cible interactive >= 24px (min tactile) |
| A1_contrast:#restart | signal_absent | 6.89 | < 4.5 | WCAG AA (bouton) |

## Signaux bruts (sans seuil)
- A4_distinct_colors = 488 (signal brut, sans seuil (cohérence palette = P2/art bible))
