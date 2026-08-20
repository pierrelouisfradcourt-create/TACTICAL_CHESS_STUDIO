# PROPOSITION — La brique manquante : fermer la boucle intention→preuve→architecte

Date : 2026-07-27 · Auteur : session Troisième Cerveau · Statut : **PROPOSED — décision Pierre**.
Répond à la question posée le 2026-07-27 : « Est-ce que la Forge sait transformer une
intention produit en une stratégie de preuve efficace avant de produire le jeu ? »
Sources : [D1 boucle de rétroaction](../audit/AUDIT_ALLEGEMENT_D1_BOUCLE_RETROACTION_2026-07-27.md)
(+ A1/B1/C1 et le [rapport de décision](../audit/RAPPORT_DECISION_ALLEGEMENT_2026-07-27.md)),
contre-vérifiés. `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. Réponse à la question — NON pour la chaîne exécutée (verdict D1 : PARTIEL, durci par les faits)

Trois faits contre-vérifiés :

1. **Il n'y a pas d'architecte dans la chaîne qui a produit Pong.** `PROFILES["standard"]`
   (dispatch.py:147-153) ne contient ni s4-archi ni s5-wiremap : la wiremap est un squelette
   gelé écrit UNE fois à la main pour le curriculum — les 13 lignes portent toutes
   `decider: null`. La boucle « retour architecte » ne peut pas exister : il n'y a personne
   au bout de l'arête.
2. **Toutes les boucles fermées récemment sont au niveau intégrité/process** (verify_run
   câblé, marqueur auto-injecté, selfaudit visible, télémétrie d'échec) — **aucune au niveau
   stratégie de preuve**. Le seul mécanisme qui ait activement cherché les angles morts
   produit (red-team s11) avait trouvé F1-vitesse et F6-exit-tautologique AVANT le playtest
   de Pierre — et il est structurellement advisory, jamais plié dans le verdict : les deux
   findings sont morts dans un fichier de 14 Ko que rien ne relisait.
3. **La densité de preuve actuelle est mauvaise et mesurée** : 8 exécutions distinctes pour
   13 citations de preuve, alors qu'UN run automatique combiné fermerait 12-13 lignes sur 13
   avec 8 invariants nommés (lancement, rendu, déplacement, physique, collision, score,
   stabilité, sortie). Personne n'a jamais fait ce calcul avant D1 — parce qu'aucune étape
   de la chaîne n'a ce calcul pour mission.

S'y ajoute la 5e occurrence du mode de panne connecteur : `learning_curve.jsonl` est écrit à
chaque run vert et **n'a aucun lecteur décisionnel** dans le dépôt.

## 2. La brique proposée : « REVUE DE PREUVE » — une brique, deux points d'accrochage

Principe (biais anti-création respecté) : **ne pas inventer une nouvelle couche d'agents** —
ajouter UN oracle déterministe et UN dossier de retour, tous deux branchés sur des données
qui existent déjà. Pas de LLM-juge (ADR-002). Advisory d'abord, adoption mesurée, passage en
gate = décision Pierre distincte (garde-fou CODEX_METHOD_SALVAGE_V1).

### Accrochage AMONT — au gel de la wiremap, AVANT tout build (l'emplacement demandé)

**`proof_review` : 7e volet de `standard_oracles.py`, mode « au gel ».** Pour chaque ligne
de la wiremap, il vérifie non plus seulement QU'une preuve est déclarée (s10s le fait) mais
CE QUE la stratégie de preuve vaut :

| Contrôle | Donnée | Sortie |
|---|---|---|
| Fidélité | `expected_proof` vs intention textuelle de la ligne | preuve-fidèle / substitut-plus-faible (nommé) |
| Observabilité joueur | nouveau champ structuré par ligne : `observable_by_player: true/false/n_a` (champ validé, jamais un commentaire — doctrine 23-07) | lignes « produit » sans preuve observable = listées |
| Densité | nombre de lignes couvrables par un même scénario global | recommandation « scénario combiné » quand ≥N lignes partagent un run |
| Coût | forme de preuve la plus chère à information égale | preuves remplaçables listées |

Sortie : un **rapport de stratégie de preuve** structuré, rendu AVANT s9, au **détenteur du
stylo de la wiremap** — qui, dans le profil standard, n'est pas un agent : c'est Pierre (et
la session qui rédige le squelette). La brique ne crée PAS d'étape s4 LLM dans le standard ;
elle donne à l'architecte HUMAIN le dossier qu'il n'a jamais eu. Arbitrage possible avant
build : changer l'architecture, simplifier une fonctionnalité, changer une forme de preuve,
ajouter l'oracle manquant — exactement la liste de Pierre.

*Preuve par l'histoire : appliqué à Pong, ce volet aurait rendu au gel : « 3 intentions
produit sans aucune ligne (adversaire, vitesse jouable, lisibilité score) · core.exit :
preuve infidèle (CLI Node pour une intention navigateur) · 12/13 lignes couvrables par un
run auto — stratégie recommandée : scénario combiné + 2 preuves dédiées ». Les 4 constats
du playtest étaient DANS ce rapport-là.*

### Accrochage AVAL — après s12 : le « dossier architecte »

Un plieur déterministe (patron `propose_brick` : écrivain best-effort dans `_run_verdict`)
qui assemble en UN fichier par run ce qui existe déjà mais meurt dispersé : verdict signé +
mutation par fichier + télémétrie (coût/échecs) + **findings red-team pliés** (aujourd'hui
`redteam_advisory: []` avec 14 Ko sur disque) + delta learning_curve — destiné à DEUX
lecteurs nommés : le rapport de gel du run suivant (le `proof_review` amont le relit —
la boucle se ferme là) et Pierre. Ceci donne enfin un lecteur à `learning_curve` et aux
rapports red-team — deux connecteurs orphelins réparés par la même brique.

### Le cycle devient

```
Intention produit (contrat de jeu)
   ↓
Wiremap (gel)
   ↓
★ PROOF_REVIEW (déterministe, au gel) → rapport stratégie de preuve → ARBITRAGE avant build
   ↓
Production (s9)  ←—— retry/escalade (boucle existante, inchangée)
   ↓
Oracles (s10) — dont l'ORACLE PRODUIT (run auto 10-30 s, la preuve à plus forte densité)
   ↓
Verdict signé (s12)
   ↓
★ DOSSIER ARCHITECTE (plieur déterministe) ——→ relu par le PROOF_REVIEW du gel suivant + Pierre
```

## 3. Coûts et séquence (estimations honnêtes)

| Étape | Contenu | Coût |
|---|---|---|
| 1 | Champ `observable_by_player` dans le schéma de ligne + rétro-remplissage Pong (13 lignes) | ½ j-session |
| 2 | Volet `proof_review` (déterministe, ~4 contrôles) + tests | 1-2 j-session |
| 3 | Plieur « dossier architecte » + pliage red-team + lecteur learning_curve | 1 j-session |
| 4 | Passage advisory→gate (si adoption prouvée) | décision Pierre ultérieure |

Dépendances : l'oracle produit (rapport C1, 2-4 j-session) est la preuve que le
`proof_review` recommandera — les deux chantiers se renforcent mais sont séparables.
Interdit tant que non décidé : rien n'est codé, ce document est la proposition.

## 4. Ce que cette proposition ne fait PAS

Pas de nouvel agent LLM · pas de couche de fichiers déclaratifs sans lecteur (chaque artefact
naît avec son lecteur nommé — leçon des 5 occurrences du mode de panne connecteur) · pas de
score LLM de « qualité de preuve » (tous les contrôles sont mécaniques) · pas de modification
de la boucle builder existante · pas de gate dur avant mesure d'adoption.
