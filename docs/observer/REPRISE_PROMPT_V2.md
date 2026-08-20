# PROMPT DE REPRISE — Forge V2 (session neuve, sans historique)

*Copier tel quel comme premier message d'une nouvelle session.*

---

## MISSION

Faire tomber le drift `lecon_routee_sans_consommateur` en câblant les consommateurs
**qui existent déjà** dans la Forge. Ne rien inventer.

Tu n'as aucun historique conversationnel. La source de vérité est le dépôt.

## ÉTAT ACTUEL (vérifiable, ne pas croire sur parole — remesure)

- **P0_STATUS = NOT_CLOSED.** Critère ratifié (`studio_brain/planning/planning.yaml:25`) :
  `lecon_routee_sans_consommateur == 0`. Mesure au 2026-08-02 : **4**.
- 5 leçons validées. 1 a un consommateur mécanique prouvé (`preflight.py`).
  3 ont un composant consommateur existant mais aucune règle qui les cite.
  1 exige une capacité inexistante (`timeout_greenfield_by_profile`).
- Observer fonctionne : `python scripts/observer/cli.py --project breakout_v2 --events`
  régénère tout ; la console vit sur `scripts/observer/live.py`.

## FICHIERS À LIRE EN PREMIER (dans cet ordre)

1. `docs/observer/FORGE_CONTEXT_RESUME_V2.md` — l'état compact, la matrice, les preuves.
2. `studio_brain/planning/planning.yaml` — le critère ratifié, seul document faisant foi.
3. `scripts/observer/command.py:303-365` — la règle qui calcule le drift.
4. `scripts/forge/declaration_readers.mjs` (en-tête) — le capteur « déclaré ou lettre
   morte » qui existe déjà et pose la même question.
5. `lab/reports/observer/breakout_v2/observer_run.json` — la mesure courante.

## ACTIONS AUTORISÉES

- Lire tout le dépôt.
- Modifier, **après avoir présenté le design et obtenu un go** :
  `scripts/observer/command.py` · `scripts/forge/standard_oracles.py` ·
  `scripts/forge/product_oracle_godot.py` · `scripts/forge/standard/SCHEMA.md`.
- Exécuter Observer, les oracles, les suites de tests existantes.

## ACTIONS INTERDITES

- Déclarer P0 fermé hors `== 0` ou décision humaine explicite amendant le critère.
- Ajouter un appel KB à un composant qui n'en a pas besoin, pour fabriquer une trace.
- Modifier `tests/`, `scripts/forge/oracles.json`, ou tout fichier de
  `reference_protected.yaml` sans gate.
- Écrire automatiquement dans `catalog.json`, `decision-log.md`, `planning.yaml`.
- Créer un agent, un scheduler, une taxonomie concurrente de `declaration_watchlist`.
- Commiter, pousser.
- Réécrire l'historique (49 décisions legacy, leçons, runs archivés).

## ORDRE D'EXÉCUTION

0. **Remesurer** le drift avant toute chose. Si ≠ 4, l'état a bougé : réauditer.
1. **Poser à l'humain la question bloquante** : `timeout_greenfield_by_profile` exige une
   capacité inexistante (structure profil→paramètres). Sans sa construction ou un
   amendement explicite du critère, `== 0` est inatteignable. Ne pas commencer sans réponse.
2. Étendre la détection (`command.py`) : reconnaître un canal de preuve par type de leçon,
   pas seulement `search_log`. Design présenté avant code.
3. Règle `reused_from.type=CONCEPT` dans `check_line_states`. Preuve : verdict wiremap
   Breakout **identique** avant/après sur les champs préexistants.
4. Déclarer la convention `FORGE_ORACLE` dans `standard/SCHEMA.md`.
5. Exemption GPU par marqueur dans `product_oracle_godot.py` (remplace le nom en dur l.55).
6. Re-mesurer. Rapporter la valeur réelle, même si elle ne bouge pas.

## RÈGLES DE MÉTHODE (non négociables)

- Une tâche sans preuve d'exécution n'est pas terminée.
- Un rapport d'agent n'est pas une preuve : le confronter au réel avant d'y croire.
- Conformité ≠ causalité : du code conforme à une leçon ne prouve pas qu'elle l'a causé.
- `NOT_OBSERVABLE` n'est jamais rendu `0`, vide, ou converti en OK.
- Un manque de mesure se nomme ; il ne se comble pas.

## FORMAT DE RAPPORT FINAL

```
STATUS:
ACTION:
FILES_CHANGED:
LESSON_MATRIX:        (lesson_id | type | consumer | preuve runtime | statut)
DRIFT_BEFORE:
DRIFT_AFTER:
TESTS:
EVIDENCE:
BLOCKERS:
RISKS:
NEXT:

software_verdict:
evidence_verdict:
claim_verdict:
P0_STATUS:            (CLOSED uniquement si drift == 0, sinon NOT_CLOSED)
```
