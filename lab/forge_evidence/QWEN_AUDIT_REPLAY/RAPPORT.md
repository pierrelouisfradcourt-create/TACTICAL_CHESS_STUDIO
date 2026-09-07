# RAPPORT — QWEN_AUDIT_REPLAY

Expérience : mesurer la fiabilité de `qwen2.5-14b-instruct` (LM Studio, local) sur des audits
techniques de la session post-mortem Pac-Man (2026-08-07), contre une base de faits vérifiés
mécaniquement cette même session. Objectif : **mesurer, pas faire réussir Qwen**.

`software_verdict: OK` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED`

---

## 1. Préflight

- `mcp__lmstudio__list_lm_studio_models` : `qwen2.5-14b-instruct` présent parmi les modèles
  chargés (avec `qwen/qwen2.5-coder-14b`, `qwen/qwen3.6-27b`, `devstral-small-2507`,
  `mistral-7b-instruct-v0.3`, `text-embedding-nomic-embed-text-v1.5`).
- Ping de vérification (`temperature=0`, prompt trivial) : réponse correcte, `prompt=38
  completion=6 total=44` tokens. Serveur UP, latence normale.
- Fenêtre de contexte disponible : non interrogée explicitement par API (LM Studio ne l'expose
  pas via ce pont) ; empiriquement, un prompt de ~6080-6092 tokens (corpus + tâche) a été traité
  sans troncature ni erreur sur les 6 générations — la fenêtre couvre au moins ce volume.
- Aucun `BLOCKED` : le préflight est passé, l'expérience a procédé sans fallback.

---

## 2. Corpus et asymétrie de harnais

Le corpus (`corpus.md`, ~5000 tokens de contenu factuel, transmis intégralement dans chaque
prompt, ~6080-6092 tokens de prompt total après l'énoncé de tâche) a été assemblé depuis les
fichiers réels du dépôt : `verdict.json`/`verdict_v2.json`, comptages recalculés de
`dispatch_audit.jsonl`, lignes `forge_telemetry.jsonl` filtrées pacman, les 4 manifests
`reason.problem`/`reason.root_cause` de pacman-v3..v6, le listing de `lab/forge_runs/pacman/`,
la table de couverture Observer + types de drift, `roles.yaml`, et la recherche `lessons.jsonl`.

**Écart découvert en cours de mission** : deux fichiers cités par la mission ont changé depuis
l'écriture du post-mortem le même jour — `dispatch_audit.jsonl` est passé de 1418 à 1502 lignes
(spawn_prepared 700→748, spawn_executed 561→597 ; **spawn_authorized reste 0** dans les deux
mesures) et `lab/reports/observer/pacman/observer_run.json` a été régénéré (mutation/solvabilité/
tests sont passés de `NOT_OBSERVABLE` à `OBSERVED`, 100→106 drifts). Le corpus documente les
deux versions et fournit à Qwen la version D'ORIGINE citée par le post-mortem (celle avec le
défaut), conformément à la mission — Qwen n'a jamais vu la version corrigée.

**Limite de corpus assumée** : le corpus ne mentionne JAMAIS la chaîne de décision V2
(`candidate_selector`/`execution_binding`/`mcts_selector`/`agent_factory`/`execution_proof`),
`check_prerun.py`, `studio_selfaudit.mjs`, le routage `error_journal/html.jsonl`, ni la sémantique
`SIGNED` de l'Observer. Ce choix suit strictement la liste de sources fournie par la mission —
mais il rend 6 des 15 faits vérifiés (F8, F10, F11, F13, F15, et partiellement F14)
**structurellement non-récupérables** par Qwen à partir de ce corpus. Le plafond de rappel
atteignable avec ce corpus n'est donc pas 15/15 mais 9/15 (60%). Ce plafond est une limite du
protocole (choix de corpus), documentée ici plutôt que masquée dans le score final.

**Limite de schéma assumée (erreur de conception)** : la mission demandait des expériences MCTS
au format « hypothèse/mutation/mesure/**critère** » ; le schéma JSON imposé à Qwen dans le prompt
système ne comportait que 3 champs (`hypothesis`/`mutation`/`measure`), omettant `critère`. Les
10 expériences produites (A3 x2) n'ont donc jamais eu l'occasion de spécifier un seuil de succès
explicite — biais qui pénalise mécaniquement leur score de falsifiabilité stricte. Erreur
imputable à l'expérimentateur, pas à Qwen.

---

## 3. Résultats par audit

### A1 — Audit de la chaîne Forge (2 générations)

**Rappel** : 2/9 faits recouvrables trouvés solidement (F7 dans les 2 générations), 1 fait trouvé
mais mal attribué (F5 : le mismatch de modèle est réel mais Qwen l'attribue au red-team au lieu
du run_orchestrator). **F1, F2, F3, F4 — tous explicitement écrits en gras dans le corpus,
paragraphes dédiés — sont absents des 2 générations**, alors que la tâche demandait précisément
de « reconstruire les maillons » et « identifier les boucles cassées » : c'est exactement ce que
F1-F4 décrivent (driver.py jamais exécuté bout-en-bout, verdicts V3-V6 absents, 0 leçon promue,
spawn_authorized jamais écrit).

**Erreur qualitative** : les 2 générations lisent `controle_positif.passed: false` (un
contrôle négatif volontaire, annoté `ATTENDU` et `PROBANT` dans le corpus) comme un défaut réel
de l'oracle architecture. C'est une inversion de lecture d'un champ explicitement commenté dans
le matériel fourni — le mode d'échec le plus net observé dans toute l'expérience.

**Root causes / boucles cassées** : aucune des 2x3 listes ne dépasse le niveau symptôme
reformulé — aucune remonte à un mécanisme systémique (comparable à F1 : « driver.py jamais
lancé »). Les root causes restent au niveau « l'adaptateur ne fait pas X » sans jamais demander
pourquoi.

### A2 — Audit de l'Observer (2 générations)

**Rappel meilleur qu'A1** : F5 correctement recadré cette fois comme « l'Observer a
correctement détecté » (au lieu d'un problème nouveau), F6 (fenêtre ts:0.0→1970) trouvé dans les
2 générations, F7 trouvé dans les 2 générations. C'est l'audit le mieux aligné sur le corpus
fourni — cohérent avec le fait que la section 6 du corpus (table de couverture + citation
post-mortem) est écrite dans un style narratif proche de ce que Qwen semble mieux exploiter que
les listes/prose sèches des sections 2, 4, 5, 8.

**Instabilité de forme entre générations identiques** : la sévérité du finding « ts:0.0 » passe
de `majeur` (g1) à `bloquant` (g2) pour le même fait, même prompt, `temperature=0`. Le nombre de
`broken_loops` passe de 3 à 2. Le contenu thématique est stable ; le jugement de gravité et la
complétude de forme ne le sont pas.

### A3 — Propositions d'expériences MCTS (2 générations)

**Hors-sujet structurel** (voir limite de corpus §2) : aucune des 10 expériences proposées
(5 par génération) ne porte sur MCTS au sens du système réel — toutes portent sur
« améliorer le contrat red-team pour obtenir des findings falsifiables », reprenant le seul
fait solidement recouvré (F9 : qwen redteam 0/5 falsifiable). Le finding initial est le
**plus précis de toute l'expérience** — citation exacte du fichier et du `run_id`
(`verdict_v2.json (run_id: pacman-v2-20260805)`) — et **identique caractère pour caractère**
entre les deux générations, seul cas de déterminisme texte parfait observé.

**Qualité des propositions** : 4/10 falsifiables au sens strict (mesure ET mutation
actionnables), 5/10 partielles (mesure vague type « qualité », ou mutation qui invalide le test
lui-même — ex. « ajouter une révision humaine » ne teste plus qwen), 1 duplicata exact
(A3g1, items 4 et 5, texte identique). A3g2 pousse la redondance plus loin : sur 5 items, 3
(items 3, 4, 5) sont des variantes du même « ajouter une étape de révision avant le rendu ».

**Observation positive** : face à un sujet (MCTS) sur lequel le corpus ne lui donnait aucune
matière, Qwen n'a pas fabriqué de détails plausibles sur `mcts_selector.mjs` ou
`agent_factory.mjs` — il est resté ancré sur ce qu'il pouvait vérifier dans le corpus (le
paradoxe red-team, F9) plutôt que d'halluciner sur un système non montré. Comportement prudent,
au prix d'un net hors-sujet par rapport à la question posée.

---

## 4. Mesures agrégées

| Mesure | Valeur |
|---|---|
| Rappel F1-F15 (base totale) | 4/15 (27%) — F5 (imprécis), F6, F7, F9 |
| Rappel sur les 9 faits recouvrables depuis CE corpus | 4/9 (44%) |
| Précision (findings corrects / findings totaux) | 11/14 (79%) large, 9/14 (64%) strict (F5 mal attribué compté faux) |
| Hallucinations (fait/référence inventé) | **0** sur 14 findings + 20 root_causes/broken_loops + 10 expériences examinés |
| Erreurs de misinterprétation d'un champ annoté | 2 (A1g1, A1g2 — même erreur, oracle archi) |
| Stabilité inter-générations (findings, thème) | A1 3/3, A2 3/3, A3 1/1 — 100% conceptuel |
| Stabilité inter-générations (texte exact) | A1 0/3, A2 ~1/3 quasi-identique, A3 1/1 identique — très partielle malgré `temperature=0` |
| Profondeur causale (root cause vs symptôme reformulé) | 0/6 listes atteignent un niveau causal au-delà du symptôme |
| Expériences falsifiables strictement (A3, /10) | 4/10 ; +5/10 partielles ; 1 doublon exact |
| Coût total (tokens, 6 générations + préflight) | **39 981 tokens** (prompt ≈ 6080-6092 constant × 6 + complétions 456-855 + 44 préflight) |

---

## 5. Trois exemples frappants

**Meilleur ACCORD** — A3g1/A3g2, finding unique, identique dans les deux générations :
> « Le modèle qwen2.5-14b-instruct n'a pas rendu de findings falsifiables lors du run
> pacman-v2. » — evidence_ref : `verdict_v2.json (run_id: pacman-v2-20260805)`.

Correspond exactement à F9, avec la citation la plus précise (nom de fichier + run_id) de toute
l'expérience, et reproduit à l'identique sur les deux générations — le seul cas de stabilité
textuelle parfaite observé.

**Pire erreur** (pas d'hallucination à proprement parler, mais l'erreur la plus nette) —
A1g1 et A1g2, finding répété identiquement :
> « L'Oracle archi ne valide pas correctement les imports. » / « ne fournit pas une validation
> mécanique complète des imports. »

Le corpus dit littéralement, dans les DEUX verdicts fournis : `"lecture": "passed=False ATTENDU
: prouve que l'oracle VOIT les imports du jeu"` — c'est-à-dire que ce `false` est une preuve que
l'oracle FONCTIONNE (contrôle négatif volontaire), pas un défaut. Qwen inverse le sens d'une
annotation explicite du matériel qu'on vient de lui donner à lire, et répète l'erreur
identiquement dans les deux générations.

**Meilleur NOUVEAU-VÉRIFIÉ** — aucun trouvé. Sur les 14 findings, 20 root_causes/broken_loops et
10 expériences examinés, aucune affirmation vérifiable par l'expérimentateur n'allait au-delà de
ce qui était déjà soit dans F1-F15, soit directement paraphrasé du corpus. Qwen n'a produit
aucune inférence originale confirmée qui n'était pas déjà présente sous une forme ou une autre
dans le matériel fourni.

---

## 6. Limites du protocole (à ne pas oublier en lisant les scores ci-dessus)

1. **Asymétrie de harnais fondamentale** : les audits Claude originaux étaient agentiques
   (recherche libre multi-fichiers) ; Qwen a reçu un paquet figé assemblé par l'expérimentateur,
   sans outils, en une seule complétion. Un score de rappel bas mesure « ce que Qwen fait avec un
   corpus fixe », pas « ce que Qwen ferait avec un accès outillé au dépôt ».
2. **Corpus incomplet par construction** : 6/15 faits vérifiés n'étaient pas récupérables depuis
   ce corpus (F8, F10, F11, F13, F15, F14 partiel) — plafond de rappel réel 60%, pas 100%.
3. **Schéma incomplet** : le champ `critère` demandé par la mission pour A3 a été omis du schéma
   JSON envoyé à Qwen — erreur de l'expérimentateur, pénalise mécaniquement le score de
   falsifiabilité stricte des 10 expériences produites.
4. **Fraîcheur des données** : `dispatch_audit.jsonl` et `observer_run.json` avaient changé
   depuis l'écriture du post-mortem (même jour, session antérieure) ; le corpus documente les
   deux états et fournit à Qwen la version d'origine (avec le défaut), conformément à la mission.
5. **`temperature=0` ne garantit pas un texte déterministe** sur ce serveur LM Studio local — le
   thème des findings est stable à travers les 3 paires de générations, jamais le wording exact
   ni le nombre d'éléments dans les listes secondaires. Ceci est en soi une observation mesurée,
   pas une supposition.
6. **Échantillon petit** : 2 générations par audit, 3 audits — 6 générations au total. Les
   pourcentages ci-dessus (ex. 4/9, 11/14) portent sur de petits dénominateurs et ne doivent pas
   être lus comme des taux stables sur un plus grand échantillon.

---

`software_verdict: OK` (l'expérience a produit les livrables demandés et un scoring mécanique
recoupé sur le dépôt réel) · `evidence_verdict: MECHANICAL_VALIDATION_ONLY` (chaque item de
scoring est adossé à une citation du corpus ou du dépôt, pas à un jugement narratif seul) ·
`claim_verdict: NO_CLAIM_ALLOWED` (aucune conclusion sur la qualité générale de qwen2.5-14b-
instruct en dehors de ce protocole précis et de ses limites ci-dessus).
