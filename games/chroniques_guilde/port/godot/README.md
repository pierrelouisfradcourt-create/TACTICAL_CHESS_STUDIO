# Contrôles de portage — Godot 4

Date : 2026-09-19. Ce dossier est un **banc**, pas un jeu : aucune scène, aucun contenu.
Il n'existe que pour répondre à une question, avant d'écrire la moindre règle dans Godot :

> **les primitives entières se comportent-elles exactement comme en JavaScript ?**

Si la réponse est non, le portage diverge, et il diverge **en silence** : la partie a l'air de
marcher, les chroniques se lisent, et deux joueurs voient deux mondes différents. C'est le seul
défaut qui détruit le multijoueur sans serveur sans jamais lever d'erreur.

---

## Le contrôle qui compte

```bash
cd games/chroniques_guilde/port/godot
godot --headless --path . --import                      # une seule fois
godot --headless --path . --script res://run_selftest.gd
```

Sortie attendue : **`65/65 — PRIMITIVES CONFORMES`**, code de sortie 0.

**Le passage `--import` n'est pas décoratif** : tant que le projet n'a pas été scanné une fois,
Godot n'enregistre pas les `class_name` et le banc échoue sur « Identifier "DetInt" not declared ».
Ça ressemble à une erreur de code, ce n'en est pas une.
Le premier échec nomme la primitive qui diverge (division tronquée vers zéro, multiplication
32 bits, FNV-1a, mulberry32, JSON canonique) : c'est là qu'il faut s'arrêter et corriger.

À la souris, si `--script` fait des siennes : ouvre **ce dossier** comme projet Godot, pose
`det_selftest.gd` sur le nœud racine d'une scène vide, F6.

## Ce que ce dossier contient

| fichier | rôle |
|---|---|
| `det_int.gd` | division entière tronquée vers zéro, multiplication 32 bits, permille, centièmes |
| `det_hash.gd` | FNV-1a 32 bits, sur entier et sur chaîne |
| `det_rng.gd` | mulberry32 et les tirages dérivés (`roll`, `chance`, `pickWeighted`) |
| `det_canonical.gd` | JSON canonique (clés triées) — l'entrée du hachage d'état |
| `det_json.gd` | **lecture JSON qui rend des entiers** — voir ci-dessous, ce n'est pas optionnel |
| `det_selftest.gd` | les 65 contrôles, valeurs attendues produites par `port/gen_primitives.mjs` |
| `run_selftest.gd` | lanceur en ligne de commande (SceneTree) |
| `golden_check.gd` | rejeu des sept vecteurs de référence contre TON moteur porté |
| `project.godot` | projet minimal, uniquement pour que les `class_name` se résolvent |

## `golden_check.gd` : pas maintenant

**Les sept vecteurs de `golden/` sont périmés depuis la tranche V5 T9** (2026-09-19) : `data.json`
a changé et les empreintes avec lui. Le script te le dira lui-même plutôt que de t'accuser à tort.
Ils seront régénérés **une seule fois** (`node port/gen_golden.mjs`), après les tranches restantes
— classes d'armure, craft de biome, quête de classe — pour ne pas refaire ce travail trois fois.

`det_selftest.gd`, lui, ne dépend d'aucune donnée : il reste valable et c'est celui à lancer.

## Le défaut trouvé : `JSON.parse_string` rend des flottants

Mesuré sur **Godot 4.6.stable.official.89cea1439**, pas supposé :

```gdscript
JSON.parse_string('{"n":1000,"m":-7}')   # n et m sont des TYPE_FLOAT, pas TYPE_INT
```

Le moteur JavaScript rend des entiers. En Godot, tout `data.json` arriverait donc en flottants.

Ce n'est pas cosmétique. `DetCanonical.canonical()` ramène déjà un flottant entier (`3.0`) à `"3"`,
donc l'empreinte d'un état fraîchement chargé serait juste — et on pourrait croire que tout va bien.
Mais entre le chargement et le hachage il y a **le jeu** : dès que le moteur calcule
`hp_base + hp_per_day * jour`, deux flottants donnent un flottant, `div()` ne tronque plus de la
même façon, et la discipline entière est perdue sans que rien ne le signale. Pire : les `assert`
de garde sont **retirés en build release** — sur le téléphone, la divergence serait muette.

**`det_json.gd` est la réparation.** `DetJson.parse()` / `DetJson.parse_file()` convertissent tout
flottant de valeur entière en entier, récursivement, **à la lecture**, une fois, avant que le moteur
ne touche à quoi que ce soit. Un vrai fractionnaire (`1.5`) est laissé visible plutôt que tronqué en
douce : il n'a rien à faire dans l'état, et `DetCanonical` le refusera bruyamment.

Le moteur porté doit lire ses données par `DetJson`, jamais par `JSON.parse_string` directement.

## État des fichiers

| | |
|---|---|
| primitives + banc | **exécutés sur Godot 4.6.stable le 2026-09-19 : 65/65, code de sortie 0** |
| `golden_check.gd` | **jamais exécuté** — il lui faut un moteur porté, qui n'existe pas encore |

Le rejeu équivalent en JavaScript (`port/gen_golden.mjs`) passe 7 vecteurs sur 7 et 161 journées
sur 161 contre le moteur d'origine. C'est ce que le portage devra reproduire.
