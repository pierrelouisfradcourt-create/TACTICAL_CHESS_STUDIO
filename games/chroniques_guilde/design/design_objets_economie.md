# Chroniques de Guilde — Design OBJETS · CRAFT · RESSOURCES · FORGE · ÉCONOMIE · BUTIN

Date : 2026-09-17 · Source : sous-agent concepteur « objets / économie » (Fable 5.1), workflow Chroniques de Guilde.
Statut : PROPOSITION, tranche 1 (prototype HTML solo + 2 co-managers simulés, ~30 jours), non ratifiée.
Documents frères lus et alignés : `design_aventuriers.md` (classes, attributs, `gather_power`, `craft_power`,
salaires, taverne) et `design_quetes_donjons.md` (difficulté, bestiaire, butin de monstre, `expedition_state`).
Tout ce qui est marqué `[ASSUMÉ]` est un choix fait à la place d'un autre concepteur (village, journée) et
doit être réconcilié dans la section 12 « Interfaces » ou tranché dans la section 15 « Questions ouvertes ».

---

## 0. Conventions (identiques aux documents frères)

* Tout nombre est un ENTIER signé 32 bits. Probabilités en permille `‰` (0-1000), multiplicateurs en
  centièmes `pct` (100 = x1). Or maximum par bourse : 1 000 000. Aucun produit intermédiaire > 2^31-1.
* `div(a, b)` = division entière tronquée vers zéro ; tous les dividendes de ce document sont >= 0.
  `pct(x, p) = div(x * p, 100)` · `permille_of(x, p) = div(x * p, 1000)` · `clamp(x, lo, hi) = min(hi, max(lo, x))`.
* `roll(rng, n)`, `chance(rng, p)`, `between(rng, lo, hi)`, `pick_weighted(rng, entries)` : primitives du document
  Quêtes §0.3-0.5 (mulberry32, tirage pondéré dans l'ordre de la table).
* Flux RNG utilisés ici (dérivés de `world_seed` par `h32`, document Quêtes §0.4) :
  `market_seed = h32(world_seed, day, 5)` (stock du marchand du jour `day`) ·
  `forge_seed = h32(world_seed, day, 6)` (qualité des objets terminés le jour `day`) ·
  `item_seed` = fourni par l'expédition pour chaque objet (`{pool, rarity, seed}`) → `rng_new(seed)`.
  Aucun autre tirage dans ce système : récolte, marché (prix), entrepôt, file de forge sont SANS tirage.
* Ordres de parcours fixés : managers par `manager_id` ASCII croissant (`m0 < m1 < m2`), héros par `hero_id`
  ASCII croissant, actions par `seq` croissant (ordre de soumission), ressources par `resource_id` ASCII croissant,
  objets par `uid` ASCII croissant. Là où l'ordre des managers favoriserait toujours `m0`, une ROTATION
  `start = day % n_managers` est appliquée (§6.3, §9.4).
* Clés de données : `snake_case` ASCII anglais. Textes affichés : français.
* Aucun champ dérivé n'est stocké (prix effectifs, puissances, valeurs de butin sont recalculés).

---

## 1. Vue d'ensemble et place dans `resolveDay`

Trois portefeuilles, deux niveaux de propriété :

| Conteneur | Propriétaire | Nature (architecture sans serveur) | Contenu |
|---|---|---|---|
| `inventories[m]` | manager `m` | ÉCRIVAIN UNIQUE | ressources, objets, consommables, bourse `gold` |
| `warehouse` | guilde | COMMUN, rejoué | ressources, objets, consommables |
| `guild.gold` | guilde | COMMUN, rejoué | trésorerie |
| `forge` | guilde | COMMUN, rejoué | file d'attente et travaux en cours |
| `market` | monde | DÉRIVÉ de la graine + index de prix COMMUN | lots du jour, `price_pct` |

Phases de la journée où ce système agit (numérotation du document Quêtes §0.6, sous-étapes `E` proposées) :

```
P1  VALIDATION DES ORDRES (matin)         → E1 actions économiques (§9) dans cet ordre exact :
                                             equip/unequip · deposit · withdraw (rotation) · market_sell ·
                                             market_buy · forge_submit · forge_cancel · donate · supplies
P3  RÉCOLTE                               → E2 rendement (§2.3) vers inventories[owner] ; surplus auto-vendu
P5  FORGE                                 → E3 avancement des travaux (§5.4), objets terminés (§5.5)
P7  EXPÉDITIONS (document Quêtes)         → consomme equipment_bonus (§3.6) et bag.supplies (§4.2)
P8  RETOURS                               → E4 butin : or (Quêtes §6.7), ressources → warehouse, objets (§8),
                                             armes brisées, retour des consommables non utilisés
SOIR (après H2 salaires du document Aventuriers)
                                          → E5 entretien des bâtiments (§7.3) · E6 dérive des prix (§7.5)
                                             · E7 stock du marchand pour day+1 (§7.4) · E8 compteurs
P11 HACHAGE                               → champs du §10
```
Aucune étape E ne lit l'état produit par une expédition du même jour avant E4.

---

## 2. Ressources (8)

### 2.1 Table `resources`

| resource_id | Nom FR | Biome source (rôle) | sell_value (or/unité, base) | buy_value (or/unité, base) | stack_weight | Usage principal |
|---|---|---|---|---|---|---|
| `wood` | Bois | forest (primaire) | 3 | 6 | 1 | arcs, bâtons, manches, chantiers |
| `herbs` | Herbes | forest (secondaire), marsh (tertiaire) | 4 | 8 | 1 | potions, antidotes, robes |
| `hide` | Cuir | forest (secondaire) | 5 | 10 | 1 | armures légères, gambisons |
| `stone` | Pierre | mountain (secondaire) | 3 | 6 | 1 | pierres à aiguiser, plates, chantiers |
| `iron_ore` | Minerai de fer | mountain (primaire) | 6 | 12 | 1 | épées, masses, cottes, réparations |
| `crystal` | Cristal | mountain (tertiaire) | 15 | 30 | 1 | bâtons, enchantements, objets rares |
| `swamp_moss` | Mousse des marais | marsh (primaire) | 4 | 8 | 1 | potions, robes |
| `venom` | Venin | marsh (secondaire) | 10 | 20 | 1 | antidotes, lame venimeuse, bâton de braise |

`buy_value = sell_value * 2` : la marge du marchand est le premier puits d'or (§7.6). `stack_weight = 1` pour
toutes (les capacités se comptent en unités, §6.1). L'or n'est pas une ressource d'entrepôt (`gold` = bourse).

### 2.2 Rendement par biome (sans tirage)

Le document Aventuriers fournit `gather_power(hero, biome)` (§6.1) et suggère `units = div(gather_power, 10)`.
Règle retenue ici :

```
GATHER_SPLIT = {                           // en centièmes des unités de base, ordre = ordre d'application
  forest:   [{wood, 100}, {hide, 40}, {herbs, 25}],
  mountain: [{iron_ore, 100}, {stone, 50}, {crystal, 12}],
  marsh:    [{swamp_moss, 100}, {venom, 35}, {herbs, 20}],
}
gather_yield(hero, biome, day) :
  base  = div(gather_power(hero, biome) * tool_gather_pct(hero, biome), 100)     // §3.5 outil
  units = max(1, div(base, 10))                                                  // jamais 0 : un jour de récolte rapporte
  out = {}
  for {res, share} in GATHER_SPLIT[biome] :
    q = div(units * share, 100)
    if share < 100 and q == 0 and (day + hero_index) % div(100, share) == 0 : q = 1   // miettes déterministes
    if q > 0 : out[res] = q
  return out
```
`hero_index` = rang du héros dans le parcours `hero_id` croissant du jour (0-based). La règle « miettes »
donne 1 cristal tous les 8 jours à un mineur trop faible pour en produire par la formule, sans tirage.

Exemples (perf_pct 82, état de départ) :

| Héros | Biome | gather_power | outil | units | Rendement / jour | Valeur de vente |
|---|---|---|---|---|---|---|
| Rôdeur niv.2 (dex 18) | forest | 34 | aucun | 3 | wood 3, hide 1 | 14 or |
| Rôdeur niv.2 | forest | 44 | hache de bûcheron (+30) | 4 | wood 4, hide 1, herbs 1 | 21 or |
| Guerrier niv.2 (str 18) | mountain | 34 | aucun | 3 | iron_ore 3, stone 1 | 21 or |
| Guerrier niv.2 | mountain | 44 | pioche (+30) | 4 | iron_ore 4, stone 2 | 30 or |
| Mage niv.2 (mind 18) | marsh | 34 | aucun | 3 | swamp_moss 3, venom 1 | 22 or |
| Clerc niv.3 (mind 13) | marsh | 25 | aucun | 2 | swamp_moss 2 | 8 or |
| Rôdeur niv.12 (dex 38) | forest | 76 | hache | 9 | wood 9, hide 3, herbs 2 | 50 or |
| Guerrier niv.12 (str 38) | mountain | 76 | pioche | 9 | iron_ore 9, stone 4, crystal 1 | 81 or |

Ordre de grandeur : 15-30 or/jour/récolteur au départ, 50-80 à niveau 12. Cohérent avec la question 2 du
document Aventuriers (2-3 recrues à 5-10 or/jour tenables avec 2 récolteurs).

### 2.3 Destination de la récolte

`gather_yield` va dans `inventories[hero.owner].resources` (un héros PRÊTÉ récolte pour son EMPRUNTEUR :
`inventories[controller]`, cohérent avec « le butin va à l'expédition » du document Aventuriers §9.6).
Dépassement de capacité (§6.1) : le surplus est vendu au marchand à `div(sell_price(res), 2)` et l'or crédité
au même manager ; chronique `inventory_overflow_sold {manager_id, resource_id, qty, gold}`.
Les accidents de récolte sont gérés par le document Aventuriers (`ACCIDENT_PERMILLE.gather`) ; un héros
accidenté a quand même récolté (l'accident est tiré le soir, après P3).

