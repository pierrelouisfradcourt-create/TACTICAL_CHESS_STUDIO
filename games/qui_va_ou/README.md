# Qui va où — portage Godot

- **Date** : 2026-09-19 · **Statut** : PROPOSED, jamais exécuté en Godot · `claim_verdict: NO_CLAIM_ALLOWED`
- **Source** : sonde artifact « Qui va où » V8 (https://claude.ai/artifact/5CLho8Pgf7DAst2NejAi4E)
  + direction Pierre 2026-09-19 sur la spécialisation des chats.

Un chaton est prisonnier dans chaque tableau, **visible dès la première image**. Des chats
spécialisés arrivent pour le sortir de là : chacun ne sait faire qu'une seule chose, et la forme
de l'obstacle annonce lequel il faut. Voir `DESIGN_CHATS.md`.

## À lire en premier : ce qui est prouvé et ce qui ne l'est pas

| Élément | État | Preuve |
|---|---|---|
| Les 5 niveaux (données) | **VÉRIFIÉ mécaniquement** | `valider_niveaux.py` passe, et refuse bien des niveaux volontairement cassés (mutation testée le 2026-09-19) |
| L'oracle lui-même | **VÉRIFIÉ** | injection de 2 défauts → 4 erreurs détectées, exit 1, puis restauration |
| Tout le GDScript (`core/`, `ui/`, `tests/`) | **JAMAIS EXÉCUTÉ** | Godot est absent de l'environnement où ce code a été écrit |

Le GDScript est écrit avec soin et typé, mais **attends-toi à des erreurs de compilation au
premier lancement**. Il n'a jamais vu un moteur Godot. C'est la raison d'être des tests headless
ci-dessous : lance-les en premier, ils te diront où ça casse sans que tu aies à cliquer.

## Les trois commandes

```bash
# 1. L'oracle des niveaux (Python, sans dépendance) — doit afficher « software_verdict: OK »
python games/qui_va_ou/outils/valider_niveaux.py

# 2. Les tests du moteur de règles, sans rendu — attendu : « TOUT VERT » et code de sortie 0
godot --headless --path games/qui_va_ou --script res://tests/run_tests.gd

# 3. Le jeu (présentation placeholder : des formes, pas d'art)
godot --path games/qui_va_ou
```

Dans le jeu : **clic** = prendre / poser · **1-9** = aller à un tableau · **R** = rejouer ·
**Échap** = lâcher.

## Ce qui est là, et pourquoi c'est structuré comme ça

```
data/chats.json          le roster : 7 chats, 7 verbes, une silhouette par verbe
data/niveaux.json        l'ORDRE des niveaux (pas un parcours de dossier : peu fiable en .pck)
data/niveaux/*.json      5 tableaux — 3 portés de la sonde, 2 neufs (grange, cave)
outils/valider_niveaux.py  l'oracle : soluble ? zones qui se recouvrent ? blocage muet ?
core/moteur.gd           les RÈGLES, pures : aucun noeud, aucune scène, testable en headless
core/donnees.gd          chargement JSON
ui/jeu.gd + jeu.tscn     présentation placeholder, lit l'état du moteur, ne le calcule jamais
tests/run_tests.gd       rejoue chaque niveau dans TOUS les ordres de préparation possibles
```

**Le point important du portage** : aucun niveau n'est écrit en code. C'était le blocage n°1
identifié au bilan — à la main, chaque tableau coûtait des heures de placement de coordonnées, ce
qui rendait 60 tableaux impossibles. Maintenant un tableau est un fichier JSON que l'oracle
valide avant même qu'il soit dessiné.

## Pièges connus (vérifiés dans la doc, pas sur machine)

- **Export Android** : les `.json` de `data/` ne partiront pas dans le `.pck` tant que tu n'as pas
  ajouté `*.json` dans *Project → Export → Resources → Filters to export non-resource files*.
  C'est le piège classique, et il ne se voit qu'à l'export, jamais dans l'éditeur.
- `project.godot` déclare la version **4.6** (comme `chess_tcg`). Avec une autre 4.x, l'éditeur
  proposera une conversion — sans danger ici, il n'y a ni scène complexe ni ressource custom.
- Le rendu est en `gl_compatibility` (choix mobile). À rebasculer si tu veux des effets 2D avancés.
- Les tests utilisent `preload()` et **pas** les `class_name` globaux, exprès : ils marchent donc
  même sur un clone frais où l'éditeur n'a jamais tourné.

## L'ordre dans lequel je reprendrais

1. Lancer les deux commandes de test, corriger ce qui ne compile pas.
2. Jouer les 5 tableaux en placeholder — vérifier que les règles sont justes, **avant tout art**.
3. Écrire 5 tableaux de plus en JSON (c'est du design, pas du code) et les passer à l'oracle.
4. **Seulement ensuite** : décider du texte vs voix off (cf. `DESIGN_CHATS.md`, point 1 du
   HumanGate), parce que ça conditionne toute la production suivante.

L'art, l'audio et le store viennent après — ils sont chers et prématurés tant que le design du
puzzle n'a pas tenu sur 10 tableaux et devant des enfants.
