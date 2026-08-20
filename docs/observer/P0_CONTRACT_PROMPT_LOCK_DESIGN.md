# P0-1 — Verrou Contrat → Prompt → Agent : design des deux options

*2026-08-02 · PROPOSED — arbitrage Pierre requis avant toute ligne de code*
*Faits d'appui (tous mesurés) : 3 champs validés par la porte de contrat et jamais
rendus dans le prompt (`skill`, `plugin`, `delegation_context` — 10/10 activations,
ancré sur lecture de `contract.py::_render_prompt`) ; matrice V2 : DECLARED_NOT_INJECTED ×30.*

## Le fait fin qui change le design

Les 3 champs ne sont pas égaux :

| champ | consommateur RÉEL trouvé | nature de l'écart |
|---|---|---|
| `skill` / `plugin` | **OUI, hors prompt** : `contract.py::_declared_tools` les convertit en `allowed_tools` (couche dispatch) — consommateur faible (l'audit signe `allowed_tools=()`, sous-déclaration connue) mais existant | champ de COUCHE DISPATCH étiqueté comme s'il nourrissait le prompt |
| `delegation_context` | **AUCUN** — ni rendu au prompt, ni lu par le dispatch, ni par l'exécuteur | champ véritablement orphelin : validé, écrit dans 47 contrats, consommé par personne |

Un verrou uniforme serait donc faux dans les deux sens. Le design traite les deux cas.

## Option A — règle exécutoire dans `contract.py`

`_render_prompt` rend une section pour TOUT champ déclaré non-vide ; la porte
(`prepare_dispatch`) REFUSE un dispatch si un champ obligatoire déclaré n'a pas
de section rendue (vérif mécanique rendu↔déclaré au moment du dispatch).

- **Fichiers** : `scripts/forge/contract.py` (~30 lignes : 3 sections de rendu +
  1 garde), tests d'accompagnement hors `tests/` (zone protégée).
- **Impact** : le prompt de CHAQUE étape grandit (delegation_context = prose
  parfois longue : +200 à +600 caractères mesurés sur les contrats réels) ;
  `final_prompt_sha256` change pour tous les runs futurs → les chaînes de
  vérification restent valides (l'empreinte est calculée au dispatch), mais
  toute comparaison historique de prompts saute. Les 47 contrats n'ont PAS à
  être modifiés.
- **Risques** : (1) injecter `skill`/`plugin` en texte alors que leur vrai
  consommateur est la couche outils = **doubler une vérité déjà portée
  ailleurs** — exactement le pattern « deux vérités vivantes » de l'incident
  wiremap ; (2) le contenu de `delegation_context` devient influent sur le
  comportement des agents du jour au lendemain (il ne l'a jamais été) — effet
  non calibré sur 47 contrats écrits en croyant le champ inerte.
- **Preuve attendue** : matrice V2 sur une campagne neuve → DECLARED_NOT_INJECTED = 0.
- **Effet sur P5** : débloque P5 après UNE campagne de contrôle (l'effet
  comportemental du nouveau texte injecté doit être observé avant de servir de
  base au jeu test — sinon P5 mesurerait deux changements à la fois).

## Option B — requalification des champs (recommandée)

`SCHEMA.md` gagne une colonne `couche` par champ : `prompt` / `dispatch` /
`documentaire`. `skill`/`plugin` → `dispatch` (consommateur nommé :
`_declared_tools`) ; `delegation_context` → au choix RATIFIÉ : `documentaire`
(traçabilité humaine assumée, jamais exécutée) OU suppression du caractère
obligatoire. La matrice Observer mappe alors : champ `dispatch` injecté nulle
part = **CONFORME** (sa preuve = `allowed_tools`/audit, pas le prompt) ; champ
`documentaire` = hors matrice d'exécution. Le verrou exécutoire devient : la
porte refuse un champ déclaré `prompt` non rendu — règle qui, aujourd'hui, ne
refuse RIEN (tous les champs `prompt` sont déjà rendus) mais fige l'invariant
pour l'avenir.

- **Fichiers** : `scripts/forge/contracts/SCHEMA.md` (doctrine, ratifiée par
  toi), `contract.py` (garde ~10 lignes, ne change AUCUN prompt),
  `scripts/observer/system_agents.py` (mapping matrice par couche).
- **Impact** : zéro changement de prompt, zéro effet sur les 47 contrats,
  historique comparable ; l'écart mesuré devient une déclaration honnête.
- **Risques** : (1) `delegation_context` documentaire = admettre qu'un champ
  obligatoire est de la traçabilité pure — c'est un choix de doctrine, pas un
  défaut ; (2) le consommateur `allowed_tools` est lui-même faible
  (sous-déclaration signée connue) — la requalification doit le nommer sans le
  blanchir.
- **Preuve attendue** : matrice sur campagne neuve → 0 champ `prompt` non rendu,
  0 champ sans couche déclarée ; drift « contrat sans effet réel » ne subsiste
  que si un champ `prompt` manque (vrai signal, plus de bruit).
- **Effet sur P5** : débloque P5 IMMÉDIATEMENT (aucun changement de
  comportement des agents — rien de nouveau à calibrer).

## Recommandation

**Option B**, pour trois raisons : elle applique ta règle « aucune décision dans
un commentaire » (la couche devient un champ structuré ratifié) ; elle ne crée
pas de double vérité skill/plugin ; elle n'introduit aucun changement de
comportement juste avant P5, qui doit mesurer UNE chose : l'apprentissage.
L'option A reste la bonne réponse si tu veux que `delegation_context` devienne
réellement influent — mais alors ce choix mérite sa propre campagne de contrôle.

**Arbitrage demandé** : A / B / B avec suppression de l'obligation sur
`delegation_context`.
