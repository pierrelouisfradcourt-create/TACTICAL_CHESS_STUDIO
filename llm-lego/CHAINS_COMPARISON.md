# Comparaison — Chaîne A (prompt_chain_map) vs Chaîne B (run_chain)

> Passe **audit uniquement**. Aucune brique modifiée, aucun code touché. Citations
> `fichier:ligne` vérifiées de première main (payloads `library/`, `autopilot.py`,
> `lab/chains/run_chain.py`, mtimes des sorties). Date : 2026-07-03.

---

## 0. TL;DR — le résultat le plus important

**Les deux chaînes ne sont PAS deux versions du même pipeline. Elles font deux JOBS
différents.** La question « laquelle est canonique » telle que posée (§7 de
`ALL_CHAINS_AUDIT`) présuppose qu'elles sont substituables — les faits montrent que non :

- **Chaîne A** (`chain-mr4u3pi6`) = idée → **liste d'IMPs** (roadmap→redteam→fusion→
  **extract JSON array d'IMPs**). Son contenu de prompts est **exactement** celui que
  `autopilot.py` exécute EN PRODUCTION (`_run_idea_pipeline`), dont la dernière sortie
  datée est **2026-06-29** (la plus récente des deux).
- **Chaîne B** (`chain-mr4u3s6y`) = idée → **prompt Claude Code CLI** (Translator→
  Engineer→RedTeam→**Formatter**). Sa source `run_chain.py` est un script réel, invoqué
  par `kaizen_autoloop.py` en `--mode charter` (génération de charter), mais moins
  récemment exercé (sorties `output/` du **2026-05-31**, kaizen du **2026-06-04**).

→ Pour le job « décomposer une idée en IMPs », **A** représente le pipeline vivant.
Pour le job « transformer un packet validé en prompt d'exécution Claude Code », **B**
représente un autre maillon réel. **Elles sont complémentaires, pas concurrentes.**

---

## 1. Contenu réel construit dans llm-lego

| | **Chaîne A** `chain-mr4u3pi6` | **Chaîne B** `chain-mr4u3s6y` |
|---|---|---|
| Nom | Pipeline idée→IMP (prompt_chain_map) | Pipeline run_chain (Translator→Engineer→RedTeam→Formatter) |
| sourceRef | `prompt_chain_map.json` | `run_chain.py` |
| Nœuds | **4 `llm`** (llm-1→2→3→4) | **4 `llm`** (llm-8→9→10→11) |
| Edges | 3, **linéaires** (`""` conditions) | 3, **linéaires** (`""` conditions) |
| Rôles | Architecte roadmap · Avocat du diable (redteam) · Arbitre (fusion) · Décomposeur IMP (extract) | Traducteur · Ingénieur · Red Team · Formateur Claude Code |
| Prompts attachés | `autopilot-prompt-{roadmap,redteam,fusion,extract}-001` (badge **réel**) | `prompt-mr4u3{pqi,pw3,q1n,q76}` (badge **réel**) |
| Prompts fidèles ? | **OUI** — identiques mot-à-mot à `autopilot.py:1430/1453/1477/1508` (voir §4) | **OUI** — identiques à `run_chain.py` `SYSTEM_TRANSLATOR/ENGINEER/REDTEAM/CLAUDE_CODE_FORMATTER` (voir §4) |
| Format de sortie final | **JSON array d'IMPs** (`{title,lane,impact,effort,domain,files,acceptance,blocked_by}`, max 4) — llm-4 | **Texte brut** = prompt Claude Code CLI avec **rapport 3-verdicts** (software/evidence/claim) — llm-11 |
| initialInput | `{task:"Implémenter la feature X"}` | `{task:"Implémenter la feature X"}` |
| Oracles / gates câblés | **AUCUN** (4 llm nus) | **AUCUN** (4 llm nus) |

---

## 2. Le test décisif : laquelle tourne réellement aujourd'hui ?

> Critère factuel (« qu'est-ce qui s'exécute »), pas esthétique.

### 2.1 ⚠️ Piège de nommage à écarter d'abord

`autopilot.py:693` définit **sa propre fonction** `def run_chain(cmd, cwd)` — un
**lanceur subprocess générique** (`autopilot.py:8421/8499/8750`) qui exécute les
commandes de `CHAINS_PYTHON` (`kaizen_loop.py`, `doc_hygiene_chain.py`). **Ce n'est PAS
`lab/chains/run_chain.py`.** Homonyme total. Ne pas conclure « autopilot appelle
run_chain.py » sur la foi de ce nom — il ne l'appelle pas.

### 2.2 Chaîne A — son contenu EST le pipeline idée→IMP vivant d'autopilot

- Les 4 prompts de A sont ceux de **`_run_idea_pipeline`** (`autopilot.py:1411`) :
  architecte `:1430`, avocat `:1453`, arbitre `:1477`, décomposeur `:1508`.
- Ce pipeline est **déclenché en production** : `target=_run_idea_pipeline`
  (`autopilot.py:8734`, lancé dans un thread par le handler d'idée).
- Il **produit un artefact daté récent** : `_stage_proposals` (`autopilot.py:1278`)
  écrit dans `lab/chains/ROADMAP_PROPOSALS.yaml` — **mtime 2026-06-29** (54 entrées
  `humangate_verdict`/`human_anchor_title`), `ideas.json` **2026-06-29**. **La sortie
  la plus fraîche des deux chaînes.**

### 2.3 Chaîne B — `run_chain.py` est réel, invoqué, mais pour un autre job et moins récent

- `run_chain.py` est un **CLI réel** (`--idea` / `--truth-packet` / `--objective` /
  `--mode charter`, `run_chain.py:1-5, 770-785`). Pipeline interne :
  `run_translator→(clarification gate)→run_engineer→run_redteam→verdict→run_formatter`
  (`run_chain.py:470-520`), avec `save_trace` par étape.
- **Il EST invoqué en production** — mais par `kaizen_autoloop.py:367-373`
  (`[PYTHON_EXE, run_chain.py, --mode charter, ...]`), **pour générer un charter**, avec
  fallback si indisponible. **Pas** pour décomposer une idée en IMPs.
- **Sa sortie propre est périmée** : `lab/chains/output/` (chain_*/execution_* de
  run_chain) = **2026-05-31** ; `CHAIN_HISTORY.jsonl` = **2026-06-04** (kaizen_autoloop).
  Sa sortie est aussi **ingérée** par `fusion_matrix_chain.py:72,188` (`ingest_run_chain`).

### 2.4 `prompt_chain_map.json` — jamais exécuté, seulement affiché

- Seul point de lecture runtime : `autopilot.py:7827` → sert le fichier tel quel via
  l'endpoint **read-only `/api/chain-map`** (`autopilot.py:7826-7835`). **Aucun code ne
  l'exécute** ; c'est un artefact de **documentation** de la carte du pipeline, pas un
  moteur. (Donc le `sourceRef:"prompt_chain_map.json"` de A pointe vers une DOC ; le
  vrai code exécuté est `autopilot.py:_run_idea_pipeline`.)

### Verdict factuel §2

| Question | Preuve | Réponse |
|---|---|---|
| Le contenu de A tourne-t-il en prod ? | `autopilot.py:1430-1508` + `:8734` + `ROADMAP_PROPOSALS.yaml` mtime **06-29** | **OUI** (idée→IMP, le plus récent) |
| `run_chain.py` (source de B) tourne-t-il ? | `kaizen_autoloop.py:373` (`--mode charter`, fallback) ; `output/` **05-31** | **OUI mais autre job** (charter), moins récent |
| `prompt_chain_map.json` (source de A) est-il exécuté ? | `autopilot.py:7827` (sert read-only) | **NON** — documentation servie, jamais exécutée |

---

## 3. Richesse / fidélité des sources originales

### `run_chain.py` (source B) — formats JSON stricts, les plus détaillés
- 4 constantes `SYSTEM_*` (`run_chain.py:121/178/206/232`) portent chacune un **schéma
  JSON de sortie complet** : Translator (`task_summary/objective/lane/files_read/
  source_state/constraints/clarification_needed/claim_verdict`), Engineer
  (`proposal_id/files_to_create/files_to_edit/forbidden_*/validation_commands/
  recommendation/claim_verdict`), RedTeam (verdict `PROCEED/HOLD/BLOCKED` + `critical_flaws/
  scope_violations/…`), Formatter (prompt Claude Code + **rapport final imposé**).
- **Le format 3-verdicts est bien réel et sourcé ici** : `REQUIRED_FINAL_REPORT_FIELDS`
  (`run_chain.py:48-55`) contient littéralement `software_verdict`, `evidence_verdict`,
  `claim_verdict`. **Confirmé — pas une coïncidence.** (C'est aussi la source de la brique
  `outputformat` « 3-Verdicts (canonique TCS) ».)
- Contrôles supplémentaires : `validate_packet` (`run_chain.py:89-91`,
  `claim_verdict != NO_CLAIM_ALLOWED` → rejet), `save_trace` par étape, mode charter
  séparé (`SYSTEM_CHARTER_GENERATOR:642`, `run_charter_mode:732`).

### `prompt_chain_map.json` (source A) — moins structuré, orienté « carte »
- Confirmé conforme aux rapports antérieurs : un `output_format` par étape mais **pas**
  de schéma JSON strict par rôle. C'est une **carte** du pipeline (versions
  current/target, zones d'ombre) — richesse documentaire, pas contrat d'exécution.
- **Mais la richesse réelle du job de A vit dans `autopilot.py`**, pas dans le JSON :
  le prompt EXTRACT (`autopilot.py:1508-1546`) porte le schéma JSON array complet
  d'IMPs + interdictions + granularité (IMP-089). C'est là qu'est la fidélité, pas dans
  la carte.

**Bilan §3 :** B a les **contrats de sortie les plus stricts** (JSON par rôle +
3-verdicts). A a une **sortie structurée** (JSON array d'IMPs) mais sa richesse est
dans le code autopilot, pas dans le `prompt_chain_map.json` cité comme source.

---

## 4. Fidélité de CE QU'ON A CONSTRUIT (honnête — dérives signalées)

> Rappel : la 1ʳᵉ Chaîne idée→IMP « trichait » (nœud fictif `qwen-coder`, prompts
> dupliqués non référencés, tag `production-réel` mensonger, `LIBRARY_UX_IMPORT` F7).
> Les deux nouvelles **ne trichent PAS de cette manière** — mais toutes deux
> **simplifient structurellement**. Détail :

### Chaîne A vs sa réalité (`autopilot.py:_run_idea_pipeline`)
- ✅ **Prompts fidèles mot-à-mot** : llm-1..4 == `autopilot.py:1430/1453/1477/1508`, y
  compris le garde-fou `needs_human` appendé (`autopilot.py:1418-1422`). `producerRef`
  pointe vers les vraies briques prompt `autopilot-prompt-*-001` (badge réel). Pas de
  copie-fantôme.
- ⚠️ **Structurellement incomplète** : le pipeline réel a, EN PLUS des 4 LLM :
  - un **gate `_check_needs_human`** après CHAQUE étape (`autopilot.py:1439/1463/1489/…`) —
    absent (aucun nœud oracle/gate dans A) ;
  - un **DEDUP** SequenceMatcher>0.70 vs IMPs CLOSED (`autopilot.py:1562-1597`) — absent ;
  - un **GHOST-FILE check** (fichiers cités vs repo, `autopilot.py:1599`) — absent ;
  - un **STAGE** final → `ROADMAP_PROPOSALS.yaml` (`autopilot.py:1278/1508`) — absent
    (pas de nœud artefact terminal).
- ⚠️ **Attribution de source trompeuse** : `sourceRef:"prompt_chain_map.json"` alors que
  le code exécuté est `autopilot.py`. Le map documente le pipeline ; il ne l'exécute pas.
- ⚠️ Note manquante : EXTRACT tourne `model=CEO` en réel (`autopilot.py:1414/1499`,
  IMP-089) — non capturé dans le nœud A.

### Chaîne B vs sa réalité (`run_chain.py`)
- ✅ **Prompts fidèles** : llm-8 == `SYSTEM_TRANSLATOR` (ligne signature « No source
  readback → no Truth Packet », `run_chain.py:147`), llm-9/10/11 == ENGINEER/REDTEAM/
  FORMATTER. `producerRef` vers de vraies briques prompt (badge réel).
- ⚠️ **Structurellement incomplète** : le `run_chain()` réel (`run_chain.py:470-520`) a
  en plus : un **gate `clarification_needed`** après le Translator, un **verdict RedTeam
  qui conditionne** le Formatter (`run_redteam→verdict→run_formatter`), `save_trace` par
  étape, `validate_packet` (`:89`), et un **mode charter séparé** (`:732`). Aucun de ces
  gates/validations n'est câblé dans B (4 llm linéaires nus).

### Verdict §4
**Aucune des deux ne triche comme l'ancienne** (prompts réels, référencés, badges
honnêtes). **Mais les deux sont « prompts fidèles / structure simplifiée »** : elles
modélisent la colonne vertébrale LLM et **laissent tomber les gates, la validation, le
dedup/ghost-file et le staging**. C'est une simplification cohérente (le moteur llm-lego
est séquentiel, cf. `COMPLETENESS_AUDIT`), honnête tant qu'on ne les présente pas comme
des répliques complètes. **A a une dérive de plus que B : son `sourceRef` pointe vers une
doc (prompt_chain_map.json) et non vers le code réellement exécuté (autopilot.py).**

---

## 5. Ce que je NE tranche PAS (décision Pierre)

La question « laquelle est la référence canonique » **reste ouverte et est en réalité
mal posée** au vu des faits :

- Ce ne sont **pas deux versions rivales d'un même pipeline** — ce sont **deux maillons
  différents** de la chaîne de valeur idée → exécution :
  - **A** : idée → **IMPs** (décomposition, staging `ROADMAP_PROPOSALS.yaml`).
  - **B** : packet/idée → **prompt Claude Code** (charter d'exécution).
- Décider « A ou B » n'a de sens que si Pierre veut UNE brique-vitrine unique pour le
  concept « pipeline idée→IMP ». Dans ce cas, **les faits désignent A** (c'est le job
  idée→IMP, et c'est le code vivant). Mais **supprimer/reléguer B serait perdre** la
  représentation du maillon charter réel + le contrat 3-verdicts sourcé.
- **Option non binaire** (à considérer) : garder les deux, mais **corriger l'étiquetage
  de A** (`sourceRef` → `autopilot.py:1411-1658 (_run_idea_pipeline)`, en gardant
  `prompt_chain_map.json` comme référence documentaire), et **renommer** pour lever
  l'ambiguïté (A = « Décomposition idée→IMPs », B = « Génération de charter/prompt »).

C'est une décision de **produit + doctrine**, pas un fait — donc HumanGate.

---

## 6. Recommandation factuelle (ce que les preuves imposent, sans opinion)

Uniquement ce qui **ressort des preuves**, pas une préférence :

1. **FAIT** : pour le job idée→IMP, le pipeline exécuté en prod est celui dont les
   prompts sont dans **A** (`autopilot.py:1430-1508` + `:8734`), avec la sortie datée la
   plus récente (`ROADMAP_PROPOSALS.yaml`, **06-29**). `prompt_chain_map.json` (source
   citée de A) n'est **jamais exécuté** (`autopilot.py:7827`, servi read-only).
2. **FAIT** : `run_chain.py` (source de B) est **réel et invoqué** (`kaizen_autoloop.py:373`,
   mode charter) mais pour un **autre job** et **moins récemment** (`output/` 05-31,
   kaizen 06-04). Il est la **source authentique du format 3-verdicts** (`run_chain.py:48-55`).
3. **FAIT** : les deux briques sont **fidèles en prompts** mais **incomplètes en
   structure** (gates/validation/dedup/staging absents des deux).
4. **CONSÉQUENCE sur le fix `run-corrections.mjs`** : la constante périmée
   `CHAIN_NAME = "Pipeline idée→IMP (autopilot)"` **n'est PAS corrigée dans cette passe**.
   Raison factuelle : la décision canonique **ne ressort pas proprement** — les faits
   *reformulent* la question (deux jobs distincts) au lieu de la trancher. Pointer la
   constante vers A ou B serait acter une décision produit qui appartient à Pierre. **Fix
   laissé en attente**, conformément à la contrainte. (Si Pierre tranche « A = la
   vitrine idée→IMP », le one-liner devient
   `CHAIN_NAME = "Pipeline idée→IMP (prompt_chain_map)"`.)

---

*Fin de la comparaison — aucune brique modifiée, aucun code touché, `run-corrections.mjs` inchangé.*
*software_verdict: OK (comparaison produite) · evidence_verdict: MECHANICAL_VALIDATION_ONLY
(payloads library/, autopilot.py, run_chain.py, mtimes vérifiés de première main ;
non exécuté — pas de run empirique des chaînes cette passe) · claim_verdict: NO_CLAIM_ALLOWED*
