# Inventaire récupération — Downloads (poste studio)

Source : `/c/Users/<utilisateur>/Downloads`. Copies vers `incoming/`, préfixe `downloads_<mtime>__`.
Généré 2026-07-06 (reconstruit à la main : l'agent avait fait les copies mais la limite de session a coupé l'écriture du tableau). Lecture seule, aucun original modifié.

## Résumé
- Fichiers TCG copiés : **~18** (dont un pack `KNOWLEDGE_UPDATE_PACK_V4` décompressé)
- Doublons `(1)/(2)` sur disque : Crown v1, mega_bible_V1, master_handoff, AAA_ARCHITECTURE, CORPUS zips — copie d'**un seul** exemplaire.
- Non copiés : zips CORPUS volumineux, `lichess_db_puzzle.csv.zst`, `lichess_elite_2021-08.zip` (hors scope TCG / >5 Mo).

## Tableau
| copié_vers | taille | date | sujet | valeur canon |
|---|---|---|---|---|
| `downloads_2026-05-18__game_desi.txt` | 5.9K | 05-18 | **Générateur RNG "version studio"** : budgets, coûts stats, formes, altérations, taxe portée/multi-cible, anti-abus, rareté, 6 factions | ★★★ HAUTE |
| `downloads_2026-05-18__formula_bible.txt` | 7.8K | 05-18 | **Engine Spec bas niveau** : runtime object model, pipeline résolution 17 étapes, traversal/counterattack/BRAWL/pressure, simulation framework | ★★★ HAUTE |
| `downloads_2026-05-18__MAJ_complete_formula.txt` | 14.6K | 05-18 | **Formula Bible proto labo v7** : dégâts=max(1,ATK-ARM), pression roi, fatigue, timeout, baseline calibrée (50 parties) | ★★★ HAUTE (version décidée) |
| `downloads_2026-05-18__extract_V2.txt` | 64K | 05-18 | 7 extracts « transmission IA » : vision, RNG, gameplay, brawl, promotion, summons, sorts | ★★ recoupe project_genesis |
| `downloads_2026-06-01__extract_1-3.txt` | 19K | 06-01 | 3 extracts vision+RNG+gameplay | ★★ recoupe |
| `downloads_2026-06-01__Nouveau_document_texte.txt` | 52K | 06-01 | Sections statistiques implicites (combos, ratios, méta théorique) | ★★ recoupe §17-32 |
| `downloads_2026-05-18__AAA_TACTICAL_CORE_ARCHITECTURE.md` | 23K | 05-18 | **Architecture stratégique** : migration lab échecs → moteur tactique réutilisable (frontière socle/TCG) | ★★★ |
| `downloads_2026-05-18__tactical_chess_master_handoff.txt` | 10.7K | **04-10** | Handoff technique **avril** : identité projet, milestone | ★★ historique |
| `downloads_2026-06-01__TACTICAL_CHESS_AI_STARTER_PACK_V5.md` | 9.3K | 06-01 | Pack contexte transmission IA v5 | ★ méta |
| `downloads_2026-06-01__MASTER_DOCS-TCS_MASTER_TRUTH_MAP.txt` | 12K | 06-01 | Truth map studio — **dit que le vrai milestone = "PURE CHESS AI LAB"** (minimise TCG) | ★★ tension |
| `downloads_2026-06-01__TACTICAL_CHESS_MASTER_BIBLE.docx` | 36.6K | 06-01 | **Bible master** (binaire) | ? **conversion requise** |
| `downloads_2026-05-18__Crown_v1.odt` | 37K | 05-18 | **"Crown" v1** (binaire) — design "Crown Tactics" ? | ? **conversion requise** |
| `downloads_2026-05-18__tactical_chess_mega_bible_V1.md` | 156K | 05-18 | **Base d'abilities générée** (ABI-000001 "Arc Pulse", f(context,target)…) | ⚠ LLM SYNTHÉTIQUE — faible canon |
| `downloads_2026-05-18__tactical_chess_max_knowledge_drain_part2.md` | 497K | 05-18 | **Base d'abilities générée part 2** (261+ entrées, mêmes patterns synthétiques) | ⚠ LLM SYNTHÉTIQUE |
| `downloads_2026-05-27__00_VISION.md` | 3.4K | 05-27 | Vision studio (doublon exact du Bureau `desktop_..00_VISION`) | DOUBLON |
| `downloads_2026-06-01__TACTICAL_CHESS_AI_STARTER_PACK_V5.md` … `README_KNOWLEDGE_UPDATE.txt` `TRANSMISSION_PROTOCOL.md` | — | 06-01 | Pack transmission/protocole (référence `01_MASTER_BIBLE`, `02_SYSTEM_DATABASE`, `AI_STARTER_PACK`) | ★ méta (→ liste manquants) |
| `downloads_2026-06-01__organize_tactical_chess.ps1.txt` | 1.9K | 06-01 | Script rangement (outil) | outil |

## Note ⚠ contenu synthétique
`mega_bible_V1` et `max_knowledge_drain_part2` sont des **tables d'abilities générées automatiquement** par LLM
(noms génériques, formule uniforme `f(context,target)`, descriptions « X system element »). Ils gonflent le volume
mais n'apportent **pas de canon fiable**. À traiter comme *idée-dump*, pas comme spec. Le vrai générateur canon est
`game_desi.txt` + project_genesis §5/§7/§8.
