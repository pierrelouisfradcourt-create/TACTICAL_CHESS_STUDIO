# Audit Miroir — Rocky vs Adversaire

date: 2026-05-31
status: ANALYSIS

## Méthode

Pour chaque signal : qui est calculé ? Rocky seul / Adversaire seul / Delta ?
Symétrique = Rocky et adversaire traités de la même façon.
Asymétrique = un des deux est favorisé ou ignoré.

Les fichiers analysés (code réel, aucune invention) :
- `src/chess/eval.rs`
- `src/chess/practical_policy.rs`
- `src/chess/search.rs`
- `src/chess/transition_reply.rs`
- `src/chess/root_decision.rs`
- `src/simulation/simulation_runner.rs`

---

## Signaux d'évaluation statique (eval.rs)

La fonction `evaluate(engine, player)` itère sur toutes les unités du plateau et ajoute `v` si `u.owner == player`, soustrait `v` si c'est l'adversaire. Un test unitaire (`eval_symmetry_start_position_near_equal`) vérifie explicitement que `evaluate(engine, 1) == -evaluate(engine, 2)` en position initiale.

| Signal | Calculé pour | Symétrique | Note |
|--------|-------------|------------|------|
| `piece_value` (matériel brut) | Les deux | Oui | Même table de valeurs |
| `center_bonus` | Les deux | Oui | Même formule pour chaque pièce |
| `pawn_structure_score` (passed, isolated, doubled) | Les deux | Oui | Fonction appelée pour chaque pion, quel que soit son camp |
| `rook_file_bonus` | Les deux | Oui | `owner` est passé en paramètre |
| `king_safety_bonus` | Les deux | Oui | `back_rank` adapté à `owner` |
| Bishop pair (+40) | Les deux | Oui | `my_bishops` et `enemy_bishops` traités symétriquement |
| Mobilité (`legal_actions`) | Les deux | Oui | `my_mobility * coeff` et `enemy_mobility * coeff` |
| Check bonus/pénalité | Les deux | **Non** | `enemy_in_check → +80`, `player_in_check → -120`. Pénalité 50% plus lourde que le bonus. |
| `endgame_conversion_pressure` | Les deux | Oui | Appelé pour `player` et `enemy`, soustrait pour l'ennemi |
| `hanging_piece_bonus` | Les deux | Oui | Appelé pour `player` (+) et `enemy` (−) |

**Seule asymétrie de pondération** : la pénalité d'être en échec (-120) est 50% plus forte que le bonus de mettre l'adversaire en échec (+80). C'est intentionnel (être en échec est un danger immédiat), mais le ratio n'est pas justifié dans le code.

---

## Signaux de la Practical Policy (practical_policy.rs)

### Signaux stratégiques (`score_practical_candidate` / `strategic_candidate_breakdown`)

| Signal | Calculé pour | Symétrique | Note |
|--------|-------------|------------|------|
| `enemy_moves_delta` | Adversaire uniquement | **Non** | `state.enemy_legal_moves - enemy_moves_after`. Mesure la réduction des coups adverses après le coup de Rocky. La mobilité de Rocky post-coup n'est jamais mesurée ici. |
| `closest_passed_pawn_distance` | Rocky uniquement | **Non** | Fonction `closest_passed_pawn_distance(engine, player)`. Les pions passés de l'adversaire proches de promotion sont totalement ignorés. |
| `passed_pawn_delta` | Rocky uniquement | **Non** | Dérivé de `closest_passed_pawn_distance` pour Rocky. Pas de delta symétrique pour l'adversaire. |
| `trade_delta` (total matériel retiré) | Absolu (les deux) | Partiel | `total_material_value(engine) - total_material_value(&sim)` : absolu. Mais `preserves_advantage: material_balance(&sim, player) >= 120` est égocentrique. |
| `king_boxing_score` | Roi adverse | **Non** | Mesure à quel point Rocky confine le roi adverse. Ne vérifie pas si Rocky est lui-même confiné. |
| `king_activity_delta` | Rocky uniquement | **Non** | Progression du roi de Rocky vers le centre. |
| `progress_move_score` | Rocky uniquement | **Non** | Avance des pièces de Rocky. |
| `shuffle_penalty` | Rocky uniquement | **Non** | Détecte les va-et-vient de Rocky. |
| `repetition_signal` | Position (indirect) | **Non** | Interprétation égocentrique : Rocky pénalisé quand `Winning/Ahead`, Rocky récompensé quand `Losing`. L'adversaire n'a pas de comportement miroir. |
| `gives_check` | Rocky uniquement | **Non** | Vérifie si le coup de Rocky met en échec. |

### Signaux tactiques (`tactical_score_breakdown`, `tactical_safety_filter_breakdown`)

| Signal | Calculé pour | Symétrique | Note |
|--------|-------------|------------|------|
| SEE-lite (`see_lite_bonus`) | Les deux (partiellement) | **Partiel** | `capture_value - cheapest_enemy + cheapest_own / 2`. Les deux camps sont considérés mais la pondération est asymétrique : `cheapest_own` est divisé par 2, pas `cheapest_enemy`. |
| `hanging_guard_penalty` | Rocky uniquement | **Non** | Pénalise Rocky si ses pièces deviennent pendantes. Ne récompense pas Rocky si les pièces adverses deviennent pendantes (ça c'est le `hanging_piece_bonus` dans eval.rs, pas ici). |
| `trade_sanity_bonus` | Rocky uniquement | **Non** | `material_balance(engine, player)` et `after_balance >= before_balance - 120` : égocentrique Rocky. |
| `quiet_nonsense_penalty` | Rocky uniquement | **Non** | Pénalise les coups passifs de Rocky. |
| `tactical_safety_filter` (material_drop) | Rocky uniquement | **Non** | `material_drop = (my_balance_after - material_balance(sim, player)).max(0)`. Ne mesure que la perte de Rocky. |
| `promotion_race_signal` | Rocky uniquement | **Non** | Vérifie si Rocky a une menace de promotion. Pas de signal symétrique pour les promotions adverses imminentes. |
| `capture_safety_signal` | Rocky uniquement | **Non** | Sécurité de la capture pour Rocky. |

### Reply scan (`reply_scan_breakdown`)

| Signal | Calculé pour | Symétrique | Note |
|--------|-------------|------------|------|
| Ordre des réponses (`quick_reply_order_score`) | Adversaire | Oui | Scoré du point de vue de l'adversaire : captures, checks, promotions adverses — correctement modélisé. |
| `reply_penalty_after_move` | Rocky uniquement | **Non** | Mesure la pénalité pour Rocky après chaque réponse adverse. Ne mesure pas le gain de l'adversaire indépendamment. |
| `fork_targets_on_square` | Les deux (partiellement) | **Non** | Dans `reply_penalty`, compte les fourchettes de l'adversaire sur les pièces de Rocky. Dans `quick_reply_order_score`, idem. Rocky ne reçoit pas de bonus si c'est lui qui crée une fourchette dans ce contexte. |

---

## Ordering des coups (search.rs)

| Signal | Calculé pour | Symétrique | Note |
|--------|-------------|------------|------|
| `move_score` | Joueur courant (`to_move`) | Oui (relatif) | Calculé pour le joueur qui joue à chaque ply. Dans les nœuds adverses, c'est scoré du point de vue de l'adversaire. |
| `capture_score` (MVV-LVA) | Neutre | Oui | `captured_value - moved_value` : absolu, indépendant du joueur. |
| `development_score` | Joueur courant | Oui (relatif) | Appliqué pour le joueur courant à chaque ply. |
| `mobility_hint_score` | Joueur courant | Oui (relatif) | `pseudo_mobility_from` du joueur courant. |
| `killers` | Partagés par ply | **Non** | Stockés par profondeur sans distinguer le joueur. Le killer de Rocky à ply 2 est aussi proposé à l'adversaire à ply 2 (approximation courante mais asymétrique). |
| `countermoves` | Partagés par `move_id` | **Non** | Stockés sans information de joueur. Un countermove de Rocky peut influencer l'ordonnancement de l'adversaire si les `move_id` se recoupent (théoriquement impossible avec des unit_id distincts). |
| `history` | Partagé par `move_id` | **Non** | Identique aux countermoves. En pratique peu d'impact car les unit_id sont uniques par pièce. |
| Quiescence `stand_pat` | Rocky (`root_player`) | **Non** | `evaluate(engine, root_player)` — toujours du point de vue de Rocky même dans les nœuds adverses. C'est correct pour negamax antisymétrique mais signifie que l'adversaire ne fait jamais son propre `stand_pat` indépendant. |

**Note sur la quiescence** : `stand_pat = evaluate(engine, root_player)` — l'évaluation au repos est toujours du point de vue de Rocky (`root_player`). Pour les nœuds adverses, le score est renversé par negamax (`-quiescence(...)`). C'est mathématiquement correct si `evaluate` est antisymétrique, mais crée une dépendance sur Rocky qui n'est pas intuitive.

---

## Modélisation adversaire (transition_reply.rs)

Fonction centrale : `opponent_worst_case_value(engine, player, action, cutoff)`.

| Aspect | Analyse | Symétrique |
|--------|---------|------------|
| Évaluation initiale | `worst_value = static_evaluate(&simulated, player)` après le coup de Rocky | Non — toujours du point de vue de Rocky |
| Tri des réponses adverses | `move_score(&simulated, opponent, mv)` — scoré du point de vue de l'adversaire | Oui — les meilleures réponses adverses sont prioritaires |
| Évaluation après réponse | `reply_value = static_evaluate(&simulated, player)` | Non — toujours Rocky |
| Agrégation | `worst_value = worst_value.min(reply_value)` | Non — on cherche le pire pour Rocky |
| Cutoff | Comparaison avec `cutoff.relative_floor` et `cutoff.terminal_floor` | Non — seuils fixés selon Rocky |

**Conclusion** : les réponses adverses sont **correctement triées** selon l'intérêt de l'adversaire (`move_score(opponent)`), mais leur impact est **toujours mesuré du point de vue de Rocky**. C'est une asymétrie intentionnelle et correcte pour un moteur de jeu (Rocky optimise pour lui-même), mais la modélisation de l'adversaire reste superficielle : on ne simule pas ce que l'adversaire *préférerait* au sens absolu, on cherche ce qui est le *pire pour Rocky*.

---

## Signaux MOVE_DIAG (simulation_runner.rs)

Le `MOVE_DIAG` émis dans `simulation_runner.rs` (lignes ~1452-1468) contient des **placeholders fixes** pour plusieurs champs :

| Signal | Valeur émise | Valeur réelle | Asymétrie |
|--------|-------------|---------------|-----------|
| `material` | `material_diff * 100` | Score depuis le point de vue de **Blanc** (player 1) toujours, même si Black joue | **Oui** — si Rocky joue Noir, `material_diff` est négatif quand Rocky est en avance |
| `own_moves` | `legal_actions.len()` AVANT le coup | Coups légaux de Rocky avant de jouer | Temporalité différente de `enemy_moves` |
| `enemy_moves` | `engine.legal_actions(opponent(player)).len()` APRÈS le coup | Coups adverses après le coup de Rocky | Correct mais temporalité asymétrique |
| `enemy_moves_delta` | **`0i32` (hardcodé)** | Le vrai delta est calculé dans `practical_policy.rs` mais non remonté ici | Signal inutilisable dans les diagnostics |
| `passed_pawn_delta` | **`0i32` (hardcodé)** | Identique : calculé dans `strategic_candidate_breakdown` mais non remonté | Signal inutilisable |
| `passed_pawn_distance` | **`8i32` (hardcodé)** | Valeur neutre par défaut — la vraie distance n'est pas calculée ici | Signal inutilisable |
| `repetition_pressure` | `repetition_flag` (0 ou 1) | Binary — dans `practical_policy.rs`, c'est une valeur continue (0-4+) | Simplifié |

**Impact critique** : trois signaux centraux du MOVE_DIAG (`enemy_moves_delta`, `passed_pawn_delta`, `passed_pawn_distance`) sont des **constantes** dans les diagnostics de simulation. Le coach LLM qui lit ces lignes reçoit des données trompeuses.

---

## Tableau de synthèse

| Signal | Calculé pour | Symétrique | Impact si asymétrie |
|--------|-------------|------------|---------------------|
| Matériel brut (eval.rs) | Les deux | Oui | — |
| Center bonus (eval.rs) | Les deux | Oui | — |
| Pawn structure (eval.rs) | Les deux | Oui | — |
| Rook file bonus (eval.rs) | Les deux | Oui | — |
| King safety bonus (eval.rs) | Les deux | Oui | — |
| Bishop pair (eval.rs) | Les deux | Oui | — |
| Mobilité (eval.rs) | Les deux | Oui | — |
| Check pondération (eval.rs) | Les deux | **Non** (80 vs 120) | Rocky surpénalisé en échec relatif au bonus de donner échec |
| endgame_conversion_pressure (eval.rs) | Les deux | Oui | — |
| hanging_piece_bonus (eval.rs) | Les deux | Oui | — |
| enemy_moves_delta (practical_policy) | Adversaire uniquement | **Non** | Rocky ne mesure pas sa propre amélioration de mobilité post-coup |
| closest_passed_pawn_distance (practical_policy) | Rocky uniquement | **Non** | Pions passés adverses proches de promotion ignorés dans le scoring stratégique |
| promotion_race_signal (practical_policy) | Rocky uniquement | **Non** | Rocky ne voit pas la course de promotion adverse |
| king_boxing_score (practical_policy) | Roi adverse | **Non** | Rocky n'évalue pas si son propre roi est confiné |
| SEE-lite (practical_policy) | Les deux, partiel | **Partiel** | `cheapest_own / 2` mais pas `cheapest_enemy / 2` |
| hanging_guard_penalty (practical_policy) | Rocky uniquement | **Non** | Ne détecte pas les pièces adverses nouvellement pendantes |
| trade_sanity_bonus (practical_policy) | Rocky uniquement | **Non** | Échange évalué uniquement du point de vue de l'avantage de Rocky |
| tactical_safety material_drop (practical_policy) | Rocky uniquement | **Non** | Ne mesure que la perte de Rocky, pas le gain adverse |
| reply_scan ordering (practical_policy) | Adversaire | Oui | Bonne modélisation — réponses triées par intérêt adverse |
| Killers (search.rs) | Partagés par ply | **Non** | Killers inter-joueurs (approximation standard mais asymétrique) |
| History (search.rs) | Partagé par move_id | **Non** | Potentiel croisement inter-joueurs (impact pratique faible) |
| Quiescence stand_pat (search.rs) | Rocky (root_player) | **Non** | Mathématiquement correct avec negamax antisymétrique, mais pas auto-suffisant pour l'adversaire |
| opponent_worst_case_value (transition_reply) | Rocky (worst case) | **Non** | Intentionnel : recherche le pire cas pour Rocky. Tri des réponses adverses correct. |
| MOVE_DIAG material (simulation_runner) | Blanc uniquement | **Non** | Incorrect quand Rocky = Noir |
| MOVE_DIAG own_moves vs enemy_moves (simulation_runner) | Temporalités différentes | **Non** | Comparaison non iso-temporelle |
| MOVE_DIAG enemy_moves_delta (simulation_runner) | Placeholder (0) | **Non** | Signal inutilisable dans les diagnostics |
| MOVE_DIAG passed_pawn_delta (simulation_runner) | Placeholder (0) | **Non** | Signal inutilisable |
| MOVE_DIAG passed_pawn_distance (simulation_runner) | Placeholder (8) | **Non** | Signal inutilisable |

---

## Conclusions

### Signaux purement égocentriques (Rocky only)

Les signaux suivants ne modélisent que la situation de Rocky et ignorent la perspective adverse :

- `closest_passed_pawn_distance` / `passed_pawn_delta` : Rocky regarde ses propres pions passés, pas ceux de l'adversaire
- `promotion_race_signal` : Rocky évalue uniquement ses promotions imminentes
- `king_boxing_score` : Rocky confine le roi adverse mais ne vérifie pas si son propre roi est confiné
- `hanging_guard_penalty` : Rocky protège ses pièces pendantes mais ne détecte pas les nouvelles pièces adverses pendantes créées par son coup
- `tactical_safety material_drop` : uniquement la perte de Rocky
- `trade_sanity_bonus` : centré sur l'avantage de Rocky
- `progress_move_score` / `shuffle_penalty` / `capture_safety_signal` : tous focalisés sur Rocky

### Signaux qui modélisent vraiment l'adversaire

- `reply_scan_breakdown` : tri des réponses par intérêt adverse, calcul de la pénalité pour Rocky — bonne modélisation de surface
- `opponent_worst_case_value` : réponses triées par `move_score(opponent)` — modélisation correcte mais shallow (1 ply)
- `evaluate` en global (eval.rs) : symétrique par construction — les deux camps traités de façon identique
- `enemy_moves_delta` dans `practical_policy.rs` : mesure la réduction de mobilité adverse (mais égocentrique : uniquement dans un sens)

### Endroits où Rocky devrait regarder l'adversaire mais ne le fait pas

1. **Pions passés adverses** : `closest_passed_pawn_distance(engine, enemy)` n'est jamais calculé dans la politique stratégique. Si l'adversaire a un pion à deux cases de promotion, Rocky peut l'ignorer complètement si sa propre situation stratégique est favorable.

2. **Course de promotion adverse** : `promotion_race_signal` est centré Rocky. Pas de signal `enemy_promotion_race_signal` en entrée de `phase_profile_rerank_bonus` ou `score_practical_candidate`.

3. **MOVE_DIAG dans simulation_runner** : trois champs centraux sont des constantes hardcodées (0, 0, 8). Le pipeline LLM reçoit des données fabriquées.

---

## Recommandations prioritaires

### R1 — Pions passés adverses dans la politique stratégique (impact : ÉLEVÉ)

**Localisation** : `practical_policy.rs`, fonction `strategic_candidate_breakdown` (ligne ~619) et `closest_passed_pawn_distance` (ligne ~1068).

**Problème** : `passed_pawn_delta` ne mesure que l'avancement des pions passés de Rocky. Si l'adversaire a un pion passé à 1 case de promotion, ce signal reste à 0. Rocky peut ignorer une promotion adverse imminente tout en cherchant à pousser son propre pion passé lointain.

**Correction possible** : calculer `enemy_passed_pawn_distance = closest_passed_pawn_distance(engine, enemy)` et l'incorporer comme pénalité dans `PracticalCandidateInputs` (nouveau champ `enemy_passed_pawn_pressure`). Le score stratégique pourrait ajouter un malus si `enemy_passed_pawn_distance < passed_pawn_distance` (l'adversaire est en avance dans la course).

---

### R2 — Corriger les placeholders MOVE_DIAG dans simulation_runner (impact : MOYEN)

**Localisation** : `simulation_runner.rs`, lignes ~1444-1446.

**Problème** : `enemy_moves_delta = 0`, `passed_pawn_delta = 0`, `passed_pawn_distance = 8` sont des constantes hardcodées. Le coach LLM qui consomme ces diagnostics lit de fausses données pour trois des signaux les plus informatifs. Cela pollue toute analyse basée sur les MOVE_DIAG.

**Correction possible** : calculer les vraies valeurs pré/post coup dans la boucle de simulation (snapshot `enemy_moves_before`, puis comparer après exécution), ou récupérer les vraies valeurs depuis `decision_trace` si disponibles.

---

### R3 — Signal de promotion adverse dans le scoring de phase (impact : MOYEN)

**Localisation** : `practical_policy.rs`, `phase_profile_rerank_bonus` (ligne ~761).

**Problème** : `promotion_race_signal(engine, player, mv)` vérifie uniquement si Rocky a une menace de promotion. Dans `PhaseRewardProfile::LosingEndgame`, une pénalité sur les captures (`PHASE_REWARD_LOSING_ENDGAME_TRADE_REDUCTION`) existe mais pas de signal explicite sur les promotions adverses imminentes (`opponent_has_promotion_threat` existe dans simulation_runner.rs mais n'est pas appelé dans practical_policy).

**Correction possible** : ajouter un appel à `imminent_promotion_threat(engine, enemy)` (fonction déjà disponible dans `practical_policy.rs`, ligne ~1629) comme signal d'alerte dans `phase_profile_rerank_bonus`, avec un bonus pour les coups qui bloquent la promotion adverse.
