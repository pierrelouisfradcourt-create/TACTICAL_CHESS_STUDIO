# SECTION 5 - — MATRICE DE COÛT COMPLÈTE
5.1 Coût des stats
Attaque
Table la plus plausible :

ATK	Coût	Certitude
1	0	[Reconstruction forte]
2	1	[Reconstruction forte]
3	2	[Reconstruction forte]
4	3	[Reconstruction forte]
PV
Table explicitement donnée :

PV	Coût	Certitude
4	0	[Explicite]
5	1	[Explicite]
6	2	[Explicite]
7	3	[Explicite]
8	4	[Explicite]
9	5	[Explicite]
Armure
Table explicitement donnée :

ARM	Coût	Certitude
0	0	[Explicite]
1	2	[Explicite]
2	4	[Explicite]
5.2 Coût de portée
Deux versions ont coexisté.

Version simple la plus répétée
Portée	Coût	Certitude
1	0	[Explicite]
2	1	[Explicite]
3	2	[Explicite]
4	3	[Explicite]
Variante élargie
Pour très longues portées / ligne complète :

coût additionnel ou taxe spéciale

[Hypothèse plausible]

5.3 Coût des géométries
Table consolidée
Géométrie	Coût	Certitude
adjacent / mono-case	0	[Reconstruction forte]
ligne 3	1	[Explicite]
diagonale simple	1	[Reconstruction forte]
cône petit	1	[Explicite sur logique, coût reconstruit]
X	2	[Explicite partielle / Reconstruction forte]
+ / croix	2	[Reconstruction forte]
ligne 5	2	[Explicite]
zone petite	2	[Explicite]
ligne complète	3	[Explicite]
grande zone / explosion premium	3	[Hypothèse plausible]
5.4 Coût des interactions
Interaction	Coût	Certitude
perce 1 unité	1	[Explicite partielle / Reconstruction forte]
perce tout	2	[Explicite partielle / Reconstruction forte]
rebond	2	[Explicite]
explosion / impact AoE	2	[Explicite]
ignore alliés	1 à 2	[Hypothèse plausible]
traverse 1 allié / 1 ennemi	1	[Hypothèse plausible]
5.5 Coût des altérations
Effets légers
Effet	Coût	Certitude
Brûlure	1	[Explicite]
Poison	1	[Explicite]
Saignement	1	[Explicite partielle / Reconstruction forte]
Faiblesse	1	[Explicite]
Armure cassée	1	[Explicite]
Effets moyens
Effet	Coût	Certitude
Racines	2	[Explicite]
Peur	2	[Explicite / Reconstruction forte]
Effets forts
Effet	Coût	Certitude
Gel	2 à 3	[Explicite partielle / Reconstruction forte]
Désarmé	2 à 3	[Explicite partielle / Reconstruction forte]
Charme	3	[Explicite]
Stun	3+	[Hypothèse plausible]
5.6 Coût multi-cibles
Une table partielle a été explicitée :

Type	Coût	Certitude
1 cible	0	[Explicite]
2 cibles	1	[Explicite]
ligne	2	[Explicite]
zone	3	[Explicite]
5.7 Cohérence mathématique générale
Règle clé :

stats + portée + géométrie + interaction + effet = budget

[Explicite dans l’intention, Reconstruction forte dans la formalisation]

