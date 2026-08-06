# Lignées causales — ANNEXE DE MESURE

> ⚠ **Ce document n'est PAS la doctrine.** La doctrine canonique est
> **`docs/forge/FORGE_CAUSAL_LINEAGE_V2.md`** (Pierre, 2026-08-06), qui définit les
> **quatre** lignées : Intent · Activation · **Return** · Persistence.
>
> Ce document-ci est son **annexe de mesure** : il porte les chiffres relevés sur la
> session `pacman` V1/V2, la localisation des fils manquants, et le câblage minimal
> chiffré. Séparation voulue — doctrine permanente d'un côté, chantier mesuré de l'autre.
> Ne pas les fusionner.
>
> **Ce que l'annexe avait manqué, et que la doctrine corrige** : (a) le **Return Lineage**
> est une lignée à part entière, pas un sous-point de la boucle — c'est en la traitant
> comme telle qu'on obtient la mesure `final_report` : 0/21 ; (b) les quatre lignées sont
> **séquentielles**, pas parallèles — Persistence est ce qui reste quand la séquence est
> terminée ; (c) la **clause de terminaison** — sans elle, « aucun agent ne meurt seul »
> dégénère en remontée infinie.

**Statut** : PROPOSED — mesures du 2026-08-06, non implémentées.
**Méthode** : mesures sur le dépôt, commandes reproductibles. Aucune supposition.
**claim_posture** : NO_CLAIM_ALLOWED

---

## 0. Révision du cas fondateur — il ne dit pas ce qu'on croyait

Le cas `04_CONTENT` a été présenté comme « le WHY ancestral ne s'est pas transmis ».
**Mesure : c'est faux.** Le charter que s4 a lu portait bien l'interdiction :

```
hors_scope[4]          « nouvelle couche à l'architecture de LA FORGE
                         (nouvel étage entre sélection, binding, fabrique et preuve) »
actions_interdites[14] « … nouveau registre, nouvelle couche, nouveau contrat … »
```

Mais le mot **« couche » y désigne un étage de la Forge**, pas une racine du dépôt du
jeu. Et le même charter **délègue explicitement** la structure à s4 :

```
hors_scope[13]  « découpage exact des modules, format de la carte … :
                  c'est l'étape s4-archi, pas ce charter »
```

Sur la lettre, s4 était fondé à se croire autorisé. **La contrainte réellement violée —
`repo_map.yaml` est une table figée à 11 racines — n'était dans aucun charter.**

**Conséquence pour la conception : un champ WHY hérité n'aurait rien empêché**, parce que
le WHY présent portait sur un autre référent. Ce qui manquait n'était pas une intention,
c'était une **table**.

## 0bis. L'anomalie exacte, localisée

| Étape | Rôle vis-à-vis des adresses | `repo_map.yaml` dans `mandatory_read` |
|---|---|---|
| `s4-archi` | **décide** | **NON** |
| `s5-wiremap` | **pose** | **NON** |
| `s9-build-godot-standard` | applique | **OUI** |

L'étape qui décide ne reçoit pas la table qui contraint sa décision ; celle qui applique
la reçoit. Et l'oracle qui juge les adresses (`check_placement`) tourne **à s5, deux
étapes après la décision**. Coût mesuré de cet écart : **232 019 tokens** de reprise.

---

## 1. Flux complet — il existe déjà, il est signé, il a des lecteurs

```
contract.mandatory_read              (déclaration : ce que l'étape DOIT avoir)
        ↓  prepare_dispatch
manifest.sources[{path, role, sha256, exists}]   (enregistrement + empreinte)
        ↓  HMAC
verify_run.py            → authenticité
context_check.mjs        → fraîcheur (REQUIRES_REFRESH / STALE / FRESH) — ADVISORY, exit toujours 0
learning_hook.py · learning_memory.py · reasoning_observability.py · driver.py · run_real.py
```

**Ce n'est pas un artefact sans lecteur** : six consommateurs. Les rôles de source sont
déjà typés, et `context_check` traite `upstream` et `contract` comme **critiques**.

Le champ `reason` du même manifest est le WHY d'activation. Mesure sur ce run :
**9 lignes `kind: dispatch`, 9 `reason` vides, 0 remplie.** Le seul appelant de production
(`forge.driver`) passe `"ordre de profil"` — une tautologie, pas une intention.

## 2. Schéma de données minimal — deux natures, à ne pas confondre

Le point de conception le plus important : **contraintes et intentions ne se vérifient pas
de la même façon.**

| | CONTRAINTE | INTENTION |
|---|---|---|
| Exemple | `repo_map` a 11 racines figées | « permettre une évolution data-driven sans casser les invariants » |
| Porteur | fichier du dépôt | texte humain |
| Transmission | `mandatory_read` → `sources` | `reason` |
| Vérifiable ? | **OUI — par `sha256`** | **NON — seulement attribuable** |
| Garde-fou | empreinte + oracle | provenance (qui l'a écrite) |

Champs, en réutilisant l'existant :

```jsonc
// manifest kind:dispatch — champs DÉJÀ présents
"sources": [ {"path": "...", "role": "contract|mandatory_read|upstream", 
              "sha256": "...", "exists": true} ],   // CONTRAINTES, empreintées
"reason": "",                                        // WHY d'activation — aujourd'hui vide

// AJOUT MINIMAL proposé sur `reason` : passer de chaîne à objet
"reason": {
  "herite":  [ {"niveau": "human|orchestrator|architect",
                "texte": "...", "auteur": "...", "ts": "...", 
                "source_ref": "charter_v2.yaml#hors_scope[4]"} ],  // JAMAIS écrit par l'enfant
  "local":   "pourquoi CETTE étape démarre maintenant"             // seul champ de l'enfant
}
```

**Champs interdits** : aucun champ où l'enfant puisse écrire dans `herite`. Le parent
compose `herite = parent.herite + [parent.local]` et le transmet ; l'enfant ne remplit
que `local`.

## 3. Garde-fous

| Risque | Garde | Existe déjà ? |
|---|---|---|
| **Perte de la contrainte** | la déclarer en `mandatory_read` → `sources` porte son `sha256` | **oui**, canal existant |
| **Contrainte périmée** | `context_check` rend `REQUIRES_REFRESH` si une source `contract`/`upstream` a changé | **oui**, mais ADVISORY |
| **Modification par l'enfant** | `herite` composé par le parent, jamais réécrit ; le manifest est **HMAC-signé** | signature oui, séparation non |
| **WHY inventé** | l'enfant n'a accès qu'à `local` ; `herite` porte `auteur` + `source_ref` | **non** |
| **Justification vide** | `reason` non vide exigé à la porte | **non** (`""` passe) |
| **Justification décorative** | un lecteur qui en FAIT quelque chose | partiellement |

**Le risque grave est « WHY inventé »**, et il a un précédent ratifié : le
`validated_by: "Pierre"` fabriqué du 2026-08-03, où une autorisation inventée est devenue
un fait persistant pour toutes les sessions suivantes. D'où la règle : **le WHY est
hérité, jamais rédigé par l'enfant.**

## 4. Métriques — mesurer les violations, pas la qualité

Le mode de panne n'est pas « le texte est moins bon », c'est « une frontière invisible a
été franchie ». Sur `s4`, les deux blueprints (avec et sans `04_CONTENT`) passaient le
**même oracle vert** : un score de qualité n'aurait rien vu.

| Métrique | Instrument | État |
|---|---|---|
| Décisions hors table figée | `check_prerun.py` | **existe** (écrit 2026-08-06, prouvé sur le cas réel) |
| Contraintes héritées non déclarées | `sources` vs tables figées du profil | à écrire, trivial |
| WHY non consommés | `reason` vides / total | **mesurable aujourd'hui : 9/9** |
| Distance WHY racine → action | profondeur de `herite` à l'étape terminale | après le §2 |

## 5. Relation avec le MCTS Recalibration Engine

La mutation à proposer n'est pas « ajouter une couche WHY ». C'est, dans l'ordre de coût
croissant :

1. **Déclarer `repo_map.yaml` en `mandatory_read` de `s4-archi` et `s5-wiremap`.**
   Deux fichiers de données. Le canal, l'empreinte, la signature et les lecteurs existent
   déjà. Effet vérifiable : `sources` porterait la table avec son `sha256`, donc **preuve
   que l'architecte l'avait**.
2. **Brancher `check_prerun.py` avant la production coûteuse** — il est écrit et prouvé.
3. **Promouvoir `context_check` de advisory à gate** sur le seul cas `REQUIRES_REFRESH`
   (source `contract`/`upstream` modifiée). Changement de politique, pas de code.
4. **Typer `reason`** (§2) — le seul ajout de schéma, et le dernier par utilité.

Boucle conforme à la doctrine : `erreur → cause racine → NIVEAU responsable → mutation
ciblée → expérience → leçon`. Ici le niveau responsable n'est pas l'agent s4 : c'est la
**déclaration de son contrat**.

## 6. Critère de réussite appliqué au cas réel

> 1. Pourquoi cette action existe ? 2. Quelle intention parent la protège ?
> 3. Quelle preuve montre qu'elle la respecte ?

Pour s4 le 2026-08-05 : (1) oui — créer la couche contenu. (2) **non** — la contrainte
`repo_map` n'était pas dans son contexte. (3) **non** — aucun oracle avant s5.
**Chaîne cassée sur 2 des 3 questions**, et le point 1 seul ne l'a pas empêchée de
produire un vert.

Avec le câblage 1+2 ci-dessus, les trois deviennent répondables **sans nouvelle couche**.

---

# CORRECTION DE MODÈLE — deux chaînes, pas une (Pierre, 2026-08-06)

Ma proposition mettait les deux natures dans **une seule chaîne** (`reason: {herite, local}`).
C'est faux : elles n'ont ni la même origine, ni la même fréquence, ni le même mode de
vérification. Ce sont **deux chaînes distinctes et complémentaires**.

## Intent Lineage — gardien de la cohérence PROJET

Question : *« pourquoi ce projet existe ? »* Descend de l'intention humaine, une fois par
projet. Porte : finalité · identité · invariants · limites de transformation acceptables.
**Non vérifiable par hash** — seulement attribuable. Ne doit jamais être réécrite par l'enfant.

Dérive qu'elle seule détecte : *« remplacer les dinosaures par des chars futuristes car
l'équilibrage est plus simple »* — techniquement OK, **projet détruit**. La tâche réussit,
le projet meurt.

**Ce n'est pas hypothétique.** Le garde-fou de `s0-contrat.yaml` cite la leçon payée :
« AutoBattler : modèle Battlegrounds choisi sans Pierre, Godot jamais posé ».

## Activation Lineage — gardien de la cohérence TÂCHE

Question : *« pourquoi cette tâche démarre maintenant ? »* Locale, recréée à chaque tâche.

```
PROBLÈME MESURÉ → ORACLE → CAUSE RACINE → CONTEXTE CHARGÉ → ACTION → PREUVE
```

`BUG → ACTION` ne suffit pas. Il faut `BUG → ORACLE → CAUSE RACINE → ACTION`.
Vérifiable par hash, signature, oracle.

## Règle qui sépare les deux

> **WHY = sens** ≠ **CONTRAINTE = réalité vérifiable.**
> Une table `repo_map` n'est pas une intention : c'est une **représentation du monde**.

## Le cas `04_CONTENT`, requalifié une seconde fois

Ce n'était **ni** une perte d'intention (le charter la portait, mais « couche » y désignait
un étage de la Forge, et le charter déléguait la structure à s4), **ni** un défaut de
compétence. C'était une **perte de réalité nécessaire à la décision**.

## Mesure des deux chaînes dans la Forge actuelle

| Chaîne | Naissance | Propagation |
|---|---|---|
| Intent Lineage | `s0-contrat.yaml` — `design-intent`, source Pierre traçable, fog | **aucune** — seul contrat sur ~13 à l'exiger |
| Activation Lineage | champ `reason` de chaque dispatch | **aucune** — 9 lignes, 9 vides |

Les deux naissent une fois et meurent sur place. Le garde-fou d'intention **a fonctionné**
en V1 (s0 a remonté `plateforme_cible` en fog, précédent Snake nommé) ; ce qui a échoué,
c'est qu'aucune étape aval ne re-confronte à ce fog.

## Critère de validation DOUBLE

Avant une action, deux questions, **et non une** :

1. **Cohérence projet** — cette action reste-t-elle fidèle à l'intention humaine ?
2. **Cohérence tâche** — répond-elle exactement au problème mesuré, avec la bonne preuve ?

Une action n'est valide que si **les deux** réponses sont positives.

> L'intelligence locale peut être excellente. Le danger vient quand elle réussit une tâche
> qui n'aurait jamais dû exister.

## Persistence Lineage — troisième propriété (Pierre, 2026-08-06)

> Le système n'est pas aligné parce qu'un agent **comprend**.
> Il est aligné parce que l'intention **survit au remplacement de l'agent**.

La lignée doit survivre aux changements d'agent · de modèle · aux escalades · aux
sessions · aux compressions de contexte.

### Mesure — la session du 2026-08-05/06 est son banc d'essai (3 agents morts)

| Frontière | A survécu | A été perdu |
|---|---|---|
| changement d'agent (×3) | artefacts **déjà écrits sur disque** ; lignes d'audit signées | **tout le travail resté en contexte** : s4 avait conçu son architecture, `blueprint.json` était ABSENT ; s2 avait sourcé sa 2ᵉ entrée, `worldscan.json` portait toujours 1 jeu |
| changement de modèle | l'**attribution** (le verdict signe `claude-blind (fallback)`, pas le modèle contracté) | rien |
| escalades | — | aucune ce run |
| sessions | transcripts sur disque, reprise par message | les agents en vol à la sortie du processus |
| compression de contexte | tout ce qui est fichier | tout ce qui n'était que dans une tête |

**Ce qui survit est ce qui est écrit avec une identité stable et re-vérifiable. Rien d'autre.**

### Corollaire mesuré : persister ne suffit pas, il faut une IDENTITÉ STABLE

`mutation_triage.json` a survécu au refactor — texte des justifications intact, toujours
vrai. Mais ses ancres `name@line` pointaient dans le vide après un décalage de 6 lignes
(122→128, 129→135). **La lignée a survécu ; le lien vers ce qu'elle désigne, non.**

C'est la miniature exacte de cette troisième propriété qui échoue, et ça élève la
proposition du forgeron (`expression` = clé de vérité, `line` = simple index de recherche)
du rang de détail d'implémentation à celui de **condition de persistance**.

### Ce que ça impose aux deux autres chaînes

- **Intent Lineage** : doit vivre dans un artefact du run (le charter la porte déjà), pas
  dans le prompt d'un agent. Aujourd'hui elle naît à s0 et n'est propagée nulle part —
  donc elle survit au disque mais **pas au passage d'étape**.
- **Activation Lineage** : le champ `reason` est déjà dans un manifest **HMAC-signé sur
  disque** — la persistance est acquise par construction. Il est vide, c'est tout.

## Boucle de retour — « aucun agent ne meurt seul » (Pierre, 2026-08-06)

Un worker n'est pas un cerveau isolé qui disparaît avec son contexte. **En succès comme en
échec**, il réveille son parent et transmet **ce qu'il a fait · pourquoi · la preuve**.

```
Agent parent → Mission + WHY → Worker → Travail → Retour {résultat, preuve, pourquoi} → Agent parent
```

La remontée n'est donc pas seulement une escalade de problème : c'est la **boucle normale**.
En succès : « j'ai réalisé cette action *parce que cette raison activait ma tâche*, voici le
résultat et la preuve ». En échec : « je suis bloqué sur cette action, *voici pourquoi elle
existait*, ce que j'ai essayé, ce que j'ai appris, et pourquoi je réveille le niveau
supérieur ».

### Mesure — le contrat de retour est spécifié aux DEUX TIERS

Champ `final_report`, 21 contrats `s*.yaml` :

| Ce que le retour doit porter | Exigé par |
|---|---|
| ce qu'il a fait | 12 / 21 |
| la preuve | 16 / 21 |
| **pourquoi** | **0 / 21** |

Symétrique de l'aller (`reason` : 9 dispatches, 9 vides). **La causalité n'est jamais
envoyée, et jamais demandée au retour.** La boucle n'est pas cassée à une extrémité : elle
n'a jamais été câblée aux deux.

### Le mécanisme de remontée EXISTE — il transmet un fait, pas une cause

`record_error` / `record_fix` sont câblés dans le driver (`_halt_step`/`_finish_step`) et
fonctionnent. Ce qu'ils écrivent :

```
error      : "échec d'une tentative précédente à s9-build-godot-standard"
resolution : "réparé à la tentative 2 (tier opus)"
```

**21 des 27 entrées à `resolution` du journal.** Zéro cause, zéro réparation transférable.
Le « canal dilué » mesuré au run V2 et cette doctrine sont **le même défaut vu des deux
bouts** : le retour automatique transmet un FAIT là où la doctrine exige une CAUSE.

### Trois agents sont morts seuls (session 2026-08-05/06)

Aucun n'a réveillé son parent. C'est le harnais qui a signalé « no completion record », et
l'état réel a été découvert en lisant le disque. L'architecture entière conçue par `s4-archi`
a disparu sans un mot — cf. Persistence Lineage ci-dessus.

### Nuance mesurée, à ne pas s'attribuer

Les agents **ont** spontanément transmis plus que leur contrat n'exige (tableaux
`SKIPPED_VALIDATION`, « ce que j'ai remonté plutôt qu'inventé », fogs nommés) — très proche
de la causalité demandée. Mais cela venait des **prompts de l'orchestrateur**, pas des
contrats. Le comportement souhaité a émergé d'une discipline, pas d'un mécanisme : même
motif que les 4 interventions décisives sur 9 issues d'une lecture manuelle.

**Câblage minimal correspondant** : ajouter l'exigence « pourquoi cette tâche existait »
au champ `final_report` des contrats. C'est une modification de **données**, dans un champ
qui existe déjà et que tous les agents honorent déjà pour les deux autres tiers.

## Ce que cette proposition ne résout pas

- Une intention **non écrite** ne se transmet pas : si Pierre pense « pas de nouvelle
  racine » sans l'écrire nulle part, aucune chaîne ne la portera.
- La **polysémie**. Le cas fondateur est un mot — « couche » — désignant deux objets.
  Aucun champ ne protège de ça ; seule une table figée nommant les objets le fait.
- L'**intention vérifiable** reste un sous-ensemble strict de l'intention. On peut
  empreinter une table, pas une volonté.
