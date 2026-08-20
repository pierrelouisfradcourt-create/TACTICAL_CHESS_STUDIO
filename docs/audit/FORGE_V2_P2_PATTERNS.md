# Forge V2 — P2 : patterns de la couche connaissance→comportement

**Statut : PROPOSED** — mission P2 « Forge V2 » (Opus, contradicteur ratifié Pierre). Date : 2026-07-20.
Chaque claim porte sa réf `file:line` lue en direct. `[source: session]` = fait donné par les thèses, non re-vérifiable ici.
Rasoir 6 questions = {connaissance · forme · lecteur · moment · comportement futur · preuve}. Sans les 6 → HYPOTHÈSE.

---

## §1 — Verdict par thèse (CONFIRMÉ / INFIRMÉ / AFFINÉ)

**T1 — Tarot vs AutoBattler = ancre opposable vs intention non extraite → AFFINÉ (moitié INFIRMÉE).**
auto_battler A extrait son intention en règles gelées : INV-1..19, 22 Events, RO-*, 8 fiches HumanGate, compilées en features WireMap (`lab/forge_runs/auto_battler_i2_5/wiremap.json`). Donc « règles gelées » n'est PAS le différenciateur — les deux en ont. Le seul différenciateur réel est le **golden comportemental** : card_engine visait la parité contre `belote-claude` (impl. de référence publiée, `knowledge_trace.json` item provenance=VERIFIED) ; auto_battler, jeu neuf, n'en a structurellement aucun. La thèse conflate « golden + règles gelées » ; seule la moitié golden distingue. L'intention d'auto_battler fut extraite ET compilée — ce qui manque est un oracle d'**expérience**, pas d'intention (pont vers T4).

**T2 — Exactement 4 compilateurs vivants → AFFINÉ.** Les 4 existent mais leur mise en œuvre est **radicalement inégale**, et AUCUN ne ferme la boucle connaissance→comportement-vérifié :
- `mandatory_read` = **injection de prompt** (`contract.py:166`), zéro lecteur vérifiant la lecture → good-faith.
- `injection-pré-mortem` = journal lu **mécaniquement** (`driver.py:404 _premortem`) puis injecté au prompt → lecture réelle, effet good-faith.
- `import+reuse` = requête **imposée** (`check_search_consulted`) mais import **jamais imposé** (`check_reuse_ratio_wired` advisory, exit 0) → **2/14 CONFIRMÉ** (seuls `kb_tactics` + `shmup_slice/logic/collisions.mjs` importent `knowledge_base/`).
- `citation-par-ID` = présence-de-fonction + gel du jeu de features imposés (`check_wiremap` `static_oracles.py:261-295`, `check_feature_set_frozen`), mais l'ID de bible et la ligne cités dans `preuve` ne sont **jamais résolus ni vérifiés sémantiquement**. « 8/11 bibles vivantes » plausible (Economy/Core/Decision/Combat cités, 118 citations d'ID dans le code ; Game/Meta/DSL/Vocabulary quasi absents) — mais « vivante » surévalue une vérification limitée à la présence du nom de fonction.

**T3 — 12 ruptures, même anatomie (écrivain sans lecteur/moment) → CONFIRMÉ, avec deux sous-espèces.** (a) AUCUN lecteur (files de propositions, playtest, télémétrie i2) ; (b) lecteur existant mais **advisory/good-faith** (mandatory_read, pré-mortem→comportement, import). Fusionner (a) et (b) masque des remèdes distincts : (a) manque un lecteur, (b) manque des dents. **Contradiction interne T2↔T3** : T2 compte `citation-par-ID` vivante, T3 compte `bible↔code` cassée — résolue par direction : bible→code (présence de fonction) vit ; code→bible / fraîcheur de citation n'a aucun lecteur.

**T4 — Playtest = oracle précoce manquant → AFFINÉ.** Zéro artefact de playtest dans le repo CONFIRMÉ (seul `studio/openclaw-workspace/skills/playtest.md`). Mais « oracle » est une erreur de catégorie : les trouvailles de Pierre (« visually dead », « no juice ») sont du **feel**, structurellement non exprimables en oracle. Le playtest est un **capteur humain** à sortie advisory ; le nommer oracle invite à fabriquer un faux oracle. Forme correcte : router vers le compilateur pré-mortem (contrainte du prochain charter), pas une gate.

**T5 — Qualification déjà là, seule la transformation manque → AFFINÉ (moitié INFIRMÉE).** Les Promotion Policies sont un **cadre ratifié mais non construit** (protocole Resolver V1 étape 3, PROPOSED ; `driver.py` n'a aucun consommateur `knowledge_trace`/`pending_review`). Il manque AUSSI le **lecteur**, pas seulement la forme : les files `*_proposals.jsonl` ont 0 lecteur (audit T1). L'unique `knowledge_trace.json` existant (card_engine) est **écrit à la main par l'orchestrateur**, jamais relu.

### Deux angles morts de l'orchestrateur
**AM1 — le remède reproduit la maladie.** Le premier `knowledge_trace.json` (`lab/forge_runs/card_engine/`, 2026-07-20) est rédigé par l'orchestrateur qui a piloté le build : auto-attestation sans lecteur indépendant — exactement l'« écrivain sans lecteur » que T3 condamne, et que la sonde anti-théâtre du protocole Resolver (§5) invaliderait. La brique centrale de la remédiation T3/T5 naît déjà malade.
**AM2 — aucun des 4 compilateurs ne ferme la boucle jusqu'au comportement vérifié.** Le bout « comportement changé » est TOUJOURS advisory ou good-faith (2 prompt-only, 1 présence-de-fonction, 1 requête-seule). La métrique centrale (actifs→comportements→perfs) est donc **non mesurée** pour 3 compilateurs sur 4. T2 aplatit cela sous « vivant ».

---

## §2 — Matrice compilateurs × types de connaissance

C1 citation-par-ID · C2 import+reuse · C3 injection-pré-mortem · C4 mandatory_read. ✔=maison native · ~=absorbé faible · ✗=aucune.

| Type de connaissance | C1 | C2 | C3 | C4 | Échec réel / destination |
|---|:--:|:--:|:--:|:--:|---|
| contrainte technique (invariant bible) | ✔ | | | | vérif limitée à présence-de-fonction (F2) |
| décision (HumanGate) | ✔ | | | ~ | chemin sain : QB-6→bible→wiremap→code |
| pattern mécanique réutilisable | | ✔ | | | lecteur sans dents → 2/14 (F1,F4) |
| erreur (leçon de bug) | | | ✔ | | natif ; sauf leçons « théâtre » (besoin C1-structurel) |
| recherche (patterns web) | | | | ~ | advisory ; packet souvent post-date la bible gelée (F9) |
| audit (finding structurel) | | | ~ | ~ | lecteur humain seul (`docs/audit/*.md`) |
| licence / provenance asset | | | | | hors 4 : `catalog.json`+kb-validate (lecteur dédié réel) |
| **playtest (feel)** | | | ✗ | | **sans destination → absorber C3** |
| **benchmark / télémétrie** | | | | | **lecteur absent** (télémétrie i2 non comparée) → Pierre |
| **historique archi / raisonnement de conception** | | | | ✗ | **`propose_bible_entry` inerte** (audit T5) → Pierre |
| **analyse joueurs** | | | | | **inexistant** (aucun jeu shippé mesuré) → prématuré/Pierre |

**Absorptions proposées (compilateur EXISTANT, adaptation minimale) :**
- playtest → **C3** : `playtest.md` écrit `record_error(domain='playtest')` ; lecteur = `driver._premortem`, moment = s0 du run suivant. Route déjà vérifiée, seule l'écriture manque.
- raisonnement de conception → **C4** : câbler `project_bible` à s0 sur le chemin `run_real.py` (audit T4, aujourd'hui lisible seulement sur le chemin Fable-manuel). Sinon Pierre acte l'humain-seul.
- benchmark-compare : aucun des 4 n'absorbe → **décision Pierre** (candidat Evolve, échoue au gate §4).

---

## §3 — Formes-cibles : 6 cas concrets au rasoir 6 questions

| # | Connaissance | Forme actuelle | Forme-cible | Lecteur | Moment | Comportement futur changé | Preuve repo — aurait-il changé le déroulé ? |
|---|---|---|---|---|---|---|---|
| 1 | Recherche TFT/HSBG (auto_battler i1/i2) | packet advisory (prose) | aucune (redondant) OU fixture si nouvelle contrainte | s2 (advisory) | s2-worldscan | **AUCUN** | `knowledge_packet.json` restate INV-2/INV-4 déjà gelés (bibles 07-18 > run 07-19) → **effet mécanique nul**. Échoue au rasoir. |
| 2 | 8 faits FFT (card_engine) | prose advisory servie à s4 | **fixture Tarot** (assert seuil 36 pour 3 oudlers) | s4 (auj.) → oracle mutation/parité (cible) | s4 → s10a | généralité des interfaces (non falsifiable auj.) | `verdict.json` logic_files = `adapters/belote/*` seuls, **aucun adaptateur Tarot** → faits sans oracle. Passe le rasoir seulement converti en fixture. |
| 3 | Playtest 2 Pierre `[source: session]` | **AUCUNE** (mémoire seule) | entrée `error_journal(domain=playtest)` {observation, is_feel, severity} | `driver._premortem` (`driver.py:404`) | s0 du run suivant | charter porte « juice requis » en critère/interdit | Route pré-mortem **vérifiée** ; seule l'écriture manque. **Passe le rasoir.** |
| 4 | « théâtre d'oracle : flags codés en dur » (`error_journal/forge.jsonl:3`) | entrée journal (DERIVED) + red-team advisory | **`static_oracles.check_solver_computes_flags`** (frère de `check_e2e_harness`) | driver (gating) | **s10a-oracle-code** | flag littéral → oracle ROUGE au lieu de vert | `check_e2e_harness` (`static_oracles.py:334`) rejette déjà « coquille qui imprime PASS » ; card_engine oracle vert (rc 0) MAIS `redteam_advisory:"theatre oracle: flags solver en litteraux"`. Un frère aurait tiré à s10a. **Passe plein.** |
| 5 | Règle QB-6 (match nul, 0 perte de Life) | HumanGate verbatim → `04_COMBAT_BIBLE` avec ID | déjà bonne (ID→wiremap→fonction) | `check_wiremap` (présence) | s10c-oracle-wiremap | feature combat doit exister | Chemin CANONIQUE sain. Limite : présence-de-fonction ≠ sémantique DRAW/0-Life (fixture requise, décrite en Oracle Hooks mais non exécutée par `check_wiremap`). Passe au niveau fonction ; gap sémantique résiduel. |
| 6 | « ref=token recoupable » (sonde Resolver §5) | sonde dans protocole PROPOSED (non construit) | **étendre `verify_run.py`** (re-vérifieur) — pas d'outil neuf | `verify_run` (`verify_run.py:69`) | forge.verify_run post-run | item de trace non-adossé → verify FAIL | `verify_run` re-hashe verdict/evidence mais **ne lit pas** `knowledge_trace.json` ; l'étendre ferme AM1. **Passe le rasoir** (consolidation, conforme anti-couches). |

---

## §4 — Improve vs Evolve : triple gate appliqué

**Improve (optimiser un comportement existant avec un actif validé) — tous absorbés par un lecteur existant :**
- **I-a** check `check_solver_computes_flags` (étend `static_oracles`) — cas 4.
- **I-b** playtest→`error_journal` (étend `playtest.md`, réutilise `record_error`) — cas 3.
- **I-c** `verify_run` recoupe `knowledge_trace` (étend `verify_run.py`) — cas 6, ferme AM1.
- **I-d** faits Tarot → fixture SI adaptateur Tarot construit — cas 2 (différé).
- **I-e** fixture sémantique wiremap pour règles de type DRAW (Oracle Hooks déjà spécifiés) — cas 5.

**Candidats Evolve (changement d'architecture) — gate = répétition + impact PROUVÉ + impossibilité locale :**

| Candidat | Répétition | Impact prouvé | Impossibilité locale | Verdict |
|---|:--:|:--:|:--:|---|
| E-1 Resolver V1 (lecteur trace + pending_review) | OUI (4 dépôts, 0 lus, semaines — audit T1) | **NON** (M2 « prouvé une fois, jamais tracé ») | **NON** (Pierre lit le `.jsonl` = option locale valable, branche « advisory » de l'audit) | **ÉCHOUE** (2/3) — correctement cadré en **expérience bornée** (c'est déjà la V1). |
| E-2 Lecteur télémétrie-compare (benchmark) | NON (un signal : télémétrie i2 absente) | NON | NON (comparaison manuelle possible) | **ÉCHOUE** — prématuré. |
| E-3 Policy Compiler (Resolver étape 5) | — | — | — | **ÉCHOUE** — le protocole lui-même le gèle « seulement si la maintenance le justifie » ; aucun signal de maintenance. |

**Réponse Q3 (dure) : ZÉRO cas justifie Evolve aujourd'hui.** Tout besoin réel est Improve (étendre un lecteur existant) ou expérience bornée. La tentation structurelle du studio (Resolver-comme-architecture, Policy Compiler) n'est pas méritée : impact non prouvé + résolution locale possible. Les deux leviers de plus haute valeur sont **deux extensions de `static_oracles`/`verify_run`**, pas une couche.

---

## §5 — FAITS / HYPOTHÈSES / RECOMMANDATIONS

**FAITS (vérifiés au repo)**
- F1 : 2 jeux seulement importent `knowledge_base/` (`kb_tactics`, `shmup_slice/logic/collisions.mjs`) — reuse 2/N confirmé.
- F2 : `check_wiremap` (`static_oracles.py:261-295`) n'impose que présence-de-fonction + `preuve` non vide ; ni l'ID/ligne de bible cité, ni la sémantique de l'invariant.
- F3 : `mandatory_read` est injecté au prompt (`contract.py:166-168`) sans vérification de consommation.
- F4 : `check_search_consulted` et `check_reuse_ratio_wired` sont **advisory** (jamais gating) — l'import d'une brique n'est jamais imposé.
- F5 : `check_e2e_harness` (`static_oracles.py:334`) est un lecteur anti-théâtre structurel opérant ; **aucun frère** pour les flags de succès du solver → card_engine vert alors que théâtral (`verdict.json redteam_advisory`).
- F6 : `knowledge_trace.json` n'existe QUE pour card_engine (2026-07-20), écrit à la main ; `driver.py` n'a aucun consommateur trace/pending_review.
- F7 : zéro artefact de playtest (seul `.../skills/playtest.md`).
- F8 : auto_battler porte son intention en règles gelées compilées (INV-1..19, 22 Events, RO-*, `auto_battler_i2_5/wiremap.json`).
- F9 : les packets i1/i2 post-datent les bibles gelées et redisent des invariants déjà ratifiés.
- F10 : le différenciateur card_engine = golden `belote-claude` (parité, provenance VERIFIED) ; aucun adaptateur Tarot construit.

**HYPOTHÈSES (non vérifiables ici)**
- H1 : les 8 faits FFT ont amélioré la généralité des interfaces `[source: session]` — pas d'adaptateur Tarot pour falsifier.
- H2 : « la recherche aide les builds » — F9 montre au moins un cas d'effet mécanique nul.
- H3 : un lecteur sur la file de propositions produit une réutilisation mesurable (M2 non prouvé).

**RECOMMANDATIONS (6 champs remplis, lecteur+moment vérifiés au repo)**
- **R1 [Improve]** — connaissance : leçon « flag littéral » · forme : `static_oracles.check_solver_computes_flags` · lecteur : driver à s10a · moment : s10a-oracle-code · comportement : flag codé en dur → oracle rouge · preuve : frère de `check_e2e_harness:334`, card_engine aurait échoué à s10a. **(passe le rasoir)**
- **R2 [Improve]** — connaissance : trouvailles feel du playtest · forme : `error_journal(domain=playtest)` · lecteur : `driver._premortem` (`driver.py:404`) · moment : s0 du run suivant · comportement : charter porte la contrainte de feel · preuve : route pré-mortem vérifiée, seule l'écriture manque. **(passe le rasoir)**
- **R3 [Improve]** — connaissance : lignage de lecture (trace) · forme : extension `verify_run.py` · lecteur : `verify_run` · moment : `forge.verify_run` post-run · comportement : item de trace non-adossé → verify FAIL · preuve : trace card_engine aujourd'hui non vérifiée, ferme AM1. **(passe le rasoir)**
- **R4 [Décision Pierre]** — le raisonnement de conception / historique archi n'a aucune maison mécanique ; `propose_bible_entry` inerte (audit). Trancher : câbler `project_bible` à s0 sur `run_real.py` OU acter l'humain-seul. (6 champs partiellement ouverts → étiqueté décision-requise, pas reco pleine.)
- **R5 [Hold]** — NE PAS construire Resolver-comme-architecture ni Policy Compiler maintenant (échoue le triple gate §4) ; garder la V1 comme l'expérience bornée qu'elle est déjà.

**Recos passant le rasoir complet : 3 (R1, R2, R3).** R4 = décision-requise. R5 = hold.

---
software_verdict : s'appliquera à toute exécution de R1-R3, pas à ce document
evidence_verdict : MECHANICAL_VALIDATION_ONLY (chaque FAIT ancré à une réf `file:line` lue ; imports/artefacts comptés sur disque)
claim_verdict : NO_CLAIM_ALLOWED
