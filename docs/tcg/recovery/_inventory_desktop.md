# Inventaire récupération — Desktop (Studio-Dev)

Source : `/c/Users/Studio-Dev/Desktop` (racine + `md claude`, `files_extracted`, `RECOVER`, `OUTSIDE_PACK`, `Nouveau dossier`).
Généré : 2026-07-06. Agent lecture seule. Copies vers `docs/tcg/recovery/incoming/`, préfixe `desktop_<mtime>__`.
Hors scope (autre agent) : TacticalChessPureLab, archives, runtime_outputs.

## Résumé

- Fichiers pertinents TCG copiés : **7**
- Non copiés (>5 Mo, MEGA_CORPUS) : **4** (= 2 uniques + 2 doublons exacts)
- Non copiés (hors scope TCG : ML Rocky / studio infra / gouvernance) : **8**
- Vides (0 octet) : **2**
- Dossier vide : **1** (`Nouveau dossier`)

## Contenu notable (design TCG compris)

- **Deux branches distinctes** : *Tactical Chess* (le jeu de plateau tactique) vs *TacticalChessPureLab* (labo ML Rust+PyTorch pour l'IA d'échecs). Le jeu = échiquier 8x8, RNG de génération d'unités par **budget de puissance**, draft par **factions**, altérations d'état, **pression progressive du roi**. Positionné entre échecs modernes / auto-battler / tactical RPG / TCG draftable. Inspirations : TFT, Magic, tactical RPG.
- **Architecture en 3 couches** (EXTRAIT2) : (1) Cœur Tactical Chess — HP/ATK/ARM, contre-attaques, BRAWL, pression roi, jeu autonome sans draft = PRIORITÉ ACTUELLE ; (2) Asymétrie — factions, rois/reines de set, pions variantes, draft ; (3) Magic Mode — sorts, mana, logique TCG complète = long terme.
- **Budgets de puissance par pièce** : Pion 4 / Cavalier 6 / Fou 6 / Tour 7 / Reine 8 / Roi 9 (03_JEUX). Calibration stats (EXTRAIT2) : Pion 3HP/3ATK/0ARM (variantes off 2/4, def 4/2), Cavalier ~6HP (2 défenseurs BRAWL), Fou 5-6HP, Tour 7HP/ARM1 permanente, Reine 7-8HP/4ATK, Roi mage/hybride/guerrier avec seuils de pression ~5/~7/~8.
- **Système de statuts** : burn, poison, gel, désarm, charme, stun… + **matrice d'interdits** (combos anti-abus).
- **Générateur de cartes** (existait sur ancien disque dur, à récupérer) — séquence RNG : faction → rôle → budget → stats → portée → géométrie → interaction → effet → validation.
- **Conflits de règles ouverts (HumanGate)** : Damage `max(1, ATK-ARM)` vs `max(0, incomingDamage-armor)` ; variantes BRAWL ; victoire par king kill vs pressure collapse vs chess mate.
- **Règle de contrôle des cases** : une pièce contrôle exactement les cases où elle pourrait capturer (EXTRAIT2). Objectifs de jeu : lignes de front/percées, batailles de centre, sièges de roi progressifs, structures de pions ; à éviter : effets globaux trop forts, pièces impunissables, mécaniques qui remplacent les échecs.
- **Knowledge Graph** : couches CANON → ENGINE → SYSTEM DATABASE → SIMULATION/AI ; entités Piece/Ability/Status/Tile/Structure/Event/Action ; relations (Piece uses Ability, applies Status, triggers Event → Engine Resolver → State Mutation).
- **Concept coaching "rétro-engineering"** (03_JEUX, Phase 3) : Rocky démarre nerfé selon le niveau du joueur et récupère progressivement son code à mesure que le joueur monte.
- `idées 76.txt` : surtout de l'infra studio (dataset, scripts), mais items **18-19** portent le design TCG : déblocage frontend Godot (Chess 960 / Fantasy / TCG) et arbitrage des conflits Chess Fantasy (damage, victory, BRAWL).

## Tableau

| chemin_origine | taille | date (mtime) | sujet | version_interne | recoupement | copié_vers / raison |
|---|---|---|---|---|---|---|
| TACTICAL_CHESS_RECOVERY.docx | 21 468 | 2026-06-01 | Doc récupération complet : identité projet, 2 branches (jeu vs labo ML), vision TCG | "Généré le 1er juin 2026" | NOUVEAU | `desktop_2026-06-01__TACTICAL_CHESS_RECOVERY.docx` — **conversion texte requise** |
| TACTICAL_CHESS_RECOVERY_EXTRAIT2.docx | 24 677 | 2026-06-01 | Règles canoniques avancées : 3 couches, stats pièces, statuts, RNG, contrôle cases | "Extrait 2 · Juin 2026" | NOUVEAU (complément) | `desktop_2026-06-01__TACTICAL_CHESS_RECOVERY_EXTRAIT2.docx` — **conversion texte requise** |
| Tactical_Chess_System_Knowledge_Graph.md | 1 282 | 2026-06-01 | Graphe système : couches, entités, relations moteur | — | NOUVEAU | `desktop_2026-06-01__Tactical_Chess_System_Knowledge_Graph.md` |
| idées 76.txt | 65 839 | 2026-06-08 | Backlog studio ; items 18-19 = design TCG (frontend, damage/victory/BRAWL) | session 2 | NOUVEAU | `desktop_2026-06-08__idées 76.txt` |
| md claude/00_VISION.md | 3 447 | 2026-05-27 | Vision studio ; produits Chess Fantasy + Chess TCG (Phase 2-3) | CANONICAL 2026-05-27 | DOUBLON (identique à `downloads_2026-05-27__00_VISION.md`) | `desktop_2026-05-27__00_VISION.md` |
| md claude/01_ROADMAP.md | 2 491 | 2026-05-27 | Roadmap ; Phase 2 Chess Fantasy + générateur cartes TCG à récupérer | CANONICAL 2026-05-27 | NOUVEAU | `desktop_2026-05-27__01_ROADMAP.md` |
| md claude/03_JEUX.md | 2 508 | 2026-05-27 | **État/design jeux** : budgets pièces, statuts, factions, draft, RNG cartes, conflits | CANONICAL 2026-05-27 | NOUVEAU | `desktop_2026-05-27__03_JEUX.md` |
| Tactical_Chess_AI_MEGA_CORPUS_PART_1.md | 136 480 788 | 2026-06-01 14:52 | Corpus unifié TCG (canon+engine+system+db+atlas), 751 hits kw | "AI MEGA CORPUS" | UNIQUE #1 | **NON COPIÉ (>5Mo)** — log only |
| Tactical_Chess_AI_MEGA_CORPUS_PART_2.md | 136 480 823 | 2026-06-01 14:52 | Corpus (mirror blocks, sts_ data), 750 hits kw | "INGESTION MIRROR" | UNIQUE #2 | **NON COPIÉ (>5Mo)** — log only |
| recovTactical_Chess_AI_MEGA_CORPUS_PART_1.md | 136 480 788 | 2026-06-01 15:00 | idem PART_1 (taille+head+kw identiques) | — | DOUBLON de PART_1 | **NON COPIÉ (>5Mo)** — log only |
| recoverTactical_Chess_AI_MEGA_CORPUS_PART_2.md | 136 480 823 | 2026-06-01 15:05 | idem PART_2 (taille+head+kw identiques) | — | DOUBLON de PART_2 | **NON COPIÉ (>5Mo)** — log only |
| Conversation avec Gemini.txt | 128 408 | 2026-05-31 | Recherche IA hybride Stockfish+LLM (Rocky), archi cognitive | — | — | NON COPIÉ — hors scope TCG (ML Rocky) |
| recup gpt.txt | 0 | 2026-06-01 | vide | — | — | NON COPIÉ — fichier vide |
| command.txt | 0 | 2026-05-23 | vide | — | — | NON COPIÉ — fichier vide |
| md claude/02_ROCKY.md | 4 751 | 2026-05-27 | Rocky : couche IA au-dessus moteur Rust (archi AlphaStar) | CANONICAL | — | NON COPIÉ — hors scope TCG (lane Rocky ML) |
| md claude/04_STUDIO.md | 4 067 | 2026-05-27 | Pipeline studio, FusionAuditor, gates, L1→L2 | CANONICAL | — | NON COPIÉ — hors scope TCG (infra studio) |
| files_extracted/CLAUDE_CODE_PATCH_AND_HARDEN.md | 3 736 | 2026-05-31 | Instructions patch run_chain.py | — | — | NON COPIÉ — hors scope TCG (infra chaînes) |
| files_extracted/run_chain.py | 11 620 | 2026-05-31 | Studio Chain Runner v2 (LM Studio) | v2 | — | NON COPIÉ — hors scope TCG (infra chaînes) |
| RECOVER/AGENTS.md | 3 758 | 2026-05-21 | Doctrine agents (software/evidence/claim verdicts) | — | — | NON COPIÉ — hors scope TCG (gouvernance) |
| OUTSIDE_PACK/L1_DATASET_PHYSICAL_TRUTH.yaml.txt | 36 647 | 2026-05-26 | Pack review dataset L1 (ML Rocky), 0 kw TCG | SCHEMA_V0 | — | NON COPIÉ — hors scope TCG (ML dataset) |
| OUTSIDE_PACK/You are Devstral...txt | 8 152 | 2026-05-27 | Prompt review Devstral L1 (ML), 0 kw TCG | SCHEMA_V0 | — | NON COPIÉ — hors scope TCG (prompt ML) |
| OUTSIDE_PACK/prompt_automation_pass3_l1_pack_v0/ (+.zip) | 17 870 (zip) | 2026-05-26 | Pack automation prompts L1 (schémas, navigator) | pass3 v0 | — | NON COPIÉ — hors scope TCG (infra prompts) |
| Nouveau dossier/ | — | 2026-06-24 | vide | — | — | NON COPIÉ — dossier vide |
