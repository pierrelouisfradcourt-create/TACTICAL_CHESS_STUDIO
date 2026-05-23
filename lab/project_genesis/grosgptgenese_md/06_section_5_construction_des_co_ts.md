# SECTION 5 - — CONSTRUCTION DES COÛTS
5.1 Logique des budgets par pièce
Le budget représente la quantité totale de “puissance” qu’une pièce peut embarquer.

Version la plus stable reconstruite :

Pièce	Budget	Confiance
Pion	4	élevé
Cavalier	6	élevé
Fou	6	élevé
Tour	7	élevé
Reine	8	élevé
Roi	9	élevé
5.2 Logique des coûts de stats
Attaque
Le coût de l’attaque a été pensé comme linéaire ou quasi linéaire.

Version plausible :

1 ATK = coût faible

2 ATK = +1

3 ATK = +2

4 ATK = +3

PV
Le coût des PV est aussi progressif.

Une table explicite a été donnée à un moment :

PV	Coût
4	0
5	1
6	2
7	3
8	4
9	5
Confiance : moyen
Cette table a été donnée, mais n’a pas été systématiquement revalidée sur tous les types de pièces.

Armure
L’armure coûte plus cher que les PV.

Table explicite à un moment :

Armure	Coût
0	0
1	2
2	4
Confiance : moyen à élevé
La hiérarchie est claire ; les chiffres exacts restent à verrouiller, mais la logique est stable.

5.3 Coûts de portée
Version la plus répétée :

Portée	Coût	Confiance
1	0	élevé
2	1	élevé
3	2	élevé
4+	3	moyen
Le point essentiel n’est pas le chiffre exact, mais la règle :

la portée paie toujours un coût, y compris pour les effets.

5.4 Coûts de géométrie
Plusieurs tables partielles ont existé. La hiérarchie la plus stable est :

Géométrie	Coût probable	Confiance
adjacent / mono-case	0	élevé
diagonale simple	1	moyen
ligne 3	1	élevé
cône petit	1	moyen
X / croix	2	moyen
ligne 5	2	élevé
zone	2	élevé
ligne complète	3	élevé
grande zone / explosion forte	3+	moyen
5.5 Coûts d’effets
Effets faibles
Effet	Coût probable	Confiance
Brûlure	1	élevé
Poison	1	élevé
Saignement	1	moyen
Faiblesse	1	élevé
Armure cassée	1	élevé
Effets moyens
Effet	Coût probable	Confiance
Racines	2	élevé
Corrosion	1-2	faible
Aveuglement	1-2	faible
Silence	2	faible
Effets forts
Effet	Coût probable	Confiance
Gel	2-3	moyen
Désarmé	2-3	moyen
Peur	2	moyen
Charme	3	moyen
Stun	3+	faible
Le créateur a explicitement voulu :

peur = rare, proche du stun en rareté

mais coût légèrement inférieur au stun.

5.6 Coûts d’interaction
Les interactions de tir / géométrie sont devenues centrales tardivement.

Hiérarchie implicite :

Interaction	Coût probable	Confiance
bloqué par première unité	0	élevé
traverse 1 unité	1	moyen
traverse 1 ennemi	1	moyen
traverse 1 allié	1	moyen
traverse tout	2+	moyen
rebond	2	moyen
explosion à l’impact	2	moyen
ignore alliés	1-2	moyen
5.7 Logique de rareté
La rareté n’a pas été fixée dans une table officielle, mais son rôle a été clair :

autoriser des budgets plus élevés

autoriser des combinaisons plus dangereuses

déplacer certains effets vers rare / unco.

5.8 Taxes universelles
C’est une des grandes avancées du projet.

Règle la plus importante :

Toute amélioration de portée, de forme, d’effet ou d’interaction doit coûter des stats ou du budget.

C’est l’une des règles les plus stabilisées et les plus centrales.

