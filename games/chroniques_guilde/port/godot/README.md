# Contrôles de portage — Godot 4

Date : 2026-09-19. Ce dossier est un **banc**, pas un jeu : aucune scène, aucun contenu.
Il n'existe que pour répondre à une question, avant d'écrire la moindre règle dans Godot :

> **les primitives entières se comportent-elles exactement comme en JavaScript ?**

Si la réponse est non, le portage diverge, et il diverge **en silence** : la partie a l'air de
marcher, les chroniques se lisent, et deux joueurs voient deux mondes différents. C'est le seul
défaut qui détruit le multijoueur sans serveur sans jamais lever d'erreur.

---

## Le contrôle qui compte, en une commande

```bash
cd games/chroniques_guilde/port/godot
godot --headless --script run_selftest.gd
```

Sortie attendue : **`58/58 — PRIMITIVES CONFORMES`**, code de sortie 0.
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
| `det_selftest.gd` | les 58 contrôles, valeurs attendues produites par `port/gen_primitives.mjs` |
| `run_selftest.gd` | lanceur en ligne de commande (SceneTree) |
| `golden_check.gd` | rejeu des sept vecteurs de référence contre TON moteur porté |
| `project.godot` | projet minimal, uniquement pour que les `class_name` se résolvent |

## `golden_check.gd` : pas maintenant

**Les sept vecteurs de `golden/` sont périmés depuis la tranche V5 T9** (2026-09-19) : `data.json`
a changé et les empreintes avec lui. Le script te le dira lui-même plutôt que de t'accuser à tort.
Ils seront régénérés **une seule fois** (`node port/gen_golden.mjs`), après les tranches restantes
— classes d'armure, craft de biome, quête de classe — pour ne pas refaire ce travail trois fois.

`det_selftest.gd`, lui, ne dépend d'aucune donnée : il reste valable et c'est celui à lancer.

## Avertissement honnête

**Aucun de ces fichiers GDScript n'a jamais été exécuté.** Ils ont été écrits sans Godot sur la
machine d'écriture. Le même rejeu, écrit en JavaScript (`port/gen_golden.mjs`), passe 7 vecteurs
sur 7 et 161 journées sur 161 contre le moteur d'origine — mais ça ne dit rien de GDScript.
C'est exactement ce que la commande ci-dessus va trancher, et c'est la raison d'être de ce dossier.
