# Autobattler — RNG / génération / garde-fous (relecture)

## Axes de génération (ce que la RNG tire)
- Pièce, budget, stats, portée, géométrie, interaction, effet, rareté, identité de faction, filtre anti-abus.  
  Source : `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\grosgptgenese_md\08_section_7_matrice_rng_consolid_e.md`

## Séquence de génération (version la plus cohérente notée)
1) choisir la faction  
2) choisir le rôle de la pièce  
3) attribuer un budget  
4) tirer les stats de base  
5) tirer la portée  
6) tirer la géométrie  
7) tirer l’interaction  
8) tirer l’effet  
9) vérifier cohérence faction + interdits + budget  
Source : `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\grosgptgenese_md\08_section_7_matrice_rng_consolid_e.md`

## Budgets par pièce (repère de balancing)
Table “stable” notée :
- Pion 4 ; Cavalier 6 ; Fou 6 ; Tour 7 ; Reine 8 ; Roi 9.  
  Source : `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\grosgptgenese_md\06_section_5_construction_des_co_ts.md`

## Garde-fous : combos explicitement dangereuses
Exemples listés comme interdits / quasi interdits (lecture “autobattler” : éviter oppression sans input humain) :
- Tour + gel ; tour + désarmé + ligne longue ; ligne complète + altération forte ; zone + gel ; charme + zone ; stun + portée longue.
- Cavalier + contrôle fort (réserver contrôle fort au fou).
- Reine “support lourde” déconseillée (reine plutôt offensive).
  Source : `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\grosgptgenese_md\09_section_8_matrice_des_interdits_et_garde_fous.md`

## Traduction autobattler (règles de sécurité pratiques)
- Bannir “hard control” + portée longue + géométrie linéaire complète (oppresse trop en auto-résolution).
- Taxer très fort (ou raréfier) zone + contrôle.
- Forcer spécialisation par pièce (reine offensive, fou contrôle, cavalier mobilité/pression, etc.).

