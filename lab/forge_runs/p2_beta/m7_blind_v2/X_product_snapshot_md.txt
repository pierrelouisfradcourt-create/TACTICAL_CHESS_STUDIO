# Product Snapshot — p2_beta

*Incremental / clicker à fin observable bornée, conçu agnostique au thème (le sujet concret — cible, générateurs, jeton — est un fog HumanGate délibéré du bras Libre, jamais fabriqué ici). Ce document décrit le produit FINI tel que le joueur le vit, dans l'ordre où il le vit.*

## 1. CE QUE LE JOUEUR VOIT

Au lancement, l'écran est dominé par une grande **cible centrale pressable** (`click_target`), l'élément le plus chaud et le plus grand, trouvable sans recherche. En haut, un **compteur d'unités** (`resource_counter`) affiche le total courant, et à côté un **lecteur de production passive** (`cps_readout`) qui vaut zéro tant qu'aucun générateur n'est possédé. Un **suivi d'objectif** (`objectif`) est présent dès le frame 0 : il affiche toujours un but courant non vide et le remplace, palier après palier, par un but textuellement différent.

Sur le côté, une **colonne d'achat** montre les générateurs et améliorations dans trois états visuellement redondants (au-delà de la teinte : opacité, forme, mouvement) : verrouillé (grisé, cadenas, raison + aperçu fantôme du débit), abordable (pleine couleur, bouton sarcelle en pulsation), possédé (badge ×N, rangée qui anime son débit). Une **jauge de fin** (`end_gauge`) persistante, distincte en position et forme du compteur de ressource, est visible en permanence et progresse de façon monotone vers 100 %. Les transitions de palier ne sont jamais un pourcentage : elles **remplacent toute la surface de jeu** (`stage_scene`) par une phase visiblement différente. À 100 %, un **écran de victoire plein écran** remplace réellement la scène et affiche les totaux finaux.

## 2. CE QUE LE JOUEUR FAIT

Le joueur **presse la cible centrale** pour produire ses premières unités — au premier écran, c'est le seul geste qui rapporte. Quand il en a assez, il **achète un générateur** (`buy_generator`), ce qui fait apparaître une rangée de production passive : le jeu commence à jouer à sa place. À partir de là, chaque cycle lui pose une **décision réelle** : continuer à cliquer maintenant, ou attendre et réinvestir dans plus de générateurs / une amélioration multiplicatrice. Ces deux politiques mènent à des trajectoires de total mesurablement différentes.

Il **franchit des seuils** qui déverrouillent de nouvelles familles de contenu (distinguées par leur rôle de production, pas par un thème), traverse **cinq paliers de scène** jusqu'à la fin observable, et poursuit une suite d'**objectifs affichés** qui lui disent toujours le prochain pas. Au terme, il peut **conclure** à l'écran de victoire, ou déclencher une **relance bornée unique** (`prestige_reset`) : le compteur retombe à zéro, mais une graine de relance lui confère un avantage de départ mesurable, si bien qu'un clic rejoué produit un gain strictement supérieur à son gain initial.

## 3. CE QUE LE JOUEUR RESSENT

La satisfaction est celle de l'escalade numérique et des récompenses fréquentes de faible valeur : chaque appui répond immédiatement (flotteur +N, animation), et le passage du clic manuel au revenu passif procure le soulagement de « la machine travaille pour moi ». La colonne d'achat entretient une tension économique lisible — abordable ou pas, ce que je débloque, ce que ça coûtera après — qui rend chaque décision réinvestir-ou-attendre concrète et non cosmétique. Les changements de scène ponctuent le run de nouveauté franche, empêchant la fatigue de répétition. Surtout, contrairement à l'endlessness canonique du genre, la jauge de fin donne un **sentiment de destination** : le joueur avance vers une fin conçue et atteignable, pas vers un vide infini — et la relance bornée récompense sans promettre un grind sans terme.

## 4. RÈGLES OBSERVABLES

- **R1 — Clic productif** : au premier écran, cliquer `click_target` augmente `resource_counter` d'exactement la valeur de clic courante, et c'est le seul moyen de gagner des unités avant tout achat.
- **R2 — Réponse immédiate** : chaque clic émet un flotteur +N et une animation d'appui visibles au tick du clic, absents au tick précédent.
- **R3 — Déverrouillage du passif** : acheter via `buy_generator` fait apparaître une rangée du groupe `generateurs` et fait passer `cps_readout` de 0 à une valeur strictement positive.
- **R4 — Coût exponentiel** : le coût du n-ième générateur vaut `base × 1.15^n` exactement (invariant repris tel quel du Game Master, `m_economy_cost_mult`).
- **R5 — Objectifs distincts** : le HUD `objectif` est non vide dès le frame 0 et affiche des buts successifs textuellement différents les uns des autres (nouvelle chaîne, pas seulement une valeur qui change).
- **R6 — Décision conséquente** : sur ≥ 300 frames, une politique « clic actif » et une politique « attente » produisent des trajectoires de `resource_counter` mesurablement divergentes.
- **R7 — Paliers de scène** : cinq seuils de palier remplacent la surface de jeu (`stage_scene`) par une phase visiblement différente — jamais rendus par un nombre.
- **R8 — Fin bornée visible** : `end_gauge` est présente à chaque capture, croît de façon monotone, et atteint 100 % en ≤ 72000 ticks.
- **R9 — Victoire perceptible** : à `end_gauge` = 100 %, un écran de victoire plein écran remplace réellement la surface de jeu et montre les totaux finaux.
- **R10 — Relance avantageuse bornée** : `prestige_reset` remet `resource_counter` à 0 ; après cette relance unique, rejouer `click_target` donne un delta par clic strictement supérieur au delta du run initial.
