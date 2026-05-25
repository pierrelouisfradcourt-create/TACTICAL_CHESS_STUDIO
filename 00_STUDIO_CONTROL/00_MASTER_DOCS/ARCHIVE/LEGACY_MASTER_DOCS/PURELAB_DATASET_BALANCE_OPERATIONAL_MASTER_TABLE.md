# PURELAB DATASET BALANCE — OPERATIONAL MASTER TABLE

This document merges:
- the balancing doctrine
- the short-term / long-term numeric targets
- the hard guardrails
- the required exposed metrics
- the active lab framing where the dataset must remain traceable, validated, and compatible with conversion recovery
- the rule that the lab-only hard cap must never become a learned chess truth

## Operational master table

| axe | cible court terme | cible long terme | garde-fou | rejet dur | métrique à exposer |
| --- | --- | --- | --- | --- | --- |
| finalité d’apprentissage | dataset plus décisif, anti-passivité, anti-drift | dataset plus complet et plus symétrique | équilibrer les comportements appris, pas seulement les labels | dataset qui apprend surtout survivre / attendre / répéter | behavior_intent_summary, narrative_class_distribution |
| résultats globaux | wins 35–40%, losses 35–40%, useful draws 20–30% | ~33/33/33 | les draws ne sont gardées que si elles sont utiles | draw conservée juste parce que draw | win_pct, loss_pct, useful_draw_pct, sterile_draw_pct |
| version minimum viable résultats | wins 35–50%, losses 35–50%, useful draws 10–25% | convergence vers ~33/33/33 | garder un corpus décisif au début | draws stériles dominantes | result_distribution |
| sterile draws | <5% | <5% | filtrage agressif | >10% | sterile_draw_pct, draw_usefulness |
| hard cap / turn limit | 0% | 0% | aucune promotion dans le core dataset | >0% | hard_cap_count, hard_cap_pct, turn_limit_count, turn_limit_pct |
| random trajectory | 0% | 0% | exclu du core | >0% | random_trajectory_count, source_type_breakdown |
| résultat × couleur | aucune case effondrée | symétrie plus naturelle | surveiller white wins, black wins, white losses, black losses séparément | collapse d’une case importante | result_by_color_table |
| side to move | 48–52% | 49–51% | parité proche 50/50 | <45% ou >55% | side_to_move_balance |
| draws blanches | filtrage plus sévère | toujours sévère | une nulle blanche molle est suspecte | inflation de white draws molles | white_useful_draw_pct, white_sterile_draw_pct |
| draws noires | tolérance un peu plus haute si instructives | équilibrage progressif | acceptable si vraie défense / égalisation / tenue | inflation de black draws molles | black_useful_draw_pct, black_sterile_draw_pct |
| positions de conversion | présentes pour Blancs et Noirs | riches des deux côtés | pas de dataset Blanc pousse / Noir tient toujours | absence structurelle de conversion d’un côté | conversion_by_color |
| types de fin à garder | mate, conversion nette, insufficient material propre, finale égale tenue | idem + plus de finesse | les fins doivent raconter une conclusion lisible | aucune | termination_mode_breakdown |
| répétition / 50 coups / pat | rare et conditionnel | contrôlé | gardés seulement s’ils sont lisibles et pédagogiques | répétition stérile, faux nul de pipeline | repetition_draw_count, fifty_move_draw_count, stalemate_count |
| non-termination déguisée | 0 | 0 | audit termination-aware obligatoire | toute présence | suspicious_draw_count, fake_draw_flags |
| équilibre narratif | noyau fort sur Punish / Convert / Defend utile / Conclude | plus de variété ensuite | chaque partie ou fragment doit entrer dans une classe utile | partie classable seulement comme Drift | narrative_tags, narrative_class_distribution |
| classes utiles | Build, Tension, Punish, Convert, Defend, Conclude | idem | au moins une classe utile par item | no identifiable story | chapter_primary, chapter_secondary, chapter_confidence |
| drift | 0–5% | ~0% | drift toléré seulement en bruit résiduel | >10% | drift_pct, reject_flags |
| Build | 15–25% | 15–20% | ne pas dominer le corpus | build sans suite massif | build_pct |
| Tension | 15–25% | 15–20% | doit déboucher sur lecture/choix/conclusion | tension vide dominante | tension_pct |
| Punish | 15–25% | 15–20% | central pendant conversion recovery | trop faible | punish_pct |
| Convert | 20–30% | 15–20% | classe surpondérée au court terme | trop faible | convert_pct |
| Defend | 10–20% | 15–20% | utile seulement si défense réelle | defend passif dominant | defend_pct |
| Conclude | 10–20% | 10–15% | garder les vraies conclusions techniques | quasi absent | conclude_pct |
| répertoire technique minimal | roque, gain tactique net, fourchette, clouage, attaque double, promotion, conversion matérielle, défense de nulle correcte, finale égale propre | ajout progressif de skewers, mate du couloir, forteresse, finales techniques | aucun thème obligatoire ne doit être absent | trou complet dans le répertoire | motif_tags, motif_coverage_table |
| répartition des motifs | motifs visibles des deux côtés | symétrie croissante | éviter les motifs présents seulement côté blanc ou côté noir | thème unilatéral ou seulement artificiel | motif_by_color |
| familles avancées | KQ vs K, KR vs K, ladder mate seulement si robustesse runtime prouvée | oui après validation | ne pas surpondérer une famille fragile | famille cassée dominante | exercise_family_stats, runtime_validation_status |
| qualité de source / trajectoire | 80–100% teacher-pure ou teacher-dominé | maintenir très haut | random exclu, heuristic-dominant quasi nul | source suspecte ou inconnue dominante | source_confidence_tags, source_type_breakdown |
| provenance | 100% manifestée ou quasi | 100% | tout item doit avoir une provenance claire | provenance cassée ou unknown dominante | source_id, game_id, labeler_version, dataset_version |
| type de donnée | composite : full games 25%, useful fragments 25%, tactical exercises 20%, conversion exercises 15%, defensive draws 10%, technical endings 5% | rééquilibrage progressif selon besoins | éviter 100% parties molles ou 100% puzzles artificiels | monobloc homogène sans récit ni technique | family_mix_distribution |
| longueur × utilité | accepter court clair, moyen progressif, long converti ou défendu proprement | idem | longueur jamais critère seul | longue inertielle / cap / sans progrès | game_length, progress_event_count, long_stagnation_span |
| stagnation | faible | très faible | définir seuils clairs | stagnation prolongée sans récit | max_stagnation_span, stagnation_flags |
| swing / progression | minimum d’événements de progrès | idem | pas de longue partie sans swing ni conclusion | absence de progression | material_swing_min, progress_event_count |
| diversité positionnelle | unique_fen_ratio ≥ 0.92 | ≥ 0.90 | éviter répétition cachée | <0.85 | unique_fen_ratio |
| diversité décisionnelle | unique_best_move_ratio ≥ 0.45 | ≥ 0.40 | éviter policy collapse | <0.30 | unique_best_move_ratio |
| qualité de tri | KEEP majoritaire, WEAK_KEEP plafonné | KEEP fort et stable | WEAK_KEEP doit rester borné | WEAK_KEEP >30% ou REJECT >25% | keep_pct, weak_keep_pct, reject_pct |
| instrumentation minimale | termination-aware counts, source confidence, narrative tags, motif tags, draw usefulness, reject flags | complète et stable | ne pas prétendre mesurer ce qui n’est pas exposé | doctrine sans métriques | termination_mode, reject_flags, source_confidence_tags, draw_usefulness, narrative_tags, motif_tags |
| admission gate | manifest présent, validation dataset passée, provenance forte, 0 hard-cap, faible draw stérile, récit identifiable | idem | promotion seulement si le dataset passe les gates | pas de manifest, pas de validation, hard-cap >0, random >0 | manifest_present, dataset_validation_pass |
| usage labo | nouveau curated dataset à côté du seed historique | possible promotion après benchmark | ne pas écraser le seed historique ni confondre baseline et nouveau main dataset | overwrite du seed ou promotion sans manifest | dataset_version, parent_dataset, promotion_status |

## Kill switches

These conditions trigger immediate rejection as `main dataset candidate`.

| kill switch | règle |
| --- | --- |
| hard cap présent | rejet |
| max-turn fake draw | rejet |
| random dans la trajectoire principale | rejet |
| source inconnue / cassée dominante | rejet |
| répétition stérile significative | rejet |
| drift long sans histoire | rejet |
| partie sans récit identifiable | rejet |
| ligne absurde mais légale | rejet |
| manifest absent | rejet |
| validation dataset absente ou échouée | rejet |

## Doctrine de pilotage

Le point central fusionné est celui-ci :

**le dataset principal ne doit pas être équilibré pour ressembler abstraitement à des parties existantes ; il doit être équilibré pour enseigner les comportements que PureLab veut réellement faire émerger : construire, tendre, punir, convertir, défendre utilement et conclure, tout en rejetant strictement stall, drift, répétition vide, passivité et non-conversion.**

## Version ultra courte

- court terme : plus décisif
- long terme : plus symétrique
- toujours :
  - 0 hard-cap
  - 0 random
  - draws utiles seulement
  - provenance forte
  - récit identifiable
  - couverture technique minimale
  - dataset composite, pas monobloc

## Active lab linkage

This doctrine is intended to govern curated dataset work inside the active lab.

Implications for current work:
- the pedagogical database remains a curated side dataset until validation and benchmark support justify promotion
- the historical seed must not be overwritten casually
- the lab-only hard cap must never be promoted as a chess truth label
- conversion-rich, pedagogically legible material is preferred during conversion recovery
- dataset admission must remain manifest-driven, traceable, and validation-aware
