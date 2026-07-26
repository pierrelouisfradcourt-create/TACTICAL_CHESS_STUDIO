# MISSION M1 — Télémétrie d'échec (gabarit AAA §3.3)

Date : 2026-07-26 · Statut : **PRÉPARÉE, NON LANCÉE** (go-préparation Pierre 2026-07-26 ;
le lancement est une validation séparée). Suivi : `lab/forge_runs/RUN_INDEX.md`.
`claim_verdict: NO_CLAIM_ALLOWED`.

## OBJECTIF (une phrase, falsifiable)
Après cette mission, un échec d'étape Forge produit une ligne de télémétrie portant son
issue, son coût réel et le modèle réellement exécuté — aujourd'hui il n'en produit aucune.

## CONTEXTE VÉRIFIÉ (à re-vérifier par l'exécutant, pas à croire)
- `scripts/forge/driver.py` : `record_telemetry` n'est appelé qu'après
  `entry["status"] = "OK"` (~l.468-472) ; le chemin `_halt_step` (~l.440) retourne avant.
  Vérifié par lecture directe le 2026-07-26.
- `cost_usd` est calculé (~l.447) et stocké dans `entry["detail"]`, mais
  `studio_link.record_telemetry` (l.77-90) n'a pas de paramètre coût — la valeur est jetée.
- Le champ `model` de la télémétrie reçoit `payload.model` (modèle du CONTRAT), jamais
  `state["model_override"]` (modèle exécuté après escalade). Preuve croisée : les lignes
  telemetry disent `claude-haiku-...` là où `forge_builder_runs.jsonl` dit sonnet/opus
  (appariement par `duration_s`, matrice 2026-07-26).
- Conséquence mesurée : 3 533 362 tokens tracés, tous sur succès — 187 267 tokens de
  tentatives sans oracle vert invisibles ; « coût par succès » incalculable.

## PIÈGES CONNUS (table de confiance §4.2 du protocole)
- `state.json` écrase `detail` à chaque tentative — ne PAS s'en servir comme journal.
- `forge_telemetry.jsonl` est append-only et consommé par des lecteurs existants
  (analyses, wiremap_nav éventuel) : le format des lignes EXISTANTES ne doit pas casser —
  champs ADDITIONNELS uniquement, normalisation à la lecture (patron `marker_key`).
- L'écriture télémétrie est best-effort (`except OSError`) : elle ne doit JAMAIS faire
  échouer un run — y compris sur le nouveau chemin d'échec.
- Les tests du dépôt ne doivent RIEN écrire hors `tmp_path` (fixture d'isolation
  `conftest.py` existante pour learning_curve — même exigence ici pour la télémétrie ;
  vérifier si la fixture couvre déjà `telemetry_path`, sinon l'étendre).

## DESIGN IMPOSÉ (arbitré — ne pas redessiner)
1. Télémétrie écrite AUSSI sur `_halt_step`, avec champ `outcome: "OK" | "HALT"`
   (les lignes historiques sans `outcome` se normalisent en `"OK"` à la lecture).
2. `cost_usd` ajouté à `record_telemetry` (paramètre optionnel, défaut rétro-compatible).
3. Le champ `model` porte le modèle RÉELLEMENT exécuté :
   `state.get("model_override") or payload.model` — même résolution que le journal (l.480).
4. AUCUNE métrique nouvelle dans cette mission au-delà de « tokens par étape réussie,
   par run » (dérivée, lecture seule). Le plafond D2 n'est PAS implémenté ici (valeur
   différée — décision Pierre).

## CONTRAINTES
- Périmètre : `scripts/forge/driver.py`, `scripts/forge/studio_link.py`,
  `scripts/forge/tests/` (+ `conftest.py` si extension d'isolation nécessaire). RIEN d'autre.
- ADVISORY STRICT : `verdict.py`, `gate.py`, `verify_run.py` intouchés ; aucun verdict,
  aucun gate, aucun comportement de run modifié — seule l'OBSERVATION s'enrichit.
- Zones gelées intouchées (`autopilot.py`, `scripts/studioV2/`, `src/`, `ml/`).
- Ne commite pas, ne push pas (gate Pierre).

## MÉTHODE
TDD strict : tests AVANT code, RED constaté et montré, puis GREEN. Cas limites listés
d'avance : halt avant tout appel LLM (tokens=0 → écrire quand même, coût 0 mesuré ≠
non mesuré) · exception dans l'exécuteur · `model_override` absent · double halt ·
rétro-compat lignes sans `outcome`/`cost_usd` · échec d'écriture télémétrie avalé.
Encodage `utf-8` explicite partout.

## PREUVE EXIGÉE
- RED puis GREEN réels (sorties collées, pas affirmées).
- Suite complète : `.venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`
  — référence 840 passed, 1 skipped ; zéro régression + nouveaux tests comptés.
- Test rétroactif à coût nul : rejouer la résolution du modèle sur les données shmup
  archivées et montrer que la ligne aurait dit opus (et non haiku).
- `git status --porcelain` après tests : rien hors périmètre, rien d'écrit en durable.
- Critères falsifiables du RUN_INDEX (a)→(e) adressés un par un.

## RAPPORT
software_verdict / evidence_verdict: MECHANICAL_VALIDATION_ONLY /
claim_verdict: NO_CLAIM_ALLOWED. Preuve d'exécution, pas d'existence.
