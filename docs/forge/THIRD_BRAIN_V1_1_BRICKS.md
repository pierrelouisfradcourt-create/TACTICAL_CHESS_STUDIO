# Troisième Cerveau V1.1 — Spécification des 5 briques (PROPOSED, zéro code)

Date : 2026-07-26 · Complète `THIRD_BRAIN_PROTOCOL_V1_PROPOSAL.md` (mission Pierre :
« complète le protocole avec les briques manquantes sans coder »).
Statut : **PROPOSED** — chaque brique se ratifie séparément. `claim_verdict: NO_CLAIM_ALLOWED`.

Séparation des rôles ratifiée par Pierre (2026-07-26), cadre de tout ce document :
**cerveau LLM = raisonnement/génération · mémoire Forge = expérience accumulée ·
troisième cerveau = supervision/critique/amélioration · Forge = exécution uniquement.**
Le troisième cerveau ne code pas : il propose avec preuve, ROI attendu et critère
falsifiable. La décision d'adoption est humaine, toujours.

Base : analyse comparative sourcée 2026-07-26 (SWE-agent/OpenHands/Devin, multi-agent,
SRE/MLOps — sources en fin de fichier de l'analyse) + inventaire interne vérifié.
Deux constats de code fondateurs, **re-vérifiés indépendamment** (lecture directe) :
- `driver.py` : la télémétrie n'est écrite qu'après `entry["status"]="OK"` ; le chemin
  `_halt_step` retourne avant. `cost_usd` est calculé puis perdu (`record_telemetry`
  n'a pas de champ coût). **Le coût des échecs est invisible par construction.**
- `studio_link.py::premortem` : filtre `r.get("project") == project`. La mémoire est
  **par PROJET** (rangée dans des fichiers de domaine) ; `etape` est écrit dans chaque
  entrée mais jamais utilisé comme clé de rappel. Le silo inter-projets reste ouvert
  malgré `_global_`.

---

## Brique 1 — Maturity scanner : requalifiée en **vue de capacités**

**Ce que dit l'état de l'art.** DORA a explicitement abandonné les modèles de maturité
(niveaux déclaratifs, check-the-box) pour des modèles de **capacités** mesurées par
résultats. Les échelles MLOps qui survivent (Google 0-2, Microsoft 0-4) ne notent pas la
qualité : chaque cran est un **artefact constatable mécaniquement**.

**TRANCHÉ Pierre 2026-07-26 (D1) : échelle mécanique 4 crans retenue** —
Declared → Referenced → Executed → Verified. L'échelle 0-5 initialement demandée est
abandonnée (« optimisé » ne peut être qu'une opinion — violation de la règle de variance).

**Spec minimale proposée.** Pas de nouveau capteur, pas d'échelle inventée : une **vue
d'agrégation** des capteurs existants sur les 38 skills + workflows, à 4 crans tous déjà
mesurables :
`Declared` (le fichier existe) → `Referenced` (lu par du code : `declaration_readers.mjs`,
qui a déjà témoins positifs et rejets motivés) → `Executed` (trace d'exécution :
`spawn_executed`, télémétrie) → `Verified` (reçu d'oracle citant l'artefact).
Sortie : un tableau généré, une ligne par skill/workflow, cran + preuve du cran.

**Critère falsifiable.** La vue doit exhiber ≥2 crans distincts sur le parc réel (on sait
déjà que oui : 2 outils lancés automatiquement / 31 — mais la vue doit le prouver
d'elle-même). Ré-exécutée deux fois sans changement du dépôt → même résultat.

**Exclusions (sur-ingénierie).** Le cran « optimisé » · toute échelle déclarée par un
agent · toute note qualitative.

---

## Brique 2 — ROI/token : d'abord rendre l'échec visible

**Ce que dit l'état de l'art.** SWE-Bench+ sépare coût par instance et coût par instance
**résolue** (le classement change du tout au tout selon le dénominateur). Anthropic :
l'usage de tokens explique ~80 % de la variance de performance. SRE : un budget sans
**conséquence pré-écrite** n'est pas un budget.

**Ce qu'on a déjà.** 3 533 362 tokens tracés sur 58 étapes **réussies** (s9-build = 50 %).
La matrice a établi : 67 % des détections gratuites (non-LLM), 62 % des corrections sur
l'étape la plus chère, ratio détection:retravail 1:6 sur card_engine.

**Spec minimale proposée (patch driver, 3 points — à coder par la Forge sur go, pas par
le cerveau).**
1. Écrire la télémétrie **aussi** sur le chemin `_halt_step`, avec `outcome: OK|HALT`.
2. Ajouter `cost_usd` à `record_telemetry` (déjà calculé, actuellement jeté).
3. UNE métrique dérivée : **tokens par étape réussie, par run** — le dénominateur est le
   succès, jamais la tentative.
Plus la partie budget transposable : un **plafond de tokens par run avec conséquence
pré-écrite** (halt + HumanGate). **D2 tranché Pierre 2026-07-26 : principe ACCEPTÉ,
valeur volontairement différée après M1** (la distribution actuelle — 44 k → 1,8 M,
succès seulement — est trop biaisée pour fixer un seuil honnête).

**Critère falsifiable.** Après patch, un run avec ≥1 échec produit ≥1 ligne `outcome:HALT`
dans la télémétrie ; la somme tokens(OK)+tokens(HALT) d'un run ≥ la valeur actuelle
(la télémétrie ne peut que grossir, jamais perdre) ; le « coût par succès » de shmup_slice
recalculé rétroactivement doit dépasser le chiffre optimiste actuel.

**Exclusions.** Un « score de valeur » d'un run (ne pourrait venir que d'un LLM-juge —
interdit par l'ADR-002) · SLO/error-budget à fenêtre glissante (volume de runs
insuffisant) · tableau de bord avant que la donnée d'échec existe.

---

## Brique 3 — Générateur de mission AAA : un rejeteur d'abord, un brouillon ensuite

**Ce que dit l'état de l'art.** 38,3 % des tâches de SWE-bench ont été jugées
sous-spécifiées par les annotateurs humains — le mode de panne n°1 d'une mission d'agent
est l'absence de **critère de fin**, pas le manque de prose. Anthropic : objectif, format
de sortie, outils/sources, frontières, + échelle d'effort déclarée. SWE-agent : les gains
viennent de contraindre l'interface, pas d'enrichir le prompt.

**Ce qu'on a déjà.** Le contrat 17 champs validé à une porte fail-closed — PLUS DUR que
l'état de l'art. Le gabarit §3.3 du protocole (7 missions exécutées avec succès le
2026-07-26). La doctrine « objectif · entrées · sortie · preuve ».

**Spec minimale proposée.** Deux moitiés, ordonnées :
1. **Le rejeteur (mécanique, à la porte)** : une mission dont l'objectif, l'oracle ou les
   frontières sont vides ou tautologiques est **rejetée avant dispatch** — « si la mission
   ne dit pas comment on saura qu'elle est finie, elle est sous-spécifiée ». S'ajoute au
   contrat : un champ d'échelle d'effort attendu (sert aussi au plafond de la brique 2).
2. **L'enrichisseur (procédure du cerveau, pas un outil)** : intention courte → questions
   du gabarit §3.3 dans l'ordre (objectif falsifiable ? contexte vérifié ? pièges connus
   de la table de confiance ? design déjà arbitré ? preuve exigée ?) → **brouillon de
   contrat soumis à Pierre**. JAMAIS transmis directement à la Forge : l'enrichissement
   LLM fabriquerait des exigences que Pierre n'a pas ratifiées.

**Critère falsifiable.** Rejeteur : les 21 contrats existants passent (zéro faux positif) ;
un contrat de sonde avec `success_criteria: aucun` est refusé. Enrichisseur : sur les
3 prochaines intentions courtes de Pierre, le brouillon est accepté avec ≤2 amendements.

**Exclusions.** Un générateur qui dispatche sans ratification · l'enrichissement qui
invente des contraintes non sourcées (chaque exigence du brouillon cite sa source :
décision Pierre, doctrine CLAUDE.md, ou leçon de journal).

---

## Brique 4 — Mémoire opérationnelle par rôle : une JOINTURE, pas une mémoire neuve

**Ce que dit l'état de l'art.** OpenHands : le déclencheur **déterministe** (par chemin/
glob) bat le déclencheur sémantique — auditable, zéro faux positif, zéro embedding.
Voyager : n'ajouter à la bibliothèque que ce qui est **vérifié** (chez nous : déjà le rôle
des oracles + verdict signé). Les agents SE vivent de mémoire **procédurale**.

**Ce qu'on a déjà — corrigé par la vérification.** La mémoire n'est ni par domaine ni par
rôle : elle est **par projet** (constat de code ci-dessus). Le couple `(etape, domaine)`
est déjà écrit dans chaque entrée — c'est notre équivalent exact du glob OpenHands — mais
le rappel ne s'en sert pas. Les 13 `capability_role` existent côté contrats.

**Spec minimale proposée.** Un **troisième flux** dans le pré-mortem existant : les N
dernières entrées de la **même `etape`, tous projets confondus** (l'étape est le proxy
exécutable du rôle : s9→builder, s10x→oracle, s2.5→art director…). Zéro nouveau fichier,
zéro nouveau format, zéro embedding — une clause de lecture en plus.

**Préalable imposé par notre propre règle de variance (à mesurer AVANT de brancher).**
La distribution des entrées par `etape` doit porter ≥2 valeurs distinctes non triviales.
Signal préliminaire déjà mesuré : s10a=14, s9-build=12, s11=3, s10s=3 sur 35 — mais la
mesure officielle doit être refaite sur les journaux au moment du branchement.

**Critère falsifiable.** Sur un run de test, un agent s9-build reçoit dans son pré-mortem
une leçon s9-build issue d'un AUTRE projet (chose impossible aujourd'hui, prouvée par le
filtre projet) ; et le pré-mortem d'un rôle sans historique reste identique à avant
(pas de bruit injecté).

**Exclusions.** Base vectorielle · skill library générative Voyager (la moitié qui compte
— vérifier avant d'ajouter — existe déjà : oracles + mutation + verdict) · fichiers par
rôle (re-prolifération refusée à la décision LEARNING_SUBJECT_MODEL_V1).

---

## Brique 5 — Boucle d'évolution : le cycle de VIE d'une règle, pas sa naissance

**Ce que dit l'état de l'art.** OPA Gatekeeper : toute règle naît en `dryrun` (audit
seulement), passe en `warn`, puis `deny` — le passage se décide sur la **mesure du blast
radius**, pas sur l'intention. Policy debt : les règles qui ne meurent jamais s'empilent ;
remède = **sunset clause** (expiration par défaut, reconduction explicite). SRE postmortem :
action items avec propriétaire — chez nous le propriétaire est toujours Pierre, le
template complet est donc superflu.

**Ce qu'on a déjà.** La naissance et la gouvernance sont couvertes : HumanGate,
`auto_apply_allowed:false` par construction, dépôts propose-only, décisions enrichies
(portée autorisée + commandes de validation), capteur d'adoption
`filled/declared_empty/absent`. Le trou est APRÈS la décision : rien ne fait vivre,
mesurer, ni mourir une règle adoptée.

**Spec minimale proposée. Deux champs sur toute règle candidate :**
- `enforcement: observe | warn | block` — naissance en `observe` obligatoire ; le passage
  au cran supérieur est une décision Pierre prise sur la mesure d'adoption (le capteur
  existant EST la mesure de blast radius du mode `observe`).
- `review_by: <date>` — sunset par défaut **30 jours (D3, ratifié Pierre 2026-07-26)** ; à l'échéance, la
  règle expire sauf reconduction explicite. Une règle expirée est retirée du prompt, pas
  archivée en couche géologique.
Instanciation immédiate disponible : `skipped_validation` est la première règle en mode
`observe` — ces deux champs sont exactement le connecteur qui manque à son capteur.

**Critère falsifiable.** Chaque règle candidate du registre porte les 2 champs (le
validateur refuse sinon) ; au moins une règle atteint sa `review_by` et est effectivement
expirée ou reconduite par une entrée datée du decision log.

**Exclusions.** Moteur de règles · scoring ROI automatique des propositions · métriques
DORA telles quelles (dénominateur d'équipe) · workflow d'ownership (owner unique).

---

## Transversal — l'ordre de construction et ce qu'on refuse

> Roadmap canonique UNIQUE : `THIRD_BRAIN_PROTOCOL_V1_PROPOSAL.md` §6 (suppression
> éditoriale ratifiée 2026-07-26 — ce qui suit est l'analyse, pas un second ordonnancement).

**Les 3 mécanismes les plus rentables** (signature commune : zéro nouveau fichier, zéro
nouveau format, zéro agent — des lecteurs pour des données déjà écrites) :
1. **Télémétrie d'échec** (`outcome: OK|HALT` + `cost_usd`) — débloque briques 1, 2, 5
   et corrige un biais optimiste structurel de toutes les métriques actuelles.
2. **Jointure `(etape)` sur le pré-mortem** — ferme le silo inter-projets avec une clause
   de lecture.
3. **`enforcement` + `review_by`** — donne une conséquence au capteur d'adoption et une
   mort naturelle aux règles.

**Refusés explicitement (sur-ingénierie pour un studio solo)** : échelle 0-5 avec cran
« optimisé » · LLM-juge de valeur · SLO formels · embeddings/base vectorielle · swarm
(le superviseur est déjà le bon choix : à 10 agents en réseau, 45 points de panne) ·
rainbow/canary d'infra · template postmortem 5 sections · générateur qui dispatche sans
ratification · **troisième cerveau monolithique** — les 5 briques sont 5 capteurs
indépendants reliés par le protocole, pas un agent.

**Limites héritées de l'analyse comparative** : Devin = marketing, aucun mécanisme
extrait · « error budget sur tokens » = transposition non documentée dans la littérature,
traitée comme hypothèse · chiffres SWE-Bench+ datés (ratios transposables, pas les
dollars) · les deux constats de code sont vérifiés en lecture, pas encore confrontés à
un run réel.

## Verdicts

```
software_verdict: OK          (spécification lecture seule ; aucun code modifié)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
                              (constats de code re-vérifiés ligne à ligne ; état de
                               l'art sourcé ; aucun run exécuté)
claim_verdict: NO_CLAIM_ALLOWED
                              (l'efficacité des 5 briques n'est pas démontrée — chacune
                               porte son critère falsifiable, qui seul en décidera)
```
