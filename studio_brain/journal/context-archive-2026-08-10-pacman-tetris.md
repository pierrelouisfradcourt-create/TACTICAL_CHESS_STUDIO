# Archive de contexte — session 2026-08-10 (capitalisation Pacman, Tetris V2)

*Extrait de `studio_brain/00_CURRENT_CONTEXT.md`, archivé le 2026-08-15 pour tenir la
limite de 100 lignes du handoff. Contenu non réécrit.*

## Session 2026-08-10 — capitalisation Pacman, fermeture de la boucle, Tetris V2
**Rien commité, rien poussé.** Tout est local, 47+ commits d'avance sur origin.

### Le résultat qui compte
La boucle Forge a tourné sur un **deuxième jeu sans le reconstruire à partir du premier**.
Chiffre : ma carte de réutilisation annonçait ~20 greffons Pacman→Tetris, il y en a eu **ZÉRO**.
Trois fois, la vérification inverse a répondu « Tetris l'a déjà » (coquille, verdict, événements).
Le travail réel était de **déclarer** l'existant et de **prouver** le déclaré. Voir
[[reuse_measure_the_target_not_the_source]].

### TETRIS V2 — 7 facettes structurelles OK, 8/9 observations prouvées
| Facette | État |
|---|---|
| contract_completeness · budget · line_states · placement · collisions · genre_coverage · index | **OK** |
| observable_coverage | **BLOCKED** — 8/9 couvertes ; `core.render` NOT_MEASURED motivé |

- WireMap 12 → 23 lignes. 6 lignes CORE déclarées sur `runtime_loop.gd` (120 l. **déjà écrit**,
  orphelin de la carte) ; `core.audio` + `core.error_handling` en **DEFERRED** motivé (audit :
  aucune exigence dans genre_bible/charter/GAME_REFERENCE/Prisme).
- `solvability.gd` calibré **N_SURVIVE=100, MAX_TICKS=500** (ratifié). Preuve :
  `lab/forge_evidence/TETRIS_SOLVABILITY_N_20260810/` — 18 graines, 6 morts naturelles
  (min 702 pièces), 4,448 ticks/pièce. **Marge de la pire graine : 9 %.**
- 9 volets d'oracle produit écrits dans `07_TESTS/oracle/`, **exécutés en vivo** (Godot v4.6.3).
- **Le jeu n'a JAMAIS été lancé en fenêtre.** Aucune preuve visuelle, aucune jouabilité humaine.

### PACMAN — capitalisé, gelé comme référence
- Sa WireMap v2 (85 lignes) rapatriée dans `games/pacman/09_WIREMAP/` — elle ne vivait que dans
  un répertoire de run. **`node` délibérément absent** du contrat : décision de gouvernance,
  Pacman est hors curriculum. `check_contract_completeness` le nomme lui-même à chaque run.
- `oracle_only` (profil s10s seul, ratifié) a déposé **203 propositions** : 190 produit / 13 usine.
- Ne pas revenir sur : node, catégories, budgets, contrat, propositions PROPOSED.

### Doctrine ratifiée cette session
- **Deux registres** : `capabilities.yaml` (jeu) / `factory_capabilities.yaml` (usine :
  `probe.` `proof.` `bot.` `solvability.` `factory.`). Routage par espace de noms, 7ᵉ file dans
  `pending_review`. Voir [[forge_two_registries_product_factory]].
  *(Commité le 2026-08-15 : `cb025dd`.)*
- **Boucle de réconciliation** registre ↔ proposition (`apply_decisions.reconcileRegistries`) :
  rapporte, n'agit jamais. **0 divergence** en fin de session.
- Profil **`oracle_only`** : mesurer un jeu validé sans le reconstruire.
- Catégorie `reference.observation` dans `repo_map.yaml`.

### En attente de HumanGate (état au 2026-08-10)
- **`core.render` → option (c)** : exécution en fenêtre GPU réelle. Seule vraie preuve pixel.
  (a) est en place (NOT_MEASURED motivé au reçu) ; (b) a été **écartée** — mesuré : `proof_kind`
  n'a **aucun oracle qui l'exige**, sortir la ligne du contrôle effacerait l'obligation.
  *(2026-08-15 : la chaîne de contrôle est désormais commitée — L0b `5a005c9`, oracle `7f239f0`,
  câblage `80f91cb`, et Snake déclare sa directive `bfe7ecb`.)*
- 215 propositions restantes dans `pending_review` (dont 190 Pacman + 12 usine).
- Points hérités non traités : producteur de `divergence_manifest.json` (P6) · armement du témoin
  d'autorité · run non autorisé `driver_smoke_v6_20260808_run2` · distillation bloquée
  (`check_decompo` non discriminant) · désescalade s2 refusée · 4 points non prouvés de Pacman V5.
