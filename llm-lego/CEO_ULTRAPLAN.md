# CEO Ultraplan — llm-lego × stratégie TCS

> Document **stratégique**, pas un audit ni un build. Posture CEO/directeur technique.
> Chaque recommandation est reliée à une preuve tirée des audits datés (`AUDIT_INDEX.md`
> = ce qui fait foi) et de `BACKLOG_FRICTION_AUDIT.md` (friction mesurée). Date : 2026-07-03.
>
> software_verdict: N/A (stratégie) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
> claim_verdict: NO_CLAIM_ALLOWED · **Décide : Pierre.** Ce document recommande, ne tranche pas.

---

## État factuel du builder

**Ce qui est solide et prouvé :**

- **Le moteur.** Contrat `Adapters` (`llm/tool/agent`) propre, exécuteur agnostique
  mocks/réel (`src/adapters/types.ts`), `runGraph`/`resumeGraph` avec pause HumanGate et
  reprise (`demo-server.ts:512-595`). C'est la seule couche vraiment mûre.
- **La Bibliothèque.** 34 briques réelles, 7 kinds, filtre par type, éditeur multi-kind.
  Depuis Passe 1, les chaînes **attachent** les prompts réels au lieu de les forker
  (`IMPORT_PASS1_REPORT.md` — corrige la violation « fork » F7).
- **La carte d'identité agent.** Gouvernance first-class (autonomie/permissions/surfaces),
  contredit l'ancien audit qui la disait absente (`COMPLETENESS §3.1`, fait foi).
- **L'isolation des tests.** `library-test/` gitignoré, `isTestLibrary`, 20 validators /
  463 checks verts + vitest 39/39. La discipline de non-régression est réelle.

**Ce qui reste fragile ou non tranché** (source : `BACKLOG_FRICTION_AUDIT.md`) :

- **Rien n'est sauvegardé.** `llm-lego/` = **205 fichiers, 0 tracké par git**. Existentiel.
- **Aucune exécution réelle.** mockAdapters partout ; « Run » ne branche rien de vivant
  (`demo-server.ts:236`, retourne `"[mock llm]"`).
- **Décisions ouvertes** déjà largement instruites par les audits : chaîne canonique
  (répondue : complémentaires, `CHAINS_COMPARISON.md`), noyau openclaw (extraction
  chirurgicale recommandée, `OPENCLAW_CONTENT_AUDIT.md`), correspondances agents
  (6 créées, non fusionnées). Ce sont des **ratifications**, plus des chantiers.

Verdict d'état : **un shell excellent, très bien testé — et zéro travail réel exécuté.**

---

## Place stratégique dans TCS

### Q1 — Outil séparé, remplaçant d'UxPilote, ou s'inspirer davantage de ses specs ?

**Tranché : llm-lego doit devenir l'implémentation qui encaisse enfin la spec UxPilote —
ni un outil séparé, ni un « remplaçant » naïf.**

Preuve : `UX_STUDIO_MATRICES_AUDIT.md` (Volet 1) montre que le concept — builder visuel de
briques/edges — a **déjà été spécifié en détail par UxPilote** (`UXPILOTE_AUDIT_CHAIN_CATALOG`,
`node_types`, `uxpilote_chain_output.v0`) et **jamais codé**. Le garder séparé, c'est
fabriquer la **4ᵉ UI** que l'audit signale explicitement comme alerte — exactement la
fragmentation qui a coulé les précédents. « Remplaçant » est prématuré : on ne remplace pas
une spec par un shell non branché. La bonne posture : **UxPilote devient la source de design
de llm-lego** (sa taxo node_types/edges à miner), puis ses docs sont **gelés comme
"supersédés par l'implémentation"**. Une seule surface vivante, pas deux.

### Q2 — Le builder échappe-t-il vraiment à « surface affichée > surface câblée » ?

**Non. Il n'y échappe pas encore — il en montre les signaux exacts.** (C'est le constat
inconfortable, je ne l'édulcore pas.)

Preuves, faibles mais convergentes :
- Le bouton « Run » **affiche** une exécution ; **câblé** = un `setTimeout(50)` + un mock.
- La maturité « live » (appel LLM réel) est **affichée mais explicitement non fonctionnelle**
  (`builder.html:2758` : « live … affiché mais non fonctionnel — reste sur mockAdapters »).
- Les 463 checks verts valident que **la coquille se comporte bien**, pas qu'elle fait un
  travail réel. Un shell parfaitement testé sans backend, c'est la même maladie **un cran
  plus loin** que la doctrine UxPilote.

La seule différence avec UxPilote, c'est que llm-lego **a** un shell (UxPilote était de la
doc pure). Mais un shell riche qui n'exécute rien, c'est le pattern d'échec au stade « on a
même construit l'UI » — pas une échappatoire.

### Q3 — mockAdapters : risque stratégique ou discipline saine ?

**Tranché : c'était de la discipline saine ; c'est en train de devenir le risque.**

Jusqu'ici : construire le contrat avant de brancher du vivant était juste — on ne câble pas
du garbage. Point de bascule atteint **maintenant** : le contrat est prouvé, le point de
swap est **une seule fonction** (`demo-server.ts:234-271`), LM Studio est **local** (:1234,
offline, gratuit). À partir de cet instant, chaque passe dépensée à empiler des
fonctionnalités sur les mocks **au lieu** de faire A1 convertit la « discipline » en
« construction de coquille ». La discipline « mocks d'abord » devient l'excuse « mocks pour
toujours » — et les 463 checks verts en deviennent l'alibi.

---

## Ultraplan — priorisation

### Phase immédiate (avant tout le reste)

**1. Protéger le travail — B4 (risque irréversible prouvé).** 205 fichiers, 0 tracké. Aucun
autre travail ne mérite d'exister tant que ce qui existe peut disparaître d'un `rm`. Action
= **obtenir le go commit de Pierre** (règle CLAUDE.md : pas de commit sans go). C'est le
seul point du backlog où l'inaction coûte irréversiblement.

**2. Trancher la racine — G1 (décision Pierre).** llm-lego est-il LA surface du studio (il
absorbe UxPilote) ou une expérience jetable ? Tout ce qui suit est un pari sur cette réponse.
**Recommandation CEO : oui, en faire la surface — mais uniquement en s'engageant sur A1.**
Une surface qu'on refuse de câbler est pire que pas de surface : c'est la 4ᵉ coquille.

### Phases suivantes (ordre, ~passes) — conditionnel à G1 = « oui »

| Ordre | Passe(s) | Contenu | Preuve / raison |
|---|---|---|---|
| **P1** | 1-2 | **A1 — adaptateur `llm` réel → LM Studio :1234.** | Le seul acte qui convertit shell→outil. Contrat prouvé, swap = 1 fonction (`demo-server.ts:234-271`). **Débloque le sens de tout le reste.** |
| **P2** | 1 | **F2 — `notes` sur tous les kinds** (le sortir du bloc agent). | Win pas cher, **aucune dépendance** — faisable même pendant que G1 traîne. Friction réelle mineure (`builder.html:2384`). |
| **P3** | 1-2 | **F1 — recherche texte + tri Bibliothèque.** | Pas urgent à 34 briques (tient en ~1 écran) mais **prérequis dur** avant tout import massif. À faire **juste avant** P4, pas avant. |
| **P4** | 1-2 | **C1 — 5 oracles PowerShell (~30 checks) comme briques oracle _runnables_.** | Périmètre borné (`00_STUDIO_CONTROL/05_AUDIT/chains/chain_*.ps1`). N'a de valeur **qu'après A1** (sinon cartes inertes, `builder.html:2575`). |
| **P5** | 1-2 (option) | **B2 — noyau openclaw chirurgical** (4 agents autorité-graduée + pattern mémoire claimed/verified). | Enrichissement de contenu, sans dépendance bloquante. `OPENCLAW_CONTENT_AUDIT.md`. |

Total réaliste jusqu'à un builder qui **exécute vraiment** : **~2-3 passes** (B4+G1 puis A1).
Le reste est de l'amélioration, pas du déblocage.

### Abandonné / mis en pause indéfinie

*(Dire « on abandonne » a de la valeur — je ferme les portes explicitement.)*

- **ABANDON — `kind:"matrix"` (D1) et les 17 briques matrix (C3).** Une seule matrice-donnée
  vivante (`tool_permission_matrix`), **déjà** capturée comme oracle ; l'audit recommande de
  ne pas créer le kind (`UX_STUDIO_MATRICES` Reco). Rien ne casse de son absence (testé).
- **PAUSE INDÉFINIE — import en masse des 245 IMP (C2).** Ferait 34→~280 briques, explose F1,
  valeur immédiate faible, gated par A1. À rouvrir seulement si un besoin réel de traçabilité
  roadmap émerge.
- **FERMER comme décision — chaîne canonique (B1).** Déjà tranchée (complémentaires). Ce
  n'est plus un chantier, juste une ratification 1-ligne.
- **PAUSE — E1 (cross-validation), E2 (CLAIM_MATRIX first-class), D2 (roadmap→LEDGER),
  micro-briques/fragments.** Tous représentationnels tant que le builder n'**enforce** rien
  de réel ; gated par A1. 0 fragment construit à ce jour, aucune demande.

### Décisions Pierre requises (questions précises)

1. **G1 (racine) :** « llm-lego devient-il **LA surface du studio** — il absorbe la spec
   UxPilote, on gèle les docs UxPilote comme "supersédés" — **ou** est-ce une expérience
   qu'on peut jeter ? » *(Conditionne A1 + toutes les phases suivantes. Aucun build lourd
   avant cette réponse.)*
2. **B4 :** « Go pour committer `llm-lego/` maintenant, en un commit ? » *(Oui/Non — risque
   de perte totale si Non.)*
3. **A1 (si G1=oui) :** « L'adaptateur réel tape **LM Studio local :1234 uniquement**, jamais
   l'API Anthropic payante — confirmé ? »
4. **Volet 3 (non tranché, `UX_STUDIO_MATRICES`) :** « Veux-tu un champ **"format de sortie"**
   sur la brique Agent (aligné Prompt/Oracle), ou l'agent reste sans contrat de sortie ? »
5. **B2 :** « On extrait le petit noyau openclaw comme contenu ? openclaw runtime reste
   BLOCKED. » *(Oui/Non/Plus tard.)*
6. **B3 :** « On fusionne les correspondances agents signalées (profil CEO ↔ agent-ceo) ou on
   garde les 6 briques distinctes ? » *(Cosmétique, sans urgence.)*

---

## Le risque le plus sérieux

**llm-lego devient la 4ᵉ « surface affichée > surface câblée » de TCS — un builder
magnifiquement testé, riche en fonctionnalités, qui n'exécute jamais rien de réel — parce
qu'A1 (le seul câblage difficile et ingrat) est indéfiniment reporté au profit de
fonctionnalités et d'imports qui démontrent bien sur les mocks.**

C'est le même mécanisme qui a coulé UxPilote (spec jamais codée), studioV2 et l'autopilote :
la surface impressionne, le câblage manque. Le piège spécifique ici est pervers : les **463
checks verts et les captures d'écran** créent un sentiment de « ça marche » qui **masque** le
fait que rien de vivant ne tourne. La discipline « mocks d'abord » se transforme
silencieusement en « mocks pour toujours », et sa propre suite de tests en devient l'alibi.

Le signal d'alarme concret à surveiller : **si la prochaine passe ajoute une fonctionnalité
au builder au lieu de faire A1, le pattern d'échec a déjà commencé.**

---

## Une phrase de synthèse

**llm-lego a un shell excellent et zéro exécution réelle : la seule chose qui compte
maintenant est de brancher un vrai LLM (A1, une fonction, LM Studio local) AVANT d'ajouter la
moindre fonctionnalité — sinon on construit, tests verts à l'appui, la 4ᵉ coquille "surface
affichée > surface câblée" de TCS.**

*software_verdict: N/A (stratégie) · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED*
