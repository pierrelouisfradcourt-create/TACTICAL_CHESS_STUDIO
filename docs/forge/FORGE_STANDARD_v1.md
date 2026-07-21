# FORGE STANDARD — Contrat / Repo / WireMap

> **Auteur** : Pierre — note de conception brute, collée en session le 2026-07-21.
> **Statut** : PROPOSED (non ratifié mécaniquement, non réconcilié avec la machinerie
> Forge existante — voir la note de réconciliation en fin de fichier, ajoutée par Claude).
> **Règle** : cette note est la parole de Pierre, jamais réécrite. Toute synthèse ou
> critique vit À CÔTÉ (ce bloc de réconciliation, et docs/forge/CURRICULUM_JEUX_v1.md).

Synthèse de conception — v1

## 0. Principe fondateur
On ne standardise pas les jeux. On standardise l'usine qui les fabrique.
Le levier central : transformer la discipline architecturale d'un vœu pieux
("l'agent doit bien coder") en une propriété **vérifiée mécaniquement**
("l'agent ne PEUT PAS produire une forme invalide, et si la structure est
violée, l'oracle échoue bruyamment").
Ordre de dépendance strict, ne pas inverser :
```
CONTRAT (ce qu'une brique doit contenir)
   ↓
REPO (où ça vit, dérivé du contrat)
   ↓
WIREMAP (le lien tracé entre les deux, vérifié aux deux bouts)
```
Le contrat est la seule chose qui a un sens avant qu'un jeu existe.
Un repo vide n'a pas de forme tant qu'on ne sait pas quels types de
briques il doit contenir.

---

## 1. Le Contrat — oracle de complétude
Tout élément du jeu (personnage, ennemi, boss, objet, compétence,
niveau, système, événement) doit remplir un schéma universel,
identique dans sa forme peu importe le jeu ou son contenu.
Analogie Lego : la forme de la pièce et ses points de connexion sont
fixes ; le contenu (couleur, thème) change librement.
```yaml
entity_contract:
  id:
  category:          # fixé UNE FOIS à la création, jamais réévalué après coup
  schema_version:     # version du schéma lui-même, distinct de la version de l'objet
  identity:
    name:
    tags:
  representation:
    assets:
  behavior:
    components:
  rules:
    interactions:
  validation:
    tests:
```
Un contrat structurellement équivalent existe pour `system_contract`
(inputs/outputs/dependencies/tests) et `level_contract`
(layout/entities/spawn_points/objectives/validation.solvable).

**Oracle Contrat = "cette brique est-elle complète ?"**
Champ manquant ou incohérent → `CONTRACT_FAIL`.
Il ne juge PAS la qualité créative (un boss peut être complet et nul —
c'est un problème de game design, pas de construction).

**Règle de catégorie** : la catégorie (`entity` vs `system`) est déclarée
par celui qui écrit le contrat, à la création, et n'est jamais déduite
après coup selon la complexité de l'objet. Un objet très complexe reste
une entité tant qu'il n'est pas réutilisé par d'autres objets — un vrai
système n'existe que s'il est un service partagé entre plusieurs
entités. Risque résiduel connu et accepté : un objet mal classé (entité
qui aurait dû être système) ne casse rien dans son propre jeu ; le seul
coût est une perte de réutilisabilité, détectée à l'usage (import dans
un autre jeu) plutôt que prévenue à froid.

---

## 2. Le Repo — deux passes
Le repo n'est pas rangé librement, il découle mécaniquement des
contrats — mais en **deux temps**, pas un seul :

**Passe 1 — structure (issue du plan / Prisme)**
Les catégories de dossiers elles-mêmes, fixes et universelles à tous
les jeux :
```
GAME_PROJECT/
├── 00_CHARTER/
├── 01_DESIGN/
├── 02_ENTITIES/
├── 03_WORLD/
├── 04_ASSETS/
├── 05_SYSTEMS/
├── 06_RUNTIME/adapters/     ← ex. adaptateur Godot
├── 07_TESTS/oracle/
├── 08_TELEMETRY/
├── 09_WIREMAP/
└── 10_FORGE/validators/
```

**Passe 2 — meublage (issue de chaque contrat d'objet validé)**
Le contenu réel des dossiers : chaque contrat validé par l'oracle de
meublage détermine son propre fichier et son propre emplacement, via
un mapping fixe `category → dossier` (ex. `entity_contract.category:
boss` → `02_ENTITIES/bosses/`). Ce mapping est une donnée figée du
standard, jamais une décision laissée au builder au moment de
l'écriture — sinon le point de freestyle se déplace simplement de
"quel système" à "où je pose le fichier".

---

## 3. La WireMap — deux passes, deux fréquences de gel

**Passe 1 — WireMap structurelle** (issue du Prisme, gelée à s5)
Trace les systèmes/features entre eux. Granularité = système/feature.
Gel dur : casser ça = rouvrir le plan (décision HumanGate).
```yaml
wiremap_structural:
  schema_version: 1
  systems: [{id: combat_system, allowed_deps: [...], owner_module: 05_SYSTEMS/combat/}]
  features: [{id: boss_phases, required_by: [combat_system]}]
```

**Passe 2 — WireMap de meublage** (issue de chaque contrat d'objet,
gelée objet par objet, au fil de l'eau)
Trace chaque brique individuelle vers sa place. Granularité = objet.
Gel local : ajouter un objet n'exige pas de rouvrir le plan.
```yaml
wiremap_furnishing:
  DragonBoss:
    contract: 02_ENTITIES/bosses/dragon_boss.contract.yaml
    system_parent: combat_system   # DOIT exister dans wiremap_structural
    code: [...]
    assets: [...]
    tests: [...]
```

**Le lien entre les deux passes est vérifiable mécaniquement** :
`system_parent` (passe 2) doit pointer vers une entrée réelle de la
passe 1, sinon `FAIL`. C'est ce qui empêche un meuble d'exister dans
une pièce qui n'a jamais été posée dans le plan.

---

## 4. Le Prisme — rétro-ingénierie du plan, pas du meublage
Le Prisme n'imagine pas des personnages ou une histoire. Il reconstruit
la structure mécanique attendue d'un genre de jeu — le plan de la
maison, pas le mobilier.
5 rôles (CEO / Game Designer / Dev Front / Dev Back / Joueur) font
chacun une rétro-ingénierie **complète et indépendante** de jeux de
référence du genre visé — pas une contribution partielle à un objet
commun. Chacun sort une liste de features mécaniques attendues :
```yaml
feature:
  id:
  category:        # combat / progression / économie / ui / meta...
  source_role:      # ceo / gd / front / back / joueur
  justification:    # pourquoi ce jeu de référence l'exige
  criticality:       # core / expected / optional
```
**s5 fusionne par convergence, pas par interprétation de texte libre** :
une feature citée par 4-5 rôles = signal fort, entrée quasi automatique
dans le featuremap gelé. Une feature citée par 1 seul rôle = flag de
conflit, arbitrage humain ou red-team (s6) avant intégration.
Ce featuremap gelé alimente ensuite la WireMap structurelle (§3, passe 1).
Le game design, level design, et la création de personnages/histoire
viennent APRÈS, et remplissent les contrats individuels (§1/§3 passe 2)
à l'intérieur des pièces déjà posées par le plan — libres en contenu,
contraints en structure.

---

## 5. Oracles — table de synthèse
| Oracle | Question | Granularité | Fréquence | Casse quoi si violé |
|---|---|---|---|---|
| Contrat | La brique est-elle complète ? | objet | à chaque création | cette brique |
| WireMap structurelle | Le plan est-il respecté (deps réelles vs interdites, carte↔code) ? | système/feature | rare | tout le run — HumanGate |
| WireMap meublage | L'objet est-il branché au bon endroit, au bon parent système ? | objet | à chaque création | cet objet |

---

## 6. Bibliothèque de briques portables
Condition pour qu'une brique soit un vrai composant Lego réutilisable
(pas juste un dossier rangé) : elle doit transporter avec elle son
contrat ET ses dépendances déclarées.
```
DragonBoss/
├── entity_contract.yaml
├── stats.yaml
├── behavior/
├── abilities/
├── assets_refs/
├── balance_profile.yaml
└── tests/
```
Import dans un nouveau jeu = vérification automatique : contrats
compatibles, systèmes nécessaires présents, assets présents, tests
passent. Dépendance manquante (ex. `fire_spell_system` absent du jeu
cible) → `Adapter ou refuser`, jamais d'import silencieux.

---

## 7. Empilement de compétences (concept, générique — pas lié à un jeu précis)
```
Nouveau jeu = compétence(s) déjà acquise(s) + 1 compétence pour combler le delta
```
Chaque jeu produit n'est pas qu'un livrable : c'est une leçon qui fait
grandir la taille/l'efficacité/la rigueur des oracles du standard
lui-même. Le standard n'est donc pas figé une fois pour toutes — il est
versionné et amendable, avec un historique du pourquoi de chaque
révision (ledger d'amélioration).

---

## 8. Hors scope pour cette synthèse
- IA joueuse / bot testeur : piste identifiée (candidats évalués :
  Godot RL Agents pour l'intégration native au moteur ; OpenSpiel/SIMPLE
  pour du self-play générique multi-jeux) mais dépend structurellement
  d'une interface d'action standardisée dans les contrats de
  système/niveau, qui n'existe pas encore. Reste en `cible` tant que le
  présent standard n'est pas stabilisé sur au moins un jeu réel.
- Recherche de bot déjà éprouvé par type de jeu : à faire séparément
  via world-scan.

---

## 9. Ce que ce document doit permettre
Fixer ce standard par écrit une fois évite l'explosion de contexte à
chaque session de build : une session future n'a besoin de charger que
la tranche scopée à l'étape en cours (le contrat de l'objet, le
morceau de wiremap concerné) — pas de redécouvrir cette philosophie à
chaque fois.

---
---

# NOTE DE RÉCONCILIATION (Claude, 2026-07-21) — à lire avant de bâtir

> Ce bloc n'est PAS de Pierre. C'est une synthèse critique ajoutée à côté, comme le
> veut la règle mémoire. Il ne modifie pas un mot de la note ci-dessus.

**Le standard n'atterrit pas sur un terrain vide.** La machinerie Forge existante recouvre
déjà partiellement ce que décrit ce document. Bâtir comme si c'était un greenfield
recréerait deux systèmes de contrats en parallèle — précisément l'anti-pattern « couches
qui s'empilent sans lecteur » que le studio combat (cf. mémoire `knowledge_resolver_direction`,
règle anti-couches ; et le mode de panne `declared_vs_executed`).

Ce qui EXISTE déjà et qu'il faut réconcilier, pas réinventer :

| Concept du STANDARD | Ce qui existe déjà dans le repo |
|---|---|
| Contrat (§1) | `scripts/forge/contracts/` — mais ce sont des **contrats d'AGENT** (s0-s12, SCHEMA.md 17 champs), PAS des contrats d'entity/system/level. Le standard introduit une famille NOUVELLE et distincte. À poser comme telle, sans confusion de nom. |
| WireMap structurelle (§3 passe 1) | `scripts/forge/static_oracles.py::check_wiremap` + `check_architecture` (deps interdites, isomorphisme carte↔code) + contrats `s5-wiremap.yaml`. L'oracle EXISTE. À étendre, pas réécrire. |
| Prisme (§4) | `scripts/forge/prisme/` + contrat `s1-prisme.yaml`. Existe. |
| Oracle Contrat de complétude (§1) | Le validateur `knowledge_base/kb-validate.mjs` fait ça pour les briques KB (schéma fermé, champ manquant = rejet). Modèle réutilisable pour les entity/system contracts. |
| Briques portables (§6) | `knowledge_base/` + `catalog.json` : déjà briques + contrat + tests + preuve d'usage + tier. Le standard formalise le format de dossier ; le mécanisme de vérification-à-l'import existe (R13/R14). |
| Repo 2 passes (§2) | NOUVEAU. La structure `00_CHARTER/…10_FORGE/` n'existe pas. Vrai apport. |
| WireMap meublage (§3 passe 2) | NOUVEAU. Le `system_parent` vérifié objet-par-objet n'existe pas. Vrai apport. |

**Première tâche recommandée pour la nouvelle session** : décider explicitement si ce
standard est (a) un REMPLACEMENT de la machinerie s0-s12, (b) une ÉVOLUTION qui l'absorbe,
ou (c) une COUCHE PARALLÈLE dédiée au contenu de jeu (entity/system/level) là où s0-s12
reste dédié à l'orchestration d'agents. L'option (c) est la plus probable et la plus
saine — les deux familles de contrats répondent à deux questions différentes (« comment
piloter un agent » vs « qu'est-ce qu'une brique de jeu complète ») — mais ça doit être
tranché PAR ÉCRIT avant d'écrire une ligne, sinon deux vocabulaires « contrat » cohabitent
sans frontière.

**Point d'ancrage déjà en place** : le §2 prévoit `06_RUNTIME/adapters/` (ex. Godot). C'est
exactement le rôle de `knowledge_base/systems/adapters/godot_trial.mjs` livré à l'étape 0.
Le standard et le travail Godot de l'étape 0 convergent naturellement là-dessus.
