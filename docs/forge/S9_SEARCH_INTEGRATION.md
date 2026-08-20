# s9 Builder — intégration SEARCH + reuse_ratio.mjs (2026-07-13)

- **Demande** : Pierre, « go S9 » — brancher `knowledge_base/search.mjs` dans l'étape
  réelle de construction de la Forge (`docs/forge/STUDIO_AGENT_ATLAS.md` §2.4, cible).
- **claim_verdict** : NO_CLAIM_ALLOWED

## 1. Ce qui a été fait

- **`scripts/forge/contracts/s9-build.yaml` amendé** : nouvelle section §2bis
  (« SEARCH d'abord ») + `objectif`/`final_report`/`output_contract` mis à jour. Le
  builder DOIT interroger `search.mjs` avant d'écrire une pièce de logique réutilisable,
  importer réellement ce qui matche (jamais une copie), n'écrire que le delta. Un
  reuse_ratio bas n'est PAS un motif de blocage automatique — mesuré et rapporté, jamais
  jugé (même discipline que le reste de la Forge : pas de LLM-as-judge, pas de seuil
  caché qui bloquerait silencieusement).
- **`scripts/forge/reuse_ratio.mjs` construit** (+ 7 tests) : mesure déterministe,
  non-LLM, du taux de réutilisation d'un jeu — compte les imports `knowledge_base/`
  parmi les fichiers de logique produit (`game/level/render/input.mjs`), exclut le
  harnais (`main/server/e2e/run-oracle/solvability.mjs`) et les tests. Formule :
  `reuse_ratio = modules_KB_réutilisés / (fichiers_logique + modules_KB_réutilisés)`.
- **Ancré à un vrai jeu du repo, pas seulement des fixtures synthétiques** :
  `games/kb_tactics/` (le seul jeu qui importe réellement depuis `knowledge_base/` à ce
  jour) donne `reuse_ratio = 2/6 ≈ 0.333` — vérifié par test, pas supposé. Un jeu à
  réutilisation nulle (`lab/workflow_lab/WFL-01/control/`) donne bien `0.000`.
- **Contrat vérifié structurellement intact** : `pytest scripts/forge/tests/` (test_contract,
  test_contract_chain, test_dispatch inclus) → 277/277 verts après l'amendement.

## 2. Ce que ceci NE fait PAS — limite honnête, pas cachée

- **Aucun run réel n'a exercé ce changement.** Le driver (`driver.py`) n'a encore
  jamais piloté un jeu de bout en bout (limite déjà connue, cf.
  `studio_brain/00_CURRENT_CONTEXT.md` historique) — tous les jeux existants ont été
  fabriqués par orchestration manuelle du skill, pas par le driver automatisé. Amender le
  contrat `s9-build.yaml` change ce qu'un FUTUR agent builder DOIT faire, mais aucun
  agent builder réel n'a encore tourné avec ce contrat amendé pour le prouver en
  situation. C'est une préparation, pas une preuve d'usage en production.
- **`reuse_ratio.mjs` n'est PAS câblé dans `run-oracle.mjs` ni dans `dispatch.py`** —
  il existe et fonctionne en CLI/import, mais rien n'appelle automatiquement
  `reuse_ratio.mjs` à la fin de s9 aujourd'hui. Le contrat DEMANDE au builder de le citer
  dans son `final_report`, mais aucune garde mécanique ne REFUSE un `final_report` qui
  l'omettrait (contrairement au gate mutation, qui, lui, est câblé et bloquant). Câbler
  ça en dur serait la suite logique si on veut une garde, pas juste une consigne.
- **`catalog.json` n'est pas modifié par le builder** — s9 reste en lecture seule sur
  la bibliothèque (comme documenté), aucune promotion de tier depuis cette étape.

```
software_verdict: OK (contrat amendé, outil construit et testé, aucune régression — 277/277)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
