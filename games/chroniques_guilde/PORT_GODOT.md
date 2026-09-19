# PORTAGE VERS GODOT 4 — Chroniques de Guilde

Date : 2026-09-19. Source : `CONTRACT.md`, `AUDIT_ARCHI.md` §6 et §8, lecture de `sim.js` et `tactic.js`.
Compagnons de ce document : `golden/vectors.json` + `golden/README.md` (les vecteurs de référence),
`port/godot/*.gd` (les primitives prêtes à coller), `port/gen_golden.mjs` et `port/gen_primitives.mjs`
(les générateurs, en JavaScript, qui produisent et rejouent tout ce qui est affirmé ici).

> **Ce qui est vérifié et ce qui ne l'est pas.** Tout ce qui est marqué **[mesuré]** a été exécuté sur cette
> machine avec le moteur JavaScript. **Aucune ligne de GDScript de ce dossier n'a été exécutée** : Godot n'est
> pas installé ici. En compensation, chaque fichier `.gd` porte en tête ses valeurs attendues, produites par le
> moteur JavaScript, et `port/godot/det_selftest.gd` les vérifie toutes en une exécution.

---

## 0. Pourquoi ce document existe

Le moteur est déterministe : même graine, mêmes actions, même état — sur tous les téléphones. C'est **toute la
valeur** du jeu : c'est ce qui permet de jouer à plusieurs sans serveur, chacun rejouant les actions des autres.

Un portage qui diverge d'un seul bit détruit cette propriété. Et il **diverge en silence** : la partie démarre,
les chroniques se lisent, les héros montent de niveau — et deux joueurs voient deux mondes différents, trois
jours plus tard, sans le moindre message d'erreur.

Le reste de ce document sert à une seule chose : rendre cette divergence **visible en quelques secondes**
au lieu de quelques semaines.

---

## 1. Stratégie : trois voies, et laquelle prendre

### 1.1 La taille réelle du moteur **[mesuré]**

| | lignes | octets | fonctions déclarées | fonctions publiques |
|---|---|---|---|---|
| `sim.js` | 3 718 | 264 106 | 323 | **8** (+ `_internal`) |
| `tactic.js` | 3 905 | 259 902 | 244 | **16** (+ `_internal`) |
| **total moteur** | **7 623** | **524 008** | **567** | **24** |
| `data.json` | — | 229 346 | — | 53 tables |
| `index.html` | 7 000+ | 297 199 | — | (non portable, §6) |

Autres mesures utiles :

* `sim.js` et `tactic.js` n'utilisent **aucune** syntaxe postérieure à ES2017 : 0 occurrence de `??`, `?.`,
  `BigInt`, `Symbol`, `Proxy`, `WeakMap`, `async`, `await`, `yield`, `Intl` **[mesuré]**. Un interpréteur
  JavaScript embarqué les avale sans adaptation.
* 0 occurrence de `document`, `window`, `navigator`, `localStorage`, `fetch`, `setTimeout`,
  `requestAnimationFrame`, `Math.random`, `new Date` (AUDIT_ARCHI §6.1 et §8.1). Les deux moteurs sont purs.
* Résoudre 30 journées : **45 ms**. Calculer un `viewModel` : **2,0 ms** (AUDIT_ARCHI §8.1).

### 1.2 Les trois voies, pesées

| | **A. Réécrire en GDScript** | **B. Embarquer un interpréteur JavaScript** | **C. Garder le JavaScript pour l'export web seulement** |
|---|---|---|---|
| **Coût** | 7 623 lignes et 567 fonctions à transcrire, dont ~3 900 de moteur tactique. Des semaines, pas une soirée. | Un GDExtension à compiler pour `arm64-v8a` et `armeabi-v7a`, plus un adaptateur de ~150 lignes. Une soirée à une journée, **si** la compilation Android passe. | Quelques heures : `JavaScriptBridge` de Godot appelle `sim.js` tel quel. |
| **Risque de divergence** | **Maximal.** 567 fonctions, et chacun des 13 pièges du §2 peut frapper à n'importe laquelle. La divergence est silencieuse. | **Nul sur les règles** : c'est le *même code* qui tourne. Le seul risque est le **pont** (types de nombres, JSON entrant/sortant) — et les vecteurs le testent en quelques secondes. | Nul, pour la même raison. |
| **Taille de l'application** | La plus petite : rien à ajouter au gabarit Godot. | QuickJS pèse ~0,7 à 1,5 Mo par ABI, à comparer aux 25-40 Mo du gabarit Android de Godot : **négligeable**. | Sans objet (pas d'APK). |
| **Maintenance** | **Deux moteurs à tenir synchronisés à vie.** Chaque règle changée se code deux fois, et se prouve deux fois. C'est la dette qui ne se rembourse jamais. | **Une seule source de vérité.** `sim.js` reste le moteur, la page web et l'application Android partagent le même fichier. | Une seule source, mais **pas d'application Android** : `JavaScriptBridge` ne fonctionne que sur l'export Web. |
| **Ce que ça donne ce soir** | Rien de jouable. | Une vraie application Android, si le GDExtension se compile. | Une page web servie par Godot. Pas l'objectif. |

### 1.3 Recommandation : **voie B**, l'interpréteur embarqué

**L'argument principal, en une phrase : le portage n'a pas à reproduire le déterminisme s'il exécute le code
qui le produit.** Les 7 623 lignes du moteur ne contiennent pas une règle qu'on puisse transcrire « à peu
près ». Chacune des 567 fonctions manipule des entiers dont le moindre arrondi change une empreinte. Réécrire
tout ça (voie A) revient à re-gagner 567 fois un pari qu'on peut simplement ne pas prendre.

Et les vecteurs de référence ne changent pas cette conclusion, ils la renforcent : ils rendent la divergence
**détectable**, ils ne la rendent pas **moins probable**. Avec la voie A, ils te diront chaque soir de quelle
journée tu es encore loin. Avec la voie B, ils passent à 100 % dès que le pont marshalle correctement, et ils
restent ensuite comme test de non-régression du pont.

**Architecture recommandée, et c'est elle qui élimine le dernier risque :** l'état ne traverse **jamais** le
pont. Il vit dans le contexte JavaScript, du début à la fin de la saison. Godot n'échange que :

* vers le JS : des **actions** (`{manager_id, day, type, payload}`) et une graine ;
* vers Godot : le **`viewModel`**, déjà prêt à afficher — 47 Ko, 2,0 ms (AUDIT §8.1) — et la `chronicle`.

Le contrat garantit que la page « ne calcule aucune règle » ; Godot hérite de cette garantie. Sauvegarde et
partage se font par le **journal d'actions** (`{seed, days:[{day, actions}]}`, ~50 Ko pour une saison, AUDIT
§8.1), pas par l'état : c'est déjà ce que fait `index.html`, et c'est aussi ce qui rend le multijoueur possible.

**Ce que je n'ai pas pu vérifier.** Aucune compilation n'a été tentée ici. Les candidats connus sont
*GodotJS* (QuickJS-NG, avec un moteur V8 optionnel) et les divers *godot-quickjs* ; je ne peux affirmer ni
qu'ils se compilent pour Android depuis ta machine, ni qu'ils restent maintenus. **Vérifie ça en premier, avant
toute autre chose** : c'est le seul point qui peut condamner la voie B, et il se teste en construisant un
projet vide qui appelle `hashState(newGame(4242, data))` et compare à `49b120de` (voir §3.1).

**Repli, si le GDExtension ne se compile pas ce soir :** livre la voie C (export Web de Godot +
`JavaScriptBridge`) pour avoir quelque chose de jouable, et garde la voie A pour plus tard — jamais en une
nuit, et **phase par phase, chaque phase validée par les vecteurs**, en commençant par `court_3j`.

**Si tu choisis quand même la voie A**, l'ordre est : primitives (`port/godot/*.gd`) → `det_selftest.gd` →
`newGame` (cible : `hash_initial`) → `court_3j` → les phases une à une dans l'ordre du §4.2 → `saison_30j_defaut`
→ `tactic.js` → `raid_gagne` et `raid_perdu_ravage`. Ne passe jamais à l'étape suivante avec un vecteur rouge.

---

## 2. LA LISTE DES PIÈGES

Treize endroits où JavaScript et GDScript diffèrent **sans rien dire**. Pour chacun : le code JavaScript exact,
l'équivalent GDScript correct, et le contre-exemple qui montre la divergence.

---

### Piège 1 — La division entière et son sens d'arrondi pour les négatifs

**JavaScript** (`sim.js:23`, à l'identique `tactic.js:21`) :

```js
function div(a, b) { return Math.trunc(a / b); }        // TRONCATURE VERS ZÉRO
```

**GDScript correct** (`port/godot/det_int.gd`) :

```gdscript
@warning_ignore("integer_division")
static func div(a: int, b: int) -> int:
	return a / b        # l'opérateur / entre deux int tronque vers zéro, comme le C++
```

**Contre-exemple.** `div(-2, 3)` vaut **0**. Avec `floor(-2.0 / 3.0)` ou `floori()`, ça vaut **-1**.

**Où ça frappe pour de vrai [mesuré].** Sur les 7 vecteurs de référence (161 journées), **57 divisions
entières ont des opérandes de signes opposés et un reste non nul** — donc 57 endroits où `floor()` diverge :

| occurrences | site | appel observé | correct | `floor()` |
|---|---|---|---|---|
| **50** | `sim.js:3086` `out[k] += div(dl[k] * spent[act], slotDiv(D))` | `div(-2, 3)` | `0` | `-1` |
| 3 | `sim.js:3086` (même ligne) | `div(-4, 3)` | `-1` | `-2` |
| 2 | `sim.js:2376` `if (dm < 0 && …) dm = div(dm, 2)` | `div(-5, 2)`, `div(-15, 2)` | `-2`, `-7` | `-3`, `-8` |
| 2 | `sim.js:2392` `if (hasTrait(h,'stoic')) dm = div(dm, 2)` | `div(-5, 2)`, `div(-31, 2)` | `-2`, `-15` | `-3`, `-16` |

Le premier cas, c'est l'usure de moral d'un héros qui s'entraîne (`activity_deltas.train.morale = -2`, divisé
par 3 créneaux). **Un point de moral par jour et par héros.** Invisible à l'œil. Fatal au hachage.

**Piège dans le piège.** En GDScript, `a / b` ne fait une division entière que si **les deux** opérandes sont
des `int`. Si l'un est devenu `float` en chemin (retour d'une fonction non typée, valeur lue d'un JSON mal
parsé, `lerp`, `pow`…), tu obtiens un `float` et la troncature disparaît. D'où les paramètres typés `int` dans
`det_int.gd` : ils transforment l'erreur silencieuse en erreur de compilation.

---

### Piège 2 — La multiplication entière sur 32 bits (le cœur du hachage)

**JavaScript** (`sim.js:43-46`, `sim.js:57-60`) :

```js
function fnvBytes(h, bytes) {
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
```

`Math.imul(a, b)` rend les **32 bits bas** du produit, comme une multiplication entière 32 bits qui déborde.

**GDScript correct** (`port/godot/det_int.gd`) :

```gdscript
static func imul32(a: int, b: int) -> int:
	a &= MASK32
	b &= MASK32
	var lo: int = (a & 0xFFFF) * b                     # <= 2^48 : aucun débordement
	var hi: int = ((a >> 16) * (b & 0xFFFF)) & 0xFFFF
	return (lo + (hi << 16)) & MASK32
```

**Contre-exemple.** `imul32(0xFFFFFFFF, 0xFFFFFFFF)` vaut **0x00000001**. La multiplication naïve
`0xFFFFFFFF * 0xFFFFFFFF` vaut 2⁶⁴ − 2³³ + 1, ce qui **déborde l'`int` 64 bits de GDScript** : le résultat
n'est pas garanti. Le découpage en deux moitiés de 16 bits plafonne l'intermédiaire à 2⁴⁸ et rend la bonne
valeur sans jamais déborder.

**Où ça frappe.** `fnvBytes` (`sim.js:43`) — donc `hashState`, donc **chaque empreinte de chaque journée** ;
`makeRng` (`sim.js:57-60`) — donc **chaque tirage aléatoire du jeu**. Ces deux fonctions sont dupliquées à
l'identique dans `tactic.js` (lignes 36 et 43-46) : les deux copies doivent recevoir la même correction
(c'est la garde **G1** de l'audit, §6.3).

**[mesuré]** `port/gen_primitives.mjs` réimplémente `imul32`, `fnvBytes` et `makeRng` en arithmétique 64 bits
masquée — sans un seul opérateur binaire 32 bits de JavaScript, sans un seul `Math.imul` — exactement comme le
fera GDScript, puis compare **16 029 valeurs** au moteur : **0 divergence**.

---

### Piège 3 — Les décalages non signés

**JavaScript** (`sim.js:52`, `sim.js:56-61`) :

```js
function hex8(h) { return ('00000000' + (h >>> 0).toString(16)).slice(-8); }
rng.s = (rng.s + 0x6D2B79F5) >>> 0;
t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
```

`>>>` décale **sans propager le bit de signe** et rend un entier **non signé** 0 … 4 294 967 295.
`>>` propage le signe. En JavaScript les deux existent et ne font pas la même chose.

**GDScript correct.** GDScript n'a **que** `>>`, qui sur un `int` 64 bits négatif propage le signe. La règle
est donc : **garde toujours la valeur masquée à 32 bits**, elle est alors positive et `>>` se comporte comme
`>>>`.

```gdscript
static func shr32(v: int, n: int) -> int:
	return (v & MASK32) >> n        # masque D'ABORD, décale ENSUITE
static func u32(v: int) -> int:
	return v & MASK32               # l'équivalent de >>> 0
```

**Contre-exemple.** Avec `t = 0x80000000` : en JavaScript `t >>> 15` vaut `0x00010000`. En GDScript, si `t`
avait été laissé signé sur 32 bits (`-2147483648`), `t >> 15` vaut `-65536`. Le tirage suivant est faux, et
avec lui tout le reste de la journée.

**Piège dans le piège.** `hex8` doit rendre **8 chiffres hexadécimaux minuscules**, complétés par des zéros à
gauche. `"%08x" % h` en GDScript. Une empreinte à 7 chiffres ne ressemble à rien et ne se compare à rien.

---

### Piège 4 — Le générateur pseudo-aléatoire, et surtout son état

**JavaScript** (`sim.js:54-74`) :

```js
function makeRng(seedU32) {
  const rng = { s: seedU32 >>> 0, count: 0 };
  rng.next = function () {
    rng.s = (rng.s + 0x6D2B79F5) >>> 0;
    let t = rng.s;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    rng.count++;
    return (t ^ (t >>> 14)) >>> 0;
  };
  rng.roll = function (n) { return n <= 1 ? 0 : rng.next() % n; };
  rng.chance = function (p) { return rng.roll(1000) < p; };
  rng.between = function (lo, hi) { return hi <= lo ? lo : lo + rng.roll(hi - lo + 1); };
  ...
}
```

**GDScript correct** : `port/godot/det_rng.gd` en entier.

**Trois contre-exemples, du plus au moins évident :**

1. **Le modulo négatif.** Si `next()` laisse échapper une valeur négative (piège 3), `roll(n)` rend un reste
   **négatif** — le `%` de GDScript garde le signe du dividende, exactement comme celui de JavaScript. Un index
   de tableau négatif, une probabilité négative : rien ne lève d'erreur, tout part de travers.

2. **`roll(n)` avec `n <= 1` ne consomme AUCUN tirage.** Ce n'est pas une optimisation, c'est une règle du
   moteur. Un portage qui appelle quand même `next()` dans ce cas **décale le flux entier de la journée**.
   Idem pour `between(lo, hi)` quand `hi <= lo`, et pour `pickWeighted` quand la somme des poids est nulle.

3. **`count` fait partie de l'empreinte.** Il ne sert à rien au calcul, mais le raid **sérialise son
   générateur dans l'état** (`state.raid.rng_s`, `state.raid.rng_count` — `tactic.js:55-56`
   `rngOf`/`saveRng`). `hashState` hache donc `count`. Un portage qui oublie de l'incrémenter, ou qui
   l'incrémente à un autre endroit, fait diverger le hachage **sans changer une seule règle de jeu** — et tu
   chercheras l'erreur dans les dégâts pendant des heures.

**Deux flux, pas un.** La journée a son flux (`makeRng(fnvU32(state.seed ^ state.day))`, `sim.js:1334`) ; le
raid a le sien, sérialisé dans l'état. C'est une très bonne décision d'architecture (AUDIT §6.1) : modifier le
raid ne décale pas le reste de la journée. Le portage doit **garder les deux séparés**.

**Valeurs de contrôle [mesuré].** Flux de la journée 1 de la partie par défaut, graine `4242` :
graine du flux `fnv1a_u32(4242 ^ 1)` = `0x76d1d166`, puis
`0xdecaa58c, 0xc95a9721, 0x367847f8, 0xff97cdb9, 0xe38b015b, 0x47983ce4, 0xc726ad8e, 0xedb32668`.

---

### Piège 5 — Le hachage de chaînes se fait sur des OCTETS UTF-8 (et le français est plein d'accents)

**JavaScript** (`sim.js:28-47`) : `utf8Bytes()` encode explicitement en UTF-8 — y compris les paires de
substitution — puis `fnvStr()` hache **les octets**.

**GDScript correct** (`port/godot/det_hash.gd`) :

```gdscript
static func fnv1a_str(s: String) -> int:
	return fnv1a_bytes(FNV_OFFSET, s.to_utf8_buffer())    # to_utf8_buffer(), rien d'autre
```

**Contre-exemple.** `"Maëlle"` :

| | valeur |
|---|---|
| `"Maëlle".length()` en Godot (points de code) | **6** |
| octets UTF-8 | **7** — `[77, 97, 195, 171, 108, 108, 101]` |
| `fnv1a_str("Maëlle")` | **`0x4f8ceb34`** |

Un portage qui hache `s.unicode_at(i)` pour `i` de 0 à `length()-1` hache **six** valeurs dont une vaut 235
(`ë`) au lieu de **sept** octets dont deux valent 195 et 171. Empreinte fausse.

**Où ça frappe, et c'est partout.** `hashState` hache le JSON canonique de l'état, qui est **plein de français
accenté** : noms de managers (`Maëlle`, `Ysolde`), noms de héros, titres de chronique, libellés de bâtiments…
Et surtout `pickTpl` (`sim.js:97-102`) choisit le gabarit de phrase par
`fnvStr(kind + '|' + salt) % list.length` : **le texte du jeu dépend du hachage d'octets**. Un accent mal
compté et c'est une autre phrase, donc un autre `chronicle.title`, donc une autre empreinte.

**Autres valeurs de contrôle [mesuré].** `fnv1a_str("")` = `0x811c9dc5` · `fnv1a_str("é")` = `0x1e9de8c1`
(**2** octets) · `fnv1a_str("Château")` = `0xf0c3c2e6` (**8** octets) · `fnv1a_str("forêt")` = `0x752141b7`
(**6** octets) · `fnv1a_str("Les Loups d’Argent")` = `0xf9d6efaa` (**20** octets — l'apostrophe typographique
`’` en fait trois à elle seule) · `fnv1a_str("🐉")` = `0x0c8d3deb` (4 octets, hors BMP).

---

### Piège 6 — L'ordre d'itération des clés d'un dictionnaire, et le tri qui doit le précéder

**JavaScript** (`sim.js:87`) :

```js
function sortedKeys(obj) { return Object.keys(obj).sort(); }
```

Le contrat l'écrit noir sur blanc : *« Interdit : … itération sur l'ordre d'insertion d'un objet pour consommer
le RNG (toujours trier par id ASCII avant) »*. **[mesuré]** `sortedKeys` est appelé **65 fois dans `sim.js`**
et **31 fois dans `tactic.js`** ; les deux fichiers portent **57 + 35 = 92 appels à `.sort()`**. Ce n'est pas un détail de style,
c'est l'ossature du déterminisme.

**GDScript correct** (`port/godot/det_canonical.gd`) :

```gdscript
static func sorted_keys(d: Dictionary) -> Array:
	var k: Array = d.keys()
	k.sort()
	return k
```

**Contre-exemple.** Un `Dictionary` de Godot conserve l'**ordre d'insertion**. Un objet JavaScript aussi —
sauf que JavaScript place **d'abord les clés « entières »**, en ordre numérique croissant, **puis** les autres
en ordre d'insertion. `Object.keys({"10":1, "b":1, "2":1})` rend `["2","10","b"]` ; le `Dictionary` équivalent
en Godot rendrait `["10","b","2"]`. Les deux **changent** dès qu'on trie — et c'est justement pourquoi il faut
trier **toujours**, jamais « quand ça semble compter ».

**La règle à tenir.** Toute boucle qui (a) consomme un tirage, (b) écrit dans l'état, ou (c) construit une
chaîne affichée, itère sur des clés **triées**. L'audit a relevé 4 `Object.keys` sans tri immédiat dans le
moteur, toutes vérifiées comme inoffensives (comptages purs : `tactic.js:791, 989, 990`). Si ton portage en
ajoute une cinquième, tu viens de créer un bug qui ne se reproduira jamais deux fois pareil.

---

### Piège 7 — Le tri de chaînes est par point de code, jamais par locale

**JavaScript.** `Array.prototype.sort()` sans comparateur trie par **unité de code UTF-16**, et les
comparaisons du moteur s'écrivent toujours `a.id < b.id ? -1 : 1` — comparaison brute, jamais `localeCompare`.
Le contrat interdit explicitement `Intl` et `localeCompare` ; l'audit confirme **0 occurrence** des deux
(§6.1).

**GDScript correct.** `Array.sort()` sur des `String` compare point de code par point de code. **N'utilise
jamais** `naturalcasecmp_to`, `nocasecmp_to`, `filesort`, ni quoi que ce soit qui parle de « naturel » ou
d'« insensible à la casse ».

**Contre-exemple.**

```
["b", "A", "10", "2", "é", "a"].sort()
  -> ["10", "2", "A", "a", "b", "é"]        correct (par point de code)
tri "naturel"      -> ["2", "10", "A", "a", "b", "é"]    ("2" avant "10")  FAUX
tri insensible casse -> ["10", "2", "a", "A", "b", "é"]  ("a" avant "A")   FAUX
tri par locale fr  -> dépend de la plateforme                              FAUX, ET PAS REPRODUCTIBLE
```

Le dernier cas est le pire : il ne casse pas chez toi, il casse chez un joueur dont le téléphone a une autre
locale. **La règle de départage des votes du contrat** — « le `building_id` / `quest_id` le plus petit en ordre
ASCII » (`sim.js:1090`) — repose entièrement là-dessus.

**Limite honnête.** JavaScript trie par unité de code **UTF-16**, Godot par point de code **UTF-32**. Les deux
ordres ne diffèrent que si une clé contient un caractère hors BMP (au-delà de U+FFFF) **et** une autre un
caractère dans U+E000–U+FFFF. Le contrat impose des clés `snake_case` **ASCII** dans `data.json`, donc le cas
ne se présente pas — mais si tu ajoutes un jour une clé avec un emoji, souviens-toi d'ici.

---

### Piège 8 — Le clonage profond

**JavaScript** (`sim.js:86`, `tactic.js:24`) :

```js
function clone(v) { return JSON.parse(JSON.stringify(v)); }
```

`resolveDay` est **pure** : elle clone l'entrée et ne la mute jamais (`sim.js:3377`
`const state = attachData(clone(input), data);`). Tout le rejeu — donc tout le multijoueur — repose là-dessus.

**GDScript correct** :

```gdscript
var copie: Dictionary = original.duplicate(true)     # true = PROFOND
```

**Contre-exemple.** `duplicate()` **sans argument** est une copie de **surface** : les sous-dictionnaires et
sous-tableaux restent **partagés**. Le jour 5 modifie alors le héros du jour 4, l'historique se réécrit
derrière toi, et le rejeu diverge — mais **seulement au rejeu**, des dizaines de journées plus loin, jamais
pendant la partie en direct. C'est le bug le plus coûteux à trouver de toute cette liste.

**Piège dans le piège.** `JSON.parse(JSON.stringify(v))` **supprime les propriétés `undefined`** et ne recopie
pas les propriétés non énumérables. C'est précisément ce qui fait que `state.__data` (posée non énumérable par
`attachData`, `sim.js:3348`) **ne survit pas** au clonage ni à la sérialisation — le bug **B4** de l'audit
(§8.2), corrigé depuis par `sim.attach(state, data)` (§V5 T2b B4 du contrat). En Godot, `duplicate(true)`
recopie **tout**. Si ton état contient un jour une référence à la table de données, elle sera clonée, elle
entrera dans `canonical()`, et ton empreinte ne ressemblera à rien. **L'état ne contient que du JSON pur :
tiens cette règle.**

---

### Piège 9 — Les entiers au-delà de 32 bits, et le fait qu'un `int` GDScript en fasse 64

C'est le piège le plus subtil des treize, parce qu'il est **exactement à l'envers** de ce qu'on croit.

* En **JavaScript**, un nombre est un **flottant 64 bits** : exact jusqu'à 2⁵³, mais **chaque opérateur
  binaire** (`^`, `|`, `&`, `<<`, `>>`) commence par convertir son opérande en **entier signé 32 bits**, et
  `>>>` en entier **non signé** 32 bits. Le débordement à 32 bits est donc **automatique et silencieux**.
* En **GDScript**, un `int` fait **64 bits** et les opérateurs binaires travaillent sur les 64 bits. **Il n'y
  a pas de débordement automatique à 32 bits.** C'est au portage de le faire, à la main, à chaque étape.

**JavaScript** (`sim.js:59`) — la ligne la plus dangereuse de tout le moteur :

```js
t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
```

Ici `t + Math.imul(...)` est une addition **flottante** qui peut dépasser 2³², puis `^ t` **tronque à 32 bits
signés**. Le résultat tient dans 32 bits *parce que JavaScript le force*, pas parce que le calcul y tenait.

**GDScript correct** (`port/godot/det_rng.gd`) :

```gdscript
t = ((t + DetInt.imul32(t ^ (t >> 7), t | 61)) ^ t) & MASK32
```

**Contre-exemple.** Sans le `& MASK32`, la somme `t + imul32(...)` peut valoir jusqu'à ~2³³ ; le `^ t` opère
alors sur 33 bits, le bit 32 survit, et `(t ^ (t >> 14))` en hérite. Le tirage n'est pas « un peu » différent :
il est **complètement** différent, dès le premier appel.

**La règle à graver.** Partout où le JavaScript écrit `>>> 0`, `| 0`, ou utilise `Math.imul`, le GDScript écrit
`& 0xFFFFFFFF`. Pas « si ça déborde ». **Systématiquement.** `det_int.gd`, `det_hash.gd` et `det_rng.gd` le
font à chaque ligne ; recopie ce style.

**Le versant rassurant.** Hors hachage et RNG, le moteur est **entier partout** et reste très loin de 2³¹ :
or, PV, prestige, XP. L'`int` 64 bits de GDScript les tient tous sans effort — c'est même **plus sûr** que le
flottant 64 bits de JavaScript. Le danger est concentré dans les ~40 lignes des primitives.

---

### Piège 10 — Aucun flottant n'a le droit d'entrer dans l'état

**JavaScript.** Le contrat l'exige (« ENTIERS uniquement », « flottants dans l'état : interdit ») et le banc
`harness` le prouve : « aucun nombre non entier dans l'état », « aucun NaN » (AUDIT §6.1 et §8.1).
`canonical()` s'appuie dessus : `JSON.stringify(1)` rend `"1"`, jamais `"1.0"`.

**GDScript correct** (`port/godot/det_canonical.gd`) : `canonical()` **lève une assertion** sur tout flottant
non entier, plutôt que de produire une empreinte fausse.

**Contre-exemple.** Une seule règle écrite `hp * 1.5` au lieu de `pct(hp, 150)` met un `float` dans l'état.
`canonical()` écrira `"1.0"` là où JavaScript écrivait `"1"`, et **toutes** les empreintes suivantes seront
fausses — alors que la valeur affichée, elle, paraîtra correcte. C'est la garde **G2** de l'audit (§6.3).

En GDScript, `sqrt`, `pow`, `lerp`, `/` entre un `int` et un `float`, `Vector2`, `deg_to_rad` : tous rendent
des `float`. Aucun n'a sa place dans une règle.

---

### Piège 11 — Le parseur JSON de Godot et les entiers de `data.json`

> **✅ MESURÉ LE 2026-09-19 SUR GODOT 4.6.stable.official.89cea1439 — LE PIÈGE EST RÉEL.**
> `JSON.parse_string('{"n":1000,"m":-7}')` rend **deux `TYPE_FLOAT`**. Ce n'était pas une
> précaution théorique : c'est le seul défaut trouvé en exécutant les 65 contrôles du banc.
> **Réparation livrée** : `port/godot/det_json.gd`. `DetJson.parse()` et `DetJson.parse_file()`
> ramènent récursivement tout flottant de valeur entière à un entier, **à la lecture**, avant
> que le moteur ne calcule quoi que ce soit. Le moteur porté lit ses données par `DetJson`,
> jamais par `JSON.parse_string` directement. Un vrai fractionnaire est laissé visible plutôt
> que tronqué en douce — `DetCanonical` le refusera bruyamment.
>
> Pourquoi ça ne pardonne pas : `canonical()` ramène déjà `3.0` à `"3"`, donc l'empreinte d'un
> état fraîchement chargé serait juste et on croirait que tout va bien. Mais dès que le moteur
> calcule, `div()` ne tronque plus pareil — et les `assert` de garde **disparaissent en build
> release**, donc sur le téléphone la divergence serait muette.

**Ce qu'il faut vérifier avant tout le reste.** `data.json` fait 229 Ko et **53 tables**, toutes en entiers
(probabilités en pour mille, multiplicateurs en centièmes). Si `JSON.parse_string` de Godot rend `1000.0` là où
le fichier porte `1000`, alors :

* `DetInt.div(x, y)` reçoit des `float` et cesse de tronquer (piège 1) ;
* `canonical()` écrit `1000.0` et **toutes** les empreintes sont fausses (piège 10) ;
* et rien, absolument rien, ne te le dira.

**GDScript correct.** `det_selftest.gd` contient le contrôle :

```gdscript
var parsed: Variant = JSON.parse_string('{"n":1000,"m":-7}')
assert(typeof(parsed["n"]) == TYPE_INT and typeof(parsed["m"]) == TYPE_INT)
```

Si ce contrôle échoue, convertis en profondeur à la lecture (une passe récursive qui transforme tout `float`
entier en `int`) — **et refais tourner le contrôle `data_fnv` du §3.1 pour t'assurer que la conversion est
complète**. C'est exactement ce que fait `golden_check.gd` avant de comparer la moindre journée.

**Contre-exemple.** `data_fnv` doit valoir **`97a2d68a`** [mesuré]. S'il vaut autre chose, tu n'as pas chargé
les mêmes tables et le reste du diagnostic n'a aucun sens.

---

### Piège 12 — L'échappement des chaînes dans la sérialisation canonique

**JavaScript** (`sim.js:79-84`) : `canonical()` utilise `JSON.stringify` pour les chaînes et les nombres, et
recompose les objets clés triées.

```js
function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  const keys = Object.keys(v).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}
```

**GDScript correct** : `DetCanonical._quote()` dans `port/godot/det_canonical.gd`, qui reproduit à la lettre
les règles de `JSON.stringify` :
`"` → `\"` · `\` → `\\` · 0x08 → `\b` · 0x09 → `\t` · 0x0A → `\n` · 0x0C → `\f` · 0x0D → `\r` ·
tout autre caractère **< 0x20** → `\u00XX` en minuscules · **tout caractère ≥ 0x20 est écrit BRUT**.

**Contre-exemple [mesuré].** `canonical("Château")` vaut `"Château"`, avec l'accent **brut**. Un échappeur
« prudent » qui écrirait `"Château"` produit une chaîne de 14 caractères au lieu de 9 : le hachage
d'octets du piège 5 ne peut plus tomber juste. De même, `/` n'est **jamais** échappé en `\/`.

**Ne te sers pas de `JSON.stringify()` de Godot pour l'empreinte.** Il ne trie pas les clés, il n'a pas les
mêmes règles d'échappement, et il écrit les nombres à sa façon. Écris la sérialisation canonique à la main :
c'est 40 lignes, et c'est la fondation de tout.

**Valeurs de contrôle [mesuré].**

```
canonical({"z":1,"a":{"d":[3,2,1],"c":"é"},"b":null,"n":-7})
    == {"a":{"c":"é","d":[3,2,1]},"b":null,"n":-7,"z":1}
hash_state(le même objet) == 294809ed
hash_state({}) == 5465b825          hash_state([]) == 741638a5
```

Noter au passage : les clés sont triées **à tous les niveaux**, mais l'ordre des **éléments d'un tableau**
n'est **jamais** touché — `[3,2,1]` reste `[3,2,1]`.

---

### Piège 13 — Les égalités doivent être départagées, et l'ordre de réception conservé

**JavaScript** (`sim.js:1411-1417` `tally` pour les votes, `tactic.js:197-215` pour Dijkstra,
`tactic.js:171` `unitsSorted` pour les unités, `tactic.js:95-101` `cellsSorted` pour les cases) : le moteur départage **explicitement** chaque égalité — par identifiant ASCII,
par index de case, par coût puis index.

Et le cas le plus retors, la phase de raid (`sim.js`, `phaseRaid`) :

```js
received.sort((a, b) => (a.rank - b.rank) || (a.hero_id < b.hero_id ? -1 : 1));
```

Les passages **réellement reçus** sont rejoués dans leur **ordre de réception** (champ `rank` de l'action
`raid_pass`, décision de conception V5 T2b §B1), **puis** les passages par défaut des managers absents, par
identifiant de manager.

**GDScript correct.** `Array.sort_custom()` de Godot **n'est pas stable**. Tout comparateur doit donc rendre
un ordre **total** : aucun couple d'éléments ne doit être « équivalent ».

```gdscript
arr.sort_custom(func(a, b):
	if a.rank != b.rank:
		return a.rank < b.rank
	return a.hero_id < b.hero_id)      # départage TOUJOURS présent
```

**Contre-exemple.** Un comparateur qui rend `a.rank < b.rank` **sans** départage laisse deux passages de même
`rank` dans un ordre dépendant de l'implémentation du tri. Ils s'exécutent dans un ordre chez toi, dans l'autre
chez ton voisin, et les deux parties divergent — de façon **non reproductible**, ce qui est le pire des cas
possibles pour déboguer. C'est la garde **G6** de l'audit (§6.3).

---

## 3. L'API à reproduire

### 3.1 `sim.js` — huit fonctions publiques

```
newGame(seed:int, data:object, options?:{}) -> state
attach(state, data) -> state
listManagers(state) -> string[]                          // ['p1', …], p1 = humain, toujours premier
planDefaults(state, managerId, data?) -> Action[]
validateAction(state, action, data?) -> {ok:bool, reason?:string}   // raison en français, JAMAIS d'exception
resolveDay(state, actions:Action[], data?) -> {state, chronicle, log:string[]}   // PURE : ne mute pas l'entrée
hashState(state) -> string                               // 8 chiffres hex minuscules
viewModel(state, managerId, data?) -> VM | {error:string}
```

`state` : objet JSON pur (sérialisable, sans fonctions, sans `undefined`). Champs publics garantis :
`seed:int`, `day:int` (1 au départ, incrémenté par la journée résolue), `season_length:int` (30),
`managers:[{id, name, kind:'human'|'ai', profile}]`. Le reste est privé au moteur — mais **entre dans
l'empreinte**.

`_internal` expose en plus `makeRng`, `fnvStr`, `fnvU32`, `canonical`, `raidEnvOf`, `raidDefaults`,
`previewCast`, `probeExpedition`, `apToday`, `craftLevel`, `combatProfile`, `tactic`.

**Action** : `{manager_id:string, day:int, type:string, payload:object}`. Les 18 types acceptés par
`validateAction` (`sim.js:843-963`, `validateInner`) :

`assign` · `plan` · `vote_quest` · `vote_build` · `craft_order` · `recruit` · `equip` · `unequip` · `deposit` ·
`withdraw` · `buy` · `sell` · `decorate` · `choose_hybrid` · `choose_spec` · `respec` · `set_loadout` ·
`raid_pass`.

Activités (`sim.js:836`) : `gather` · `train` · `craft` · `rest` · `expedition` · `defend` · `solo` · `raid`.

**Premier point de contrôle du portage [mesuré]** :
`hashState(newGame(4242, data, {managers: …}))` doit valoir **`49b120de`** avec la table de managers du vecteur
`saison_30j_defaut` (elle est écrite dans `golden/vectors.json`, champ `options`).

### 3.2 `tactic.js` — seize fonctions publiques

```
startRaid(state, raid_id, env) -> state'
raidView(state, managerId, env) -> VM.raid | null
raidAction(state, action, env) -> {state, ok, reason, log, events}
raidEndPass(state, env) -> {state, log, events}
raidNight(state, env) -> {state, log, events}
raidPass(state, hero_id, actions, env) -> {state, ok, reason, log, events}
validateRaidPass(state, hero_id, actions, env) -> {ok, reason}
raidDefaults(state, managerId, env) -> [{adventurer_id, actions:[…]}]
raidDefaultsFor(state, hero_id, env) -> actions | null
previewCast(view, spell_id, {x,y}) -> {valid, reason, cells, targets, path}
checkEffects(data) -> {ok, unknown:[], reason}
spellPool(env, u) · spellSlots(…) · defaultLoadout(…) · loadoutWhy(…) · loadoutView(…) · unitLoadout(env, u)
```

`env` est construit par `sim._internal.raidEnvOf(state, raiders|null, day?)` : tables, jour, managers, profils
des héros **au matin**. Toutes ces fonctions sont **pures** : l'entrée n'est jamais mutée.
Actions d'un passage : `{type:'move', to:{x,y}}` · `{type:'cast', spell_id, x, y}` · `{type:'end_turn'}` ·
`{type:'end_pass'}`.

La dépendance est **à sens unique** : `sim → tactic`, 8 appels (AUDIT §8.1). Un portage peut donc reprendre
`tactic.js` seul pour l'écran tactique. **Attention** : `sim.js` attend `window.GuildeTactic` chargé **avant**
lui ; dans le désordre, `TACTIC` vaut `null` et **le raid se désactive en silence** (`raidEnabled`,
`sim.js:210`) — le jeu retombe sur le dragon V4 sans rien dire (AUDIT §8.3). Fais-en une erreur bruyante.

### 3.3 L'ordre des phases, et où chacune consomme du hasard

> **Le contrat annonce « 13 phases ». Le code en enchaîne 19.** Les six manquantes sont des ajouts V4 et V5
> (menace, raid, missions solo, voie, nuit de raid, âge du village, présage, emplacements de sorts) que le
> §« Journée : ordre de résolution » de `CONTRACT.md` n'a pas suivis. **C'est l'ordre du code qui fait foi** —
> c'est lui qui produit les empreintes des vecteurs. Le voici, relevé dans `resolveDay` (`sim.js:3373-3410`).

Graine du flux de la journée : `makeRng(fnvU32(state.seed ^ state.day))` (`sim.js:1334`). **Un seul flux**,
consommé dans l'ordre ci-dessous. Le raid en a un second, séparé et sérialisé dans l'état.

Le tableau ci-dessous est **mesuré** sur les 161 journées des 7 vecteurs de référence (instrumentation du
compteur `rng.count` avant et après chaque appel de phase).

| # | fonction | ce qu'elle fait | tirages FLUX JOUR | journées concernées | tirages FLUX RAID |
|---|---|---|---|---|---|
| 1 | `phaseValidation` | validation des actions, votes, activité effective — tri par `manager_id` ASCII **puis ordre de réception** | 0 | 0 | 0 |
| 2 | `phasePay` | paie / entretien (or de guilde) | 0 | 0 | 0 |
| 3 | `phaseSlots` | récolte + entraînement + forge, **par créneau de points d'action** (V4) | 177 | 85 | 0 |
| 4 | `phaseInfirmary` | soins / repos (infirmerie) | 0 | 0 | 0 |
| 5 | `phaseExpedition` | expédition sur la quête votée — **la phase la plus gourmande, et de loin** | **10 669** | 73 | 0 |
| 6 | `phaseThreat` | menace : dragon de biome, auto-combat (V4) | 1 | 1 | 0 |
| 7 | `phaseRaid` | raid tactique : passages du jour (`tactic.js`) | 45 | 14 | **366** |
| 8 | `phaseSolo` | missions solo (V4) | 488 | 86 | 0 |
| 9 | `phaseMarket` | marché : achats, ventes, réassort | 147 | **147** | 0 |
| 10 | `phaseTavern` | taverne : nouvelles recrues, **héritiers** | 1 199 | 78 | 0 |
| 11 | `phaseConstruction` | chantier : avancement du bâtiment voté | 0 | 0 | 0 |
| 12 | `phaseEvening` | fin de jour : fatigue, moral, blessures, XP, niveaux, expiration des quêtes, nouveau tableau | 3 562 | **161** | 0 |
| 13 | `phaseLineage` | voie (hybride) : proposition du soir, choix automatique à J+2 | 0 | 0 | 0 |
| 14 | `phaseRaidNight` | nuit du raid : régénération, enrage, échec au 4ᵉ soir | 2 | 2 | 0 |
| 15 | `phaseVillageAge` | âge du village | 0 | 0 | 0 |
| 16 | `phaseDragons` | réveil des dragons + présage | 0 | 0 | 0 |
| 17 | `phaseDerby` | derby, jours 7 / 14 / 21 / 28 — **simule une expédition complète sur le flux du jour** | 4 050 | 16 | 0 |
| 18 | `phaseLoadout` | les cinq emplacements de sorts de **demain**, fixés ce soir | 0 | 0 | 0 |
| 19 | `phaseSeason` | bilan de saison, jour 30 | 0 | 0 | 0 |
| | **total** | | **20 340** | **161** | **366** |

Puis, toujours dans `resolveDay` et **dans cet ordre** :

```js
ctx.summary.gold_delta = …;
const chronicle = buildChronicle(ctx);
state.notices = ctx.notices.slice();
state.last_chronicle = chronicle;
const dayDone = state.day;
state.day += 1;                                                    // l'incrément vient APRÈS la chronique
const h = hashState(Object.assign({}, state, { history: null }));  // le hachage du JOURNAL exclut l'historique
state.history.push({ day: dayDone, title, headline, hash: h, village_age_index: state.village_age || 0 });
```

**Trois choses à ne pas rater ici :**

1. `state.day` s'incrémente **après** la construction de la chronique. Une phase qui lit `state.day` lit le
   jour **en cours**, pas le suivant.
2. Le hachage rangé dans `state.history[]` est calculé sur l'état **privé de son historique**
   (`history: null`) — sinon il se hacherait lui-même. Ce **n'est pas** la même valeur que
   `hashState(state)` que les vecteurs comparent. Les vecteurs utilisent `hashState(state)`, la fonction
   publique, sur l'état complet retourné par `resolveDay`.
3. **L'ordre de consommation du hasard est ce qui doit être identique, pas seulement les formules.** Une
   formule juste appelée un tirage trop tôt donne un jeu entièrement différent. C'est pour ça que le tableau
   ci-dessus existe : si ton portage diverge, compare d'abord **le nombre de tirages consommés** par journée,
   pas les valeurs. Le moteur l'imprime déjà : `ctx.log` finit par
   `'jour N résolu, <count> tirages, hash <h>'`.

**Règles de résolution que le tableau ne montre pas :**

* Un manager **sans aucune action** reçoit `planDefaults` appliqué automatiquement (`phaseValidation`).
  Les vecteurs de référence enregistrent les actions de **tous** les managers, donc ce chemin n'est pas
  exercé par eux — mais il l'est dès que tu joues pour de vrai.
* Une action **invalide** est **ignorée**, sa raison part dans `log` et dans `notices`. Jamais d'exception.
* Table de données absente → `{state (inchangé), chronicle:null, log, error:'…'}`. Jamais d'exception.
* Guilde dispersée (`state.collapsed`) → `resolveDay` devient l'**identité** et rend une chronique de chute.
* Un aventurier a au plus une activité par jour : **la dernière action `assign` valide gagne**.
* Votes à égalité : le `building_id` / `quest_id` le plus petit en **ordre ASCII** — mécaniquement,
  `tally` (`sim.js:1411-1417`) parcourt `sortedKeys(count)` et ne remplace le meilleur qu'avec un `>` STRICT :
  à égalité, le premier de l'ordre ASCII gagne. Un `>=` inverserait tous les départages.

### 3.4 La forme du modèle de vue

`viewModel(state, managerId)` est **le seul point d'accès de l'interface à l'état**, et tout y est **prêt à
afficher** : aucun calcul côté interface. Sa forme exacte est dans `CONTRACT.md` §« VM = viewModel(…) » et ses
ajouts V4/V5 aux §« viewModel — ajouts », §« VM.raid ». Racines : `day, season_length, seed, hash,
is_season_over, manager, managers, guild, roster, quest_board, buildings, construction, forge, tavern,
quarter, market, inventory, chronicle, history, village, threat, raid, raid_history, derby, season_report,
notices`.

Si tu prends la voie B, **c'est cette structure et elle seule qui traverse le pont**. Godot n'a alors aucune
règle à connaître : il dessine `VM`.

---

## 4. Ce qui se porte sans effort : `data.json`

Godot lit le JSON nativement. `data.json` (229 Ko, **53 tables**) se charge tel quel, sans conversion, sans
génération de code :

```gdscript
var f := FileAccess.open("res://data.json", FileAccess.READ)
var data: Variant = JSON.parse_string(f.get_as_text())
```

Les 53 tables : `ai_profiles, attributes, biomes, bosses, building_empty_decor, buildings, classes, constants,
crafts, decoration_morale_cap, decorations, difficulty, dragons, epithets, events, first_names_f,
first_names_m, founders, human_manager, hybrids, items, layouts, lineage, loot_pools, loot_rarity,
market_base_stock, meta, monster_fallback, monsters, outcome_pct, quest_names, quest_type_weight_tiers,
quest_types, raid, raids, rarities, recipes, resources, rival_guilds, room_types, room_weights, skills, slots,
solo_missions, specs, tactic_passives, tactic_spells, templates, threats, trait_incompatible, traits,
village_ages, xp_table`.

**Ce qu'il faut vérifier quand même, dans l'ordre :**

1. **Les nombres reviennent-ils en `int` ?** C'est le piège 11, et c'est le seul qui peut tout faire dérailler.
   `det_selftest.gd` le contrôle.
2. **`data_fnv` retombe-t-il sur `97a2d68a`** [mesuré] ? C'est le contrôle global, et c'est le premier que
   `golden_check.gd` exécute. Il couvre à la fois la lecture du fichier, l'encodage UTF-8, la conversion des
   nombres et ta sérialisation canonique.
3. **Le fichier est-il lu en UTF-8 ?** `FileAccess.get_as_text()` le fait. Ne passe pas par
   `get_buffer()` + une conversion maison.
4. **`data.js` n'a rien à faire dans le portage.** C'est le même contenu enveloppé dans
   `window.GUILDE_DATA = …` pour la page web ; Godot lit `data.json` directement. (Si tu prends la voie B,
   donne `data.json` au contexte JavaScript, pas `data.js` : pas de `window` dans un QuickJS nu.)
5. **`data.json` et `sim.js` vont ensemble.** Changer l'un sans l'autre casse les vecteurs. Si tu régénères
   `data.json`, régénère les vecteurs (`node port/gen_golden.mjs`) et dis-le.

---

## 5. Ce qui ne se porte pas : la page HTML

`index.html` fait 297 Ko. **Rien n'en est réutilisable en Godot**, et c'est normal : c'est du Canvas 2D et du
DOM. Le point rassurant, vérifié par l'audit (§8.3) : **aucune de ces lignes ne décide d'une règle** — aucune
ne touche `app.state`.

**Ce qui doit être refait, et où est la spécification :**

| Ce qu'il faut refaire | Taille d'origine | Où est la spec |
|---|---|---|
| **Le tableau vivant du domaine** (le village qui grandit, âges 0 → 4) | 407 lignes (`index.html:1510-1916`) | **`CHATEAU_SPEC.md`** en entier : caméra (§1), bâtiments dans les murs (§2), verticalité (§3), enceinte / porte / pont-levis (§4), soldats (§5), trois niveaux de détail (§6), jour / nuit / saisons (§7), chantiers visibles (§8) |
| **L'écran de raid** : grille 9×11, unités, zones, aperçu de sort | 169 lignes (`index.html:1299-1467`) | `CONTRACT.md` §« `VM.raid` » : `grid.cells[]` porte déjà `kind`, `zone`, `safe`, `boss`, `spawn` ; `units[]` porte les états ; `me.spells[]` porte `castable`, `reason`, `range_label` |
| Les quatre onglets, la chronique, le journal, l'import/export | le reste | `CONTRACT.md` §« Interface (index.html) » et §« Plan graphique » (couleurs clair/sombre, typographies, mise en page à 400 px) |

**Deux bonnes nouvelles.**

* La **géométrie** du tableau vivant (`SPOTS`, `ROAD`, `WALL_A/B`, `spotFor`, `roadPoint`) est isolée dans
  42 lignes (`index.html:1468-1509`) et **peut être transcrite telle quelle** en Godot (AUDIT §8.3).
* La grille de raid se dessine **entièrement depuis `VM.raid.grid.cells`**, sans rien savoir des sorts : seules
  deux tables de correspondance sont à compléter côté affichage, `STATE_GLYPH` (`index.html:1055`) et
  `ZONE_COLOR` (`index.html:1054`) (AUDIT §7.1).

**Une mauvaise.** L'audit relève (§2.2, §2.3, §4.3) que l'écran de raid **contourne `viewModel`** par endroits
et que **~39 lignes de la page réécrivent des règles du moteur** (dont `rd.paMax = 6` et `slotCount`
plafonné à 4). **Ne transcris pas ces lignes-là.** Tout ce dont l'affichage a besoin doit venir de `VM`. Si
une valeur manque dans `VM`, c'est `viewModel` qu'il faut compléter, pas Godot.

---

## 6. Liste de contrôle de fin de portage

À cocher dans l'ordre. Chaque ligne se vérifie mécaniquement.

**Les fondations**

- [x] `det_selftest.gd` affiche **65/65 — PRIMITIVES CONFORMES** (division, `imul32`, FNV entier, FNV chaîne
      UTF-8 avec accents, mulberry32, canonique, empreinte, tri par point de code, lecture JSON entière).
      **Fait le 2026-09-19 sur Godot 4.6.stable, code de sortie 0.** Deux commandes, cf.
      `port/godot/README.md` — le passage `--import` est obligatoire une fois, sinon les
      `class_name` ne sont pas enregistrés.
- [x] Le piège 11 est CONFIRMÉ (`JSON.parse_string` rend des flottants) et réparé par `det_json.gd`.
      Le moteur porté doit lire par `DetJson`, jamais par `JSON.parse_string`.
- [ ] `data_fnv` calculé sur `data.json` vaut **`97a2d68a`**.
- [ ] Aucun `float` ne peut entrer dans l'état : `canonical()` lève une assertion (piège 10).
- [ ] Toutes les copies d'état sont des `duplicate(true)` (piège 8).
- [ ] Tous les comparateurs de tri rendent un ordre **total** (piège 13).
- [ ] Aucun `.keys()` non trié dans une boucle qui consomme un tirage, écrit dans l'état ou compose du texte
      (piège 6).
- [ ] Aucun tri par locale, aucun `nocasecmp`, aucun `naturalcasecmp` (piège 7).

**Le moteur**

- [ ] `hashState(newGame(4242, data, options))` vaut **`49b120de`**.
- [ ] Vecteur `court_3j` : **3/3** journées.
- [ ] Vecteur `derby_j7` : **8/8** journées (la phase derby passe).
- [ ] Vecteur `saison_30j_defaut` : **30/30** journées, empreinte finale `ea0b390e`.
- [ ] Vecteur `age_chateau` : **30/30**, le village atteint l'âge 4.
- [ ] Vecteur `mort_heritier` : **30/30**, mort et héritier passés.
- [ ] Vecteur `raid_gagne` : **30/30** (`tactic.js` et son flux RNG séparé).
- [ ] Vecteur `raid_perdu_ravage` : **30/30** (raid perdu, ravage).
- [ ] `resolveDay` ne mute **jamais** son entrée : rejouer deux fois la même journée depuis le même état donne
      deux fois la même empreinte.
- [ ] Une action invalide est **ignorée** avec une raison en français dans `notices` — **aucune exception**.
- [ ] Une table de données absente rend `{state, chronicle:null, log, error}` — **aucune exception**.
- [ ] Un manager sans action reçoit `planDefaults` (ce chemin **n'est pas** couvert par les vecteurs : teste-le
      à la main).

**L'application**

- [ ] L'interface n'accède à l'état que par `viewModel` — **zéro règle de jeu dans Godot**.
- [ ] Le journal d'actions `{seed, days:[{day, actions}]}` s'exporte, s'importe, et se rejoue jusqu'à la même
      empreinte finale (c'est le bouton « Rejouer » du contrat : **IDENTIQUE** ou **DIVERGENCE jour N**).
- [ ] L'écran tient à **400 px de large sans défilement horizontal**, thèmes clair et sombre.
- [ ] Si `tactic.js` (ou son portage) n'est pas chargé, le jeu le dit **bruyamment** — pas de repli silencieux
      (AUDIT §8.3).

**Le verdict**

- [ ] **`golden_check.gd` sur un VRAI TÉLÉPHONE Android** (pas seulement dans l'éditeur) : **7 vecteurs sur 7,
      161 journées sur 161, 100 %.**

Tant que la dernière case n'est pas cochée, le jeu n'est pas portable : il est seulement jouable, et seulement
par une personne à la fois.

---

## 7. Ce qui a été vérifié pour écrire ce document, et ce qui ne l'a pas été

**Vérifié mécaniquement, ici, le 2026-09-19 [mesuré]**

* `node port/gen_golden.mjs` : 7 vecteurs générés puis rejoués contre le moteur d'origine — **7/7 vecteurs,
  161/161 journées, 100 %**.
* `node port/gen_primitives.mjs` : le modèle arithmétique 64 bits masqué (celui des `.gd`) comparé au moteur
  sur **16 029 valeurs** — **0 divergence**. Toutes les valeurs de contrôle de ce document et des en-têtes
  `.gd` en sortent.
* Les 57 divisions entières à signes opposés du piège 1, relevées par instrumentation de `div()` sur les
  161 journées des vecteurs.
* Le tableau de consommation du hasard du §3.3, relevé par instrumentation du compteur `rng.count` autour de
  chacun des 19 appels de phase de `resolveDay`, sur les mêmes 161 journées.
* Les tailles, comptages de fonctions, absences de syntaxe moderne du §1.1.

**NON vérifié — à ne pas prendre pour acquis**

* **Aucun fichier `.gd` de `port/godot/` n'a été exécuté.** Godot n'est pas installé sur cette machine. Le code
  peut contenir une faute de frappe, une méthode mal nommée, une subtilité de typage statique. C'est
  `det_selftest.gd` qui tranchera, et il est écrit pour ça.
* Le comportement exact de Godot 4 sur trois points précis, tous transformés en contrôles de
  `det_selftest.gd` plutôt qu'affirmés : le sens d'arrondi de `/` entre deux `int` ; le type rendu par
  `JSON.parse_string` pour les nombres entiers ; l'ordre de `Array.sort()` sur des `String`.
* **Qu'un GDExtension QuickJS se compile et s'exporte pour Android depuis ta machine.** C'est la seule
  hypothèse qui peut condamner la recommandation du §1.3, et elle n'a pas été testée.
* Les performances sur téléphone. Les 45 ms pour 30 journées sont mesurées sous Node sur un ordinateur
  (AUDIT §8.1), pas sur un appareil Android.
* Le chemin « manager sans action → `planDefaults` » n'est pas couvert par les vecteurs, par construction :
  ils enregistrent les actions de tous les managers.

---

**software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED**
