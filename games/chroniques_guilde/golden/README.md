# Vecteurs de référence — Chroniques de Guilde

> ⚠️ **PÉRIMÉS depuis la tranche V5 T9 (2026-09-19).** `data.json` a changé (six emplacements, douze objets,
> recalibrage des raids, `spec_day_min` 17) et `sim.js` / `tactic.js` avec lui : les sept empreintes de ce
> dossier, `data_fnv` compris, ne correspondent plus au moteur. **Ne pas s'en servir pour valider un portage
> en l'état.** Ils seront régénérés **une seule fois**, quand les tranches restantes (classes d'armure,
> prérequis, craft de biome, quête de classe) auront été passées — c'est l'ordre convenu avec Pierre, pour
> n'avoir à refaire ce travail qu'une fois. `node port/gen_golden.mjs` les reconstruit.

Date : 2026-09-19. Produit par `port/gen_golden.mjs` depuis `sim.js` + `tactic.js` + `data.json` de ce dossier.
Fichier : `vectors.json` (499 Ko, 7 vecteurs, 161 journées, 2 596 actions enregistrées).

---

## À quoi ça sert

Le moteur est **déterministe** : même graine, mêmes actions, même état sur tous les téléphones. C'est ce qui
permet de jouer à plusieurs **sans serveur** — chacun rejoue les actions des autres et doit tomber sur le même
état. Un portage qui diverge d'un seul bit détruit cette propriété, **et il diverge en silence** : la partie a
l'air de marcher, les chroniques se lisent, et deux joueurs voient deux mondes différents.

Ces vecteurs sont le filet. Chacun porte :

* la **graine** et la **table de managers** passées à `newGame` ;
* l'empreinte de l'**état initial** (`hash_initial`) — avant toute journée ;
* pour chaque journée : la **liste complète des actions de tous les managers**, l'**empreinte de l'état après
  résolution** (`hash_after`), et quelques valeurs lisibles (`diag`) pour le diagnostic.

Les actions sont **écrites en entier** dans le fichier. Un portage n'a donc **pas besoin d'avoir porté
`planDefaults` ni l'IA** pour commencer à se vérifier : il lui suffit de savoir rejouer des actions. C'est
volontaire — ça permet de valider la résolution avant l'intelligence artificielle.

---

## Les sept vecteurs

| id | graine | jours | ce qu'il couvre | empreinte finale |
|---|---|---|---|---|
| `court_3j` | 4242 | 3 | le test le plus rapide : `newGame`, paie, récolte, entraînement, forge, soir | `c22a042c` |
| `saison_30j_defaut` | 4242 | 30 | saison complète, 5 managers, plans par défaut (graine du contrat) ; raid gagné, derby, bilan de saison, âge 3 | `ea0b390e` |
| `derby_j7` | 2 | 8 | huit jours jusqu'au premier **Derby** (jour 7) inclus | `c49ff096` |
| `raid_gagne` | 10 | 30 | raid tactique **gagné**, dragon abattu — exerce `tactic.js` et le flux RNG séparé du raid | `8b5d8854` |
| `raid_perdu_ravage` | 8 | 30 | raid **perdu**, village **ravagé** (bâtiment qui perd un niveau), mort + héritier | `71c2b02c` |
| `mort_heritier` | 5 | 30 | **mort** d'un héros, tombe, offre d'**héritier**, recrutement de l'héritier | `0b3d6824` |
| `age_chateau` | 1 | 30 | montée d'âge du village jusqu'au **Château** (âge 4) | `4e55fd3b` |

Le champ `observe` de chaque vecteur dit ce que le générateur a réellement vu passer ; `gen_golden.mjs` refuse
d'écrire un vecteur qui ne contient pas ce qu'il prétend couvrir.

`data_fnv` (= `97a2d68a`) est l'empreinte FNV-1a de `data.json` canonisé. **Vérifie-la en premier** : si elle ne
tombe pas juste, ce n'est pas le moteur qui diverge, ce sont les tables — et comparer des journées n'a plus
aucun sens.

---

## Comment s'en servir

1. Charge `vectors.json` et `data.json`.
2. Vérifie `data_fnv`.
3. Pour chaque vecteur : `new_game(seed, data, options)` ; compare l'empreinte à `hash_initial`.
4. Pour chaque `step`, dans l'ordre : `resolve_day(state, step.actions)`, puis compare `hash_state(state)` à
   `step.hash_after`.
5. **La première journée qui diverge désigne la phase fautive.** Arrête-toi là ; les journées suivantes ne
   t'apprendront plus rien, elles héritent toutes de l'erreur.

Le script `port/godot/golden_check.gd` fait exactement ça côté Godot et imprime la première divergence.
`node port/gen_golden.mjs --check` fait la même chose côté JavaScript, sans rien réécrire.

---

## Procédure de diagnostic, DANS CET ORDRE

Quand une journée diverge, remonte cette liste de haut en bas. Chaque étape est moins probable que la
précédente, et chacune se vérifie plus vite que celle d'après.

**1. `hash_initial` diverge déjà ? Le problème n'est pas dans la résolution.**
C'est `newGame` : génération des fondateurs, du tableau de quêtes, du marché de départ, des bourses. Ou
`data.json` mal lu (voir `data_fnv`). Ou la sérialisation canonique elle-même — lance d'abord
`port/godot/det_selftest.gd` : si les 58 contrôles de primitives ne passent pas, rien d'autre ne peut passer.

**2. `court_3j` diverge au jour 1 ?**
Ce sont les phases du début : validation des actions, paie, créneaux (récolte / entraînement / forge),
infirmerie, soir. Ce sont aussi les seules phases que ce vecteur exerce. Regarde `diag.guild_gold` : s'il est
faux, c'est la paie ou le marché ; s'il est juste, c'est le soir (fatigue, moral, XP).

**3. Compare les valeurs lisibles de `diag` de la journée fautive.**
`guild_gold` faux → paie, marché, taverne, chantier. `heroes_alive` faux → soir (mort), expédition, menace ou
raid. `village_age` faux → prestige ou chantier. `chronicle_title` faux alors que tout le reste est bon → c'est
le CHOIX du gabarit, donc `fnv1a_str` sur du texte français : ton hachage de chaîne compte probablement des
points de code au lieu d'octets UTF-8. Recontrôle `fnv1a_str("Château") == 0xf0c3c2e6`.

**4. La divergence tombe-t-elle sur une journée de raid ?**
Compare `raid_gagne` et `raid_perdu_ravage` avec les autres. Le raid a son **propre flux** de hasard, sérialisé
dans l'état (`raid.rng_s`, `raid.rng_count`). Si `rng_count` diverge mais pas les dégâts, c'est un tirage
consommé au mauvais endroit — pas une formule fausse. Le `count` fait partie de l'empreinte.

**5. La divergence tombe-t-elle au jour 7, 14, 21 ou 28 ?**
C'est le **Derby**, et il simule une expédition complète **sur le flux du jour**. Une erreur dans l'expédition
décale le derby *et tout ce qui suit*. Le vecteur `derby_j7` isole le cas en huit journées.

**6. Tout est juste sauf l'empreinte ?**
Alors c'est la sérialisation, pas les règles. Trois suspects, dans l'ordre :
tri des clés absent ou par locale · un flottant écrit `1.0` là où JavaScript écrit `1` · l'échappement des
chaînes (un `é` écrit `é`). Imprime ton JSON canonique de l'état et compare-le caractère par caractère à
celui du moteur JavaScript (`node -e "console.log(require('./sim.js')._internal.canonical(état))"`).

**7. Ça passe sur ordinateur mais pas sur téléphone ?**
Alors c'est du 32/64 bits ou un flottant : cherche un endroit où le calcul déborde, ou une division qui passe
par un `float`. Les vecteurs doivent passer **sur l'appareil**, pas seulement dans l'éditeur.

---

## Régénérer les vecteurs

```
node port/gen_golden.mjs            # régénère golden/vectors.json et le rejoue aussitôt
node port/gen_golden.mjs --check    # rejoue le fichier existant sans le réécrire
```

Le générateur sort en erreur si un seul hachage ne retombe pas.

**Ne régénère les vecteurs que si le moteur JavaScript a changé pour de bon.** Un vecteur régénéré pour faire
taire un portage récalcitrant ne prouve plus rien du tout.

---

## Preuve d'exécution (2026-09-19)

`node port/gen_golden.mjs` :

```
PASS  court_3j             graine 4242  3 journées   final c22a042c  []
PASS  saison_30j_defaut    graine 4242  30 journées  final ea0b390e  [raid_won, derby, season_report, âge 3]
PASS  derby_j7             graine 2     8 journées   final c49ff096  [derby, âge 1]
PASS  raid_gagne           graine 10    30 journées  final 8b5d8854  [raid_won, derby, season_report, âge 3]
PASS  raid_perdu_ravage    graine 8     30 journées  final 71c2b02c  [raid_lost, ravage, death, heir, derby, season_report, âge 1]
PASS  mort_heritier        graine 5     30 journées  final 0b3d6824  [raid_lost, death, heir, derby, season_report, âge 2]
PASS  age_chateau          graine 1     30 journées  final 4e55fd3b  [raid_won, derby, season_report, âge 4]
---
vecteurs : 7/7   journées vérifiées : 161/161   (100 %)
```

**software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED**
