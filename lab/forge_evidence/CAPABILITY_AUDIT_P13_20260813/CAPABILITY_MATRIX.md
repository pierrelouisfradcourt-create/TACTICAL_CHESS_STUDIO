# AUDIT DE CAPACITÉS — 7 étapes LLM de conception (P1.3, 2026-08-13)

> `claim_verdict: NO_CLAIM_ALLOWED` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY`
> Mission : mesurer CONTRACT → DECLARED → EFFECTIVE → USED, sans modifier le dépôt.
> Runtime : demandé Fable 5 (`/model claude-fable-5`) ; l'environnement d'exécution se déclare
> `claude-opus-5`. Écart signalé, non résolu depuis l'intérieur de la session.
> Aucune modification du dépôt pendant cet audit. Baseline revalidée : arbre 120 entrées,
> HEAD `111fa4b`, seul code modifié de la session = `run_real.py` (+71/−1, P1.2).

## Résultat central

**Le champ `permissions` des contrats déclare les capacités requises — et il n'est câblé à
RIEN.** Aucun canal ne relie `contract.permissions` à `_STEP_TOOLS` (l'organe qui, depuis P1.2,
détermine les capacités effectives par complément). Les deux couches ont toujours été
indépendantes ; avant P1.2 le fail-open masquait la divergence, P1.2 l'a rendue active.

Conséquence mesurée : les **7 contrats exigent `read: repo`**, un exige `run: WebSearch,
WebFetch` (s2), deux exigent une écriture agent (s1, s6) — et l'exécuteur refuse **13/13 outils
aux 7 étapes** (`_STEP_TOOLS` vide partout → complément total).

## Matrice CONTRACT → DECLARED → EFFECTIVE → USED

| step | contract_requires (champ `permissions` du YAML) | declared `_STEP_TOOLS` | effective (post-P1.2) | observed_used | proof | verdict |
|---|---|---|---|---|---|---|
| s0-contrat | Read(repo) · Write(charter.yaml) | `()` | 13/13 refusés | NOT_MEASURED | contrat l.perm ; `_derive_disallowed(())` | **CONTRAT NON LIVRABLE** (Read+Write requis, refusés) |
| s1-prisme | Read(repo+charter) · Write(product_snapshot.md) | `()` | 13/13 refusés | **Read USED pré-P1.2** (sortie P1 cite `state.json`/`is_game` — 3 occurrences, valeurs absentes du prompt) ; post-P1.2 NOT_MEASURED | `P1_baseline/s1-prisme.txt` | **CONTRAT NON LIVRABLE** ; Write jamais accordé même pré-P1.2 → cause racine du `product_snapshot.md` manquant |
| s2-worldscan | Read(repo+snapshot+KB) · **run: WebSearch, WebFetch** | `()` | 13/13 refusés | web pré-P1.2 : NOT_MEASURED (15 URLs dans worldscan.json P1 — compatibles mémoire modèle, aucun log d'outil) ; post-P1.2 : refusé | contrat l.perm ; run `p1-3` HALTED | **CONTRAT NON LIVRABLE — PROUVÉ EN VIVO** (HALTED, 0 bloc JSON) |
| s3-decompo | Read(repo) · Write(featuremap) | `()` | 13/13 refusés | NOT_MEASURED | contrat l.perm | **CONTRAT NON LIVRABLE en lecture** ; écriture couverte par l'exécuteur (`_ARTIFACT_BY_STEP` matérialise `featuremap.json`) |
| s4-archi | Read(repo) · Write(blueprint.yaml) | `()` | 13/13 refusés | NOT_MEASURED | contrat l.perm | idem s3 (matérialisation `blueprint.json`) |
| s5-wiremap | Read(repo+blueprint+featuremap) · Write(WireMap) | `()` | 13/13 refusés | NOT_MEASURED | contrat l.perm | idem s3 (matérialisation `wiremap.json`) |
| s6-redteam-plan | Read(repo) · Write(rapport + artefacts ajustés) | `()` | 13/13 refusés | NOT_MEASURED | contrat l.perm | **CONTRAT NON LIVRABLE** (Write requis, aucun matérialiseur pour son rapport) |

Niveau « USED » : le capteur `tool_observability` rend `loaded: {status: NOT_MEASURED,
tools: []}` sur tous les runs observés — le niveau 4 est **structurellement non mesuré** par le
dépôt. Seule exception : la preuve indirecte Read/s1 pré-P1.2 (contenu impossible autrement).

## Nuances qui empêchent une conclusion uniforme

1. **« Write » au contrat ne veut pas dire « outil Write »** pour s2/s3/s4/s5 : le patron réel
   est « bloc JSON terminal → l'exécuteur matérialise » (documenté dans s2 lui-même). Pour ces
   étapes, la divergence Write est TEXTUELLE (contrat pas à jour), pas fonctionnelle.
2. Pour **s1 et s6**, en revanche, le contrat attend une écriture agent qu'aucun matérialiseur
   ne remplace (`product_snapshot.md`, `rapport_redteam_plan.md`). Divergence FONCTIONNELLE —
   c'est la cause racine mesurée du chaînon manquant P2a.
3. **« read: repo » requis partout vs injection `_UPSTREAM_BY_STEP`** : la transmission par
   injection couvre les artefacts amont listés, PAS les `mandatory_read` (SCHEMA.md, manuels,
   checklists…). Post-P1.2, ces lectures ordonnées par contrat sont impossibles. Suffisance :
   NOT_MEASURED (P1.3 n'a pas atteint s1).

## Expériences

| exp | question | résultat |
|---|---|---|
| P1.3 run réel (`p1-3-exclusivity-20260813`) | la chaîne amont tourne-t-elle post-P1.2 ? | **HALTED à s2** — `BLOCKED_BEFORE_TARGET` pour les 3 axes s1 (TRANSMISSION/EXCLUSIVITY/SUFFICIENCY) |
| croisement statique contrats↔`_derive_disallowed` | les besoins contractuels sont-ils couverts ? | **NON, 7/7** — résolu sans LLM |
| preuve d'usage P1 baseline | Read utilisé pré-P1.2 ? | **OUI pour s1** (citations `state.json`) ; web s2 : indécidable (URLs ∈ mémoire possible) |

Aucune expérience LLM supplémentaire lancée : chaque question restante est soit résolue
statiquement, soit `BLOCKED_BEFORE_TARGET` (exiger un run complet passe par s2, qui est cassé),
soit structurellement non mesurable (niveau USED sans capteur).

## Classification cause racine

| incapacité observée | classe | niveau responsable |
|---|---|---|
| aucun canal `contract.permissions` → `_STEP_TOOLS` (7/7) | **SYSTEMIC** | architecture du runtime d'exécution (`run_real.py`) — le contrat déclare, personne ne consomme la déclaration |
| s2 HALTED sans web | **TRANSMISSION** (symptôme du SYSTEMIC ci-dessus) | la capacité est déclarée AU CONTRAT et n'atteint jamais l'exécuteur |
| `product_snapshot.md` sans producteur (s1) | **TRANSMISSION** | contrat attend une écriture agent, exécuteur ne l'a jamais accordée, aucun matérialiseur |
| `mandatory_read` illisibles post-P1.2 | **TRANSMISSION** | déclaration documentaire sans canal (connu : seul `_UPSTREAM_BY_STEP` transmet) |
| niveau USED non mesurable | **SYSTEMIC** | capteur `tool_observability` rend NOT_MEASURED par construction |
| contrats s2/s4/s5 disant « write » pour un patron de matérialisation | **DESIGN** (texte de contrat périmé) | Architect/contract_author |

Aucune classe KNOWLEDGE, MEMORY ou EXECUTION : l'information existe partout, elle ne circule pas.

## Mutations recommandées (AUCUNE appliquée)

| # | mutation | gate |
|---|---|---|
| M1 | câbler `contract.permissions` comme SOURCE de `_STEP_TOOLS` (dérivation, une seule vérité) au lieu de deux tables indépendantes | **HUMAN_REQUIRED** — change l'architecture des permissions |
| M2 | en attendant M1 : déclarer `("WebSearch","WebFetch")` pour s2-worldscan, dérivé de son contrat ratifié | **HUMAN_REQUIRED** — élargit une allow-list |
| M3 | trancher s1 : écriture agent (contrat) OU matérialiseur texte (GO-1 déjà posé) — pas les deux | **HUMAN_REQUIRED** — GO-1 |
| M4 | mettre à jour le TEXTE des contrats s4/s5 (« write » → « bloc JSON, l'exécuteur matérialise », comme s2 le documente déjà) | **HUMAN_REQUIRED** — édition de contrats |
| M5 | capteur du niveau USED (combler `tool_observability.loaded`) — même chantier que l'oracle de dérive `_TOOL_UNIVERSE` et que le jumeau `Task→Agent` | **HUMAN_REQUIRED** — nouveau capteur |
| — | s0/s3/s6 : `NO_MUTATION` individuelle — couverts par M1 | — |

## Gates humaines ouvertes (cumul session)

§7.1 identité producteur interactif · §7.2 stations amont · GO-1 (P2a texte) ·
M1–M5 ci-dessus · reprise P1.3 (impossible avant M2 ou équivalent).
