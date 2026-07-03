# Audit de friction — Backlog llm-lego

> Passe **audit + plan uniquement**. Aucun code construit, aucune brique modifiée,
> aucun commit. Citations `fichier:ligne` vérifiées de première main (builder.html,
> demo-server.ts, git, library/) ou reprises d'audits datés déjà présents dans
> `llm-lego/`. Date : 2026-07-03.
>
> software_verdict: N/A (audit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
> claim_verdict: NO_CLAIM_ALLOWED

---

## Méthode

**Testé réellement (vérité de premier main, pas raisonnement) :**

| Point | Ce qui a été vérifié | Source |
|---|---|---|
| **F1** recherche | 34 briques en Bibliothèque ; **filtre par Type** (8 kinds) mais **zéro champ texte, zéro tag dans la liste, zéro tri** ; densité de rendu mesurée | `builder.html:2272,2285` (filtre) ; `builder.html:186-189` (CSS scroll) ; `ls library/` = 34 |
| **F2** notes | `notes` (textarea `lib-notes`) est **exclusivement** dans le bloc `e.kind === 'agent'`. Aucun autre kind n'a de notes. Un `sourceRef` universel existe pour tous | `builder.html:2350-2408` (bloc agent) ; `2384` (notes) ; `2345` (sourceRef universel) |
| **D1** kind matrix | **Aucun** `kind:'matrix'` nulle part dans le builder. Rien ne casse de son absence | `grep kind builder.html` : agent/prompt/chain/oracle/goal/outputformat/roadmap/node/edge — **pas de matrix** |
| **A1** appel LLM | L'adaptateur `llm` retourne `"[mock llm] …"` après un `setTimeout(50)` — **zéro requête réseau**. Point de swap = un seul objet `Adapters` | `demo-server.ts:234-271` |
| **B4** commit | **Tout `llm-lego/` est non tracké** : `git ls-files` = **0**, non-suivis = **205 fichiers**. Pas de `.git` propre, pas dans un `.gitignore` parent | `git ls-files llm-lego/` / `git status` |

**Évalué par lecture d'audits datés déjà écrits** (pas re-dérivé) : B1 (`CHAINS_COMPARISON.md`),
B2 (`OPENCLAW_CONTENT_AUDIT.md`), B3 + C1 « Passe 1 » (`IMPORT_PASS1_REPORT.md`), C2/C3/D1/E1/E2
(`UX_STUDIO_MATRICES_AUDIT.md`, `COMPLETENESS_AUDIT.md`, `ALL_CHAINS_AUDIT.md`), G1 (`AUDIT_INDEX.md`,
`ALL_CHAINS_AUDIT.md`). Existence des scripts C1 et compte IMP C2 vérifiés de première main
(`00_STUDIO_CONTROL/05_AUDIT/chains/chain_*.ps1` = 5 ; `IMPROVEMENT_LEDGER.yaml` = 245 `IMP-`).

**Correction de cadrage majeure trouvée en testant** : deux points du backlog sont mal décrits.
- **B4** n'est PAS « 3 chantiers canvas non commités » → c'est **le projet entier** (205 fichiers,
  0 tracké). Le risque réel est bien plus grand que ce que le libellé laisse croire.
- **B1/B3** sont largement **déjà tranchés** par des audits/imports faits depuis (Passe 1 livrée) —
  ce ne sont plus des décisions ouvertes mais des ratifications à 1 ligne.

---

## Grille de friction

Échelle : **Bloquant** (empêche activement autre chose) · **Urgent** (friction haute déjà
ressentie) · **Important** (valeur claire, pas urgent) · **Différable** (cosmétique/spéculatif) ·
**Abandon** (valeur/friction quasi nulle — à retirer du backlog).

| Point | Friction mesurée (testée si possible) | Coût de l'attente | Dépendances | Score |
|---|---|---|---|---|
| **A1** vrai LLM (mocks) | **Testé** : toute exécution est simulée (`[mock llm]`, `demo-server.ts:236`). Le builder est un éditeur de câblage + simulateur de trace, **pas** un environnement d'exécution. Swap = 1 fonction (contrat `Adapters` propre, LM Studio local :1234) | Plafond de valeur de tout le builder. Tant qu'A1 manque, chaînes/oracles importés = **cartes inertes** | **Prérequis de sens** pour C1/C2/C3/E1/E2. Gated par **G1** (le builder doit-il exécuter ?) | **Urgent** (si G1=oui) |
| **B1** chaîne canonique | **Résolu** par `CHAINS_COMPARISON.md` : A (idée→IMP) et B (idée→prompt Claude Code) font **deux jobs différents**, pas deux versions. Les deux construites, prompts réels attachés, exécutées (mocks) | ~0 — les deux coexistent sans conflit | — | **Différable** (ratifier « garder les deux ») |
| **B2** noyau openclaw | `OPENCLAW_CONTENT_AUDIT.md` : reco claire = **extraction chirurgicale** d'un petit noyau (4 agents autorité-graduée + domaine→oracle ; pattern mémoire *claimed vs verified*). openclaw reste BLOCKED (déjà acté) | Faible — enrichissement de contenu, rien n'en dépend structurellement | — | **Important** (pas urgent) |
| **B3** correspondances agents | **Partiellement résolu** (`IMPORT_PASS1_REPORT.md`) : pas 3 mais **6** `agents_a_creer`, tous créés comme briques distinctes ; correspondances (ex. profil CEO ↔ agent-ceo) **signalées, non fusionnées** | ~0 — doublons coexistent sans danger ; seul coût = léger encombrement conceptuel | — | **Différable** (décision de merge cosmétique) |
| **B4** non commité | **Testé** : **205 fichiers non trackés, 0 suivi**. Builder + 34 briques + 20 validators + ~15 rapports d'audit n'existent que sur disque | **ÉLEVÉ** — perte totale possible (rm/clean/panne). C'est le seul risque existentiel du backlog | Action = **go commit Pierre** (règle CLAUDE.md), pas un build | **Bloquant** (risque) |
| **C1** Passe 2 : 5 PS audit → Oracles | Scripts confirmés (`00_STUDIO_CONTROL/05_AUDIT/chains/chain_{hygiene,lab,models,python,rust}.ps1`). Non importés. 6 briques oracle existent déjà par ailleurs | Moyen — donnerait des oracles runnables… mais **inertes sans A1** (le builder l'écrit lui-même : `builder.html:2575`) | **Gated par A1** | **Important** (après A1) |
| **C2** Passe 3 : oracles + 245 IMP | 245 `IMP-` dans le LEDGER. **0 brique roadmap** aujourd'hui. Un import en masse ferait passer la Biblio de 34 à ~280 briques | Faible en valeur immédiate ; **négatif** si fait brut (explose F1) | **Force F1 avant.** Gated par A1/G1 | **Différable** (ne PAS bulk-importer) |
| **C3** Passe 4 : matrices → briques | `UX_STUDIO_MATRICES_AUDIT.md` : **une seule** matrice-donnée vivante (`tool_permission_matrix`), et elle est **déjà** une brique oracle. Reco : ne PAS créer 17 briques matrix | ~0 — la seule qui compte est déjà capturée | — | **Abandon** (sauf 2ᵉ matrice future) |
| **D1** kind:"matrix" | **Testé** : n'existe pas ; **rien ne casse** de son absence. Audit recommande de **ne pas le créer** (option légère « référencer, pas forker ») | ~0 | Lié à C3 | **Abandon** (décider explicitement de ne pas le construire) |
| **D2** roadmap→LEDGER | `roadmapRef`/`impRef` existent mais **null partout** ; **0 brique roadmap** créée. Le lien n'est jamais peuplé | ~0 — personne ne le heurte (rien à lier) | Gated par C2 (roadmaps importées d'abord) | **Différable** |
| **E1** cross-validation matrix | **Testé** : absent du builder (aucun code `crossValid`). Règle simple actuelle | Faible — complétude gouvernance, spéculatif tant que le builder ne fait pas tourner de validation multi-agent réelle | Gated par A1 | **Différable** (spéculatif) |
| **E2** CLAIM_MATRIX 1ʳᵉ classe | ACTIVE-AU-BOOT dans autopilot ; dans le builder **partiel** (`COMPLETENESS §3.2` : pas de 4-lanes first-class ni enforcement) | Moyen conceptuellement (doctrine TCS centrale) mais **représentationnel** sans exécution | A1-adjacent | **Important** (pas urgent) |
| **F1** recherche/tags | **Testé** : 34 briques. Rendu **dense** (police 10px, ~24px/ligne, `white-space:nowrap`), `wm-scroll` = `calc(100vh−190px)` ≈ 890px ≈ **~30 lignes/écran**. → à 34, **toute la Biblio tient en ~1 écran** ; pire kind (agent) = 14 lignes. Trouver = 0-1 clic filtre + scan visuel + 1 clic. Friction **basse aujourd'hui** | Faible aujourd'hui ; **explose** dès qu'un import en masse (C2) arrive | **Prérequis dur** de tout bulk-import | **Différable** maintenant / **conditionnel-urgent** avant C2 |
| **F2** notes limité à Agent | **Testé** : notes = agent-only (`builder.html:2384`). Prompt/chain/oracle/roadmap/goal/outputformat n'ont pas de notes. `sourceRef` universel existe en compensation partielle. Étendre = trivial (sortir le champ du bloc agent) | Faible — friction réelle mais mineure (pas d'endroit pour un contexte libre sur les autres kinds) | — | **Important-bas** (win pas cher) |
| **G1** UxPilote vs llm-lego | Méta-question. `docs/studio_v2` = pivot business récent (non tracké, 14 docs) ; alerte **« 4e UI »** (llm-lego risque d'être une 4ᵉ UI concurrente). Non testable dans le builder | **ÉLEVÉ mais subtil** : chaque build (A1/C*/E*) est un investissement DANS llm-lego. Si Pierre bascule vers UxPilote/studio_v2, ce travail est potentiellement jeté | **Racine** : gate la VALEUR de tous les points de build | **Bloquant** (décision) |

---

## Plan de traitement

### À traiter en premier (friction/risque prouvé, pas supposé)

**1. B4 — protéger le travail (risque, pas build).** 205 fichiers, 0 tracké. C'est le seul point
du backlog où l'inaction a un coût **irréversible** (perte totale). Prouvé par `git ls-files`.
Action = **demander le go commit à Pierre** dès maintenant (la règle CLAUDE.md interdit de committer
sans go — donc ce n'est pas une tâche que je fais seul, c'est une **question à poser en priorité 1**).
Rien d'autre ne mérite d'être construit tant que ce qui existe déjà n'est pas à l'abri.

**2. G1 — trancher avant d'investir plus.** C'est la racine. Tant que « llm-lego est-il le cheval
sur lequel on mise, ou UxPilote/studio_v2 ? » n'est pas répondu, construire A1/C1/C2/E1/E2 est un
**pari** qui peut être jeté. Ne PAS lancer de build lourd avant cette réponse.

**3. A1 — si G1 = « oui, llm-lego exécute ».** Alors A1 est le **plus gros déblocage de valeur pour
le plus petit effort** : contrat `Adapters` propre, point de swap unique (`demo-server.ts:234-271`),
LM Studio déjà local. Il transforme le builder de « diagramme » en « cockpit » et **débloque le sens**
de C1/C2/E1/E2. C'est le premier vrai build à faire — mais seulement après G1.

### En attente de décision Pierre (questions précises)

> Formulées comme des questions fermées, pas « en attente ».

- **G1 (racine, à poser en premier avec B4) :** « llm-lego doit-il devenir le **cockpit d'exécution**
  du studio (donc on investit A1 + imports), ou rester un **outil de spec/câblage** doublant UxPilote
  qu'on gèle bientôt ? » — La réponse conditionne A1, C1, C2, C3, E1, E2. **Aucun build lourd avant
  cette réponse.**
- **B4 :** « Go pour committer `llm-lego/` (builder + 34 briques + validators + audits) maintenant,
  en un commit ? » (Oui/Non. Risque de perte si Non.)
- **A1 (si G1=cockpit) :** « L'adaptateur `llm` réel tape **LM Studio :1234 uniquement** (offline),
  jamais l'API Anthropic — confirmé ? »
- **B1 :** « On ratifie **garder les deux chaînes** A et B (jobs différents, pas concurrentes) et on
  ferme la question 'laquelle est canonique' ? » (Oui = B1 retiré du backlog.)
- **B2 :** « On extrait le **petit noyau openclaw** (4 agents autorité-graduée + pattern mémoire
  claimed/verified) comme contenu de briques ? openclaw runtime reste BLOCKED. » (Oui/Non/Plus tard.)
- **B3 :** « On **fusionne** les correspondances signalées (profil CEO ↔ agent-ceo, etc.) ou on garde
  les 6 briques distinctes ? » (Cosmétique, sans urgence.)

### Candidats à l'abandon explicite (bruit de backlog)

Retirer plutôt que traîner — l'audit montre une valeur/friction quasi nulle :

- **D1 `kind:"matrix"` — ABANDONNER.** Rien ne casse de son absence (testé) ; l'audit matrices
  recommande explicitement de **ne pas le créer** (« référencer, pas forker »). À reconsidérer
  **seulement si** une 2ᵉ matrice-donnée vivante émerge.
- **C3 (17 briques matrix) — ABANDONNER la version en masse.** Une seule matrice-donnée vivante
  (`tool_permission_matrix`) et elle est **déjà** une brique oracle. Construire 17 briques = pur bruit.
- **B1 en tant que « décision ouverte » — RETIRER.** Déjà tranché (complémentaires). Ne reste qu'une
  ratification 1-ligne, pas une décision à instruire.
- **C2 bulk (245 IMP) — NE PAS FAIRE tel quel.** Un import brut ferait 34→~280 briques et rendrait F1
  obligatoire d'un coup. Si roadmap il y a, importer la **structure** (le kind roadmap + quelques
  jalons), pas les 245 IMP.

### Découpage en passes recommandé (ordre + justification)

| Passe | Contenu | Justification friction/dépendance |
|---|---|---|
| **P0** (parole, pas code) | Poser **B4** + **G1** à Pierre | B4 = risque irréversible prouvé ; G1 = racine qui gate tout build. Rien avant. |
| **P1** (si G1=cockpit) | **A1** : adaptateur `llm` réel → LM Studio :1234 | Plus gros déblocage / plus petit effort ; **prérequis de sens** de C1/C2/E. Sans A1, tout import = cartes inertes. |
| **P2** (win pas cher, indépendant) | **F2** : sortir `notes` du bloc agent → tous les kinds | Trivial, friction réelle mineure, **aucune dépendance** — peut se faire même si G1 traîne. |
| **P3** (avant tout import massif) | **F1** : recherche texte + tri dans la Bibliothèque | **Pas urgent à 34**, mais **prérequis dur** dès qu'un import gonfle la Biblio. À faire **juste avant** C1/C2, pas avant. |
| **P4** (après A1) | **C1** : 5 oracles PowerShell (~30 checks) comme briques oracle **runnables** | Gated par A1 (sinon inertes). Périmètre borné et net (5 scripts connus). |
| **P5** (optionnel, contenu) | **B2** noyau openclaw + **B3** merge correspondances | Enrichissement, aucune dépendance bloquante. À faire quand le cœur est stable. |
| **Différé sine die** | **C2** (roadmaps LEDGER), **D2**, **E1**, **E2** | Spéculatifs ou gated par des décisions produit (G1) non prises. Ne pas ouvrir tant que P0-P4 ne sont pas clos. |

---

## Verdict honnête

**Le backlog n'est pas ingérable — mais il est mal cadré et doit être élagué avant de reprendre la
production.** Deux distorsions le rendent plus lourd qu'il n'est :

1. **Il mélange des risques, des décisions et des builds sous une seule liste.** Le vrai P0 (B4 =
   205 fichiers non sauvegardés) est déguisé en « 3 chantiers canvas ». La vraie racine (G1) est en
   bas de liste alors qu'elle gate la valeur de la moitié des points.

2. **Plusieurs « chantiers ouverts » sont déjà fermés par les audits faits depuis** (B1 tranché, B3
   à 60% fait, C3/D1 recommandés à l'abandon). Les garder « ouverts » crée une illusion de dette.

**Après élagage, le backlog réel tient en 6 items** : B4 (protéger), G1 (trancher la racine), A1 (le
build qui débloque tout), F2 (win pas cher), F1+C1 (à faire ensemble, après A1). Le reste est soit du
bruit à retirer (D1, C3, C2-bulk), soit du différé légitime gated par G1 (E1, E2, D2), soit une
ratification 1-ligne (B1) ou un enrichissement optionnel (B2, B3).

**La seule chose à ne PAS faire : continuer à produire des imports/briques (C1/C2/C3) avant d'avoir
répondu à G1 et fait A1.** Ce serait empiler de l'inerte (oracles qui ne s'exécutent pas) sur une
fondation dont on n'a pas décidé si elle survit.

*software_verdict: N/A (audit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED*
