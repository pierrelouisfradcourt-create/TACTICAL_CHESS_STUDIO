# P1 — Capteurs Forge : proposition des primitives de mesure

*2026-08-02 · PROPOSED — une gate par capteur, aucun scheduler, aucune autonomie nouvelle*
*Objectif ratifié : rendre possible une optimisation future fondée sur des mesures
réelles. Chaque capteur ci-dessous comble un écart MESURÉ, pas supposé.*

## Les 9 primitives, leur écart d'origine, leur point d'écriture

| # | primitive | écart mesuré qui la justifie | où elle s'écrirait | consommateur |
|---|---|---|---|---|
| 1 | `session_id` du sous-processus | corrélation transcript↔run = inférence BY_FILE_SCOPE (4 146 événements) | `state.json.steps.<etape>` + ligne télémétrie, capté à la sortie de `claude -p` (le CLI l'imprime en stream-json) | Observer (corrélation exacte), futur moteur de décision |
| 2 | `task_id` unifié | 4 vocabulaires concurrents (attempt/activation/retry_number/attempts) | champ commun `task_id = <run_id>:<etape>:<activation>` sur audit + télémétrie + manifests | toutes les jointures |
| 3 | modèle UTILISÉ (pas déclaré) | wm1 : opus-4-8 signé / opus-5 exécuté | télémétrie, depuis la réponse réelle du CLI (`message.model` du stream) | fiches agents, drift modèle → 0 faux |
| 4 | tokens déclarés | déjà présents (mais faux ×6,7–12,3) | inchangé — conservés pour comparaison | mesure de l'écart lui-même |
| 5 | tokens MESURÉS (in/out/cache) | la télémétrie ignore le cache (33–98 M/run) | télémétrie, depuis `usage` du stream-json du CLI — le même canal que le modèle | fonction de coût vraie (prérequis MCTS) |
| 6 | coût recalculable | `cost_usd` sans grille ni formule — invérifiable | grille tarifaire versionnée à côté de la télémétrie + formule dans la ligne | vue Campagnes (« coût vérifiable » enfin ≠ NOT_OBSERVABLE) |
| 7 | durée | déjà fiable | inchangé | — |
| 8 | fichiers touchés | seule trace = transcripts (hors dépôt, purgeable) | liste des Write/Edit du stream, résumée par étape dans la télémétrie | wiremap stamping (P2), risque périmètre |
| 9 | hash preuve | reçus existants OK ; manque l'empreinte de prompt sur les dispatches par outil Task (trou wm1, « ni prouvable ni réfutable ») | même signature que run_real, posée par le chemin Task | chaîne de vérification SHA complète 10/10 |

## Point d'architecture unique

Les capteurs 1, 3, 5, 8 ont LE MÊME point d'écriture : le flux `stream-json` que
`claude -p` émet déjà et que `run_real._claude_call_raw` lit déjà. Il ne s'agit
pas d'un nouveau système de télémétrie — il s'agit de **cesser de jeter** ce que
le flux contient. C'est pourquoi cette proposition reste P1 et petite : un seul
fichier touché (`run_real.py`, zone d'exploitation du flux), plus le schéma de
ligne télémétrie étendu (champs additifs, lecteurs existants intacts).

## Découpage en gates (une par capteur, comme ratifié)

- **G1** (1+2) : identifiants — session_id + task_id unifié. Zéro sémantique nouvelle.
- **G2** (3+5) : vérité d'exécution — modèle utilisé + tokens mesurés. Rend
  `token_accounting_below_measured` et `model_audit_differs` auto-vérifiants.
- **G3** (6) : grille de coût — décision de doctrine (quelle grille, qui la met à jour).
- **G4** (8) : fichiers touchés par étape — la trace cesse de dépendre de fichiers
  hors dépôt purgeables.
- **G5** (9) : empreinte de prompt sur le chemin Task — ferme le dernier trou SHA.

Chaque gate : preuve = le drift Observer correspondant tombe à zéro sur la
campagne suivante ; mesure de succès = ratio déclaré/mesuré ∈ [0,9 ; 1,1] (G2),
0 événement UNLINKED de session (G1), « coût vérifiable » calculable (G3).

**Rien d'autre** : pas de scheduler, pas d'agrégation automatique, pas de
décision machine. Des mesures.
