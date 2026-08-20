# FORGE OBSERVER V0 — cartographie, architecture, résultats

*Date : 2026-07-31 · Périmètre : lecture seule stricte · Golden run : campagne Breakout V2*

```
software_verdict : OK        (corrélateur exécuté, reconstruction produite, comparaison passée)
evidence_verdict : MECHANICAL_VALIDATION_ONLY
claim_verdict    : NO_CLAIM_ALLOWED
```

Observer n'a modifié **aucun** fichier de la Forge, des contrats, des agents, des runners
ou des jeux. Il écrit uniquement sous `lab/reports/observer/<projet>/`.

---

## 1. Cartographie des traces existantes

### 1.1 Ce qui existait déjà — et qui rend Observer possible sans nouvelle capture

Le studio ne souffrait pas d'un déficit de télémétrie. Il souffrait d'une absence de
lecteur. Sources réellement présentes pour un run Forge :

| Source | Granularité | Ce qu'elle porte | Preuve |
|---|---|---|---|
| `lab/forge_runs/<p>/state.json` | run + étape | statut, tentatives, détail, horodatages | mécanique |
| `lab/forge_runs/<p>/verdict.json` | run | décision, verdicts, HMAC, nonce, git_head, oracles | **signée** |
| `context/<etape>.manifest.jsonl` | activation | modèle, `contract_sha256`, sources, `tools_effective`, empreintes de prompt | **signée** |
| `context/<etape>.reasoning_observability.jsonl` | activation | `capability_role`, modèle déclaré, statut de résolution | **signée** |
| `context/<etape>.tool_observability.jsonl` | activation | outils déclarés, `loaded.status` | **signée** |
| `lab/forge_evidence/dispatch_audit.jsonl` | activation | `spawn_prepared` / `spawn_executed`, modèle, rôle | **signée** |
| `lab/forge_evidence/forge_telemetry.jsonl` | activation | coût, durée, tokens, issue | mécanique |
| `lab/forge_evidence/forge_builder_runs.jsonl` | tentative | tier, stratégie, retry, coût estimé | mécanique |
| `evidence/mutation_<run_id>.raw.json` | run | mutants tués/survivants, fichiers, gate | mécanique |
| `evidence/oracle_<projet>.log` | run | assertions, solvabilité R9 | mécanique |
| `reference_guard.jsonl` | phase | dérive de fichiers protégés | mécanique |
| `playtest/playtest_capture_report.json` | run | captures GPU, tailles, différence | mécanique |
| `lab/reports/error_journal/*.jsonl` | incident | erreur, statut, résolution | mécanique |
| `artifacts/<etape>.txt` | étape | rapport de l'agent sur son propre travail | **auto-déclarée** |
| `wiremap.json` | run | registre de lignes, fichiers, preuves attendues | **auto-déclarée** |
| Transcripts Claude Code | message | modèle, outils, fichiers lus/écrits, commandes, tokens | mécanique |

### 1.2 Le pont qui manquait

Les agents d'étape Forge sont lancés par `run_real.py` via `claude -p` en sous-processus.
**Chacun produit sa propre session Claude Code**, identifiable par trois signatures
mécaniques : un seul `promptId`, aucun `customTitle`, et un marqueur de dispatch en tête
de prompt encodant `etape`, `run_id` et parfois la tentative.

C'est ce marqueur qui relie l'univers Forge (`lab/`) à l'univers d'exécution
(`~/.claude/projects/`). Il existait déjà. Personne ne l'utilisait pour observer.

### 1.3 Trois pièges de normalisation, rencontrés en vrai

1. **Quatre vocabulaires pour « tentative »** : `attempt` (dispatch_audit), `activation`
   (manifests), `retry_number` (builder_runs), `attempts` (state.steps). Aucun champ
   commun. Observer conserve la valeur **et** le nom du champ d'origine.
2. **Quatre formats de temps**, dont deux sans fuseau. `error_journal` porte `date` (ISO
   local sans marqueur) **et** `ts` (epoch) dans le même objet : lire `date` comme de
   l'UTC décale de 2 h. Observer étiquette `iso_naive` / `log_naive` au lieu de convertir
   en silence.
3. **Renommages silencieux** : `forge_builder_runs.jsonl` appelle `task_id` ce que tout le
   monde appelle `run_id`, et `builder_id` ce que tout le monde appelle `model`.

---

## 2. Architecture d'Observer V0

```
scripts/observer/
├── events.py      schéma d'événements — structures pures, n'ouvre aucun fichier
├── sources.py     ObserverContext — lecture seule + garde de cécité
├── correlate.py   assemblage en runs/étapes, couverture, détection de drift
├── compare.py     confrontation au rapport humain (phase 2 seulement)
├── cli.py         point d'entrée
└── adapters/
    ├── forge_run.py        run_dir : state, verdict, contexte, preuves, artefacts
    ├── forge_evidence.py   fichiers partagés + commits git
    └── transcripts.py      sessions Claude Code
```

### 2.1 Les deux garanties, implémentées et non promises

**Lecture seule.** `ObserverContext` n'expose aucune fonction d'écriture. Les commandes
git sont filtrées par liste blanche : `commit`, `checkout`, `reset` sont refusés au niveau
du code, pas de la discipline.

**Cécité.** La reconstruction doit se faire sans le rapport humain. Ce n'est pas une
consigne, c'est une contrainte structurelle : `ALLOWED_ROOTS` liste cinq racines lisibles
(run_dir, jeu, forge_evidence, error_journal, transcripts). `docs/` — où vit le rapport —
lève `BlindnessViolation`, jamais rattrapée par un adaptateur.

Vérifié à l'exécution : `state.json` passe, `BREAKOUT_V2_CHARTER_PROPOSED.md`,
`00_CURRENT_CONTEXT.md` et `CLAUDE.md` sont refusés.

### 2.2 Contrat d'adaptateur

```python
NAME = "forge_run"
def collect(ctx: ObserverContext) -> list[Event]: ...
```

Un adaptateur lit uniquement via `ctx`, ne rattrape jamais `BlindnessViolation`, et traite
une source absente comme un saut — pas comme une erreur.

---

## 3. Schéma des événements

Un événement ne porte jamais une valeur nue. Il porte **trois axes de confiance** :

**`proof` — la nature de la preuve.**

| valeur | signification |
|---|---|
| `SIGNED` | trace mécanique + HMAC vérifiable |
| `MECHANICAL` | produite par du code, non falsifiable par l'agent |
| `SELF_DECLARED` | prose écrite par l'agent sur son propre travail |
| `INFERRED` | déduit par Observer, jamais lu tel quel |

**`link` — comment l'événement a été rattaché à un run.**

| valeur | signification |
|---|---|
| `DIRECT` | champ `run_id` présent dans l'objet |
| `BY_FILENAME` | `run_id` lisible dans le nom du fichier |
| `BY_PATH` | déduit du dossier de run |
| `BY_FILE_SCOPE` | marqueur en tête de session, étendu au fichier — **inférence** |
| `UNLINKED` | non rattaché (les commits, par exemple) |

**`source` — chemin, format, ligne**, pour que toute affirmation soit relisible à la main.

Sans ces trois axes, Observer reproduirait le théâtre d'oracle : un reçu signé et une
prose auto-satisfaite auraient la même apparence de vérité.

**Chaîne canonique reconstituée** :
`Run → Dispatch → Agent → Contexte → Tools → Fichiers → Tests → Preuves → Verdict`

**Identifiants déterministes** : deux exécutions sur les mêmes traces produisent les mêmes
`event_id`. Un diff entre deux exécutions est donc signifiant.

---

## 4. Reconstruction du golden run

```
évènements : 4493      runs : 6      écarts : 42      sources lues : 861
```

| run_id | rôle | fenêtre UTC | durée | statut | décision | év. |
|---|---|---|---:|---|---|---:|
| `breakout_v2-dryrun` | dryrun | 00:10:31 | 0 s | — | — | 1 |
| `breakout_v2-dryrun2` | dryrun | 00:16:22 | 0 s | — | — | 1 |
| `breakout_v2-wm1-…021904` | pre_run | 00:19:04 → 11:15:47 | — | — | — | 381 |
| `breakout_v2-run1-…082705` | tentative | 06:27:05 → 10:02:27 | 3 h 35 | DONE | **BLOCKED** | 2061 |
| `breakout_v2-run2-…101252` | tentative | 08:12:53 → 11:06:04 | 2 h 53 | DONE | HUMANGATE_READY | 1026 |
| `breakout_v2-run3-…111149` | tentative | 09:11:49 → 13:27:34 | 4 h 15 | DONE | HUMANGATE_READY | 1020 |

Le golden run n'est pas un run : c'est un arbre de trois tentatives précédé d'un pré-run
wiremap. Observer modélise l'échec au même titre que le succès — une reconstruction qui
ne montrerait que le run 3 raconterait une campagne qui n'a jamais eu lieu.

**Couverture : 17 données attendues sur 17 sont `OBSERVED`, aucune `NOT_OBSERVABLE`.**
Chronologie, agents, modèles, contrats, contexte injecté, outils réellement utilisés,
fichiers lus, fichiers modifiés, tokens, coûts, tests, mutation, solvabilité,
failure_events, captures, verdict signé, commits.

---

## 5. Comparaison automatique au rapport humain

Produite **après** que la reconstruction a été figée. Les affirmations sont extraites du
rapport par regex sur le fichier réel, pas recopiées à la main.

| classe | n |
|---|---:|
| RECONSTRUIT | 18 |
| PARTIEL | 1 |
| CONTRADICTOIRE | **0** |
| NOT_OBSERVABLE | 3 |
| MANQUANT | 1 |

**Aucune affirmation comparée n'est sans provenance** : chaque ligne cite son fichier et
son emplacement (numéro de ligne, chemin de champ, ou portée explicite).

Le seul `PARTIEL` — « builder et red-team sur opus-4-8 » — concorde, mais son
établissement passe par une inférence de portée de session. Le classer `RECONSTRUIT`
reviendrait à donner à une déduction le même rang qu'à une trace portant son `run_id`.

**Le rapport humain est exact sur tout ce qui est mécaniquement vérifiable** — et il l'est
sans qu'Observer l'ait lu pour reconstruire : 3 runs,
décisions BLOCKED/HUMANGATE_READY, mutation 73/73 et 59/73, 305 assertions, 0 échec,
solvabilité 50/50, ancrage git `2b38702`, timeout s9 à 1800 s, 2 captures, 1 pool retry,
0 escalade, `provider=claude-local`, modèle opus-4-8 sur builder et red-team.

**« 9+5+6 étapes exécutées » : contradiction apparente, dissoute.** Observer comptait
d'abord les étapes distinctes du pipeline (5, 5, 5). En comptant les activations d'agent
(`dispatch.executed`) — l'unité qu'employait le rapport — Observer retrouve exactement
9, 5, 6. Ce n'était pas un désaccord de fait, mais d'unité. Une comparaison qui ne
vérifie pas l'unité fabrique de fausses contradictions.

**1 NON RETROUVÉ, imputable à Observer et pas au rapport** : la copie wiremap divergée
`_run2_20260731/wiremap_rundir_constats_stale.json` existe bien ; l'adaptateur V0 ne la
lit pas.

**3 INCONNU, correctement classés** : le ressenti de jeu, la classification des causes
d'échec, et les leçons L1-L5. Ce sont des jugements. Aucune trace ne les atteste ni ne les
infirme, et prétendre le contraire serait la faute la plus grave qu'un observateur puisse
commettre.

---

## 6. Ce qu'Observer a vu et que personne ne regardait

### 6.1 Le modèle signé n'est pas le modèle exécuté

L'étape `wm1-wiremap-breakout` déclare `claude-opus-4-8` dans l'audit **signé HMAC**. Les
83 messages du transcript portent `claude-opus-5`.

Cause : `wm1` a été dispatchée comme sous-agent `Task` depuis une session interactive — un
sous-agent hérite du modèle de sa session. Les six étapes `s9`/`s11` passent par
`claude -p --model` et concordent parfaitement.

**Portée** : la signature HMAC prouve que la déclaration n'a pas été altérée. Elle ne
prouve pas que la déclaration est vraie. Le champ `model` de l'audit est la valeur que le
registre *prévoyait*, jamais une mesure de ce qui a répondu.

### 6.2 La comptabilité de tokens est fausse d'un ordre de grandeur

| run | déclaré par la Forge | mesuré facturable | ratio | lecture de cache ignorée |
|---|---:|---:|---:|---:|
| run 1 | 421 242 | 5 163 004 | **× 12,3** | 98 264 250 |
| run 2 | 298 847 | 2 015 472 | **× 6,7** | 55 485 948 |
| run 3 | 343 100 | 2 966 803 | **× 8,7** | 33 425 798 |

`forge_telemetry.jsonl` ne compte ni la totalité des tokens de sortie ni la lecture de
cache. Toute décision de coût prise à partir de ce fichier repose sur un chiffre faux.

### 6.3 Les outils déclarés ne bornent pas les outils utilisés

| run / étape | déclaré `tools_effective` | observé en plus |
|---|---|---|
| run1 `s9` | `Bash(node:*)`, `Edit`, `Read`, `Write` | `Bash`, `Glob`, `Grep`, `PowerShell`, `TaskCreate`, `TaskUpdate`, `ToolSearch` |
| run1 `s11` | `Read` | `Bash`, `Glob`, `Grep`, `Write` |
| run2 `s9` | `Bash(node:*)`, `Edit`, `Read`, `Write` | `Bash`, `Grep` |
| run2 `s11` | `Read` | `Bash`, `Grep`, `Write` |
| run3 `s9` | `Bash(node:*)`, `Edit`, `Read`, `Write` | `Bash`, `PowerShell` |
| run3 `s11` | `Read` | `Bash`, `Glob`, `Grep`, `Write` |

Le red-team, déclaré en lecture seule (`Read`), a écrit des fichiers aux trois runs.

Sur `wm1`, `tool_observability` déclare `loaded.status: NOT_MEASURED` alors que 51 appels
d'outils sont observables.

### 6.4 Autres écarts

- **5 × dérive de la garde de référence** : `scripts/forge/oracles.json` modifié pendant
  le run 2, `authorized: false`.
- **2 × dispatch préparé jamais exécuté** (les deux dry-runs).
- **23 × écriture hors dépôt** dans les scratchpads de session — requalifié en `info` :
  c'est la trace mécanique que les agents ont *réellement* exécuté des vérifications au
  lieu de les affirmer. Le nom du dossier de scratchpad est l'identifiant de session, ce
  qui fournit une confirmation indépendante de la corrélation.

---

## 7. Angles morts

### 7.1 Dans le système observé

| # | Angle mort | Où il devrait exister | Comment l'obtenir sans modifier la Forge |
|---|---|---|---|
| 1 | Modèle réellement exécuté | `dispatch_audit.jsonl` | croiser avec `message.model` des transcripts (fait par Observer) |
| 2 | Outils réellement chargés | `tool_observability.loaded` | idem, via les blocs `tool_use` |
| 3 | Fichiers modifiés par un agent | aucune trace Forge | transcripts `Write`/`Edit` uniquement |
| 4 | Texte du contrat activé | seul `contract_sha256` existe | irrécupérable a posteriori si le contrat a changé |
| 5 | Texte du contexte injecté | seules des empreintes SHA | irrécupérable — le prompt de mission seul survit dans `tasks_run*.json` |
| 6 | Ratification HumanGate | `HUMANGATE_READY` ≠ ratifié | `studio_brain/decisions/decision-log.md`, hors périmètre V0 |
| 7 | Fuseau de `error_journal.date` | ISO sans marqueur | utiliser `ts` (epoch), jamais `date` |
| 8 | Tokens et coût réels | `forge_telemetry.jsonl` | `usage` des transcripts |

### 7.2 Dans Observer lui-même — à dire avant qu'on les découvre

1. **Corrélation au niveau fichier.** Le `run_id` n'existe que sur la ligne du marqueur.
   Rattacher les 789 appels d'outils au run est une inférence (`BY_FILE_SCOPE`), pas une
   donnée. Elle est étiquetée comme telle dans chaque événement.
2. **Détection sur les 50 premières lignes.** Un dispatch survenant plus tard serait
   manqué par construction. Vérifié sur ce corpus : tous les marqueurs apparaissent avant
   la ligne 42.
3. **Contamination écartée, mais le risque est structurel.** Une session qui *mentionne*
   un marqueur (un `grep` sur les traces) n'est pas un agent d'étape. Deux filtres :
   position d'instruction, puis signature mécanique de session non interactive. Sans eux,
   la reconstruction attribuait au run Breakout des fichiers écrits par une session
   d'analyse — soit ~800 événements faux.
4. **Les PNG ne sont pas lus.** Observer constate l'existence des captures, pas leur
   contenu. Lire une image relève d'un capteur visuel.
5. **Dépendance à des données non versionnées.** Les transcripts vivent hors dépôt
   (~466 Mo), ne sont pas commités et peuvent être purgés. **La preuve la plus riche de la
   campagne est aussi la plus volatile.**

---

## 8. Recommandations pour Observer V1

Classées par rapport coût/valeur. Aucune n'est appliquée : Observer ne répare rien.

**R1 — Archiver les transcripts d'un run dans son run_dir (priorité haute).**
C'est le point 7.2.5 : la seule trace mécanique de ce qu'un agent a fait vit hors dépôt et
peut disparaître. Une copie des seules sessions corrélées (≈ 6 Mo pour Breakout V2) rendrait
la campagne rejouable indéfiniment. **Touche à la capture ⇒ gate Pierre.**

**R2 — Étendre la comparaison aux campagnes passées (Pong, Snake, shmup).**
Le corrélateur est déjà générique (`--project`). Faire tourner Observer sur les campagnes
archivées dirait si les écarts constatés ici sont structurels ou propres à Breakout. Coût
quasi nul, valeur de preuve élevée.

**R3 — Règle de drift wiremap : fichiers déclarés vs fichiers réellement écrits.**
Les 52 lignes de `wiremap.json` déclarent des fichiers ; les transcripts disent lesquels
ont été écrits. La comparaison est immédiate et testerait la « règle de câblage » sur pièces.

**R4 — Corrélation par ligne plutôt que par fichier.**
Supprimerait la seule inférence d'Observer. Demanderait que le driver écrive le `sessionId`
du sous-processus dans `state.json`. **Modification de la Forge ⇒ gate Pierre.**

**R5 — Ne pas construire de dashboard.**
Le studio compte déjà trois générateurs d'observabilité sans appelant
(`master_index.mjs`, `agent_context_map.mjs`, `component_design.py`) et un oracle censé
garder `/autoloop` périmé de plus d'un mois. Le risque de ce chantier n'est pas de manquer
de vues : c'est d'en produire une quatrième que personne ne lit. Observer doit gagner un
appelant avant de gagner une interface.

---

## 9. Banc de test par adaptateur

`scripts/observer/selftest.py` teste chaque adaptateur **isolément**, avec un contexte
neuf à chaque fois (sinon la liste des fichiers lus serait polluée par le précédent).

| adaptateur | événements | sources lues | provenance ligne | invariants |
|---|---:|---:|---|---|
| `forge_run` | 277 | 49 | 80/277 (le reste vient de `.json`/`.log`, sans notion de ligne) | 4/4 PASS |
| `forge_evidence` | 70 | 8 | 67/70 (les 3 restants sont des commits, `fmt="git"`) | 4/4 PASS |
| `transcripts` | 4146 | 805 | **4146/4146** | 4/4 PASS |

Invariants vérifiés : les `kind` appartiennent au schéma · aucun `event_id` en double
(deux faits distincts ne peuvent pas devenir indistinguables) · aucune tentative de
lecture hors racines autorisées · tout événement porte un chemin source.

**Pertes d'information mesurées, pas supposées.** Trois sources lues ne produisent aucun
événement (`dispatch_dryrun.jsonl`, `error_journal/forge.jsonl`, `playtest.jsonl` — lues
pour rien après filtrage projet). 794 des 805 transcripts ont un ratio
événements/lignes inférieur à 1, ce qui est attendu : la plupart des lignes d'un
transcript ne sont pas des appels d'outil.

**Ambiguïtés remontées mécaniquement** : 52 événements où le `run_id` de `wiremap.json`
diverge de celui de la tentative courante · 2 fichiers de prompt dont la numérotation ne
correspond pas au dossier · plusieurs transcripts portant 2 à 3 marqueurs distincts,
départagés par la règle documentée du marqueur le plus fréquent.

---

## 10. Table de faits à provenance obligatoire

`scripts/observer/facts.py` produit la reconstruction sous forme de **faits**, pas de
prose. Règle unique : un fait qui ne peut pas nommer son fichier **et** son emplacement
exact n'est pas produit — il devient `NOT_OBSERVABLE`.

```
96 faits — RECONSTRUIT 59 · PARTIEL 30 · NOT_OBSERVABLE 7
357 localisateurs — 329 numéros de ligne · 19 chemins de champ · 9 portées explicites
0 fait sans provenance
```

Les 21 catégories demandées portent toutes au moins un fait : timeline, dispatch, agents,
modèles, contexte injecté, contrats, outils, fichiers lus, fichiers écrits, commandes,
tokens, coûts, retry, tests, mutation, solvabilité, failure_events, captures, verdict,
commits, artefacts.

### Les 7 `NOT_OBSERVABLE`, avec les quatre renseignements exigés

| Fait | Pourquoi | Donnée manquante | Où elle devrait être | Détenteur probable |
|---|---|---|---|---|
| Contexte injecté (×3 runs sans prompt en clair) | seul le prompt de **mission** existe en clair ; le prompt **final** n'existe que sous forme d'empreinte SHA-256 | le texte envoyé au modèle | le run_dir, à côté du manifeste de contexte | `scripts/forge/contract.py` (`_render_prompt`) et `run_real.py` (qui l'envoie sur stdin) |
| Coût du run (×3) | un montant sans grille de prix ni détail de calcul : il ne peut être ni recalculé ni vérifié | la grille tarifaire et la formule | `forge_telemetry.jsonl`, à côté de `cost_usd` | le producteur de `forge_telemetry.jsonl` |
| Ratification HumanGate | `HUMANGATE_READY` signifie **prêt pour** la gate, pas **ratifié par** elle | la décision de Pierre et sa date | `studio_brain/decisions/decision-log.md` (destination ratifiée D4, 2026-07-26) | la skill `/gate`, hors des racines lisibles par Observer V0 |

Conséquence de la première ligne, qui mérite d'être dite : **un run Forge n'est pas
rejouable à l'identique depuis ses seules traces.**

---

## 11. Observation hors mandat

`games/breakout_v2/project.godot` est apparu modifié en cours de session. Le diff remplace
le commentaire d'en-tête du charter — qui documentait le POINT DUR #5,
`main_scene = res://main.tscn`, « le projet DOIT démarrer » — par le boilerplate par
défaut de Godot. Signature de l'éditeur Godot réenregistrant le projet.

Ce n'est pas Observer : les seules écritures de `scripts/observer/` visent les répertoires
de sortie, `sources.py` n'ouvre qu'en lecture, aucun adaptateur n'écrit. Vérifié par
inspection du code, pas affirmé.

Observer signale, ne répare pas. La restauration éventuelle est un geste HumanGate.

---

## 12. Critères de succès

| # | Critère | Statut | Preuve |
|---|---|---|---|
| 1 | Reconstruction mécanique de la campagne | **ATTEINT** | 4493 événements, 6 runs, 96 faits, 862 sources — aucune saisie manuelle |
| 2 | Chaque affirmation porte une provenance | **ATTEINT** | 0 fait sans provenance, 0 affirmation comparée sans provenance ; règle imposée par le code (`_fact` rétrograde en `NOT_OBSERVABLE` un fait sans localisateur) |
| 3 | Aucune donnée inventée | **ATTEINT** | les valeurs proviennent d'événements localisés ; les zones sans trace sont `NOT_OBSERVABLE`, jamais comblées |
| 4 | Tous les angles morts marqués | **ATTEINT** | 7 `NOT_OBSERVABLE` documentés selon les 4 champs exigés + 5 limites propres à Observer (§7.2) |
| 5 | Comparaison retrouve la quasi-totalité des faits sans utiliser le rapport comme source | **ATTEINT** | 18 RECONSTRUIT + 1 PARTIEL sur 23 · 0 CONTRADICTOIRE · 3 NOT_OBSERVABLE (jugements) · 1 MANQUANT (lacune d'Observer) ; cécité garantie par `ALLOWED_ROOTS`, vérifiée à l'exécution |

**STATUS = VALIDE.**

Deux réserves qui ne relèvent pas des critères mais qu'il serait malhonnête de taire :
le rattachement des 4146 événements de transcript au run est une **inférence de portée de
session** (étiquetée `BY_FILE_SCOPE` sur chaque événement), et la source la plus riche de
la campagne — les transcripts — vit **hors dépôt, non versionnée, purgeable**.

---

## 13. Reproduire

```bash
python scripts/observer/cli.py --project breakout_v2 --events
python scripts/observer/compare.py --report docs/forge/BREAKOUT_V2_CAMPAIGN_REPORT_2026-07-31.md
python scripts/observer/selftest.py --project breakout_v2
```

Sorties dans `lab/reports/observer/breakout_v2/` : `observer_run.json` (dont `facts` et
`facts_summary`), `events.jsonl`, `RECONSTRUCTION.md`, `COMPARAISON.md`,
`comparaison.json`. Le banc écrit hors dépôt, dans le scratchpad de session.

```
claim_verdict: NO_CLAIM_ALLOWED
```
