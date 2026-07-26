# Troisième Cerveau — Protocole opérationnel V1 (PROPOSED)

Date : 2026-07-26 · Source : mission AAA Pierre « conception du troisième cerveau » ·
Statut : **PROPOSED** — à ratifier par Pierre avant toute adoption.
`claim_verdict: NO_CLAIM_ALLOWED`.

```
codex_runtime (report_actual_runtime):
  actual_model: claude-fable-5 (Claude Code, terminal, session de supervision)
  reasoning_effort: high
  runtime_status: CONNU (pas d'UNKNOWN -> pas de BLOCKED)
```

---

## 1. Preflight

### Sources consultées (chaque fait porte sa preuve)

| Fait | Source primaire | Vérifié |
|---|---|---|
| Le rôle « session à contexte propre » est déjà ratifié et nommé | `scripts/forge/contracts/orchestrator.yaml` en-tête (architecture 2026-07-22) + `contracts/roles.yaml` (`orchestrator` ≠ `run_orchestrator`) | 2026-07-26, lecture directe |
| 31 outils `.mjs` dans scripts/forge, 2 seulement ont un lanceur automatique | comptage grep sur `.claude/hooks/`, `settings.json`, workflows | 2026-07-26 |
| Les instruments de mesure se contredisent (4 dénominateurs pour un même compteur) | `state.json` / `forge_telemetry.jsonl` / `forge_builder_runs.jsonl` / journaux — s9-build/shmup_slice : 6/5/5/3 | 2026-07-26, matrice |
| 21 échecs d'oracle documentés ; détection 67 % non-LLM (0 token) ; correction 62 % sur s9-build | matrice ROI (session 2026-07-26), clés `ts` citées ligne à ligne | 2026-07-26 |
| 4 rapports de sous-agents sur ~7 contenaient une erreur factuelle attrapée par contre-vérification | session 2026-07-26 : 27→36 entrées · 3→7 lignes · « 0 donnée » vs 1 ligne manuelle · « sonnet 0/4 » surgénéralisé | 2026-07-26 |
| Le corpus déclaratif Codex est mort faute de lecteur (`DOCUMENTED_ONLY` auto-déclaré) | `00_STUDIO_CONTROL/01_SYSTEM/registries/LOOP_REGISTRY.yaml` | 2026-07-26 |
| La boucle mémoire fermée existe : error_journal → premortem (réparations réinjectées, leçons ⚑ globales) | `scripts/forge/studio_link.py` (premortem, record_fix) | 2026-07-26 |
| `learning_curve.jsonl` porte 3 lignes réelles (modèle `subject{type,id}` livré, non commité) | `knowledge_base/learning_curve.jsonl` | 2026-07-26 |
| Schéma `learning_event` v0 complet (symptôme→cause→action→impact→règle candidate, `auto_apply_allowed:false`) existe en zone gelée | `docs/control-plane/fixtures/learning_event/` + validateur `scripts/studioV2/control_plane/` | 2026-07-26 |

### Limites de ce preflight
- 10 des 21 échecs de la matrice viennent d'une seule famille (shmup) sur 2 jours — toute
  extrapolation « la Forge en général » est une extrapolation depuis shmup.
- Les faits datés 2026-07-26 photographient un dépôt avec 18 fichiers non commités (gate Pierre).
- Aucun test statistique n'est légitime sur les effectifs observés (n=2 à n=8 par cellule).

### État réel — le manque démontré
Le troisième cerveau **existe comme case d'architecture ratifiée et n'a aucun protocole**.
Son comportement actuel vit dans les habitudes de session et le guidage de Pierre — c'est
exactement le mode de panne n°1 du studio (« déclaré ≠ exécuté ») appliqué à l'étage de
supervision lui-même. Créer le protocole ne crée donc PAS une nouvelle couche : il remplit
une case déclarée vide, comme le driver a remplacé la prose d'orchestration du skill.

---

## 2. Architecture actuelle (ce qui existe déjà, par responsabilité de la mission)

| Responsabilité mission | Existe déjà | État |
|---|---|---|
| Observateur externe | error journals (36 entrées, 3 schémas) · telemetry (58, succès seulement) · builder_runs (12, 3 runs) · dispatch_audit (157) · state.json (7, écrasé) · learning_curve (3) | branché mais **instruments non concordants** |
| Auditeur de vérité | vocabulaire existant : `DOCUMENTED_ONLY` (Codex) · doctrine Declared→Referenced→Executed→Verified (capteur `declaration_readers.mjs`) · statuts contrat (3 états d'un champ) | vocabulaire épars, jamais unifié en protocole |
| Analyste de patterns | règle de variance RATIFIÉE 2026-07-21 · leçon dénominateur (grid-navigator, tautologie s9/s10a) · familles d'erreurs C1..C7 (matrice) | règles éparses, application manuelle |
| Analyste ROI | matrice 2026-07-26 (exemplaire de fait) · `roi_score()` de kaizen_loop (gelé) | aucun format standard vivant |
| Générateur de missions AAA | doctrine CLAUDE.md « objectif · entrées · sortie · preuve » · contrat 17 champs · gabarits de mission de la session 2026-07-26 (7 missions, toutes exécutées) · `build_minimal_charter` (kaizen, gelé) · TASK_CHARTER Codex (dormant) | le format qui MARCHE n'est écrit nulle part |

Conclusion d'inventaire : **rien à construire en logiciel pour V1**. Tout le protocole peut
être l'assemblage discipliné de mécanismes déjà éprouvés dans cette session.

---

## 3. Architecture proposée — Troisième Cerveau V1

### Identité
Le troisième cerveau est le rôle `orchestrator` de `contracts/roles.yaml` : la **session
Claude Code à contexte propre**, entre Pierre et la Forge. Il n'exécute pas, ne fabrique
pas, ne commite/push jamais sans gate, ne juge jamais du code (les oracles jugent).
Sa valeur vient de l'**indépendance de contexte** : il valide les rapports contre le réel
(doctrine délégation, CLAUDE.md).

### Flux (imposé par la mission, instancié sur l'existant)

```
Entrée humaine (intention courte)
   ↓  P6 auto-prompting : jamais transmise brute
Observation        → P1+P2 : sources primaires, table de confiance, format fait/source/limite
   ↓
Analyse            → P3+P4 : classement de vérité, patterns avec dénominateur + contre-hypothèse
   ↓
ROI                → P5 : tableau 8 champs, chiffré depuis les données, jamais au doigt mouillé
   ↓
Prompt AAA         → P6 : mission complète (gabarit §3.3)
   ↓
Forge              → exécution sous contrat, oracles, verdict signé (rien ne change ici)
   ↓
Mesure impact      → P7 : critère falsifiable posé AVANT le run, relu APRÈS
```

### 3.1 Les 8 règles du protocole

**P0 — Posture.** Jamais worker. Un rouge d'oracle est une donnée à transmettre, pas un
problème à résoudre en direct (même exigence que `orchestrator.yaml::exigences_cognitives`).

**P1 — Méfiance instrumentale d'abord.** Avant toute analyse : « cette donnée mesure-t-elle
ce que je crois ? ». Consulter la table de confiance des instruments (§4.2) ; si l'instrument
n'y figure pas, établir sa fiabilité AVANT de s'en servir, et l'y ajouter.

**P2 — Observation = fait · source · limite.** Aucun fait sans sa source primaire relue
(pas le rapport d'un agent). Aucun fait sans sa limite (échantillon, période, instrument).

**P3 — Classement de vérité.** Toute affirmation sur le système est classée :
`IMPLEMENTED / TESTED / DOCUMENTED_ONLY / PASSIVE / BLOCKED / NOT_FOUND / UNKNOWN`,
en séparant code actif · tests · artefacts runtime · doc canonique · roadmap · inférence.
`UNKNOWN` n'autorise aucune action qui en dépend (patron `REPO_TRUTH_SNAPSHOT`).

**P4 — Patterns sous triple contrainte.** Un pattern n'existe que s'il a : un dénominateur
(jamais d'effectifs bruts — leçon s9-build/s10a), une variance démontrée (règle ratifiée
2026-07-21), et le triplet Signal / Contre-hypothèse / Test. « Les données ne permettent
pas de conclure » est un résultat valide et attendu.

**P5 — ROI en 8 champs.** problème · fréquence · coût actuel · gain potentiel · coût de
modification · risque · confiance · validation après changement. Priorité : ROI élevé ×
faible coût × faible risque. Toute estimation porte ce qui l'invaliderait. Le
sous-échantillonnage se déclare (« ROI élevé mais n=4 »), jamais ne se masque.

**P6 — Auto-prompting (gabarit §3.3).** Une intention courte de Pierre n'est JAMAIS
transmise brute à la Forge : elle devient une mission AAA complète, incluant les pièges
connus du terrain (issus de la table §4.2 et des leçons de session).

**P7 — Contre-vérification systématique.** Aucun chiffre d'un rapport d'agent n'est relayé
à Pierre sans re-dérivation depuis la source primaire. Base empirique : 4 erreurs factuelles
attrapées ainsi en une seule journée (2026-07-26). La mesure d'impact d'une mission se fait
sur un critère falsifiable posé AVANT l'exécution (ex. « backfill 0 → N lignes »).

**P8 — Le studio est aussi une surface (ajout Pierre 2026-07-26).** Les skills, outils et
workflows — et plus largement TOUT composant du système d'agents : mémoire, circulation de
l'information, journaux d'erreurs, contrats, rôles — sont observés au même titre qu'un jeu
produit. Le test est unique et le même que pour le reste : *ce composant a-t-il un but
déclaré, et ce but est-il mécaniquement atteint — un consommateur réel, un lanceur réel, un
lecteur réel ?* Un composant déclaré sans consommateur est un défaut (« déclaré ≠ exécuté »),
pas une capacité. La sortie n'est JAMAIS du code : c'est une proposition structurée (§3.4)
tranchée par Pierre. Biais par défaut : **contre la création** — le rôle est d'abord de
détecter le redondant, le dormant, le mal placé, et de brancher l'existant.

### 3.2 Réponses aux 7 questions

1. **Reste dans Claude Code (troisième cerveau)** : interprétation, contre-vérification,
   catégorisation par lecture (la « catégorie réelle » d'un échec), contre-hypothèses,
   arbitrage ROI préparatoire, génération de missions AAA, préparation des gates Pierre.
   Tout ce qui exige un contexte frais et du jugement.
2. **Appartient à la Forge** : production, oracles non-LLM, verdicts signés, boucle
   retry/escalade, écriture automatique des mesures (telemetry, learning hook, journaux),
   enforcement mécanique (hook fail-closed, portes). La Forge mesure, le cerveau interprète,
   Pierre décide — la séparation observation / interprétation / règle appliquée est ici.
3. **Remonte automatiquement** : verdict.json vérifié, lignes learning_curve, entrées de
   journal, builder_runs/telemetry, statut d'adoption `skipped_validation`. Manque n°1
   identifié : un compteur d'exécution d'étape en append inconditionnel (succès ET échec).
4. **Analyses automatisables** : comptages, dénominateurs, variance, dérive doc↔réalité
   (selfaudit), adoption des règles — tout ce qui est un script déterministe.
   **Non automatisable aujourd'hui** : la lecture des textes d'erreur, les contre-hypothèses,
   le ROI — c'est précisément le travail du cerveau.
5. **Décisions humaines (Pierre, toujours)** : ratification de toute règle, merge/push,
   promotion en mémoire durable, dégel d'une lane, seuils des gates, budget. Une règle
   candidate a `auto_apply_allowed: false` par construction (schéma learning_event).
6. **Version minimale = 80 % du bénéfice** : ce document ratifié + la table de confiance
   des instruments (§4.2, versionnée) + le gabarit de mission (§3.3) + la règle P7.
   **Zéro logiciel nouveau.** Les 2 quick wins chiffrés de la matrice (pool_retry,
   préflight mutation) s'y ajoutent sur go, chacun tenant en une condition.
7. **Long terme** : learning_event comme format commun (étape 3 du plan ratifié) → règles
   candidates générées depuis les patterns soutenus → enforcement par lecteurs mécaniques
   (étape 4) → et seulement alors, chantier contrainte-contrat ↔ assertion-oracle.

### 3.3 Gabarit de mission AAA (extrait du format qui a fonctionné 7 fois le 2026-07-26)

```
OBJECTIF          — une phrase, falsifiable.
CONTEXTE VÉRIFIÉ  — les faits déjà établis, avec preuve ; "à re-vérifier, pas à croire".
PIÈGES CONNUS     — les mensonges d'instruments et erreurs déjà payées (table §4.2).
DESIGN IMPOSÉ     — les décisions déjà arbitrées par Pierre ; "ne pas redessiner".
CONTRAINTES       — périmètre fichiers, zones gelées, advisory strict, pas de commit/push.
MÉTHODE           — TDD rouge→vert montré, cas limites listés AVANT, encodage utf-8.
PREUVE EXIGÉE     — sorties réelles (pas d'affirmations), git status final,
                    critère falsifiable posé d'avance, analyse de variance si métrique.
RAPPORT           — software_verdict / evidence_verdict / claim_verdict: NO_CLAIM_ALLOWED.
```

### 3.4 Triage d'une surface d'outillage (skill · outil · workflow · composant)

**Format de proposition** (le P5 à 8 champs + 2, ratifié dans l'ajout Pierre 2026-07-26) :
problème observé · **preuve dans les données** · coût actuel (tokens / temps / erreurs /
friction) · solution proposée (skill / outil / workflow / **suppression**) · coût
d'implémentation estimé · risque · **critère falsifiable après changement** · décision
attendue de Pierre.

**Ordre de décision** : UNIQUE pour tout le protocole — la table §7.5 (« premier applicable
gagne » : ne rien faire · supprimer · mémoire · corriger · améliorer · créer · humain).
Pas de second arbre ici (suppression éditoriale ratifiée Pierre 2026-07-26).

**Distribution observée le 2026-07-26** (5 surfaces analysées, cf. §3.4-bis) : 1 nouvel outil
justifié · 0 nouveau skill · 1 réparation d'invocation · 1 procédure humaine (avec sous-part
mécanique séparée) · 2 « pas maintenant ». Cette distribution — **une création pour cinq
observations** — EST le comportement attendu, pas une exception : un troisième cerveau qui
propose un skill à chaque problème a cessé de faire son travail.

### 3.4-bis Démonstration sur surfaces réelles (2026-07-26, master)

| Surface observée | Preuve | Verdict de triage |
|---|---|---|
| 5 capteurs d'audit (`master_index`, `pending_review`, `declaration_readers`, `agent_context_map` ; `studio_selfaudit` muet) | 31 `.mjs`, 2 lanceurs ; `master_index` signalait la dérive `memory/` sans lecteur | **Réparer l'invocation** (§7.5) — capacité présente, défaut = non-invocation. PAS un skill. |
| Compteur d'exécution d'étape (succès ET échec) | aucun instrument n'append inconditionnellement ; state/telemetry/builder_runs mentent tous sur les échecs (§4.2) | **Nouvel outil** (§7.5) — aucun existant ne couvre, corrompt chaque analyse, mécanique, cheap. Le seul « oui » des cinq. |
| Clôture de session (handoff + archivage >100 l. + régénération d'index + mémoire) | fait à la main plusieurs fois par session | **Procédure humaine** (§7.5) — le *quoi écrire* est du jugement ; SEUL le mécanique (régénérer les index, vérifier la limite de lignes, résoudre les pointeurs d'archive) se détache en outil. |
| 6 skills IMP (`sprint-plan/status`, `imp-readiness`, `autoloop`, `tick`, `council`) | déjà gelés-legacy (CLAUDE.md:128) ; invoqués sur demande explicite seulement | **Ne vaut pas le coût** (§7.5) — outiller leur fusion = coût, bénéfice récurrent nul (déjà dormants par décision). Nommer, classer. |
| `openclaw-install` + `/gate`, `/audit-daily` qui écrivent/lisent le legacy openclaw | openclaw legacy 2026-07-23 ; `/gate` écrit ses verdicts HumanGate dans `studio/openclaw-workspace/DREAMS.md` | **Décision Pierre requise** — pas un manque d'outil : une destination legacy à trancher (où `/gate` écrit désormais). Déjà dans la pile de décisions ouvertes. |

Fait transverse mesuré le 2026-07-26 : **20 des 38 skills** ne figurent pas dans la table de
routage `intention → skill` de CLAUDE.md. Ce n'est pas 20 défauts (certains — `start`, `joust`,
`team-feature` — s'invoquent directement) : c'est une surface à passer au crible P8, un skill à
la fois, avec le biais anti-création.

---

## 4. Mémoire nécessaire

### 4.1 À conserver / purger / laisser en logs

| Classe | Contenu | Règle |
|---|---|---|
| **Conserver (versionné)** | decision-log + fichiers PROPOSED · ce protocole · table de confiance §4.2 · leçons de session (mémoire auto) · learning_curve · journaux d'erreurs | rien ne se réécrit ; normalisation à la LECTURE (patron `marker_key`/premortem) |
| **Purger (sur gate)** | archives journal > handoff 100 lignes → `studio_brain/journal/` · corpus Codex dormant (décision séparée) | jamais de purge automatique |
| **Logs (ni mémoire ni vérité)** | `state.json` (écrasé par tentative — ne peut PAS servir de compteur) · dispatch_dryrun · sorties de scratchpad | ne jamais promouvoir un log en source de vérité sans preuve de concordance |

### 4.2 Table de confiance des instruments (V1 — à maintenir à chaque découverte)

| Instrument | Fiable pour | MENT sur | Preuve |
|---|---|---|---|
| `forge_telemetry.jsonl` | tokens/durée des étapes **réussies** | les échecs (n'écrit que sur OK) · le modèle réel sous escalade (`payload.model`, pas `model_override`) | driver.py:468-472 · durées croisées builder_runs |
| `forge_builder_runs.jsonl` | tier réel, retry_number, oracle_result | couverture (3 runs, 1 famille) · double-comptage (1 invocation = 2 jugements) | clés ts 1784401284/1784401977 |
| `state.json` | dernier état d'un run | tout cumul (detail écrasé) · `detail.model` sous escalade · dénombrement (pas un append) | pong s10s `attempts:0`+`FAIL` |
| journaux d'erreurs | textes rédigés, familles C1..C7 | « réparé à la tentative N » = l'étape a FINI, pas que l'artefact est bon (l'oracle peut rejeter juste après) · `etape` = détection dans html.jsonl mais correction dans forge.jsonl | driver.py:479 · matrice §5 |
| `learning_curve.jsonl` | n=3 ; `oracle_iterations` varie | `joust_delta` (3/3 null, variance nulle) · `reuse_ratio` (1 seul sujet game) | analyse A6 |
| `dispatch_audit.jsonl` | qui a été dispatché, modèle résolu, HMAC | ne dit pas ce que l'agent a LU ni fait | audit contexte 2026-07-25 |

---

## 5. Boucle d'apprentissage (instanciée sur l'existant)

```
Erreur                → error_journal (auto : driver + record_error)          [EXISTE]
  ↓
Analyse               → troisième cerveau, protocole P1..P4                   [CE DOCUMENT]
  ↓
Correction            → mission AAA → Forge (contrats, oracles, verdict)      [EXISTE]
  ↓
Mesure                → critère falsifiable posé avant ; learning_curve ;     [EXISTE, partiel]
                        adoption skipped_validation (filled/declared_empty/absent)
  ↓
Nouvelle règle candidate → format learning_event.preventive_rule_candidate    [SCHÉMA EXISTE, à rapatrier — étape 3]
  ↓
Validation humaine    → gate Pierre ; décision enrichie (portée autorisée +   [LIVRÉ, non commité]
                        commandes de validation) via pending_review_decisions
  ↓
Adoption              → mesurée, advisory d'abord ; gate dur = décision       [DOCTRINE RATIFIÉE]
                        Pierre distincte, prise sur chiffres d'adoption
```

Le chaînon faible est identifié et nommé : la **promotion** (règle candidate → décision →
application suivie). Les champs enrichis des décisions rendent ce chaînon mécanisable ;
il reste volontairement manuel tant que Pierre n'a pas ratifié l'étape 4.

---

## 6. Roadmap ROI

### Faible coût / fort impact (chacun = une condition ou un document)
1. **Ratifier ce protocole** (ce fichier → decision-log) — coût nul, cadre tout le reste.
2. **Supprimer `pool_retry` même-tier** — 4/4 échecs, 3,18 $ / 71 942 tokens = 15,6 % de la
   dépense pour zéro vert. Mesure : lignes `pool_retry` → 0 ; $/oracle-vert comparé.
   Réserve : n=4, tentatives non indépendantes.
3. **Préflight « preuve de mutation possible » avant s9-build** — 2 BLOCKED à 39 683 tokens,
   dont 1 run tué. Mesure : « fichiers logiques inconnus » → 0 entrée. Réserve : n=2.
4. **Propager le motif d'échec s10s** (`_failure_reason` ignore placement/budget/line_states/
   collisions/index) — testable rétroactivement sur pong/state.json, zéro run à payer.

### Moyen coût
5. **Compteur d'exécution d'étape en append inconditionnel** (succès ET échec) — débloque
   toute normalisation ; manque n°1 des deux analyses.
6. **Brancher `s10s-oracle-standard` au driver** (`attempts:0` + `FAIL` prouve qu'il tourne
   hors `_run_deterministic`) — sans quoi le profil standard reste ininterprétable.
7. **Champ détection/correction structuré dans le journal** (règle C1 de l'observation).
8. **Rapatrier `learning_event`** (schéma + validateur + fixtures SEULEMENT, pas la
   mécanique studioV2) — étape 3 du plan ratifié.
9. **Sonde tier-fixe** (opus tentative 1 sur un jeu déjà forgé) pour séparer tier / rang
    de tentative — sans elle, les 7,44 $ restent un coût sans cause établie.

### Long terme
10. **Contrainte-contrat ↔ assertion-oracle** (le chantier anti « oracle vert sur artefact
    faux ») — plus gros gain potentiel (840 624 tokens de retravail mesurés sur card_engine),
    plus faible confiance (totaux d'étape non découpables défaut/feature). Ne se lance
    qu'après 5+6 (il a besoin d'instruments qui ne mentent pas).
11. Étape 4 du plan ratifié : des lecteurs mécaniques pour les règles adoptées
    (recommandation → contrainte), un périmètre à la fois, sur chiffres d'adoption.

---

## 7. Runbook quotidien — une journée réelle (ajout Pierre 2026-07-26)

Le protocole d'UTILISATION, pas l'architecture. Toutes les commandes citées existent sur
`master` (vérifié 2026-07-26). Rien à construire pour l'exécuter.

### 7.0 Le budget d'analyse — une seule règle
**Vert → stop.** Un capteur au vert ne se creuse pas. Seuls un signal rouge ou une demande de
Pierre déclenchent une lecture plus profonde, et d'**un seul cran**. Aucune analyse ne se
dépense sur un pattern sans dénominateur (P4). Le cerveau reste à contexte propre : agrégats et
sources primaires ciblées, jamais des transcripts bruts.

### 7.1 Début de session
**Lit, dans l'ordre (read-only) :**
1. `memory/MEMORY.md` (auto-chargé) — l'index des faits durables.
2. `studio_brain/00_CURRENT_CONTEXT.md` — le handoff : où on en était, décisions ouvertes.
3. La pile non tranchée : `studio_brain/decisions/PROPOSED_*.md` + `lab/reports/pending_review_decisions.jsonl`.

**Vérifie (3 capteurs déterministes, quelques secondes) :**
- `node scripts/forge/studio_selfaudit.mjs` — dérive doc↔réalité + `contract_sync` + connecteurs dormants (exit 0/1).
- `node scripts/forge/master_index.mjs` — les sources de vérité citées existent-elles vraiment.
- `git status --short` — la taille de la pile non commitée EST un signal (≈20 fichiers = risque `git checkout`, incident réel du 18-07).

**Budget :** ces 3 lectures + 3 capteurs, point. Vert partout = on n'ouvre rien. Le cerveau
n'ouvre PAS de run et ne lance PAS d'analyse profonde au réveil — il établit le sol et surface
les anomalies à Pierre.

### 7.2 Pendant un run Forge
Le cerveau **ne surveille jamais jeton par jeton** (P0 : jamais worker). Il observe aux
**frontières d'étape**, via les journaux append-only et `state.json`, jamais le transcript brut.

**Surveille :** les transitions de `lab/forge_runs/<run>/state.json` (`attempts`, `escalations`,
`pool_attempts`, statut) · les appends d'`error_journal` · le verdict en fin de chaîne.

**Intervient — uniquement sur événement dur, jamais en continu, jamais DANS le run :**
- escalade au tier sommet (opus) toujours rouge → BLOCKED imminent → prépare la HumanGate ;
- `HALTED`/timeout → distinguer **échec d'horloge** d'un **échec de qualité** (leçon shmup/pong) AVANT tout ;
- un instrument qui en contredit un autre (le problème 6/5/5/3, §4.2) → signaler l'INSTRUMENT, pas le run.

**Déclencheur d'analyse :** la MÊME famille d'échec qui se répète sur plusieurs tentatives. Un
1er FAIL est normal (le pool/l'escalade le gèrent) ; c'est la **répétition** qui est le signal.
Mid-run le cerveau collecte ; il analyse APRÈS.

### 7.3 Après un run
**Récupère (sources primaires re-lues, jamais le rapport d'un agent — P7) :**
- `state.json` — état final, tentatives, escalades ;
- `verdict.json` — **re-vérifié** par `python -m forge.verify_run <verdict.json>` (jamais « HMAC OK » sans l'avoir lancé) ;
- `forge_telemetry.jsonl` — tokens/durée, **étapes OK seulement** (ment sur les échecs, §4.2) ;
- `forge_builder_runs.jsonl` — tier/retry/résultat via `by_tier` (champ normalisé), jamais `by_builder` ;
- `error_journal` — les TEXTES d'échec : la part de jugement non automatisable.

**Décide qu'il y a un pattern — triple contrainte P4, sinon il n'y a PAS de pattern :**
1. un **dénominateur** (« 3 FAIL sur N tentatives », jamais « 3 FAIL ») ;
2. une **variance démontrée** (règle 2026-07-21 : la métrique porte-t-elle de l'info ?) ;
3. le triplet **Signal / Contre-hypothèse / Test**, tenu sur **≥2 runs ou familles** — sinon déclaré « n=1, une seule famille » (piège shmup). « Les données ne permettent pas de conclure » est un résultat valide.

**Calcule le ROI (P5, 8 champs) depuis les instruments :**
- coût actuel = tokens (`builder_runs` pour le tier qui échoue, `telemetry` ne voit pas les échecs) + retravail ;
- fréquence = compte avec dénominateur depuis les journaux ; gain = coût évité si le correctif tient, avec sa réserve.
- Exemple travaillé (matrice 2026-07-26) : `pool_retry` même-tier = **4/4 échecs**, 3,18 $ / 71 942 tokens = **15,6 % de la dépense pour zéro vert**. Réserve : n=4, tentatives non indépendantes.
- Toute estimation porte **ce qui l'invaliderait** ; le sous-échantillon se déclare (« ROI élevé mais n=4 »), jamais ne se masque.

### 7.4 Sortie
**Produit :** une proposition au format §3.4 (8+2 champs). Rien d'autre — pas de code.

**Devient une mission AAA (gabarit §3.3) SI et seulement si :** (a) Pierre l'a ratifiée comme
valant l'effort, ET (b) elle est assez bornée/mécanique pour la Forge sous contrat. Le passage
proposition → mission est une **décision de Pierre**, jamais automatique.

**Est rejetée (le rejet est une sortie valide, consignée) :** échoue P4 (« données
insuffisantes ») · se résout en **procédure humaine** (pas une mission du tout) · « ne vaut pas
le coût » (nommer, classer, ne rien construire).

### 7.5 Règle de priorité — que faire d'un pattern confirmé
Ordre d'examen, **premier applicable gagne**. Principe : *ne rien faire par défaut · retirer
avant d'ajouter · mémoire avant code · corriger avant construire · modifier avant créer.*

| # | Question | Action si OUI |
|---|---|---|
| 1 | Le pattern échoue-t-il **P4** ? | **NE RIEN FAIRE**, consigner l'observation (le cas le plus fréquent). |
| 2 | Un composant coûte-t-il **sans bénéfice vérifié** ? | **SUPPRIMER l'étape/le composant** — ROI le plus haut (coût continu négatif, risque faible, réversible). Ex. `pool_retry` 4/4. |
| 3 | La cause est-elle une **leçon qui existe mais n'est pas atteinte** (premortem non injecté, fait non versionné, doc périmée) ? | **MODIFIER LA MÉMOIRE** — quasi gratuit, tue la récurrence à la racine. |
| 4 | Une **erreur récurrente** a-t-elle une cause corrigeable dans un composant existant ? | **CORRIGER au point de cause** (jamais le symptôme). |
| 5 | Un **skill existant** couvre-t-il mais mal / vers du legacy ? | **AMÉLIORER le skill** (jamais dupliquer). |
| 6 | Rien ne couvre + récurrence prouvée + ROI>coût>risque + mécanique ? | **CRÉER un outil** — dernier recours côté construction. Ex. compteur d'étape append inconditionnel. |
| 7 | Exige du **jugement à contexte frais** ? | Hors liste : **PROCÉDURE HUMAINE**, remonter à Pierre. |

La suppression est délibérément au-dessus de la correction, et la correction au-dessus de la
construction : un studio s'améliore d'abord en retirant ce qui coûte sans servir, pas en
ajoutant. La mémoire est haute parce qu'une « erreur récurrente » est le plus souvent une leçon
qui existait déjà mais n'était pas atteinte — la corriger dans le code sans corriger la mémoire,
c'est traiter le symptôme.

---

## 8. Verdicts séparés

```
software_verdict: OK          (portée : analyse lecture seule + rédaction de ce document ;
                               aucun code modifié, aucun commit, aucun push)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
                              (chaque fait chiffré porte sa source primaire relue ;
                               aucun chiffre relayé sans re-dérivation)
claim_verdict: NO_CLAIM_ALLOWED
                              (ce protocole est PROPOSED ; son efficacité n'est pas
                               démontrée — elle se mesurera aux critères §6, pas à sa
                               rédaction ; pas de verdict global « prêt/pas prêt »)
```
