# ROOT_PROBLEM_LINK_PROPOSAL_V1

*2026-08-04. **Aucun code, aucun champ rempli.** `root_problems[].lesson_ids` reste vide
sur les 4 problèmes. Ce document présente ce qui est mesurable et ce qui ne l'est pas ;
la décision appartient à Pierre.*

---

## Trois critères fondés sur la preuve. Trois fois zéro.

Aucune similarité de texte, aucun Jaccard, aucun embedding, aucun score lexical n'a été
employé — et n'a besoin de l'être pour conclure.

| critère | ce qu'il compare | résultat |
|---|---|---|
| **1. Preuve partagée** | `lesson.supporting_runs` ∩ dossiers `lab/forge_evidence/<ROOT_PROBLEM>/` | **0** |
| **2. Artefact partagé** | fichiers cités par la leçon ∩ fichiers ciblés par les mutations du problème (identité de chemin, pas ressemblance) | **0** |
| **3. Couche déclarée** | `lesson.layer` ∩ `root_problem.layer` | **impossible — le champ n'existe pas côté leçon** |

Détail du critère 2, qui est le plus proche d'une preuve :

```
ORACLE_FALSE_NEGATIVE    cible  check_blueprint_contract.mjs · check_wiremap_contract.mjs · oracle_quality.mjs
DEFECT_DISPLACEMENT      cible  cross_field_quality.mjs
PROMPT_FIELD_OMISSION    cible  repair_step.mjs
REPAIR_NON_CONVERGENCE   cible  repair_loop.mjs

18 lecons validees citent : run-oracle.mjs · project.godot · wiremap.json · state.json ·
oracles.json · loop.mjs · core_boot.gd …

intersection : 0
```

## Pourquoi c'est zéro — et ce n'est pas un accident

Les deux familles vivent à des étages différents, et leurs preuves le montrent :

```
18 lecons          <- runs de JEU        breakout_v2 · pong_r2/r3 · snake · tetris
                      mecanismes : builder Godot, oracle produit, wiremap, entrypoint,
                      timeout de dispatch, statut de run

 4 problemes racines <- experiences WORKER  lab/forge_evidence/<PROBLEME>/
                      mecanismes : prompt, boucle de reparation, signaux de qualite
```

Aucune leçon ne cite une preuve d'un problème racine ; aucun problème racine ne cite un run
de jeu. Ce ne sont pas deux vues du même objet : ce sont **deux chaînes de production
distinctes**, l'une qui fabrique des jeux, l'autre qui fabrique des artefacts amont.

## Le vrai maillon manquant : un champ, pas un algorithme

`root_problem` déclare `layer` (`s2-worldscan`, …). **`lesson` ne déclare rien
d'équivalent** — ni couche, ni composant, ni problème racine.

C'est pour ça que le lien ne peut pas être mécanique aujourd'hui : il ne manque pas une
méthode de rapprochement, il manque une **déclaration à la source**. Une leçon écrite
demain avec un champ `layer` (ou `root_problem_id`) se rattacherait par identité, sans
qu'aucune heuristique n'intervienne.

**Ce document ne crée pas ce champ** — c'est une modification de schéma, hors périmètre.

---

## Rapprochements que seul un humain peut trancher

Ce qui suit n'est **mesuré par aucun des trois critères**. Je les expose parce que tu peux
légitimement voir un mécanisme commun là où la preuve n'en montre pas — mais **je n'en
recommande aucun**, et les retenir consisterait à transformer un jugement en cause.

| leçon | mécanisme qu'un humain pourrait rapprocher de… | pourquoi ce n'est PAS une preuve |
|---|---|---|
| `forge.new_proof_needs_declared_executor` — « un test non listé par la commande d'oracle n'existe pas dans la chaîne qualité » | `ORACLE_FALSE_NEGATIVE` — un oracle qui ne voit pas un défaut réel | la leçon parle d'un test **absent du registre d'oracle** ; le problème parle d'un oracle **présent qui ne détecte pas**. Deux causes différentes du même symptôme apparent. |
| `forge.reuse_tracking_oracle_dead_since_inception` — deux volets jamais verts sur aucun run | `ORACLE_FALSE_NEGATIVE` | volet **mort**, pas volet **aveugle**. Un oracle qui n'a jamais tourné n'a pas de faux négatif : il n'a pas de résultat. |
| `forge.oracle_fail_vs_not_measured_marker` — `NOT_MEASURED` ≠ `FAIL` | `ORACLE_FALSE_NEGATIVE` | c'est l'inverse d'un faux négatif : un **faux positif** de sévérité. |
| `forge.broken_loop_repair_not_report` — réparer, ne pas rapporter | `REPAIR_NON_CONVERGENCE` | la leçon parle de la **posture de l'orchestrateur** face à un diagnostic ; le problème parle d'une **boucle de réparation d'artefact** qui ne converge pas. Le mot « réparation » est le seul point commun — et c'est exactement le raisonnement par ressemblance que la doctrine interdit. |

La dernière ligne est celle qui illustre le mieux le piège : un rapprochement par le mot
« réparation » aurait l'air juste et serait faux.

---

## Proposition

**Laisser `lesson_ids` vide sur les 4 problèmes.**

Le vide est ici une information : il dit que la mémoire causale du studio et sa mémoire
d'expérimentation n'ont, à ce jour, **aucun point de contact prouvé**. Le remplir par
jugement effacerait ce fait.

### Décision demandée

☐ **Laisser vide** — l'absence de lien est le résultat *(recommandé)*
☐ **Retenir un ou plusieurs rapprochements du tableau ci-dessus** — dans ce cas, préciser
  lesquels ; ils seront inscrits avec la mention explicite qu'ils relèvent du jugement
  humain, pas de la preuve
☐ **Traiter d'abord le maillon manquant** — décider si les futures leçons doivent déclarer
  leur couche ou leur problème racine (modification de schéma, chantier distinct)

Tant qu'aucune case n'est cochée, `root_problems.json` reste inchangé.
