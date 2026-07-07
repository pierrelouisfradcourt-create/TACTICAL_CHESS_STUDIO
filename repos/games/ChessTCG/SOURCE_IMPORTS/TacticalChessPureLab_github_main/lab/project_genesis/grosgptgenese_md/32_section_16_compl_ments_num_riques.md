# SECTION 16 - — COMPLÉMENTS NUMÉRIQUES
16.1 Statistiques implicites du design
Densité saine par carte
0 à 1 effet sur les communes

1 à 2 effets sur les rares

2 effets lourds = zone rouge

Ratio stats / effet
Une carte qui gagne un effet léger doit souvent perdre :

1 ATK
ou

1 PV

Une carte qui gagne :

une grande géométrie

une portée longue

un effet fort

doit souvent perdre :

1 ATK

et parfois 1 PV

16.2 Probabilités de combos dangereux
Impossible de donner une proba absolue sans générateur codé, mais la matrice indique que les plus dangereux sont :

contrôle fort + ligne longue

contrôle fort + zone

reine + polyvalence

cavalier + contrôle

support stack

Ces familles représentent probablement moins de 5 à 10 % de l’espace de génération brut, mais doivent être explicitement bannies, car leur impact sur la méta est disproportionné. [Hypothèse plausible]

16.3 Équivalences de puissance
1 ATK ≈ 1 PV ?
Pas toujours. Dans ce système :

1 ATK est très importante sur les petites valeurs

1 ARM vaut plus qu’1 PV

Équivalences plausibles
1 effet léger ≈ 1 ATK ou 1 PV

1 portée supplémentaire ≈ 1 ATK

1 ARM ≈ 2 PV en valeur brute [Hypothèse plausible, cohérente avec les tables]

16.4 Paramètres pour simulation de 1 million de parties
Pour un simulateur, il faudrait au minimum :

budget par pièce

stats de base

tables de coût

tables de rareté

distributions de formes

distributions d’effets par faction

caps / interdits

pression du roi

logique de plateau

logique d’opportunité

logique de sideboard

logique de promotion

logique de fusion.

16.5 Méta théorique chiffrée
La conversation donne plusieurs repères :

6 à 10 factions actives = zone idéale de variété [Explicite / Reconstruction forte]

300 à 400 combinaisons équilibrables = bon espace de design [Explicite]

3 plateaux compétitifs suffisent à générer beaucoup de diversité [Reconstruction forte]

20/60/20 pour la puissance des cartes = bonne base de distribution [Explicite]

16.6 Dernière synthèse mathématique
Le moteur est construit sur 4 niveaux :
budget

taxe universelle

filtres anti-abus

cohérence de faction / lisibilité

Le moteur reste sain si :
les altérations fortes restent rares

la portée est taxée

les zones sont limitées

les rôles de pièces restent nets

le sideboard n’annule pas la valeur du positionnel

Conclusion finale
Les données numériques du projet sont déjà suffisantes pour construire un simulateur RNG de préproduction, à condition de verrouiller encore :

certaines valeurs exactes de coûts (surtout géométries secondaires et effets mentaux)

la rareté exacte par type de carte

le moteur de résolution complet

les matrices finales par faction.

La base chiffrée la plus solide et la plus stable aujourd’hui repose sur :

budgets 4 / 6 / 6 / 7 / 8 / 9

distribution 20 / 60 / 20

rareté 60 / 30 / 10

caps stricts sur contrôle fort

taxe universelle appliquée à toute amélioration.

C’est le noyau mathématique du projet.


PROJECT CONTEXT — TACTICAL CHESS

This conversation is part of the Tactical Chess project.

The project contains a central document:

TACTICAL CHESS — MASTER ENCYCLOPEDIA

This encyclopedia is the canonical knowledge base of the project.

It contains:

* core game systems
* formulas
* engine architecture
* simulation systems
* design principles

The encyclopedia must NOT be rewritten by you.

Your role is to analyze it and return structured information that can improve it.

---

WORKFLOW

1. Read the encyclopedia carefully.
2. Analyze the systems it describes.
3. Extract useful knowledge you possess.
4. Detect missing systems or inconsistencies.
5. Propose improvements.

You must return your analysis in ONE structured report.

Do NOT modify the encyclopedia.
Do NOT create multiple documents.

---

MANDATORY OUTPUT FORMAT

Return your response in the following structure:

TACTICAL CHESS — AI CONTRIBUTION REPORT

