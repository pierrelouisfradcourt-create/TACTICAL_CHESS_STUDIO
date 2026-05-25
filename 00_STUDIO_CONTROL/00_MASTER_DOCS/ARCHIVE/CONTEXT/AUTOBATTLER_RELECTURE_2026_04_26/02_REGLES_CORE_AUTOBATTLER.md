# Autobattler — règles core (relecture)

## Plateau & setup
- Plateau max 64 cases, standard compétitif 8×8.
- Deux premières rangées de chaque joueur réservées au placement initial (pas de trous/obstacles/buissons).
- Plateau déterminé avant la draft ; plateaux compétitifs symétriques (éviter avantage structurel des blancs).  
  Source : `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\grosgptgenese_md\02_section_1_r_gles_exactes_et_wording_reconstruit.md`

## Mouvement (héritage échecs)
- Règle : les pièces se déplacent selon leur nature d’échecs sauf modification explicite par carte.
- Pion : mouvement/capture type échecs ; positionnement : “pas des supports”, plutôt progression/affrontement ; exceptions limitées via pions spéciaux.  
  Source : `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\grosgptgenese_md\02_section_1_r_gles_exactes_et_wording_reconstruit.md`

## Timing / ordre de résolution (point d’attention)
- Plusieurs versions ont existé (pas 100% verrouillé dans ces sources).
- Besoin identifié : représenter opportunités, “brawl”, altérations persistantes, terrain (donc un ordre plus riche que move→attack→effects).  
  Source : `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\lab\project_genesis\grosgptgenese_md\03_section_2_timings_et_ordre_de_r_solution.md`

## Traduction utile en autobattler (proposition de lecture)
- Phase stratégique : draft + placement + choix éventuel d’1 sort (si conservé).
- Phase autobattle : déplacements/attaques résolus automatiquement selon règles/IA simple, en respectant géométries/portées/états.
- Objectif : conserver la “tactique d’échecs” (lignes, forks, zones) mais déplacer la charge cognitive vers draft/placement plutôt que micro-exécution.

