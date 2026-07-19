# Product Snapshot — auto_battler engine-core (incrément 1, headless)

Produit : NOYAU DE SIMULATION déterministe d'un auto battler (bibliothèque, is_game=false). Aucun joueur humain, aucun rendu, aucune UI, aucun contenu de gameplay à cet incrément. Le « consommateur » est un harnais de test, un futur incrément, ou un futur Renderer qui lira l'EventLog.

## Ce que le consommateur observe

- Un `GameState` **sérialisable et comparable au bit près** : structure de données pure, sans référence machine, dont `rng_state` est un champ explicite (pas un état caché). Deux sérialisations d'un même état sont identiques octet pour octet.
- Un `EventLog` **ordonné, append-only**, qui est la **seule** surface de sortie observable de la simulation. Tout ce que le consommateur peut « voir » d'une transition passe par (nouvel état + Events ajoutés au journal).
- Le **résultat d'une transition**, qui est l'un de deux cas observables et jamais un troisième : soit l'**état suivant** (Input traité), soit un **rejet déterministe** (Input hors alphabet), l'un comme l'autre reflété dans le couple (GameState, EventLog).
- À i1, uniquement des Events **structurels génériques** (issus du registre fermé de 19 noms) : initialisation du Match, acceptation d'un Input, rejet d'un Input. L'**absence** d'Events de Combat/Economy/unités est un état observable **attendu**, pas un manque.
- Aucune sortie annexe : pas de rendu, pas de log console de gameplay, pas d'écriture disque/réseau, pas d'horloge.

## Ce que le consommateur fait

- **Initialise** un Match avec une `seed` explicite → un `GameState` initial dont `rng_state` est dérivé de la seed (et seulement d'elle).
- **Injecte des Inputs** issus de la liste close des 7 autorisés : `Buy`, `Sell`, `Reroll`, `Lock`, `LevelUp`, `Place`, `ConfirmPreparation`.
- **Applique une transition** pure `transition(state, inputs) → nextState`, sans muter l'état passé en argument.
- **Rejoue** un journal d'Inputs depuis un état initial : `replay(initialState, inputLog) → (finalState, eventLog)`.
- **Peut tenter un Input non autorisé** (p. ex. un « Merge » joueur) et observer un rejet déterministe, reproductible à l'identique.
- **N'observe** l'évolution qu'à travers `GameState` et `EventLog` — aucun autre canal ne lui est offert.

## Ce que le consommateur ressent (garanties)

- **Déterminisme au bit près** : même (état, Inputs) → même état suivant, à chaque exécution, sur toute machine.
- **Reproductibilité par replay** : rejouer (état initial + journal d'Inputs) redonne exactement le même état final ET le même EventLog, octet pour octet.
- **Aucun état implicite, aucune surprise** : toute donnée de décision est dans `GameState`/`EventLog` ; jamais dans une variable ambiante, un timer, ou l'environnement.
- **Pureté** : une transition ne modifie pas ses arguments et ne produit aucun effet de bord ; elle retourne un nouvel état.
- **Robustesse fermée** : un nom d'Event hors des 19 = échec fail-hard ; un Input hors des 7 = rejet déterministe, jamais un crash imprévisible ni une mutation silencieuse.
- **Neutralité de contenu (P11)** : le moteur ne dépend d'aucun type de gameplay ; il tournera identiquement quel que soit le contenu branché plus tard.
- **Complétude de i1** : un Match tourne de bout en bout **même sans aucune règle de jeu** — c'est le succès visé, pas une lacune.

## Règles observables

R1 — **Déterminisme de la transition** (INV-1/INV-3). `transition(state, inputs)` appelée deux fois sur les mêmes entrées produit un `nextState` identique au bit près. *Testable :* deep-equal / égalité de sérialisation des deux sorties.

R2 — **Pureté de la transition** (INV-1/INV-3). La transition ne mute ni l'état d'entrée ni aucune variable externe ; elle retourne un état neuf. *Testable :* geler (freeze) l'état d'entrée et vérifier qu'il est inchangé après l'appel ; l'appel n'écrit aucun canal externe.

R3 — **rng_state seedé une seule fois** (INV-2). `rng_state` est un champ de `GameState`, fonction déterministe de la seed à l'init ; deux inits de même seed donnent le même `rng_state` ; il n'évolue que lorsqu'une règle autorisée le consomme, et n'est **jamais re-seedé** en cours de Match. *Testable :* init(S) reproductible ; une transition sans consommation laisse `rng_state` inchangé ; aucun chemin de code ne re-seede.

R4 — **Replay bit-exact** (INV-4). `replay(initialState, inputLog)` redonne le même `finalState` ET le même `EventLog` que l'application pas-à-pas des mêmes Inputs, et ce à chaque exécution. *Testable :* comparer replay vs application incrémentale, et deux replays entre eux, par égalité de sérialisation.

R5 — **EventLog seule sortie** (INV-5). La seule sortie observable d'une transition/replay est le couple (nouvel état, Events ajoutés au journal) ; aucun autre canal (console de gameplay, fichier, réseau, valeur de retour parallèle). *Testable :* instrumenter l'exécution et vérifier qu'aucun effet hors (GameState, EventLog) n'est produit.

R6 — **Registre d'Events fermé à 19 noms** (INV-12). Tout Event ajouté à l'EventLog porte un nom appartenant au registre fermé de 19 ; une tentative d'émission d'un nom hors registre échoue en fail-hard (erreur explicite, jamais silencieuse). À i1, seul un sous-ensemble générique est émis. *Testable :* asserter que tout nom émis ∈ registre ; une émission hors registre forgée lève une erreur.

R7 — **Alphabet d'Inputs fermé à 7** (INV-13). L'alphabet d'entrée est exactement {`Buy`, `Sell`, `Reroll`, `Lock`, `LevelUp`, `Place`, `ConfirmPreparation`} ; tout autre Input (dont un « Merge » joueur) est rejeté de façon déterministe (rejet enregistré, état non corrompu), sans crash ni mutation. *Testable :* chacun des 7 est accepté/traité ; un Input hors liste donne le même rejet reproductible à chaque appel.

R8 — **Aucun état implicite ni non-déterminisme ambiant** (INV-19). Le noyau n'appelle jamais `Date.now`, `Math.random`, de timer, ni aucun accès machine/environnement ; toute donnée de décision vit dans `GameState`/`EventLog`. *Testable :* scan statique de dépendances (aucun appel interdit) ; comportement indépendant de l'horloge murale et de la machine.

R9 — **Neutralité de contenu** (P11, charter i1). La surface de types du noyau ne contient que des abstractions génériques (`EntityId`, `PlayerId`, `Input`, `Event`, `State`) et aucun type de contenu (`Warrior`/`Origin`/`Trait`/`Item`). *Testable :* inventaire des types/interfaces exportés — aucun type de contenu présent.

R10 — **Match sans règle de gameplay** (charter i1, INV-1). Un Match composé d'états et d'Inputs se déroule jusqu'au bout **même si aucune règle de jeu n'est implémentée** (jeu de règles vide/générique) : il produit un `GameState` valide et un `EventLog` cohérent, sans crash. *Testable :* exécuter un Match avec ensemble de règles vide → complétion, état + journal valides.
