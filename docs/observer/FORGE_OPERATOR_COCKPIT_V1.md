# FORGE OPERATOR COCKPIT V1 — poste de pilotage humain + IA

*Date : 2026-08-01 · Statut : **PROPOSED** — conception, aucun code, ratification Pierre requise*
*Sources : Observer (construit et étalonné sur Breakout V2, connaissance de première main) + 2 reconnaissances déléguées (Master Schema/planning/boucle documentaire · besoins IA orchestratrice), affirmations porteuses re-vérifiées à la main.*

```
software_verdict : BLOCKED   (rien construit — document de conception)
evidence_verdict : MECHANICAL_VALIDATION_ONLY
claim_verdict    : NO_CLAIM_ALLOWED
```

---

## 0. La thèse

Le studio possède déjà les trois quarts d'un poste de pilotage, mais en trois
morceaux qui ne se parlent pas :

| Morceau | Nature | Défaut structurel |
|---|---|---|
| Master Schema (VUE 1-4 HTML) | vision structurelle, doctrine | **manuel, vieillit en silence** — le selfaudit le dit lui-même ; VUE 4 ignore `lessons.jsonl` créé le jour même |
| Observer | réalité mesurée, provenance obligatoire | ne connaît ni le planning, ni les décisions, ni la doctrine |
| Prose de session (`00_CURRENT_CONTEXT`, rapports de campagne) | planning et décisions de fait | illisible par une machine, fuit hors des registres canoniques |

Le cockpit V1 n'est **pas** une nouvelle couche : c'est le raccordement des trois,
sous le contrat de cellule qu'Observer impose déjà — `{valeur, provenance, raison
si absente}`. La règle finale de la mission (« pas de chiffre sans contexte, pas
de statut sans preuve… ») n'est pas à inventer : elle est **déjà implémentée**
dans Observer. Le travail du cockpit est de l'étendre aux deux étages qui ne
l'ont pas : le planning et la structure.

Corollaire dur, appris du Master Schema : **aucune vue du cockpit ne doit être
entretenue à la main**. Une vue est générée depuis des sources machine, ou elle
n'existe pas. Un document manuel est de la doctrine (HUMAN_ONLY, au sens du
manuel architecte), jamais une source de cockpit.

---

## 1. Phase 1 — analyse croisée (constats vérifiés)

### 1.1 Disponible

- Réalité d'exécution complète par run : état, verdict signé, prompts vérifiés
  SHA (9/10 MATCH), outils réels, fichiers touchés, tokens mesurés, mutation,
  solvabilité, incidents — Observer, provenance ligne à ligne.
- Chaîne d'étapes par profil : `dispatch.py::PROFILES` (source unique déclarée,
  fail-fast) — la dépendance entre étapes EST machine-lisible.
- Charter et invariants de périmètre : `charter.yaml` (validé par oracle),
  `reference_protected.yaml` (consommé par la garde), `.claude/settings.json`.
- Boucle leçons, moitié amont : `lab/reports/lessons.jsonl` (schéma
  `forge.lesson.v1`, 10 lignes) **lu réellement** par `driver.py::premortem_lessons`
  — vérifié à la main, c'est la seule boucle documentaire déjà câblée.
- Coûts/durées bruts par étape : `forge_telemetry.jsonl` (avec la réserve
  connue : tokens sous-déclarés ×6,7–12,3 — le cockpit doit afficher les DEUX
  comptes, jamais le seul déclaré).

### 1.2 Manquant (vérifié, pas supposé)

| Manque | Preuve |
|---|---|
| Planning machine-lisible | aucun champ lot/priorité/séquence typé nulle part ; le plus proche est de la prose (`00_CURRENT_CONTEXT`, `DEFERRED.md`, non parsés) |
| Registre de décisions à jour | `decision-log.md` : **0** occurrence de Breakout ; les gates du 31/07 ne vivent que dans la prose de session et le commit `2b38702` |
| Index des campagnes | `RUN_INDEX.md` : **0** occurrence de Breakout — deux « sources de vérité des runs » sans pont |
| Confiance dans les instruments | table §4.2 de THIRD_BRAIN en Markdown, jamais sérialisée |
| Disponibilité des agents | `roles.yaml` résout rôle→modèle ; aucun état occupé/libre nulle part |
| Actions possibles par état | reprise/escalade/halt vivent dans le contrôle de flux de `driver.py` — aucune énumération interrogeable |
| Risque d'action complet | `git_guard.py` s'auto-déclare « PRÉPARÉ, NON ACTIVÉ » ; le gel STUDIO (CLAUDE.md, prose) est **absent** de `reference_protected.yaml` — vérifié, 0 occurrence |
| Ratification HumanGate | `HUMANGATE_READY` ≠ ratifié ; la décision humaine vit hors des racines lisibles d'Observer |

### 1.3 Doublons et confusions

1. **Deux vues « Drift »** dans la console (v9 technique, c2 cockpit) — mêmes 43
   écarts, deux présentations. Tranché en phase 3.
2. **Deux registres de décisions** (`decision-log.md` canonique mais stale ;
   `HUMANGATE_DECISION_LOG.yaml` structuré mais figé depuis 5 semaines et scoré
   sur un autre sous-système). Split-brain actif.
3. **Deux journaux d'erreurs** (legacy `governance/error_journal.py` vs
   par-domaine `studio_link.py`) — connu, non fusionné.
4. **VUE 4 Pilotage** affiche des chiffres de mémoire cognitive antérieurs à
   `lessons.jsonl` — un lecteur croirait le mécanisme inexistant alors qu'il
   vient d'être exercé.

### 1.4 Utile à qui

- **Humain seulement** : narratifs de campagne, doctrine (Master Schema HTML),
  leçons en prose, criteres_demo. L'IA n'en tire rien de fiable.
- **IA seulement** : empreintes SHA/HMAC par ligne, `event_id` déterministes,
  chaîne `PROFILES`, priors de coût bruts, signatures d'échec par motif. Pierre
  n'a pas à lire ça — il a à savoir que ça se vérifie.
- **Les deux, mais à des grains différents** : verdicts, drift, coût, état des
  étapes. Même donnée, deux niveaux de zoom — c'est l'argument central pour un
  cockpit à deux faces plutôt que deux outils.

---

## 2. Phase 2 — les deux points de vue

### Vue A — « Si j'étais Pierre » : piloter en 30 secondes

Les huit questions, et ce qui y répond aujourd'hui :

| Question | Réponse actuelle | Verdict |
|---|---|---|
| État global ? | ouvrir la console, onglet État Forge | OK mais par run, pas par studio |
| Progression ? | bloc progression inter-runs (MIEUX/MOINS_BIEN) | OK, mono-projet |
| Blocages ? | failure_events + run BLOCKED | OK |
| Décisions attendues ? | **nulle part de fiable** — prose de session | MANQUE |
| Risques ? | drift high (11 items) | OK mais sans propriétaire |
| Preuves ? | clic provenance | OK — c'est le point fort |
| Prochaines actions ? | **nulle part** | MANQUE |
| Planning ? | **nulle part** | MANQUE |

Le résumé honnête : Pierre peut aujourd'hui savoir en 30 secondes **ce qui s'est
passé et si c'est prouvé**. Il ne peut pas savoir **ce qui l'attend** — ni les
décisions en souffrance, ni la prochaine action, ni le plan. La moitié
rétrospective du cockpit existe ; la moitié prospective n'existe pas, et elle ne
peut pas être générée depuis les traces actuelles : il lui faut une source.

### Vue B — « Si j'étais l'IA orchestratrice »

Ce qui me manque pour piloter, classé par gravité (top 5 vérifié) :

1. **Confiance dans mes instruments.** Je sais que `forge_telemetry` ment ×12 sur
   les tokens et que `state.json` ment sur tout cumul — mais je le sais par la
   prose d'un protocole, pas par un champ interrogeable. Il me faut la table de
   confiance §4.2 **sérialisée** : `instrument → fiable_pour[] / ment_sur[]`,
   versionnée, mise à jour par les découvertes d'Observer.
2. **Quelles décisions font foi.** Le log canonique est de la prose stale ; le
   log structuré est d'un autre sous-système. Je ne peux pas répondre « ai-je le
   droit de faire X » sans lire du Markdown à la recherche d'une ratification.
3. **Actions possibles depuis l'état courant.** HALTED → {reprendre, escalader,
   abandonner} existe dans le code du driver, pas comme donnée. Une machine à
   états exposée (`etat → actions[] → coût_attendu → risque`) est la condition
   de toute orchestration autonome — et, plus tard, du MCTS : ses nœuds sont
   exactement ces états, ses arêtes exactement ces actions.
4. **Coût attendu par action.** Les bruts existent (123 lignes de télémétrie),
   aucun prior agrégé (médiane/p90 par étape×modèle). Je dois recalculer à
   chaque fois — et sur les chiffres déclarés, qui sont faux.
5. **Risque d'action complet.** Deux listes machine partielles, une garde non
   activée, et le plus gros gel du studio en prose seulement. Un agent qui ne
   lit que les fichiers machine peut toucher la lane STUDIO gelée sans qu'aucun
   mécanisme ne l'arrête.

Inutile à Pierre, vital pour moi : les empreintes par activation, la machine à
états, les priors de coût, la table de confiance. C'est la justification de la
vue 7 (AI CONTROL) comme vue séparée — non pas cachée, mais à un grain que
l'humain n'a pas à subir.

---

## 3. Phase 3 — arbitrage Drift : **Option A, une seule vue**

Les deux « Drift » actuels ne sont pas deux concepts : ce sont **deux
présentations des mêmes écarts**, issus du même détecteur. L'option B
(technique / opérationnel) consacrerait une distinction absente des données et
recréerait l'ambiguïté au premier cas frontière — l'écart de tokens est les
deux à la fois. La vraie ligne de partage est **qui doit répondre** : c'est une
colonne, pas une vue.

Structure ratifiable de la vue unique :

| colonne | source | état |
|---|---|---|
| écart (quoi ↔ quoi, en clair) | détecteur Observer (déjà fait) | existe |
| gravité | idem | existe |
| preuve (clic → ligne source) | idem | existe |
| impact | à dériver par type d'écart (table fixe : tokens→décisions de coût faussées, outils→périmètre non garanti…) | à écrire |
| **propriétaire** | table fixe type→propriétaire (harnais / contrat / exécuteur / doctrine / HumanGate) | à écrire |
| action recommandée | existe en germe (`a arbitrer / a examiner / information`) — à typer | à affiner |

Les cinq familles demandées se rangent dedans : déclaration→exécution (existant),
contrat→réalité (existant), métrique (tokens, existant), documentation (nouveau
détecteur : VUE 4 vs `lessons.jsonl`, `RUN_INDEX` vs campagnes réelles — les
deux cas sont déjà prouvés à la main), comportement agent (outils/périmètre,
existant). `v9` disparaît comme onglet ; ses données restent en détail dépliable.

---

## 4. Phase 4 — les huit vues

Pour chaque vue : question, données, sources existantes, sources manquantes.
Toute cellule respecte le contrat `{v, src, why}` — un manque s'affiche
`NOT_OBSERVABLE` avec sa raison, jamais 0, jamais vide.

### 4.1 FORGE MAP — « où sommes-nous ? »

Pipeline Projet → Campagne → Mission → Agents → Artifacts → Tests → Preuves →
Décisions, **généré**, jamais dessiné à la main.

| entité | source machine | état |
|---|---|---|
| Projet | `games/<p>/` + `oracles.json` (registre) | existe |
| Campagne | **aucun index** — reconstruction par Observer (groupes de run_id) | dérivable |
| Mission/Run | `state.json` + verdict | existe (Observer) |
| Agents | `dispatch_audit` + contrats YAML | existe |
| Artifacts | run_dir + transcripts (fichiers écrits) | existe |
| Tests/Preuves | oracle logs, mutation, HMAC | existe |
| Décisions | **trou** — voir 4.6 | manquant |

Le Master Schema HTML n'est **pas** une source de cette vue : il en devient un
**consommateur possible** (doctrine illustrée par des données vraies) — jamais
l'inverse. C'est la réponse au vieillissement silencieux.

### 4.2 PLANNING — la vue qui n'existe pas, et sa condition

Afficher objectifs, lots, priorité, état, dépendances, blocages, prochaine
action — chaque tâche avec **raison** (décision ou leçon qui l'a créée) et
**preuve de complétion attendue** (quel oracle dira « fait »).

**Il n'y a rien à afficher aujourd'hui** : aucune source machine. La condition
d'existence de cette vue est un petit registre nouveau — proposition :
`studio_brain/planning/planning.yaml`, schéma minimal
`{id, objectif, raison→(décision|leçon), priorite, etat, depends_on[], preuve_attendue}` —
écrit par Pierre ou proposé par l'orchestrateur en propose-only, ratifié.
**C'est une écriture nouvelle : gate Pierre requise.** Sans ce registre, la vue
PLANNING affichera honnêtement `NOT_OBSERVABLE — aucun planning machine-lisible
n'existe`, ce qui est déjà une information de pilotage.

Les leçons L1-L5 en sont le premier contenu naturel : elles portent déjà
`DESTINATION` (tag de routage) et attendent dans `lessons.jsonl` sans qu'aucun
registre ne garantisse leur réveil.

### 4.3 CAMPAGNES — lisibilité

Existant (17 colonnes, provenance, progression). Deux changements :

- **Noms humains** : `s9-build-godot-standard` → « Build Godot », session
  `16904fb3…` → « Breakout V2 · Build Godot · run 2 ». La table de nommage
  existe déjà : champ `role`/`capability_role` des contrats + étape. UUID
  conservés en détail dépliable — le nom est un confort, la provenance reste
  l'identité.
- **Multi-projets** : empiler les campagnes (Pong, Snake, shmup, Breakout) —
  le corrélateur est déjà générique, il manque la passe d'agrégation.

### 4.4 AGENTS — carte enrichie

Existant : session, type, parent/enfants, modèles, durée, tokens, statut.
À ajouter depuis les contrats : nom humain, rôle, mission (objectif du
contrat), raison d'activation (existe), résultat (verdict d'étape). Le lien
parent reste `NOT_OBSERVABLE` pour les sessions lancées par le driver — affiché
comme tel tant que le capteur `sessionId → state.json` (proposé, non validé)
n'existe pas.

### 4.5 DRIFT — vue unique (phase 3)

### 4.6 HUMAN GATE — décisions humaines

| donnée | source | état |
|---|---|---|
| décisions en attente | verdicts `HUMANGATE_READY` non suivis d'une entrée de log | dérivable |
| décisions prises | `decision-log.md` (prose — parsable a minima par sections datées) | dégradé |
| **écart prises ↔ enregistrées** | croisement commits/prose vs log | **c'est LA ligne de valeur** |
| preuve attendue par décision | `humangate_flags` du verdict | existe |

La vue doit afficher en premier l'écart démontré : gates Breakout ratifiées le
31/07, enregistrées **nulle part** de canonique. Un cockpit qui masquerait ça
pilote sur un registre qui ment par omission. La résorption (mirror structuré
du decision-log, ou écriture directe par `/gate` dans un YAML) est une décision
de Pierre — le cockpit la **montre**, il ne la répare pas.

### 4.7 AI CONTROL VIEW — l'état honnête d'abord

Les 12 rubriques demandées, avec leur état réel :

| rubrique | aujourd'hui |
|---|---|
| contexte actif | `state.json` (avec sa réserve « ment sur le cumul » affichée) |
| objectif courant | `charter.yaml` |
| invariants actifs | `reference_protected.yaml` + `settings.json` + **alerte : gel STUDIO non couvert, git_guard non activé** |
| état des agents | `roles.yaml` (résolution) ; disponibilité `NOT_OBSERVABLE` |
| dépendances | `PROFILES` de dispatch.py |
| mémoire chargée | `lessons.jsonl` + pré-mortem (câblé, prouvé) |
| décisions prises | `NOT_OBSERVABLE` fiable — voir 4.6 |
| erreurs/causes | signatures mécaniques oui ; causes racines **jamais** (jugement) |
| confiance | `NOT_OBSERVABLE` — table §4.2 non sérialisée |
| actions possibles | `NOT_OBSERVABLE` — machine à états non exposée |
| coût attendu | bruts oui, priors non |
| risque d'action | partiel, incohérences affichées |

Cette vue est légitime **dès maintenant** précisément parce qu'elle montrera
sept `NOT_OBSERVABLE` sur douze : c'est la liste de courses de la Forge
autonome, tenue à jour mécaniquement. Elle devient pilotage réel au fur et à
mesure que les sources manquantes sont ratifiées et créées.

### 4.8 DOCUMENTATION LOOP

Boucle : fin de campagne → Observer → leçons validées → mise à jour doc →
planning suivant.

État vérifié : maillon 1-2-3 câblés (`lessons.jsonl` lu par le pré-mortem du
run suivant). Maillons 4-5 inexistants : les leçons portent un tag
`DESTINATION` mais aucune mise à jour de doc n'est proposée mécaniquement, et
aucun registre de planning ne les accueille.

Documents à proposer automatiquement en mise à jour (dérivé des tags réels des
L1-L5) : `scripts/forge/standard/SCHEMA.md` (L5), `product_oracle_godot.py`
doc (L4), profils de timeout (L1), garde de pré-vol oracles.json (L2), règle
wiremap inter-genres (L3). La vue liste « leçon validée → doc cible → statut
(proposé/appliqué/refusé) ». **Propose-only** : l'application reste un geste
ratifié, writes never ascend.

---

## 5. Données nécessaires — synthèse sources

**Existantes et suffisantes** : tout Observer (événements, faits, prompts
vérifiés, drift, provenance), PROFILES, charters, contrats, lessons.jsonl,
telemetry brute, reference_protected, settings.

**Manquantes — chacune est une écriture nouvelle, donc gate Pierre :**

| # | source à créer | débloque | coût estimé |
|---|---|---|---|
| M1 | `planning.yaml` (schéma minimal ci-dessus) | vue PLANNING, moitié prospective du cockpit | faible |
| M2 | sérialisation de la table de confiance §4.2 | AI CONTROL (confiance) | faible |
| M3 | mirror structuré du decision-log (ou `/gate` écrit en YAML) | HUMAN GATE fiable, AI CONTROL (décisions) | faible, mais touche `/gate` |
| M4 | machine à états du driver exposée en données | AI CONTROL (actions), futur MCTS | moyen, touche la Forge |
| M5 | priors de coût agrégés (calculables par Observer seul, **sans** toucher la Forge) | AI CONTROL (coût) | faible, côté Observer |
| M6 | gel STUDIO en machine-lisible + activation git_guard | risque d'action complet | faible, mais décision de garde |

M5 est la seule réalisable sans toucher au système observé.

---

## 6. Ordre d'implémentation proposé

1. **Fusion Drift** (option A) + colonnes impact/propriétaire — pur Observer,
   supprime la confusion immédiate.
2. **Noms humains** dans Campagnes/Agents — pur Observer, mapping depuis les
   contrats existants.
3. **FORGE MAP générée** — pur Observer, sources machine existantes.
4. **HUMAN GATE** avec l'écart prises↔enregistrées — lecture d'une racine
   nouvelle (`studio_brain/decisions/`) : extension des racines lisibles
   d'Observer, à déclarer explicitement (c'est un élargissement du périmètre de
   lecture, pas une écriture — mais je le signale plutôt que de l'étendre en
   silence).
5. **DOCUMENTATION LOOP** (lecture `lessons.jsonl`, déjà dans lab/reports —
   racine à ajouter également).
6. **AI CONTROL** version honnête (7/12 NOT_OBSERVABLE affichés) + M5 (priors).
7. **PLANNING** — bloqué par M1, gate Pierre.
8. Compléments AI CONTROL — bloqués par M2/M3/M4/M6, gates séparées.

Étapes 1-3 : aucune nouvelle donnée, aucun élargissement. Étapes 4-6 :
élargissement de lecture seulement. 7-8 : écritures nouvelles, ratification.

---

## 7. Limites — dites avant qu'on les découvre

1. Le cockpit **montre** les fuites (décisions non enregistrées, gel non
   couvert, tokens faux) — il n'en répare aucune. Chaque réparation est un
   chantier ratifié séparément.
2. La moitié prospective (PLANNING) est vide tant que M1 n'existe pas — la vue
   l'affichera comme un fait, pas comme un bug.
3. L'AI CONTROL VIEW ne rend pas la Forge autonome : elle rend **mesurable la
   distance à l'autonomie** (7 rubriques sur 12 non observables aujourd'hui).
4. Le rattachement transcript↔run reste une inférence de portée de session,
   héritée d'Observer, étiquetée sur chaque événement.
5. Les causes racines resteront hors du cockpit : une signature est mécanique,
   une cause est un jugement. Le cockpit affiche les signatures et l'historique
   des jugements humains, jamais une causalité auto-décrétée.
6. Mono-poste, mono-dépôt, lecture locale — pas de multi-utilisateur, pas de
   distant, et c'est voulu.

---

## 8. La règle finale, mécanisée

« Pourquoi ? Qui ? Quand ? Preuve ? Prochaine action ? » — portée par le schéma
de cellule, pas par la discipline :

```
cellule := { v,                    # valeur ou NOT_OBSERVABLE
             src,                  # provenance cliquable (chemin, ligne/champ)
             why?,                 # raison si NOT_OBSERVABLE
             owner?,               # propriétaire (drift, tâches, décisions)
             because?,             # décision/leçon d'origine (planning, actions)
             next? }               # action recommandée typée
```

Les trois premiers champs existent et sont éprouvés. Les trois derniers sont
l'extension V1. Une vue qui ne peut pas remplir `owner`/`because` l'affiche
`NOT_OBSERVABLE` — et c'est exactement ainsi que le cockpit reste un instrument
de vérité au lieu de devenir un quatrième générateur de théâtre.

```
claim_verdict: NO_CLAIM_ALLOWED
```
