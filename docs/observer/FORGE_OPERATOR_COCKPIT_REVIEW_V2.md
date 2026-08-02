# FORGE OPERATOR COCKPIT — REVIEW V2

*Date : 2026-08-01 · Statut : **PROPOSED** — revue de conception, aucun code, aucune écriture dans les stores*
*Méthode : croisement de FORGE_OPERATOR_COCKPIT_V1.md, du Master Schema (recon + contre-vérifications manuelles), d'Observer (connaissance de première main : construit, étalonné sur Breakout V2) et du planning réel (prose de session). Chaque affirmation est étiquetée **[EXISTANT]** / **[DÉRIVABLE]** / **[MANQUANT]** / **[HYPOTHÈSE]**.*

```
software_verdict : BLOCKED   (revue seule — rien construit)
evidence_verdict : MECHANICAL_VALIDATION_ONLY
claim_verdict    : NO_CLAIM_ALLOWED
```

---

## 00_SYNTHÈSE

**Ce que V1 a établi de juste** — et que cette revue confirme :

1. Le contrat de cellule `{v, src, why}` est le bon socle : la règle finale
   (« pas de chiffre sans contexte… ») est un mécanisme, pas une discipline. [EXISTANT]
2. Drift : une seule vue (Option A). Confirmé et précisé ici (§04). [DÉRIVABLE]
3. Aucune vue entretenue à la main — générée ou inexistante. C'est la seule
   réponse au vieillissement silencieux du Master Schema, documenté par son
   propre historique. [EXISTANT — le défaut ; DÉRIVABLE — le remède]
4. La moitié prospective (planning) n'existe pas et ne peut pas être générée
   depuis les traces : il faut une source nouvelle, donc une gate. [MANQUANT]

**Ce que V1 a raté — les corrections de cette revue :**

1. **V1 a confondu diagnostic et conception pour la vue humaine.** Il établit
   ce qui manque pour répondre en 30 secondes, mais ne dessine pas la vue qui
   y répond. §01 livre la HUMAN CONTROL VIEW concrète — un bandeau de sept
   cellules, pas un onglet de plus.
2. **V1 n'a pas défini les propriétaires.** Une colonne `owner` sans taxonomie
   est un vœu. §04 fixe la taxonomie à cinq propriétaires, dérivée des entités
   réelles du studio.
3. **L'ordre d'implémentation de V1 est discutable.** Il place FORGE MAP en
   étape 3, avant HUMAN GATE. Or la question du matin (« quelles décisions
   m'attendent ? ») est plus urgente que « où sommes-nous dans la structure ? ».
   §08 corrige : le bandeau humain et la vue gates passent devant la carte.
4. **V1 ne distingue pas les rythmes de lecture de l'IA.** Les 12 rubriques de
   l'AI CONTROL sont listées à plat ; une IA ne lit pas ses invariants à la
   même fréquence que le coût d'une action. §02 réorganise en trois moments :
   au démarrage / avant chaque action / après chaque action.
5. **V1 n'a pas nommé les informations dangereuses.** C'est pourtant le risque
   principal d'un cockpit : un chiffre vrai mal interprété. §01 en dresse la
   liste — elle est longue, et chaque entrée est prouvée.

**La phrase qui résume la revue** : le studio n'a pas besoin de plus de vues —
il a besoin d'un bandeau honnête pour l'humain, d'un état interrogeable pour
l'IA, et d'un registre pour le futur. Tout le reste existe déjà ou s'en dérive.

---

## 01_HUMAN_CONTROL_VIEW

### La question du matin, prise au sérieux

« Si j'ouvre le cockpit le matin, qu'est-ce qui me permet de piloter en 30
secondes ? » — la réponse n'est pas un onglet, c'est un **bandeau** : sept
cellules en tête de console, chacune cliquable vers sa vue de détail, chacune
sous contrat `{v, src, why}`.

```
FORGE HUMAN CONTROL VIEW — bandeau du matin
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ DÉCISIONS    │ RUN EN COURS │ DERNIER      │ DRIFT high   │ INCIDENTS    │ COÛT du jour │ PROCHAINE    │
│ EN ATTENTE   │              │ VERDICT      │ nouveaux     │ nouveaux     │ (2 comptes)  │ ACTION       │
│      2       │   aucun      │ HUMANGATE_   │      0       │      0       │ décl. 34,8$  │ NOT_         │
│ (gates       │              │ READY        │ (11 connus,  │              │ mesuré ≥×8   │ OBSERVABLE   │
│  Breakout)   │              │ run3 ✓HMAC   │  0 nouveau)  │              │              │ (pas de      │
│              │              │              │              │              │              │  planning)   │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

| Cellule | Source | État |
|---|---|---|
| Décisions en attente | verdicts `HUMANGATE_READY` sans entrée de log correspondante | [DÉRIVABLE] — croisement Observer × decision-log |
| Run en cours | `state.json` `run_status=RUNNING` + veille mtime | [EXISTANT] |
| Dernier verdict | verdict.json + HMAC présent | [EXISTANT] |
| Drift high **nouveaux** | drift Observer, diffé contre la dernière consultation | [DÉRIVABLE] — les event_id déterministes rendent le diff trivial |
| Incidents nouveaux | failure_events, même mécanique de diff | [DÉRIVABLE] |
| Coût du jour, 2 comptes | telemetry (déclaré) + usage transcripts (mesuré) | [EXISTANT] — les deux, jamais le seul déclaré |
| Prochaine action | planning | [MANQUANT] — affiche NOT_OBSERVABLE tant que M1 n'existe pas |

La distinction **nouveaux vs connus** est le vrai apport : 11 drifts high
affichés en permanence deviennent du bruit en trois jours ; « 0 nouveau depuis
hier » est un signal. Elle exige un petit état local de consultation (côté
cockpit, hors dépôt) — [DÉRIVABLE], pas une écriture dans les stores.

### Classement des informations

**Obligatoires (le bandeau)** : les sept ci-dessus.

**Utiles (un clic derrière)** : progression inter-runs, table drift complète,
carte des agents, prompts vérifiés, mutation/tests/solvabilité, leçons en
attente de routage.

**Inutiles pour l'humain** (mais pas pour l'IA — ne pas supprimer, reléguer) :
empreintes SHA/HMAC par ligne, event_id, détail par activation des manifests,
tokens de cache par message, vocabulaires de tentative.

**Dangereuses si mal interprétées** — chacune exige un garde-fou d'affichage :

| Information | Piège | Garde-fou d'affichage |
|---|---|---|
| `cost_usd` déclaré | faux d'un facteur 6,7–12,3 (prouvé) | toujours accolé au compte mesuré ; jamais seul |
| solvabilité 50/50 | invariante sur toutes les tentatives mesurées → aucun pouvoir discriminant | badge « valide le moteur, ne discrimine pas » (règle de variance ratifiée) |
| couverture « OBSERVED » | signifie « une trace existe », pas « c'est vrai » — un artefact SELF_DECLARED est « observé » | toujours afficher le proof-mix (SIGNED/MECHANICAL/SELF_DECLARED) |
| `HUMANGATE_READY` | se lit « validé » alors que c'est « prêt pour validation » | libellé affiché : « EN ATTENTE DE PIERRE », jamais le token brut seul |
| absence de drift sur une étape | peut vouloir dire « pas de déclaration à comparer » (wm1) | distinguer CLEAN de NON_COMPARABLE |
| reference_guard CLEAN | ne couvre QUE la liste protégée — le gel STUDIO n'y est pas | mention de périmètre sur la cellule |
| mutation 73/73 | binaire échoué/parfait — récompense terminale, pas gradient | pas de tendance affichée sur 2 points |

---

## 02_AI_CONTROL_VIEW

### Réorganisation par moment de décision

Une IA orchestratrice ne consomme pas un tableau : elle interroge un état à
trois rythmes. C'est la correction principale apportée au §4.7 de V1.

**Au démarrage de session (une fois)** :

| Donnée | Source | État |
|---|---|---|
| Invariants durs + zones interdites | `reference_protected.yaml`, `settings.json` | [EXISTANT] — avec l'alerte : gel STUDIO absent des listes machine, git_guard non activé [EXISTANT, incohérence prouvée] |
| Contraintes ratifiées | FORGE_SYSTEM_CONTRACT (statut PROPOSED affiché tel quel) | [EXISTANT, dégradé] |
| Mémoire inter-runs | `lessons.jsonl` → pré-mortem (câblé, prouvé dans driver.py) | [EXISTANT] |
| Décisions faisant foi | — | [MANQUANT] — M3 ; substitut : prose non fiable |
| Table de confiance des instruments | — | [MANQUANT] — M2 ; substitut : prose §4.2 THIRD_BRAIN |

**Avant chaque action (à chaque nœud de décision)** :

| Donnée | Source | État |
|---|---|---|
| État courant du run | `state.json` (+ réserve « ment sur le cumul » affichée) | [EXISTANT] |
| Actions possibles depuis cet état | — | [MANQUANT] — M4 ; aujourd'hui enfoui dans le contrôle de flux du driver |
| Coût attendu de chaque action | priors agrégés par étape×modèle | [DÉRIVABLE] — M5, calculable par Observer seul depuis 123 lignes de télémétrie + usage transcripts |
| Risque de l'action | listes machine partielles | [EXISTANT, incomplet] |
| Chaîne d'étapes restante | `PROFILES` de dispatch.py | [EXISTANT] |

**Après chaque action (vérification)** :

| Donnée | Source | État |
|---|---|---|
| Preuve que l'action a eu lieu | dispatch_audit (prepared/executed), transcripts | [EXISTANT] |
| Prompt reçu conforme au signé | vérification SHA (9/10 MATCH prouvés) | [EXISTANT] |
| Écart déclaré↔exécuté produit | détecteur de drift | [EXISTANT] |
| Historique des corrections | error_journal + lessons | [EXISTANT, partiel — signatures oui, causes jamais] |

**Le point structurant pour le MCTS futur** [HYPOTHÈSE, assumée] : les trois
rythmes ci-dessus sont exactement la signature d'un arbre de recherche — état
(nœud), actions (arêtes), coût/risque (fonction de valeur), preuve (retour).
L'AI CONTROL VIEW n'est pas un tableau de bord pour IA : c'est **l'interface
d'état d'un futur moteur de décision**. La construire honnête aujourd'hui
(7/12 NOT_OBSERVABLE) revient à mesurer la distance à l'autonomie en continu.

---

## 03_FORGE_OS_VISION

### Hiérarchie de vérité — la réponse aux cinq questions

**Source de vérité** : jamais un document. Deux choses seulement :
1. **Les traces mécaniques** (state, verdicts signés, audits HMAC, transcripts,
   reçus d'oracle) — append-only, produites par du code. [EXISTANT]
2. **Les décisions ratifiées par Pierre** — aujourd'hui mal enregistrées
   (fuite prouvée : gates Breakout absentes du log canonique). [EXISTANT, qui fuit]

**Seulement des vues** (régénérables, jetables sans perte) : toutes les vues
Observer, la reconstruction, le benchmark, les futures FORGE MAP / PLANNING /
HUMAN GATE / AI CONTROL. Critère opérationnel : *si le fichier ne peut pas être
régénéré à l'identique depuis les sources de vérité, ce n'est pas une vue — et
s'il n'est pas une décision ratifiée, il n'a rien à faire en source.*

**Généré automatiquement** : cartes (FORGE MAP), index (campagnes), statuts,
diffs de drift, priors de coût, écart décisions-prises↔enregistrées.

**Reste humain, à jamais** : la ratification, le feel/playtest, l'attribution
de cause racine, la doctrine narrative (Master Schema HTML comme document
d'intention — consommateur du cockpit, plus jamais source), les leçons comme
jugements (leur *validation* est humaine, leur *routage* peut être mécanique).

**Ce qui manque pour un vrai poste de commande** — au-delà des M1-M6 de V1,
la revue identifie le manque de fond : **une discipline d'écriture unique**.
Le studio a une porte en lecture (Observer, garde de cécité) mais pas de porte
en écriture symétrique : les décisions fuient vers la prose, les leçons
attendent sans registre, le planning n'existe pas. Le FORGE OS n'est pas une
fusion de trois outils — c'est **deux portes** : tout ce qui se lit passe par
la reconstruction prouvée ; tout ce qui s'écrit passe par propose-only + gate.
Les six M de V1 sont des instances de cette seule règle. [HYPOTHÈSE structurante]

---

## 04_DRIFT_DECISION

**Décision maintenue : fusion en une seule vue.** Deux onglets montrant les
mêmes 43 écarts sous deux noms violent le critère de la mission. `v9`
disparaît ; la vue unique absorbe le niveau de détail en dépliable.

**Structure** (colonnes définitives) :

| colonne | contenu | état |
|---|---|---|
| écart | « quoi ↔ quoi » en clair (déjà réécrit ainsi) | [EXISTANT] |
| famille | déclaration/contrat/métrique/documentation/comportement | [DÉRIVABLE — mapping type→famille] |
| gravité | high/medium/info | [EXISTANT] |
| preuve | clic → ligne source | [EXISTANT] |
| impact | table fixe par type (ex. tokens → « toute décision de coût est faussée ») | [DÉRIVABLE] |
| **propriétaire** | voir taxonomie | [DÉRIVABLE] |
| action attendue | typée : RATIFIER / CORRIGER(chantier) / ACCEPTER(dérogation datée) / SURVEILLER | [DÉRIVABLE] |
| statut de traitement | nouveau / vu / arbitré (état local cockpit, hors stores) | [DÉRIVABLE] |

**Taxonomie des propriétaires** — cinq, dérivés des entités réelles :

| propriétaire | répond de | exemples prouvés |
|---|---|---|
| HARNAIS (exécuteur `run_real`/driver) | ce qui borne réellement les agents | tokens ×12, outils hors contrat, `allowed_tools=[]` signé |
| CONTRAT (auteurs des YAML d'étape) | ce que la déclaration promet | red-team déclaré Read-only qui écrit |
| REGISTRE (roles/dispatch) | résolution rôle→modèle | opus-4-8 signé / opus-5 exécuté (wm1) |
| DOCTRINE (docs normatifs) | doc vs réalité | VUE 4 ignorant lessons.jsonl, RUN_INDEX sans Breakout |
| HUMANGATE (Pierre) | dérogations et arbitrages | oracles.json modifié pendant run (authorized:false), gel non couvert |

Chaque type de drift existant se range dans exactement une case — vérifié sur
les 8 types actuels. Un drift sans propriétaire assignable est un bug de la
taxonomie, affiché comme tel, jamais rangé de force.

**Nouveau détecteur à ajouter (famille documentation)** [DÉRIVABLE] : les deux
cas prouvés à la main — VUE 4 vs `lessons.jsonl`, `RUN_INDEX` vs campagnes
réelles — deviennent des règles mécaniques (comparaison mtime/contenu entre
docs déclarés vivants et réalité des stores).

---

## 05_MISSING_INFORMATION

### Niveau 1 — indispensable au pilotage immédiat

| manque | pour qui | statut |
|---|---|---|
| Registre de planning (M1) | humain d'abord | [MANQUANT — gate : nouvelle écriture] |
| Miroir structuré des décisions (M3) | les deux | [MANQUANT — gate : touche /gate] |
| Écart décisions prises↔enregistrées | les deux | [DÉRIVABLE dès que la racine `studio_brain/decisions` est lisible par Observer — élargissement de lecture à déclarer] |
| Diff nouveaux/connus (drift, incidents) | humain | [DÉRIVABLE — état local cockpit] |
| Libellés anti-piège (§01, tableau des dangereuses) | humain | [DÉRIVABLE — pur affichage] |

### Niveau 2 — optimisation

| manque | pour qui | statut |
|---|---|---|
| Priors de coût par étape×modèle (M5) | IA | [DÉRIVABLE — Observer seul, aucune gate] |
| Table de confiance sérialisée (M2) | IA | [MANQUANT — gate : nouveau store, contenu initial = découvertes Observer déjà prouvées] |
| Noms humains (étapes, sessions, agents) | humain | [DÉRIVABLE — contrats existants] |
| Agrégation multi-projets (Pong/Snake/shmup/Breakout) | les deux | [DÉRIVABLE — corrélateur déjà générique] |
| Compteur de tokens réel dans la télémétrie | les deux | [MANQUANT — capteur Forge, gate] |

### Niveau 3 — autonomie avancée / MCTS

| manque | statut |
|---|---|
| Machine à états du driver exposée (M4) | [MANQUANT — touche la Forge, gate] |
| `sessionId` du sous-processus dans state.json (corrélation exacte) | [MANQUANT — capteur, gate] |
| Empreinte de prompt sur les dispatches `Task` (trou wm1) | [MANQUANT — capteur, gate] |
| Modèle mesuré (pas déclaré) dans l'audit | [MANQUANT — capteur, gate] |
| Gel STUDIO machine-lisible + activation git_guard (M6) | [MANQUANT — décision de garde, gate] |
| Risque par action (au-delà des zones : coût d'erreur estimé) | [HYPOTHÈSE — prématuré avant M4] |

Lecture du classement : **tout le niveau 1 côté cockpit est dérivable sans
toucher la Forge** sauf les deux registres (planning, décisions) — qui sont
précisément les deux fuites humaines documentées. Le niveau 3 est entièrement
gated. C'est cohérent : l'autonomie se débloque par ratifications successives,
jamais par accumulation silencieuse de capteurs.

---

## 06_PLANNING_MODEL

### Le modèle minimal, et ce qu'on refuse de construire

**Un fichier, sept champs, quatre états.** [HYPOTHÈSE de schéma, à ratifier]

```yaml
# studio_brain/planning/planning.yaml — propose-only, ratifié par Pierre
- id: P1
  objectif: "Compteur de tokens réel dans forge_telemetry"
  raison: "drift token_accounting_below_measured x3 (Observer, benchmark Breakout)"
  priorite: 1            # entier, pas de labels flous
  etat: EN_ATTENTE       # EN_ATTENTE | EN_COURS | BLOQUE | TERMINE
  depends_on: []
  decision_attendue: "gate capteur télémétrie"
  preuve_de_fin: "benchmark Observer : ratio déclaré/mesuré ∈ [0.9, 1.1]"
```

Points durs du modèle :
- **`raison` est obligatoire et traçable** — une décision ou une leçon, avec
  référence. Une tâche sans raison est rejetée à la validation. C'est la règle
  finale appliquée au futur.
- **`preuve_de_fin` est obligatoire** — quel oracle ou quelle mesure dira
  « terminé ». Une tâche sans preuve de fin attendue est le germe d'un
  « déclaré ≠ exécuté » de plus.
- Les leçons validées portant `DESTINATION` alimentent la file en propose-only
  — le pont leçon→planning manquant (§07).

**Ce qu'on refuse** : pas de Gantt, pas de dates promises, pas de workflow à
plus de quatre états, pas de sous-tâches récursives, pas d'assignation
multi-agents, pas d'outil externe. Le studio est un opérateur unique plus une
IA : un fichier YAML trié par priorité suffit, et tout ce qui dépasse est de
l'usine à gaz au sens exact de la mission.

**La vue** : tableau trié priorité — id, objectif, raison (lien), état,
dépendances, décision attendue, preuve de fin. Bandeau du matin : la première
tâche EN_ATTENTE non bloquée devient « PROCHAINE ACTION ».

---

## 07_DOCUMENTATION_LOOP

### État vérifié de la boucle

```
Fin de campagne → Observer → Lessons → Documentation → Planning suivant
      [E]           [E]        [E]         [M]              [M]
```

| maillon | état | preuve |
|---|---|---|
| campagne → Observer | [EXISTANT] | reconstruction Breakout, 4493 événements |
| Observer → lessons candidates | [EXISTANT, humain dans la boucle] | L1-L5 validées, `forge.lesson.v1`, 10 lignes |
| lessons → mémoire de run suivant | [EXISTANT, câblé, prouvé] | `driver.py::premortem_lessons` lit `lessons.jsonl` |
| lessons → propositions de mise à jour doc | [MANQUANT] | tags `DESTINATION` présents, aucun consommateur |
| doc/leçon → planning suivant | [MANQUANT] | aucun registre ; « 5 chantiers routés » vivent en prose de session |

### Automatique vs humain — la ligne de partage

**Peut être automatique** (propose-only, jamais d'écriture directe) :
- détection qu'une campagne close n'a pas d'entrée RUN_INDEX / pas de leçons
  extraites → drift famille documentation ;
- génération des **propositions** de mise à jour doc depuis les tags
  `DESTINATION` (leçon → doc cible → diff proposé) ;
- injection des leçons validées dans la file de planning en EN_ATTENTE ;
- rappel des tâches dont la `preuve_de_fin` est devenue vraie (l'oracle passe
  → proposer TERMINE).

**Reste humain, sans exception** :
- la **validation** d'une leçon (candidate → validated) — un jugement ;
- l'**application** d'une mise à jour de doc normatif — writes never ascend ;
- la ratification d'une entrée de planning et de son passage TERMINE ;
- toute attribution de cause racine.

Le critère général, cohérent avec la doctrine du studio : **la machine propose
et prouve, l'humain tranche et signe.** Chaque maillon automatique produit une
proposition datée avec provenance ; aucun n'écrit dans un store normatif.

---

## 08_IMPLEMENTATION_ORDER

Révisé par rapport à V1 — le bandeau humain passe devant la carte, et chaque
étape porte son niveau de gate :

| # | livrable | dépend de | gate |
|---|---|---|---|
| 1 | Fusion Drift (structure §04 : familles, impact, propriétaires, actions typées, statut local) | rien | aucune |
| 2 | **HUMAN CONTROL VIEW** — le bandeau §01, avec diffs nouveaux/connus et libellés anti-piège | rien | aucune |
| 3 | Noms humains + agrégation multi-projets (Campagnes/Agents) | rien | aucune |
| 4 | HUMAN GATE avec écart prises↔enregistrées | lecture de `studio_brain/decisions/` | élargissement de lecture — à déclarer, pas silencieux |
| 5 | DOCUMENTATION LOOP (lecture lessons.jsonl + détecteur drift documentation) | lecture de `lab/reports/lessons.jsonl` | idem |
| 6 | AI CONTROL VIEW honnête (3 rythmes, 7/12 NOT_OBSERVABLE affichés) + priors de coût (M5) | rien côté Forge | aucune |
| 7 | FORGE MAP générée | rien | aucune |
| 8 | PLANNING (vue + registre M1) | M1 | **gate Pierre** |
| 9 | Miroir décisions (M3), table de confiance (M2) | M2/M3 | **gates Pierre** |
| 10 | Capteurs Forge (tokens réels, modèle mesuré, sessionId, empreinte Task, M4, M6) | chacun séparément | **gates Pierre, une par capteur** |

Étapes 1-3 et 6-7 : zéro donnée nouvelle, zéro élargissement. 4-5 : lecture
élargie, déclarée. 8-10 : écritures et capteurs, ratifiés un par un.

---

## Clôture

Cette revue ne propose **aucune architecture nouvelle** : elle précise V1 là où
il était flou (bandeau humain, taxonomie des propriétaires, rythmes IA, modèle
de planning minimal), le corrige là où il était discutable (ordre
d'implémentation), et nomme ce qu'il avait tu (informations dangereuses,
discipline d'écriture unique comme manque de fond).

Le prochain geste n'est pas du code : c'est ton arbitrage sur §04 (taxonomie),
§06 (schéma planning) et l'ordre §08 — puis les étapes 1-3 peuvent partir sans
autre validation, puisqu'elles ne touchent à rien.

```
claim_verdict: NO_CLAIM_ALLOWED
```
