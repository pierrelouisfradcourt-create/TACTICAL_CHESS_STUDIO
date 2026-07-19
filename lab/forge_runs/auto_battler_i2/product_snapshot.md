# Product Snapshot — auto_battler preparation + economy (incrément 2, headless)

Produit : couche **Preparation State + Economy** posée sur le noyau engine-core d'i1
(`games/auto_battler/engine/`). Toujours **is_game=false** : aucun joueur humain, aucun
rendu, aucune UI, aucun contenu de gameplay (units/Content Bible restent hors périmètre).
Le « consommateur » reste un harnais de test, un futur incrément (Combat), ou un futur
Renderer qui lira l'EventLog.

## Ce que le consommateur observe

- Toujours un `GameState` sérialisable au bit près (hérité i1), enrichi de `shops`, `pool`,
  `bench` par Seat, `gold` par Seat — sans changer le contrat i1 (P11 : abstractions
  génériques, aucun type de contenu de gameplay).
- Le journal d'Inputs et l'EventLog restent la seule surface observable (INV-4/INV-5,
  hérités). Cinq NOUVEAUX Events économiques apparaissent dans le registre fermé de 19
  noms (déjà réservés à i1, pas encore émis) : `GoldChanged`, `ShopRolled`, `UnitBought`,
  `UnitSold`, `PlayerLevelUp` (QE-6). Deux Events système : `MergeTriggered`,
  `MergeResolved` (QC-3).
- Un Pool fini et partagé, compté en **exemplaires physiques par UnitDefinition** (QE-1) —
  mais à cet incrément, sans Content Bible ratifiée, les UnitDefinition manipulées restent
  des identifiants génériques opaques (fixtures de test), jamais un contenu réel (P11
  toujours en vigueur pour ce qui touche au CONTENU, même si l'économie elle-même n'est
  plus content-agnostic par nature).
- Le résultat d'un Input `Buy` est TOUJOURS l'un de deux cas observables : transaction
  acceptée (débit Pool+Gold, `UnitBought`+`GoldChanged` émis) OU rejet déterministe pour
  Bench plein (DP-9, aucun débit) — jamais un troisième cas, jamais un crash.

## Ce que le consommateur fait

- **Injecte des Inputs** de la liste close INV-13 : `Buy`, `Sell`, `Reroll`, `Lock`,
  `LevelUp`, `Place`, `ConfirmPreparation` — cette fois avec un EFFET économique réel
  (i1 ne faisait que les accepter/rejeter structurellement).
- **Observe le Merge automatique** : 3 UnitInstances identiques (même UnitDefinition, même
  Star) réunies sur Board/Bench → `MergeTriggered` puis `MergeResolved`, sans Input joueur
  (QC-3, DP-4).
- **Observe un tirage de Shop déterministe** : à `rng_state` identique, Shop identique
  (ECO-5) — le tirage RÉSERVE les exemplaires (QE-2), ne les débite pas.
- **Observe la conservation du Pool** : pour toute séquence d'Inputs valide, l'inventaire
  total (Pool + Shops réservées + possessions Board/Bench) est invariant (ECO-1).
- **Tente un Buy à Bench plein** et observe le rejet déterministe DP-9 — aucun débit,
  aucune destruction, reproductible à l'identique.

## Ce que le consommateur ressent (garanties)

- **Toutes les garanties d'i1 restent vraies** : déterminisme bit-à-bit, replay,
  reproductibilité, pureté, robustesse fermée (registre 19 Events, alphabet 7 Inputs),
  aucun état implicite. i2 les ÉTEND, ne les affaiblit jamais.
- **Conservation comptable stricte** (ECO-1/ECO-3) : aucune Unit ni aucun Gold n'apparaît
  ou ne disparaît hors des transactions déclarées de la liste close.
- **Probabilités affichées = probabilités réelles** (ECO-2/INV-8) : une seule table d'odds,
  lue par affichage ET tirage.
- **Aucune valeur chiffrée inventée** : Gold initial, coûts, tables d'odds, capacité du
  Bench — tout est TBD propriété Balance Bible ; ce snapshot ne fixe AUCUN chiffre, les
  fixtures de test utilisent des valeurs de test explicitement non-canoniques.

## Règles observables (dérivées de 02_CORE_RULES.md, 03_DECISION_BIBLE.md DP-9, 05_ECONOMY_BIBLE.md — aucune invention)

R1 — **Conservation du Pool** (INV-7, ECO-1). Pour toute séquence d'Inputs valide,
`Pool + Shops réservées + possessions(Board+Bench)` par UnitDefinition est invariant selon
la règle de comptage ratifiée : réservation au tirage, débit au Buy (jamais au Place),
`Sell ★k → Pool += exemplaires consommés`, Merge = compactage sans effet Pool. *Testable :*
property-test sur séquences d'Inputs aléatoires seedées.

R2 — **Débit du Pool au Buy, jamais au Place** (QE-2). *Testable :* fixture Buy→Place :
Pool décrémenté après Buy, inchangé après Place.

R3 — **Sell rend les exemplaires physiques** (QE-1). `Sell` d'une Unit de Star k rend au
Pool le nombre d'exemplaires physiques consommés pour la produire (`★2 → +3`). *Testable :*
fixture Sell ★1 et Sell ★2, vérifier le delta Pool exact.

R4 — **Merge automatique, cascades par ordre de création** (INV-16, QD-4, DP-4). 3
UnitInstances identiques (même UnitDefinition + même Star) → `MergeTriggered` puis
`MergeResolved`, nouvelle UnitInstance de Star strictement supérieur, nouvel
`unit_instance_id`, consommation A+B+C par ordre de création (D surnuméraire reste).
*Testable :* fixture de cascade, property-test « Star produit > Star consommé ».

R5 — **Refus de Buy à Bench plein, sans effet de bord** (DP-9, QE-7). Bench à capacité
pleine → Input `Buy` rejeté déterministe : aucun débit de Gold, aucun débit du Pool,
aucune Unit détruite. *Testable :* fixture Bench plein → Buy → assert aucun changement
d'état hors le rejet enregistré au journal.

R6 — **Tirage économique déterministe** (ECO-5, DEC-3). À `rng_state` identique → Shop
identique, deux runs, bit à bit. *Testable :* deux inits même seed, comparer `ShopRolled`.

R7 — **Lock conservatif** (ECO-8). Une Shop sous Lock est identique au Round suivant,
aucune consommation de `rng_state` pour cette Shop, sans coût en Gold. *Testable :* fixture
Lock → Round suivant → Shop identique bit à bit, `rng_state` inchangé pour ce tirage.

R8 — **Gold : liste close de mouvements** (ECO-3, INV-19). Le delta de Gold d'un Seat sur
toute transition est exactement la somme algébrique des transactions déclarées (Income,
Buy, Sell, Reroll, LevelUp, rewards) — jamais d'Interest, jamais de streak (QE-4/QE-5).
*Testable :* property-test delta Gold = somme du journal ; audit statique aucun site
d'écriture du Gold hors module de transactions.

R9 — **Preparation State reste une fenêtre unique** (QC-2, hérité i1). Inputs = liste
close INV-13 ; se termine uniquement par `ConfirmPreparation` ; aucun Input pendant Combat
(toujours absent à i2). *Testable :* hérité des fixtures i1, non affaibli.

R10 — **Événements économiques dans le registre fermé** (INV-12, QE-6). `GoldChanged`,
`ShopRolled`, `UnitBought`, `UnitSold`, `PlayerLevelUp` sont émis avec les payloads
structurels définis par Economy Bible ; aucun autre nom, aucun champ hors contrat.
*Testable :* validation de schéma sur chaque Event économique émis.
