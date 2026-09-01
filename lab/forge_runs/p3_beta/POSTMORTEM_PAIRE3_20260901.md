# POST-MORTEM COURT — PAIRE 3 (2026-09-01) — les 5 axes demandés par Pierre

Cadre : paire 3 déjà incapable d'être valide (arrêt honnête p3_beta, décision Pierre).
p3_alpha s'est ensuite arrêté SEUL à s10a sur un **crash moteur** (nouveau finding P3-2).
Aucune intervention effectuée : les deux dossiers sont intacts, diagnostic en lecture seule.

## 1. Finding P3-1 (p3_beta)

Non-convergence du GM Opus sur le schéma d'adressage `worldscan:` à s2.7 : 4 tentatives,
cycle 1→2→3→retour-au-défaut-1 (détail : ARRET_HONNETE_20260901.md). Exigence documentée
(contrat + 23 occurrences prompt), satisfaite par le GM alpha et les deux GM de la paire 2.
Portée (Pierre) : comportement observé de CE run/bras/trajectoire/contexte — pas une
conclusion de capacité du modèle.

## 2. Finding P3-2 (p3_alpha) — crash moteur au volet mutation de s10a

- **Fait** : le process est mort sur `FileNotFoundError: games\p3_alpha\games\p3_alpha\economy.mjs`
  (chemin DOUBLÉ), exit 1, `state.json` resté `RUNNING` (périmé), étape s10a `RUNNING` figée.
  L'oracle produit (`run-oracle.mjs`) avait rendu returncode=0 juste avant.
- **Cause établie (lecture seule)** : la wiremap écrite par le builder cite les fichiers en
  chemins REPO-relatifs (`games/p3_alpha/economy.mjs`) ; `driver._run_code_oracle` joint ces
  chemins à `src_root` (= `games/p3_alpha`) → double préfixe. En paire 2 les builders avaient
  cité des noms nus → jamais exercé.
- **Deux trous moteur distincts** :
  a) aucune normalisation/validation des chemins de la wiremap avant `run_mutation_for_game` ;
  b) l'exception s'échappe du régime fail-closed : **crash ≠ HALT** — pas de `_finish_step`,
     pas de raison consignée, état menteur (`RUNNING` sans process). Rejoint la leçon
     « RUNNING confirmé par une réalité » (invariants qualité 2026-07-27).

## 3. Coût réel (state.json, tokens consignés par étape OK)

| Bras | Étapes OK | Tokens consignés | Détail notable |
|---|---|---|---|
| p3_alpha (D3) | 13/18 (mort à s10a) | **575 069** | s2.7 GM = 200 691 · s9 build = 77 028 |
| p3_beta (L3) | 4/18 (HALT s2.7) | **124 706** | s0 = 48 556 |

Limite d'observabilité constatée : les tokens des **tentatives échouées** (4× s2.7 beta,
2× s2.5-r2 alpha) ne sont PAS consignés dans state.json (l'étape BLOCKED n'a pas de champ
tokens). Ordre de grandeur du gaspillage beta-s2.7 : substantiel — le même rôle a coûté
200k côté alpha en réussissant. Total paire ≈ 700k consignés + tentatives non consignées,
vs budget de référence 1,7 M (non atteint car paire interrompue).

## 4. Défaut protocole/oracle vs limite du GM — preuves à l'appui

- **P3-1 → limite d'agent dans ce contexte, PAS un trou de protocole** : la garde de
  matérialisation a fait exactement son travail (refus nommés, append-only tenu, budget
  cumulatif respecté à la reprise). Rien à corriger côté protocole pour ce finding — c'est
  le résultat expérimental. Seule observation périphérique : consignation des tokens des
  tentatives échouées absente (mineur, observabilité).
- **P3-2 → trou moteur AVÉRÉ, indépendant des modèles** : un artefact d'entrée légal
  (chemins repo-relatifs, qu'aucun contrat n'interdit) fait mourir le driver hors du régime
  fail-closed. C'est structurel, reproductible, et il masquerait n'importe quel run futur
  dont le builder choisit cette convention.

## 5. Décision P4 (à la gate Pierre — options)

- **(i)** Sas moteur MINIMAL borné à P3-2 avant P4 : normaliser/valider les chemins wiremap
  au volet mutation + attraper l'exception en HALT propre (fixtures = wiremap réelle
  p3_alpha) ; AUCUNE autre surface. Puis P4 telle quelle.
- **(ii)** P4 telle quelle sans correctif : risque de reperdre un bras entier sur le même
  crash si un builder recite des chemins repo-relatifs.
- **(iii)** + option indépendante : consigner les tokens des tentatives échouées (observabilité,
  peut attendre).
- Sort de p3_alpha : rester en l'état (évidence, 13/18) — le terminer exigerait le correctif
  (i) + une reprise, pour un bras d'une paire déjà invalide ; utile seulement comme banc
  d'essai du correctif, à ta gate.

Compteur : **0 paire valide**.
claim_verdict: NO_CLAIM_ALLOWED
