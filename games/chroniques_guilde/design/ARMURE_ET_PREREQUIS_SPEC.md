# Chroniques de Guilde — CLASSES D'ARMURE, PRÉREQUIS D'OBJETS, LA VOIE TISSU

Date : 2026-09-19. Source : session Claude Code, branche `claude/game-ideas-app-store-9dvk6p`.
Demande Pierre : « Ya des prérequis pour les objets ? Une classe d'armure qui correspond à chaque classe
de base ? Il faut que la voie full tissu débloque une vraie mage qui tabasse car il aura pas d'armure,
c'est à prendre en compte. Il faut garder les up de stats/niveau de classe aussi. »

**Document de conception. Aucune ligne de `data.json`, `sim.js`, `tactic.js` ni `golden/` n'a été touchée.**
Toute modification des données invalide les sept vecteurs de référence (`data_fnv = 97a2d68a`) dont le
portage Godot se sert comme premier contrôle. L'ordre proposé reste : le portage valide contre les vecteurs
actuels → gel → tranches → **une seule** régénération. Ce document est à ratifier avant toute implémentation.

---

## 1. Ce que la mesure dit aujourd'hui

Reproduction : scripts dans le bac à sable de la session, moteur seul, 20 graines × 6 héros × 30 jours,
`sim._internal.combatProfile` appelé sur l'état réel d'une partie jouée.

| # | Mesure | Valeur |
|---|---|---|
| M0 | Objets portant un prérequis, une classe d'armure ou une restriction de classe | **0 / 47** |
| M4 | Armures par nature et rareté | tissu : 1 commune, 1 rare, **0 épique**, 2 légendaires · cuir : 2, 1, 1, **0** · plaque : 1, 1, 1, 2 |
| M1 | Meilleure armure légendaire, pour les **7** classes de base | la même pour toutes : `a_ecorce_ancestrale` en tenue, `a_peau_hydre` en frappe |
| M1 | Ce que le tissu **légendaire** rend en attaque, comparé à la plaque légendaire | **0** pour les 7 classes (les deux tissus légendaires portent MAG 0) |
| M3 | Ce que le tissu **rare** rend, comparé à la plaque rare | **+6 ATQ** pour Mage, Clerc, Invocateur · **0** pour Guerrier, Rôdeur, Voleur, Barde · coûte **−5 DÉF et −10 PV** à tout le monde |
| M5 | Occurrences de la vitesse du héros dans le moteur tactique | **aucune** : `.spd` n'est lu que pour trier les unités `kind !== 'hero'` (`tactic.js:2450`) |
| M6 | Emplacement d'armure vide en fin de saison | **40 %** des héros (babiole 62 %, arme 39 %, fiole 38 %) |
| M14 | Niveau en fin de saison (120 héros) | min 3, **médiane 6**, max 8 |
| M15 | Rareté de ce qui est réellement porté (480 emplacements) | commun **46 %** · vide **42 %** · rare 9 % · épique 2 % · légendaire **1 %** |
| M16 | Taux de change mesuré contre le boss de la forêt, Mage niveau 6 | **1,71 point d'ATQ par point de DÉF abandonné** |

### Le défaut, en une phrase

**La défense monte avec la rareté (DÉF 2 → 18, ×9) ; la contrepartie offensive ne monte pas (MAG 3 → 6
puis 0, ×2 puis ×0).** Une armure lourde est donc strictement meilleure pour tout le monde, la classe de
base ne change rien à ce qu'on porte, et la « voie full tissu » n'existe pas : elle s'arrête au palier rare,
n'a pas de palier épique, et ses deux légendaires sont des plaques déguisées (DÉF 15 et 17, MAG 0).

Trois conséquences mesurées, dans l'ordre de gravité :

1. **Le tissu vaut le quart de son prix.** Pour compenser les 14 points de DÉF qu'il abandonne au palier
   légendaire, il faudrait rendre **+24 d'ATQ** (M16). Il en rend **0**.
2. **Le seul coût déclaré de la plaque ne coûte rien.** Les plaques portent `spd: -1`. La vitesse du héros
   n'est jamais lue dans le raid (M5). Mettre la cotte d'acier sur un Mage est gratuit dans la couche de jeu
   qui décide de la saison.
3. **Le débat porte sur du contenu que personne ne voit.** Épique et légendaire pèsent **3 %** des
   emplacements portés (M15). Le jeu se joue en commun et en vide. Un système de classes d'armure qui ne
   mord qu'au palier légendaire ne serait mesurable sur rien.

> Conséquence directe sur la conception : **le système doit mordre au palier commun et rare**, là où la
> saison se joue, et le palier vide (42 %) est un défaut d'approvisionnement à traiter séparément — il est
> déjà porté par `CRAFT_BIOME_SPEC.md` (le craft mesuré mort : 0,4 % des créneaux).

---

## 2. Décision 1 — trois classes d'armure déclarées

Chaque objet d'emplacement `armor` porte un champ nouveau :

```json
"armor_class": "tissu" | "cuir" | "plaque"
```

Ce n'est pas une étiquette de couleur : c'est ce que le barème de la décision 4 contraint. Répartition des
13 armures actuelles (inférée du nom, à ratifier pièce par pièce) :

| classe | commun | rare | épique | légendaire |
|---|---|---|---|---|
| tissu | `a_robe_lin` | `a_robe_mousse` | **manque** | `a_ecorce_ancestrale`, `a_manteau_marais` |
| cuir | `a_gambison`, `a_cuir` | `a_cuir_cloute` | `a_plates_cendre`¹ | **manque** |
| plaque | `a_cotte_fer` | `a_cotte_acier` | `a_cuirasse_ecailles` | `a_peau_hydre`, `a_plates_ecailles` |

¹ `a_plates_cendre` porte « plates » dans son nom et DÉF 13 : c'est une plaque. Le cuir n'a donc **aucun**
épique et **aucun** légendaire. Trois trous à combler : tissu épique, cuir épique, cuir légendaire.

## 3. Décision 2 — la tolérance de classe : une gêne, jamais un interdit

Chaque classe de base déclare la classe d'armure la plus lourde qu'elle porte sans gêne :

| classe | attaque bâtie sur | tolérance |
|---|---|---|
| Guerrier | Force ×2 + Adresse | plaque |
| Rôdeur | Adresse ×2 + Force | cuir |
| Voleur | Adresse ×2 + Force | cuir |
| Clerc | Volonté + Force | cuir |
| Mage | Esprit ×2 + Volonté | tissu |
| Invocateur | Volonté + Esprit | tissu |
| Barde | Charisme ×2 + Esprit | tissu |

**Porter plus lourd n'est jamais refusé.** C'est la doctrine déjà tenue ailleurs (l'affinité de craft
accélère, elle ne barre pas) et c'est ce qui préserve les choix de groupe : un Mage qui n'a que la cotte de
fer sous la main la met. Il paie une **gêne**, un seul chiffre, lisible dans la fiche :

```
gêne = (rangs de dépassement) × gene_permille
rangs : tissu 0, cuir 1, plaque 2   →   un Mage en plaque dépasse de 2 rangs
effet : l'ATTAQUE du héros est réduite de la gêne (permille), la DÉF de l'objet est conservée entière
```

Pourquoi sur l'attaque et non sur la défense : la défense est ce que le joueur est venu chercher en mettant
la plaque ; la lui retirer rend le geste absurde plutôt que coûteux. Réduire l'attaque dit exactement la
bonne chose — *tu survis mieux et tu frappes moins* — et c'est un arbitrage, pas une punition.

**Ce que la gêne ne fait pas** : elle ne touche ni les PV, ni le soin, ni le soutien, ni la puissance
magique héritée par les invocations. Un Invocateur qui s'emmitoufle pour survivre garde ses corps intacts ;
c'est lui qui frappe moins, pas eux. C'est une décision de conception, pas une omission.

**Valeur de départ proposée, à calibrer** : `gene_permille = 120` (12 % d'attaque par rang). Deux rangs,
soit un Mage en plaque, coûtent alors 24 % d'attaque — à comparer aux 1,71 ATQ par DÉF de M16, qui dit
qu'à ce niveau 14 points de DÉF valent 24 points d'ATQ, soit environ 30 % de l'attaque d'un Mage niveau 6.
La gêne à 12 %/rang laisse donc la plaque **encore légèrement avantageuse en survie pure** et cher payée en
dégâts : c'est un arbitrage, ce qui est le but. La valeur exacte est un résultat de banc, pas une opinion.

## 4. Décision 3 — prérequis d'objets

Deux prérequis, pas plus, sur n'importe quel objet de n'importe quel emplacement :

```json
"req": { "level": 5, "attr": { "strength": 14 } }
```

* **`level`** — le palier de rareté auquel l'objet appartient. Barème calé sur M14 (médiane 6, max 8) :
  commun 1, rare 3, épique 5, légendaire 7. Un légendaire pris au jour 12 sur un dragon reste portable
  par un héros de niveau 7, ce que la saison produit dans la moitié des cas.
* **`attr`** — un seul attribut, et seulement sur les armures lourdes et les armes à deux mains. La plaque
  demande de la Force, le grand arc de l'Adresse. C'est le second verrou, celui qui empêche le Mage de
  niveau 7 de mettre les plates d'écailles en fin de saison sans rien changer d'autre.

**Un prérequis non rempli interdit l'équipement**, avec sa raison en français dans l'interface
(« Force 14 requise, tu en as 9 »). C'est le seul endroit du système où l'on refuse : un prérequis est une
promesse de progression, alors que la classe d'armure est un arbitrage permanent. Les deux ne doivent pas
se confondre.

**Garde-fou mesurable** : aucun prérequis ne doit faire monter le taux d'emplacements vides. Il est déjà à
42 % (M15) ; c'est déjà le premier défaut de la couche objet. Borne : après la tranche, le taux de vide ne
dépasse pas sa valeur d'avant + 2 points.

## 5. Décision 4 — le barème : la contrepartie monte comme la défense monte

C'est le cœur. Une armure porte **un couple** : ce qu'elle protège et ce qu'elle rend. Les deux colonnes
progressent avec la rareté, sinon une seule des trois voies existe.

| rareté | tissu | cuir | plaque |
|---|---|---|---|
| commun | DÉF 2 · **rendu 4** | DÉF 3 · **rendu 2** | DÉF 6 · rendu 0 |
| rare | DÉF 4 · **rendu 10** | DÉF 6 · **rendu 5** | DÉF 9 · rendu 0 |
| épique | DÉF 7 · **rendu 18** | DÉF 10 · **rendu 9** | DÉF 14 · rendu 0 |
| légendaire | DÉF 9 · **rendu 26** | DÉF 13 · **rendu 13** | DÉF 18 · rendu 0 |

Le « rendu » n'est pas une statistique unique, c'est la **monnaie de la voie** :

* **tissu** → `magic` (attaque des classes Esprit/Volonté, puissance magique des invocations) et `support`.
* **cuir** → `crit` (en permille, ×10 : rendu 5 = 50 ‰) et `spd`, une fois la vitesse rendue vivante (§7).
* **plaque** → rien d'offensif. Sa monnaie est les PV, qu'elle porte déjà, et elle seule.

Lecture du barème contre M16 : au palier légendaire le tissu abandonne 9 points de DÉF contre la plaque
(18 − 9) et rend 26 de MAG, là où le taux de change mesuré demande 9 × 1,71 ≈ **15**. Le tissu est donc
délibérément **au-dessus** du point d'équilibre en attaque pure : c'est ce que Pierre demande — *une vraie
mage qui tabasse parce qu'elle n'a pas d'armure*. Le prix est payé en PV et en tenue, et il est réel : la
même mesure M1 dit qu'un Mage en tissu encaisse 27 par coup de boss contre 22 en plaque.

**Le tissu ne doit pas devenir le choix par défaut de tout le monde.** C'est la gêne qui l'en empêche pour
les quatre classes Force/Adresse : elles ne lisent pas `magic` du tout (M3 : +0 ATQ), donc le rendu du tissu
leur est invisible, et elles ne gagneraient que la perte de DÉF. Le système se ferme tout seul.

## 6. Décision 5 — ce que la voie tissu débloque vraiment

Trois pièces manquantes rendent la voie jouable de bout en bout. Elles sont à créer, pas à ré-étiqueter :

1. **un tissu épique** (le trou de M4) ;
2. **deux tissus légendaires qui portent leur monnaie** : `a_ecorce_ancestrale` et `a_manteau_marais` ont
   aujourd'hui MAG 0 et DÉF 15/17. Au barème, ils deviennent DÉF 9 et rendu 26. Ce n'est pas un ajustement
   de chiffres, c'est le changement qui fait exister la voie ;
3. **un cuir épique et un cuir légendaire** (l'autre trou de M4), sans quoi le Rôdeur et le Voleur n'ont pas
   de fin de parcours et retombent sur la plaque avec un rang de gêne.

Et une règle de non-régression sur la demande explicite de Pierre (« garder les up de stats/niveau de
classe ») : **le barème d'armure ne touche à aucune croissance de classe**. Les tables `start` et `growth`
des sept classes, l'entraînement et les bonus de niveau restent exactement ce qu'ils sont. L'armure module
ce que le héros porte, jamais ce qu'il est.

## 7. Dette adjacente, à traiter dans la même tranche ou à assumer

**La vitesse du héros ne sert à rien dans le raid** (M5). Trois issues, par ordre de préférence :

* **(a)** la VIT ordonne les héros dans un passage de raid — coûteux, touche l'ordre de résolution, donc
  les vecteurs, donc le portage. À ne pas faire maintenant.
* **(b)** la VIT donne un point de mouvement au-delà d'un seuil — petit, local, mesurable.
* **(c)** on retire `spd` des armures et on l'assume : la plaque n'a alors **aucun** coût déclaré autre que
  la gêne, ce qui est cohérent et honnête.

Recommandation : **(c) maintenant, (b) après le portage**. Laisser une statistique déclarée sans effet est
exactement ce que l'audit T6 a passé une tranche entière à réparer ; ne pas rouvrir le trou par le haut.

---

## 8. Oracles — comment on saura que c'est vrai

Chaque décision porte son contrôle mécanisé. Banc proposé : `test/armure_t9_check.mjs`. Aucune valeur
exacte : des **bornes**, comme partout ailleurs dans ce projet.

| # | Contrôle | Borne |
|---|---|---|
| A1 | Toute armure déclare `armor_class` | 13/13, sinon refus au chargement |
| A2 | Les trois classes d'armure ont les quatre paliers | 3 × 4 = 12 cases pleines |
| A3 | La meilleure armure n'est pas la même pour les 7 classes | au moins **3** armures distinctes gagnantes sur 7 classes |
| A4 | Pour une classe Esprit/Volonté/Charisme, tissu et plaque du même palier sont à moins de 20 % l'un de l'autre sur (tenue × dégâts) | écart ≤ 200 ‰ |
| A5 | Pour une classe Force/Adresse, la plaque domine le tissu du même palier | sur les 4 classes, aux 4 paliers |
| A6 | La gêne mord : un Mage en plaque frappe moins fort qu'en tissu du même palier | écart ≥ 150 ‰ |
| A7 | Aucun prérequis n'est inatteignable | chaque `req` est rempli par ≥ 1 héros dans ≥ 50 % des saisons |
| A8 | Le taux d'emplacements vides ne monte pas | ≤ valeur d'avant + 2 points |
| A9 | Aucune statistique déclarée sans effet (reprise de la règle T6) | `spd` retiré des armures, ou mesuré |
| A10 | Les croissances de classe sont inchangées | `start` et `growth` identiques au vecteur d'avant |

**A4 est le contrôle qui décide si la voie tissu existe.** Aujourd'hui il est ROUGE par construction :
le tissu légendaire rend 0 là où il faudrait 15.

## 9. Ce qui n'est pas décidé, et qui doit l'être par Pierre

1. **L'ordre.** Cette tranche touche `data.json` : elle invalide les sept vecteurs. Elle appartient au
   même paquet que `CRAFT_BIOME_SPEC.md` et doit passer **après** la validation du portage Godot.
2. **`gene_permille = 120`** est une valeur de départ, pas un résultat. Elle sort d'un rapprochement avec
   M16, sur un seul héros, à un seul niveau, contre un seul boss. Elle doit être balayée au banc.
3. **La tolérance du Clerc à `cuir`** est discutable : c'est la classe qui soigne en première ligne, et
   l'histoire du genre la met en plaque aussi souvent qu'en cuir. Trancher.
4. **Le Barde en `tissu`** suppose que son attaque au Charisme est une attaque « de caster ». Si Pierre le
   voit en bretteur-chanteur, il passe à `cuir` et le barème du cuir doit alors porter aussi du `support`.
5. **Les trois pièces manquantes** (tissu épique, cuir épique, cuir légendaire) : à créer, ou à assumer
   comme trous. Les créer fait 3 objets de plus dans un ensemble de 47 dont 11 ne sont jamais portés —
   il vaut sans doute mieux **reconvertir** trois objets morts que d'en ajouter trois.

---

software_verdict: OK (document de conception, aucun code modifié) ·
evidence_verdict: MECHANICAL_VALIDATION_ONLY — toutes les valeurs M0 à M16 viennent d'exécutions du moteur
sur 20 graines, aucune d'une lecture de code seule · claim_verdict: NO_CLAIM_ALLOWED — **aucun playtest
humain** : rien ici n'est prouvé sur le plaisir de jouer une voie tissu, seulement sur le fait qu'elle
n'existe pas mécaniquement aujourd'hui.
