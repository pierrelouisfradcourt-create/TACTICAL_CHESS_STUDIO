# Capteur qualité mécanique — p1_probe_tiny_target (advisory)

Seed FTUE: `1234` · mode: `seeded_exploration` · 40 inputs (rejouable).

| id | outcome | mesuré | seuil(hyp.) | justification |
|---|---|---|---|---|
| A1_contrast:#score | signal_absent | 17 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#lives | signal_absent | 17 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#level | signal_absent | 17 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:.hud-label | signal_absent | 6.03 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#help | signal_absent | 4.86 | < 4.5 | WCAG AA texte normal = 4.5:1 |
| A1_contrast:#overlayTitle | metric_unavailable | null | — | élément absent/masqué au moment de la mesure |
| A3_empty_density | signal_absent | 0.895 | > 0.92 | hypothèse: >92% de fond = écran vide |
| A5_h_overflow | signal_absent | 0 | > 0 | hypothèse: contenu ne doit pas déborder la fenêtre |
| A6_render_alive | signal_detected | 0.0005 | < 0.001 | hypothèse: <0.1% de pixels changés sur 200ms = rendu figé |
| B2_steps_to_first_reward | signal_absent | 1 | > 20 | hypothèse: une récompense doit arriver en <20 inputs naïfs |
| B1_dead_input_rate | signal_absent | 0 | > 0.5 | hypothèse: >50% d'inputs sans effet = contrôles peu réactifs |
| B3_longest_stall | signal_absent | 0 | > 8 | hypothèse: >8 inputs consécutifs sans effet = blocage |
| A2_target_size:#restart | signal_detected | 16 | < 24 | hypothèse: cible interactive >= 24px (min tactile) |
| A1_contrast:#restart | signal_absent | 10.15 | < 4.5 | WCAG AA (bouton) |

## Signaux bruts (sans seuil)
- A4_distinct_colors = 14 (signal brut, sans seuil (cohérence palette = P2/art bible))
