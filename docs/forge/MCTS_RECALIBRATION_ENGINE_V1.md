# MCTS Recalibration Engine — définition canonique

**Statut** : doctrine énoncée par Pierre, 2026-08-05.
**Portée** : lane FORGE. Fixe le sens du terme « MCTS » dans ce studio.
**claim_posture** : NO_CLAIM_ALLOWED

---

## Pourquoi ce document existe

Le terme « MCTS calibration » était **ambigu** et a produit une confusion réelle,
tracée le 2026-08-05 : une question portant sur « les runs MCTS de calibration
d'hier » supposait une campagne d'allocation de modèles par étape, alors que
`scripts/forge/mcts_selector.mjs` sélectionne des **mutations de la Forge** et
déclare lui-même n'explorer aucun arbre.

La formulation correcte est **MCTS Recalibration Engine**.

## Définition

> Recherche arborescente de **trajectoires de transformation** permettant
> d'améliorer la Forge tout en conservant la **victoire observable**, à coût minimal.

Ce n'est pas : un réglage initial · une optimisation ponctuelle de modèle · une
recherche de prompt. C'est un moteur de recherche du chemin entre deux états de
la Forge.

## Ce qu'est la victoire

La victoire n'est **pas** « Qwen remplace Opus ». Le remplacement de modèle n'est
qu'une transformation possible parmi d'autres. La victoire est :

```
qualité observable conservée
+ preuves conservées
+ invariants respectés
+ coût réduit
```

## Espace de recherche : la CONFIGURATION, pas le modèle

Une configuration comprend : modèle · température · prompt · contrat agentique ·
skill · mémoire disponible · outils · boucle de correction · niveau de contrôle.

> Un petit modèle correctement configuré peut battre un gros modèle mal positionné.

Question incorrecte : « quel modèle est le plus intelligent ? »
Question correcte : « quelle distribution des capacités produit la meilleure
sortie au meilleur coût ? »

## L'erreur de raisonnement à éviter

Mauvaise conclusion : *Opus a réussi, donc Opus doit rester.*

Bonne analyse : Opus a produit une **référence**. Quels éléments de cette réussite
viennent réellement du **modèle**, et lesquels viennent du prompt, du skill, du
contexte, du contrat, des oracles, de la mémoire ? Le moteur cherche à **isoler
ces variables**.

## Le moteur travaille ENTRE les runs

```
RUN → observation → mesure des écarts → arbre des transformations
    → simulation des branches → choix de mutation → nouvelle version Forge → RUN suivant
```

Un **retour humain est une observation** comme une autre : « le jeu manque
d'identité » devient « écart entre produit actuel et produit attendu », puis
« quelles transformations réduisent cet écart ? ». La réponse n'est pas
« ajouter des sprites » — c'est explorer : assets seuls · Art Bible · couche
identité · modifier le World Scan · modifier le pipeline produit.

## Agent ≠ MCTS

Un **agent** est une configuration d'un LLM.
Le **MCTS** décide comment modifier les configurations. Il travaille au niveau
architecture et peut décider de : changer un agent · créer un skill · changer un
contrat · modifier le workflow · **renforcer un oracle**.

## Cible

Ni une Forge pilotée par Opus, ni une Forge pilotée par Qwen :

> une Forge qui sait placer chaque capacité au meilleur endroit.

---

# CONFRONTATION AU MESURÉ — état au 2026-08-05

Cette section n'énonce pas la doctrine, elle la confronte aux faits du jour.
Elle est **datée et falsifiable**, la doctrine ci-dessus ne l'est pas.

## 1. Le moteur n'existe pas encore, et son absence est documentée

`mcts_selector.mjs` compose `candidate_selector` + `execution_binding` et rend les
candidats exécutables. Il **n'explore aucun arbre** — mesuré : branching factor
= 1 sur les 4 problèmes racines (re-mesuré 3/1/1/1 le 2026-08-05, inchangé après
production réelle d'un jeu). Ce n'est pas un défaut caché : le fichier le déclare.

## 2. Le préalable bloquant : les oracles ne discriminent pas

Pilote exécuté sur le bloc `s3-decompo` (2026-08-05), entrée gelée, référence
Opus, **même oracle** que la référence :

| Config | tokens sortie | temps | oracle | capacités | `kind` distincts |
|---|---|---|---|---|---|
| Opus (référence) | ~191 000 | ~9 min | exit 0 | **55** | **5** |
| Qwen brut | 1 942 | 27 s | **exit 0** | 22 | **1** |
| Qwen + checklist | 1 774 | 22 s | **exit 0** | 22 | **1** |
| Qwen + checklist + exemple | 3 623 | 46 s | **exit 0** | 24 | **1** |

Les trois configurations Qwen **passent l'oracle** à ~60× moins cher, et **aucune
n'est équivalente** : elles déclarent `expected_proof.kind = "oracle"` sur 100 %
des capacités. Or le `kind` désigne le **capteur** — tout router vers `oracle`
signifie qu'aucune capacité `visual`, `mutation`, `bot_action` ni `file_write`
n'atteindra jamais son capteur.

`check_decompo` vérifie que `kind` **appartient à l'énumération**, jamais qu'il
est **approprié**. Sur cet axe il est aveugle.

**Conséquence pour le moteur** : un critère `Score_Qwen >= Score_Opus × seuil`
calculé sur les oracles actuels déclencherait un remplacement injustifié. La
victoire telle que définie plus haut — « qualité observable conservée » — n'est
pas observable aujourd'hui sur l'axe qui décide.

Illustration exacte de la loi du déplacement déjà ratifiée (2026-08-04) :
*durcir un axe pousse le défaut sur un axe non mesuré*. L'oracle mesure couverture
et non-invention ; Qwen a maximisé ces deux axes et effondré tout le reste.

## 3. Ce que le pilote a isolé — une variable, proprement

L'ajout d'un **exemple d'artefact** fait passer la longueur moyenne d'une capacité
de 60 à 188 caractères (référence Opus : 210). La **forme se transfère par
l'exemple**. La diversité de `kind` reste à 1 dans les trois configs : la
**sémantique ne se transfère pas**. C'est le type d'isolement de variable que la
doctrine demande, obtenu pour ~8 000 tokens locaux et 95 secondes.

## 4. Ordre de travail qui en découle

Avant toute campagne de substitution, **chaque oracle doit passer son test de
discriminance** : rejette-t-il un artefact volontairement dégradé ? Le mécanisme
existe déjà (`Q1-DISCRIMINANCE`, `M-Q4-ANCRAGE` — `false_positive` /
`true_positive` sur `sample_size: 5`) et n'a jamais été appliqué à `check_decompo`.
Les trois sorties Qwen du pilote sont des cas de test dégradés **déjà disponibles**.

Corollaire conforme à la doctrine : « renforcer un oracle » est une transformation
que le moteur a le droit de choisir. Ici, c'est la **première** qu'il devrait choisir.

## 5. Limite honnête sur le bloc le plus cher

`s9-build` pèse 40 % des tokens et est déclaré **non mesurable** par le protocole
de substitution (« un build Godot par configuration coûterait des dizaines
d'heures », calibration 2026-08-04). Le moteur ne pourra pas arbitrer ce bloc par
la même méthode. Aucune conclusion ne doit être extrapolée depuis les blocs amont.

---

# EXTENSION — escalade contrôlée et PRE-RUN (Pierre, 2026-08-05)

## La fausse victoire

Un MCTS n'est intelligent que si son évaluation est fiable. Un mauvais oracle crée
une **fausse victoire** : le worker produit moins de capacités, des preuves mal
routées, une sémantique perdue — et l'oracle ne regarde que la validité du JSON.

> Avant de remplacer Opus, la Forge doit vérifier : *mon système de mesure
> distingue-t-il un artefact excellent d'un artefact dégradé ?*
> Si non, la première mutation n'est pas de changer le modèle. C'est de
> **renforcer l'oracle**.

Ceci n'est plus une hypothèse : c'est ce que le pilote `s3-decompo` a mesuré
(section « Confrontation », §2). La doctrine et la mesure coïncident.

## L'escalade est une capacité du moteur, pas une règle fixe

Mauvaise doctrine : « toujours Opus pour les étapes importantes ».
Mauvaise doctrine symétrique : « toujours remplacer Opus par Qwen ».
Bonne doctrine : **tester, mesurer, escalader uniquement si nécessaire.**

```
Bloc SX
   Qwen → validation ?
     oui → garder
     non → + skill → validation ?
              oui → garder
              non → + critique Opus → validation ?
                       oui → hybride
                       non → Opus obligatoire
```

Question permanente, à chaque étape :
**« quelle est la configuration la moins chère qui gagne encore ? »**
Si aucune configuration moins chère ne gagne, l'escalade est justifiée. Sinon, la
capacité coûteuse doit être retirée.

## Règle du PRE-RUN — un worker ne reçoit jamais directement une tâche massive

Avant production massive, le worker produit un **PRE-RUN REPORT** :

```
Compréhension mission :
Risques détectés :
Découpage proposé :
Dépendances :
Questions bloquantes :
Estimation coût :
Plan d'exécution :
```

Boucle : `worker → pré-run → architecte/orchestrateur → validation du découpage →
production massive`. Évite : spaghetti code · mauvais découpage · mauvaise
allocation des modèles · gaspillage de tokens.

### Coût mesuré de l'absence de pré-run — session du 2026-08-05

| Cas | Coût | Ce qu'un pré-run aurait exposé |
|---|---|---|
| `s4-archi` V2 | 205 896 + **232 019 de reprise** = 437 915 tokens ; **53 % du coût de l'étape est du refait** | « je crée une racine `04_CONTENT/` » — une ligne. La racine n'existe pas dans `repo_map.yaml`, qui portait déjà la catégorie `level` → `03_WORLD/levels/{id}/`. |
| `s9-build` V1 | 510 245 tokens, 100 min | bot de solvabilité en **boucle ouverte** et protocole de sortie en code non nul — deux décisions de conception corrigées **en vol**, après le lancement. |

Dans les deux cas, la décision fautive était énonçable en quelques centaines de
tokens et n'a été détectée qu'après une production massive.

**Note d'honnêteté sur le second cas** : la correction n'a été possible que parce
que le red-team tournait en parallèle du build — un choix de séquencement de
l'orchestrateur, pas un mécanisme. Sans lui, les deux défauts seraient allés
jusqu'à l'oracle.

## Critère final

Une Forge mature n'est pas « un gros modèle qui fait tout », c'est **une
organisation où chaque capacité reçoit le niveau d'intelligence nécessaire** :
l'expert intervient là où son expertise change le résultat, les tâches répétitives
sont déléguées, les contrôles empêchent les erreurs, l'organisation amplifie les
individus.

---

## Provenance

Doctrine : énoncée par Pierre, 2026-08-05, session « Production Pac-Man / Forge V2 ».
Confrontation : mesures de l'orchestrateur, même session, commandes reproductibles
citées dans le corps. Aucun humain n'a relu les artefacts Qwen du pilote — seuls
leurs reçus d'oracle et leurs compteurs structurels sont rapportés.
