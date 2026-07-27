# SPEC — Chantier « usine apprenante » : reconnecter la boucle connaissance → conception

Date : 2026-07-27 · Auteur : session Troisième Cerveau · Statut : **PROPOSED — décisions Pierre**.
Séparation **ratifiée par Pierre le 2026-07-27** : ce chantier est distinct du
[plan immédiat run propre](PLAN_RUN_PROPRE_V1.md), qui reste inchangé.
Amont : [feuille de route](ROADMAP_USINE_APPRENANTE_V1.md) · [profil design](PROPOSAL_PROFIL_DESIGN_V1.md).
`claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. La règle de gouvernance du chantier (issue de 6 pannes identiques)

Le mode de panne dominant du studio est **l'écrivain sans appelant et le lecteur sans données**
(6 occurrences prouvées : `learning_metrics` · `propose_brick` · findings red-team ·
`learning_curve` · `spawn_authorized` · `propose_bible_entry`). Donc :

> **Aucune flèche de ce chantier n'est acceptée sans ses trois colonnes remplies : ÉCRIVAIN ·
> LECTEUR NOMMÉ · MESURE MÉCANIQUE QU'ELLE A TIRÉ.**

| # | Flèche | Écrivain | Lecteur nommé | Mesure qu'elle a tiré |
|---|---|---|---|---|
| 1 | World Scan → Genre Bible | `s2-worldscan` + distillation | `check_genrebible` puis le Prisme | la bible existe, versionnée, `n_rules > 0` |
| 2 | Genre Bible → Prisme | bible versionnée | contrat s1 (`mandatory_read` + injection) | nb de règles de genre **citées** par les lentilles |
| 3 | Prisme → Architecte | `merge_prisme` (existant) | contrat s4 re-spécifié | lignes retenues par l'architecte / lignes proposées |
| 4 | Architecte → Wiremap V2 | décisions de brique | `s10s` au gel + le build | diff V1→V2 non vide et **attribué** |
| 5 | Oracle produit → Findings | reçus signés + red-team plié (étape 1 du plan immédiat) | le Bible Writer | nb de findings convertis en règles candidates |
| 6 | Findings → Genre Bible v+1 | **`propose_bible_entry`** (existe, **0 appelant** — à brancher, patron V4) | Pierre ratifie · Prisme du jeu suivant lit | `forge_bible_proposals.jsonl` passe de **inexistant** à ≥1 ligne |

Une flèche dont la 3ᵉ colonne ne peut pas être mesurée n'entre pas dans le studio : elle
retourne au tableau.

---

## 2. La Genre Bible — le patron Art Bible transposé, champ par champ

Le patron qui marche (extrait de `s2.5-artbible.yaml` + `check_artbible.mjs`, 369 lignes,
8 dispatches réels) tient en cinq propriétés. Je les transpose une par une :

| Propriété du patron Art Bible | Réalisation dans la Genre Bible |
|---|---|
| **Frontmatter structuré non vide** (`styles[]`, `mood_keywords[]`) | `genre` · `version` · `date` · `sources[]` (chaque source : `{ref, type, date, confiance}`) — **la provenance est dans le frontmatter, donc vérifiable mécaniquement** |
| **Sections obligatoires non triviales** (3) | **1. ADN du genre** (boucle principale · durée de partie · fantasme joueur · progression) · **2. Patterns qui marchent** (mécanique · pourquoi · exemples · conditions de validité) · **3. Pièges connus / anti-patterns** (problème · symptôme · cause · correctif) · **4. Onboarding & difficulté** (courbe attendue, premiers 60 s) · **5. Attentes joueurs** |
| **Bloc JSON lisible par machine dans le markdown** (`visual_requirements`) | `genre_rules: [{id, claim, section, source_ref, confiance, applies_to[]}]` — **`id` obligatoire** parce que le studio possède déjà la citation-par-ID (118 citations réelles dans le code) |
| **Vérification de couverture — le mécanisme anti-théâtre** : chaque `required:true` doit avoir ≥1 asset request du même id | **chaque `genre_rule` dont `applies_to` matche la famille du jeu courant doit être soit CITÉE dans la wiremap, soit REFUSÉE avec une raison écrite.** C'est exactement ton « utilisation obligatoire quand pertinente » — et ça rend une bible ignorée mécaniquement visible |
| **Statistique advisory strictement séparée du pass/fail** (taux de résolution des requests) | **taux de résolution des citations** : citations résolues / citations revendiquées. Advisory, jamais un pass/fail — mais c'est **la mesure de valeur d'une bible** (§4) |

**Vocabulaire de verdict, repris à l'identique** : `FAIL` = bible malformée · `BLOCKED` = bien
formée mais **couverture manquante** (une règle applicable ni citée ni refusée) · `OK` = conforme
et couverte. Cette distinction est ce qui empêche « un joli document » de passer pour un actif.

**Réutilisation, pas duplication** (autre règle du patron) : `check_genrebible.mjs` délègue ce
qui existe — la validation de forme au même style que `validateRequestShape`, la résolution des
citations à l'outillage `citation-par-ID` à durcir (§3).

---

## 3. Le durcissement indispensable : résoudre réellement les ID

État mesuré : **118 citations d'ID** dans le code, 8/11 bibles « citées » — mais `check_wiremap`
ne vérifie que **la présence du nom de fonction**. L'audit P2 le dit lui-même : « *vivante*
surévalue une vérification limitée à la présence du nom ».

Sans ce durcissement, la Genre Bible héritera d'une citation qui ne prouve rien, et tout le
chantier reposera sur une mesure creuse. **C'est le prérequis technique n°1** : résoudre
`source_ref` → la bible → la règle, et échouer si la cible n'existe pas.

Coût : ~1 j-session. Bénéfice immédiat, indépendant du reste : les 118 citations existantes
deviennent vérifiables, et l'on saura enfin lesquelles des 11 bibles auto_battler sont vivantes.

---

## 4. Le critère de valeur d'une bible (pour qu'« actif » soit une mesure)

> Une bible gagne sa place quand un jeu **ultérieur** cite ses règles **et que les citations se
> résolvent**. Mesure : `citations_résolues / citations_revendiquées`, par bible et par version.

Conséquences assumées : une bible qu'aucun jeu ne cite après N jeux est **à requalifier ou à
supprimer**, pas à étoffer. C'est ta règle de variance des métriques appliquée à la connaissance.

---

## 5. Les lentilles du Prisme — et un désaccord argumenté sur l'une des quatre

L'infrastructure existe : `merge_prisme.mjs` recombine mécaniquement N lentilles, **sans
LLM-arbitre**, par union des règles rattachées à un critère de charter, avec **GAP explicites**
(un critère que personne ne couvre est remonté marqué non couvert, jamais deviné).

Tes lentilles, retenues telles quelles :

| Lentille | Responsabilité (ce dont elle répond, et rien d'autre) |
|---|---|
| **Gameplay Programmer** | boucle de jeu · difficulté · progression · exploits · game feel |
| **Runtime Programmer** | moteur · chargement · performance · plateforme · intégration réelle |
| **Player Reviewer** | compréhension · onboarding · friction · lisibilité |

**Désaccord sur la 4ᵉ — « Architecte du dépôt » : je le recommande comme ÉTAPE, pas comme
lentille.** Raison : une lentille **critique en parallèle** des autres et ne décide rien ; or
l'architecte doit **décider** (`brick_decision: new|extend`), et sa décision a besoin de
consommer les critiques des trois autres. En lentille, il parlerait en même temps qu'elles et
son `brick_lookup` ne pourrait pas répondre à ce qu'elles viennent de soulever. En étape
placée **après** `merge_prisme`, il décide sur matière complète.

Contre-argument honnête, à ta main : en lentille, il donne un signal **précoce** (« ça sent une
brique existante ») avant même la wiremap. Si tu veux les deux, le coût est un passage
supplémentaire — mon avis est que le signal précoce ne vaut pas ce prix tant qu'aucun jeu n'a
encore réutilisé de brique (`reuse_ratio` = 0,333 sur un seul jeu, `kb_tactics`).

### Comment on mesure ce que chaque lentille apporte (ton exigence)

Prérequis gratuit, toujours pas fait : **`source_role` par ligne** (idée du 22-07,
`grep source_role scripts/forge/prisme/*.mjs` = vide). Il se pose maintenant ou jamais.

Deux compteurs par lentille et par jeu, dérivés de la sortie de `merge_prisme` :

- **`unique`** : lignes qu'elle seule a produites (aucune autre lentille sur le même critère) ;
- **`retenues`** : lignes qui survivent dans la **wiremap V2**.

Règle de sortie, posée d'avance : **une lentille à `retenues = 0` sur 3 jeux consécutifs est
retirée**, pas améliorée. C'est ton expérience de diversité des rôles du 22-07, enfin
exécutable — et c'est ce qui empêche le panel de grossir par accumulation.

---

## 6. Coûts et ordre du chantier

| Lot | Contenu | Coût | Dépend de |
|---|---|---|---|
| **K0** | **`source_role` + durcissement de la résolution des ID** — les deux mesures, avant toute machine | 1-1,5 j | — |
| **K1** | **Brancher le Bible Writer** (`propose_bible_entry`, appelant + lecteur, patron V4) | 1 j | K0 |
| **K2** | **Genre Bible** : contrat + `check_genrebible.mjs` (patron Art Bible) + 1 bible réelle distillée du World Scan (genre de Pong : arcade/versus temps réel) | 2-2,5 j | K0, K1 |
| **K3** | **Prisme multi-lentilles** : 3 lentilles + lecture des bibles pertinentes + compteurs `unique`/`retenues` | 1,5-2 j | K0, K2 |
| **K4** | **Architecte du dépôt** : re-spécification de `s4-archi` + les 4 champs structurés + `brick_lookup` sur la KB | 1 j | K3 |
| **K5** | **Boucle de retour** : findings (oracle produit + red-team plié) → règles candidates → bible v+1 | 1 j | K1, plan immédiat étapes 1 & 3 |

**Total ≈ 7,5-9 j-session.** Ordre imposé : **K0 d'abord, sans exception** — poser les deux
mesures avant les machines qu'elles doivent juger, sinon on ne pourra pas dire si le chantier a
servi (et ce serait la 7ᵉ occurrence du mode de panne).

**Dépendances externes à débloquer, décisions séparées** : LM Studio est **DOWN** ⇒ le rôle
`redteam_reviewer` (Qwen) est inexécutable, donc `s6-redteam-plan` ne peut pas tourner
aujourd'hui · `s6` exige un `blueprint.yaml` que le profil standard ne produit pas ⇒ son entrée
doit être requalifiée pour qu'il puisse attaquer une wiremap seule.

## 7. Le test le moins cher du chantier entier

Une fois K2 et K3 faits : passer le Prisme multi-lentilles **sur la wiremap Pong actuelle**, avec
la Genre Bible arcade/versus en entrée. **Critère de succès posé d'avance** : les lentilles
ressortent l'adversaire manquant, la vitesse injouable, la lisibilité du score et le quitter
infidèle — les 4 constats de ton playtest, dont la vérité est **déjà connue**. Coût : un run de
conception, **zéro build**. Si elles ressortent autre chose, le chantier est à réviser avant
d'engager les 9 jours.

## 8. Ce que je ne propose pas

Une usine à documents · une bible par jeu en plus des bibles de genre (les 10 bibles
`auto_battler` restent ce qu'elles sont, elles ne sont pas le modèle à généraliser) · un
LLM-arbitre entre lentilles (`merge_prisme` est mécanique, c'est sa valeur) · des lentilles
juges (les oracles déterministes restent seuls juges) · la réconciliation du Détail G · de
nouvelles lentilles avant que les 3 premières aient prouvé leur `retenues > 0`.

## 9. Décisions attendues

**K-1** go chantier et ordre K0→K5 · **K-2** architecte : étape (ma recommandation) ou lentille,
ou les deux · **K-3** la Genre Bible du genre de Pong comme première bible réelle · **K-4** la
règle de sortie d'une lentille (`retenues = 0` sur 3 jeux ⇒ retirée) · **K-5** le critère de
valeur d'une bible (citations résolues / revendiquées) · **K-6** sort de LM Studio / du reviewer
de plan.
