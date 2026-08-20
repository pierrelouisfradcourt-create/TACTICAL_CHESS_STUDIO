# Prisme Produit — chesscolor (s1)
- Ce que le joueur voit : `python chesscolor.py e4` -> `sombre`
- Ce qu'il fait : passe une case (a1..h8) en argument
- Ce qu'il ressent : réponse immédiate, sans ambiguïté
- Règles observables :
  - R1 : case valide = colonne a-h + rangée 1-8
  - R2 : (index_colonne + rangée) pair -> "sombre", impair -> "claire"
  - R3 : case invalide -> message d'erreur + code sortie != 0
