# Chroniques de Guilde — LA QUÊTE DE CLASSE SOLO ET LA PIÈCE UNIQUE

Date : 2026-09-19. Source : session Claude Code, branche `claude/game-ideas-app-store-9dvk6p`.
Demande Pierre : « une quête de classe solo à faire quand on a choisi sa 3e et 4e voie. Elle doit
rapporter une pièce d'équipement S tier unique. »

**Document de conception. Aucune ligne de `data.json`, `sim.js`, `tactic.js` ni `golden/` n'a été touchée.**
Même règle d'ordre que `CRAFT_BIOME_SPEC.md` et `ARMURE_ET_PREREQUIS_SPEC.md` : portage Godot validé contre
les vecteurs actuels → gel → tranches → une seule régénération. À ratifier avant implémentation.

---

## 1. Ce que la mesure dit — la fenêtre existe, la difficulté n'existe plus

30 saisons × 6 héros × 30 jours, moteur seul, plans par défaut (donc le vrai comportement des profils d'IA
et du profil humain).

| # | Mesure | Valeur |
|---|---|---|
| M7 | Héros spécialisés en fin de saison | **119 / 120** (99 %) |
| M7 | Jour de spécialisation | min 21, **médiane 21**, max 22 |
| M18 | Jours restants après la spécialisation | min 1, **médiane 9**, max 9 |
| M18 | dont jours de repos, donc disponibles | min 0, **médiane 3**, max 8 |
| M18 | dont jours de raid (3 PA, héros pris) | min 0, médiane 2, max 6 |
| M18 | Héros disposant d'au moins **3** jours libres après leur spécialisation | **135 / 178 (76 %)** |
| M9 | Missions solo déclarées | 16 |
| M9 | Missions solo portant un `class_id` | **0 / 16** — le champ existe, il est mort |
| M13 | Missions solo jamais choisies sur 20 saisons | 3 / 16 (`s_col_enneige`, `s_concours_tir`, `s_exorcisme`) |
| M17b | Réussite des missions solo, jours 21-30 | difficulté 1 : **99 %** · 2 : **100 %** · 3 : 84 % · 4 : 89 % |
| M10 | Raretés déclarées | commun < rare < épique < légendaire — **aucun palier au-dessus**, 0 objet `unique` |

### Trois faits qui commandent toute la conception

1. **Le crochet est déjà là et il est mort.** `soloAptitude` donne **+6** quand `m.class_id === h.class_id`
   (`sim.js:2869`) et `soloPick` filtre déjà le tableau sur la classe (`sim.js:1182`). Aucune des 16 missions
   ne porte de `class_id`. La quête de classe est donc le **premier consommateur réel** d'un mécanisme déjà
   écrit, pas une couche nouvelle. C'est le meilleur point d'entrée possible.
2. **La fenêtre est de 9 jours et elle tient — de justesse.** Médiane 9 jours restants, dont 3 libres, et
   76 % des héros ont au moins 3 jours libres. Une quête en **trois étapes d'un jour** est jouable par trois
   héros sur quatre. Une quête en quatre étapes ne l'est plus.
3. **La couche solo n'a plus aucune difficulté à ce moment de la saison.** 99 % et 100 % de réussite aux
   difficultés 1 et 2, 84-89 % aux difficultés 3 et 4. La difficulté 5 (DC 116) n'est **jamais** choisie par
   aucun manager sur 20 saisons. Poser la quête de classe sur l'échelle existante en ferait une formalité :
   on appuie trois fois sur un bouton et on gagne la meilleure pièce du jeu. **Elle a besoin de sa propre
   échelle.**

---

## 2. Décision 1 — le déclenchement

La quête s'ouvre **le soir où le héros choisit sa spécialisation** (`spec_day` est déjà stocké sur le héros).
Pierre dit « 3e et 4e voie » : la 3e voie est l'hybride, la 4e est la pointe. C'est donc bien à la pointe,
une fois la lignée complète — jamais avant.

```
déclencheur : h.spec !== null           (et h.spec_day posé le soir même)
une seule quête par héros et par saison ; l'héritier d'un héros mort repart de zéro,
il n'hérite pas de la quête (il n'a pas de spécialisation).
```

**La quête est épinglée, pas tirée.** Le tableau solo d'un manager ne contient que
`solo_per_day = 2` missions tirées au sort chaque soir (`rollSoloBoard`, `sim.js:781`). Une quête glissée
dans ce tirage aurait deux chances sur seize d'apparaître et disparaîtrait le lendemain : elle ne serait
jamais finie en 9 jours. La quête de classe occupe donc une **troisième case permanente**, hors tirage,
affichée avec le nom du héros, et elle y reste jusqu'à ce qu'elle soit finie ou que la saison s'achève.

C'est une case, pas un point d'action de plus : une étape coûte les **2 PA** d'une mission solo ordinaire,
sur les 3 PA du jour. Le héros peut donc faire son étape et s'entraîner, mais pas son étape et un raid.
La quête entre en concurrence directe avec le raid, et c'est voulu : **choisir entre la guilde et soi-même
est exactement l'arbitrage que cette quête doit produire.**

## 3. Décision 2 — trois étapes, et chacune demande à la pointe ce qu'elle sait faire

Les 26 spécialisations portent déjà un `verb` et un `need` en données (`Templier : verb "ancrer",
need "tenir"`). La quête s'écrit sur eux. Trois étapes, trois formes, toujours les mêmes :

| étape | forme | ce qu'elle demande | résolution |
|---|---|---|---|
| I — **l'appel** | solo | le verbe de la pointe, seul, contre un adversaire de son biome d'origine | jet solo, DC de classe |
| II — **le prix** | solo | le verbe de la pointe, mais privé de ce sur quoi il s'appuie (le Templier doit tenir sans sa case, le Traqueur frapper sans l'ombre) | jet solo, DC de classe + 12 |
| III — **la preuve** | solo | le verbe, à son plein régime, contre le besoin de la **pointe sœur** — ce que sa jumelle résout mieux que lui | jet solo, DC de classe + 24 |

L'étape II est le cœur de l'intention : elle dit au joueur ce que sa pointe est *vraiment*, en la lui
retirant. L'étape III lui fait affronter précisément ce pour quoi il n'est pas fait. Les deux sont
écrites depuis les champs `sister` et `distinction` déjà présents sur les 26 fiches — **aucune donnée
narrative nouvelle à inventer**, seulement à rédiger.

**Ordre imposé, reprises autorisées.** Un échec ne ferme rien : il coûte la journée, donne le tiers d'XP
comme toute mission solo ratée, et l'étape reste ouverte. C'est le temps qui est la ressource rare
(9 jours), pas les tentatives. Ne jamais fermer définitivement : un joueur qui rate deux fois à trois jours
de la fin a déjà perdu, il n'a pas besoin qu'on le lui dise deux fois.

## 4. Décision 3 — l'aptitude et l'échelle de difficulté

L'aptitude générique ne convient pas. `soloAptitude` additionne `primary + secondary` de la **classe de
base** : elle ne sait rien de l'hybride ni de la pointe, et un Templier y est noté comme un Guerrier. La
quête de classe lit donc une aptitude à elle :

```
apt_classe = niveau × 5
           + attribut moteur de la POINTE (déclaré sur la fiche de spec, champ nouveau `attr`)
           + 4 × niveau du savoir-faire demandé par l'étape
           + 6   (le bonus de classe existant, qui s'applique enfin)
           + d30
```

Échelle dédiée, hors de `solo_dc`, parce que l'échelle existante est saturée (M17b) :

```
class_quest_dc = [ étape I : 130, étape II : 142, étape III : 154 ]
```

Point de repère : la difficulté 5 existante vaut DC 116 et n'est jamais tentée. L'étape I part donc
**au-dessus du plafond actuel du jeu**. Ces trois nombres sont un point de départ, pas un résultat : ils
doivent être balayés au banc jusqu'à tenir la borne du §6 (B3).

**Ce que la difficulté ne doit pas être** : un mur d'équipement. Le héros vient de se spécialiser, il porte
du commun dans 46 % des cas et rien dans 42 % (mesure M15 de `ARMURE_ET_PREREQUIS_SPEC.md`). Une quête calée
sur l'équipement récompenserait ceux qui n'en ont pas besoin. `apt_classe` ne lit **aucune** statistique
d'objet : elle lit le niveau, l'attribut de la pointe et le savoir-faire. On récompense ce que le joueur a
construit, pas ce qu'il a ramassé.

## 5. Décision 4 — la pièce unique

### 4.1 Un cinquième palier

`rarities` devient `common < rare < epic < legendary < unique`. Le palier `unique` n'est **jamais** dans un
butin, jamais au marché, jamais dans une recette. Il n'a qu'une source : la quête de classe. C'est ce qui
en fait un titre plutôt qu'un objet.

### 4.2 Une pièce par spécialisation : 26 pièces

Chaque pointe a la sienne, et elle porte **le mécanisme de son verbe**, pas un paquet de chiffres. Exemple
sur la fiche déjà écrite du Templier (`verb: ancrer`, passif `Ancrage`) : sa pièce ne donne pas « +10 DÉF »,
elle fait que **la case qu'il a tenue reste tenue un tour après son départ**. La pièce prolonge la phrase
d'identité que la spécialisation raconte déjà.

**Garde dure** : le mécanisme d'une pièce unique doit être un `effects[].kind` que le moteur tactique
applique **déjà**. Le garde de chargement posé en V5 T2b refuse au démarrage tout effet inconnu et
désactive le raid avec sa raison en français ; 26 pièces sont 26 occasions de le déclencher. Aucune pièce
n'introduit un genre d'effet nouveau. Si une pointe n'a pas de mécanisme disponible, sa pièce prend la
forme dégradée du §4.4 plutôt qu'un effet inventé.

### 4.3 Répartition sur les emplacements

Avec les six emplacements de `CRAFT_BIOME_SPEC.md` (arme, armure, cape, anneau, babiole, fiole) :
26 pièces réparties **au plus 5 par emplacement**, et **aucune dans `armor`**. Raison : l'emplacement
d'armure est gouverné par l'arbitrage tissu/cuir/plaque de `ARMURE_ET_PREREQUIS_SPEC.md` ; y poser une
pièce unique imposée annulerait cet arbitrage pour 26 héros sur 26. La cape et l'anneau, qui sont neufs et
sans butin établi, en portent la majorité.

### 4.4 Puissance — une pièce de fin de parcours, pas une pièce de rupture

Borne : **la pièce unique ne doit pas être le meilleur objet de son emplacement en chiffres bruts.** Elle
se situe au niveau d'un légendaire, et sa valeur vient de son mécanisme. Un joueur doit pouvoir
légitimement préférer son légendaire de dragon sur certaines compositions — sinon la quête de classe tue le
butin de dragon, qui est le contenu que Pierre a demandé en premier (« une piñata à loot »).

Forme dégradée, si une pointe n'a pas de mécanisme disponible : la pièce porte les statistiques d'un
légendaire **plus** le déclencheur du passif de sa pointe abaissé d'un cran (le passif mord plus souvent,
pas plus fort). C'est mesurable et ça ne crée aucun effet nouveau.

### 4.5 Prérequis et vie de la pièce

* `req.level` = le niveau **médian de spécialisation moins un** (donc 5 au barème mesuré M14). Une pièce
  gagnée qu'on ne peut pas porter n'est pas une récompense.
* **Liée au héros.** Elle ne s'échange pas, ne se vend pas, ne se fond pas.
* **À la mort du héros, elle va au coffre de la guilde** (`guild_chest` existe déjà, `sim.js:722`) et y
  reste, portable par personne. C'est une relique : la guilde garde la trace de celui qui l'a gagnée.
  L'héritier ne la reçoit pas.
* **Un trophée dans le quartier du manager** sur le tableau vivant, le soir où la quête s'achève. C'est la
  seule partie de ce document qui est visible par les amis sans ouvrir l'application, et c'est le vrai prix :
  la pièce se porte, le trophée se voit.

## 6. Oracles — ce qui prouvera que ça marche

Banc proposé : `test/quete_classe_t10_check.mjs`. Bornes, jamais de valeurs exactes.

| # | Contrôle | Borne |
|---|---|---|
| B1 | Les 26 pointes ont leur quête et leur pièce | 26 quêtes, 26 pièces, 0 fiche vide |
| B2 | La quête est atteignable dans la fenêtre réelle | ≥ **60 %** des héros spécialisés finissent les 3 étapes (mesure de départ : 76 % ont 3 jours libres) |
| B3 | Elle n'est pas une formalité | réussite de l'étape III entre **45 %** et **75 %** au premier essai |
| B4 | Elle coûte quelque chose | sur les saisons où la quête est menée, la participation au raid du héros baisse de ≥ 1 jour |
| B5 | Aucune pièce unique n'est le meilleur objet brut de son emplacement | 0 / 26 |
| B6 | Aucun `effects[].kind` nouveau | le garde de chargement V5 T2b ne se déclenche jamais |
| B7 | Aucune pièce en `armor`, ≤ 5 par emplacement | 26 réparties sur 5 emplacements |
| B8 | La pièce est portable à l'obtention | ≥ 90 % des héros remplissent `req` le jour où ils la gagnent |
| B9 | Elle ne tue pas le butin de dragon | le taux de port des légendaires de dragon ne baisse pas de plus de 5 points |
| B10 | Mort du héros → coffre de guilde, jamais à l'héritier | 100 % des cas |

**B2 et B3 se contredisent volontairement** : l'un exige qu'on y arrive, l'autre qu'on puisse échouer.
C'est entre eux deux que la quête existe. Si les deux ne peuvent pas tenir ensemble, ce n'est pas le DC
qu'il faut changer, c'est la fenêtre — voir §7.

## 7. Le vrai risque, et comment le lever

**La fenêtre de 9 jours est le point de rupture.** Médiane 9, minimum **1**. Un héros qui se spécialise
tard n'a pas de quête du tout, et 24 % des héros n'ont pas trois jours libres (M18). Trois issues :

* **(a)** avancer l'offre de spécialisation du jour 21 vers le jour 17-18. Touche directement le calibrage
  de saison verrouillé par `test/season_t5_check.mjs` (morts 2,7 %, chute de guilde 3,3 %, dragons 62-76 %) :
  il faudrait re-prouver ces cinq bornes. Coût réel, mais c'est la seule issue qui règle la cause.
* **(b)** laisser la quête inachevée traverser la saison et s'ouvrir sur la suivante. Suppose une continuité
  entre saisons qui n'existe nulle part aujourd'hui.
* **(c)** deux étapes au lieu de trois. Tient sans rien toucher, et perd l'étape II, qui est la seule idée
  intéressante des trois.

Recommandation : **(a)**, et seulement après le portage. Ne pas faire **(c)** : garder l'étape du prix.

---

## 8. Ce qui reste à trancher par Pierre

1. **L'ordre.** Cette tranche touche `data.json` et `sim.js`. Elle va dans le même paquet que le craft de
   biome et les classes d'armure, après la validation du portage Godot.
2. **`class_quest_dc = [130, 142, 154]`** est un point de départ calé sur un plafond existant jamais
   atteint (DC 116). C'est un résultat de banc, pas une opinion.
3. **Avancer la spécialisation au jour 17-18** (issue (a) du §7) — c'est la décision qui a le plus de
   conséquences et elle rouvre le calibrage de saison T5.
4. **26 pièces, ou une par hybride (13), ou une par classe de base (7) ?** 26 est ce que Pierre a décrit
   (« quand on a choisi sa 3e et 4e voie »), et c'est 26 mécanismes à écrire et à tenir. 13 serait deux fois
   moins de travail pour une identité deux fois plus floue. Je recommande 26 et j'en signale le coût.
5. **La pièce liée au héros** ferme la porte à tout échange entre amis. C'est cohérent avec « pas de prêt de
   compétence entre joueurs », mais c'est un choix social, pas technique.

---

software_verdict: OK (document de conception, aucun code modifié) ·
evidence_verdict: MECHANICAL_VALIDATION_ONLY — M7, M9, M10, M13, M14, M15, M17 et M18 viennent d'exécutions
du moteur sur 20 à 30 graines ; les renvois à `sim.js` sont des numéros de ligne vérifiés ·
claim_verdict: NO_CLAIM_ALLOWED — **aucun playtest humain**. Rien ici ne prouve qu'une quête de classe fait
plaisir ; la mesure prouve seulement que la fenêtre existe et que la difficulté, elle, n'existe plus.
