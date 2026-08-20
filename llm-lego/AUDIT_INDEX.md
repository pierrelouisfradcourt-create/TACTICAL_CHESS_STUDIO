# Index des audits llm-lego

> Ce document ne résume pas les audits — il indique lequel fait foi sur quel sujet,
> et signale les tensions connues entre eux. Mis à jour à chaque nouvel audit.
>
> Créé le 2026-07-03, suite à `META_AUDIT.md`. Raison : la série d'audits est saine
> (chaînage réel, auto-correction datée), mais un lecteur qui ouvre un audit ancien
> ne sait pas s'il est encore à jour. Cet index pose la préséance **sans fusionner**
> — la fusion effacerait la traçabilité « qui a constaté quoi, quand », qui est
> précisément ce qui rend la série fiable.

## Chronologie (par ordre de production — mtime vérifié)

| # | Fichier | Sujet principal | Statut |
|---|---|---|---|
| 1 | `LIBRARY_AUDIT.md` (07-01) | Fondations d'une bibliothèque de briques : réutiliser le pattern Wire Map, 7 types, commencer par Agent | Fondateur — **partiellement périmé** (§1.3 gouvernance, §4 plan Agent-first) |
| 2 | `MICRO_BRICKS_AUDIT.md` (07-02) | Faut-il extraire mémoire/skill/…/modèle en micro-briques (`kind:"fragment"`) ? | **À jour** (le plus stable — décrit des fiches vides qui n'ont pas bougé) |
| 3 | `COMPLETENESS_AUDIT.md` (07-02) | Le builder peut-il représenter TOUT TCS ? (Council parallèle, Rocky autorité, 4-lanes, ledger) | **Fait foi** sur la gouvernance agent et les trous builder ; voir Note de correction (CLAIM_MATRIX) |
| 4 | `AUTOPILOT_MINING_REPORT.md` (07-02) | Fouille d'`autopilot.py` (9029 l) → top-5 pépites (pipeline idée→IMP, prompts, oracles, profil LM) | Valide mais **sous-dimensionné** (couvre le seul monolithe) ; voir Note de correction |
| 5 | `LIBRARY_UX_IMPORT_AUDIT.md` (07-03) | Test live 18 briques : UX bibliothèque + solidité import ; découverte `lab/chains/` | **Fait foi** sur l'état live de la lib et les 7 frictions (dont F7 fork) |
| 6 | `ALL_CHAINS_AUDIT.md` (07-03) | Inventaire exhaustif des **3 familles** de chaînes TCS + matrices | **Fait foi** sur les sources importables et le plan d'import |
| 7 | `META_AUDIT.md` (07-03) | Audite les 6 audits précédents (cohérence, fraîcheur, contradictions) | **À jour** — origine de cet index |
| 8 | `UX_STUDIO_MATRICES_AUDIT.md` (07-03) | UX/studio/openclaw + 17 matrices de gouvernance + « format de sortie manquant » (Volet 3) | **À jour** — postérieur à META, non couvert par lui |
| 9 | `OPENCLAW_CONTENT_AUDIT.md` (07-03) | Contenu openclaw (4 agents + 28 skills + BOOTSTRAP/TOOLS/MEMORY/DREAMS + 2 ponts) — récupérable comme contenu, pas mécanisme | **À jour** — approfondit le Volet 1 openclaw d'UX_STUDIO_MATRICES |
| — | `IMPORT_PASS1_REPORT.md` (07-03) | *(Rapport de build, pas audit)* Import Passe 1 : chaînes + profils LM + 6 agents, construit à la souris | **À jour** — corrige activement la violation « fork » (F7) : attache les briques réelles au lieu de les copier |

> Note de méthode : `LIBRARY_AUDIT` cite « ~5200 / 217 IMP », chiffres depuis périmés
> (voir Angles morts). La chronologie mtime coïncide avec les références croisées
> internes (chaque audit ne cite que des audits d'index inférieur), ce qui la valide.

## Qui fait foi sur quoi

En cas de désaccord apparent avec un audit antérieur, **l'audit le plus récent listé
ci-dessous prime** sur le sujet indiqué :

| Sujet transversal | Fait foi | Périmé / partiel sur ce point |
|---|---|---|
| **Gouvernance agent** (autonomie/permissions/surfaces éditables) | `COMPLETENESS §3.1` (fiche Agent les porte, `builder.html:1514-1526`) | `LIBRARY_AUDIT §1.3/§2` (« absente du modèle nœud ») — **rendu faux** |
| **Sources importables / gisement de valeur** | `ALL_CHAINS` (3 familles ; `lab/chains/` = gros du gisement, déjà semi-structuré) | `AUTOPILOT_MINING` — couvre **seulement** le monolithe `autopilot.py` |
| **Plan de passes / feuille de route** | `ALL_CHAINS §6` + `LIBRARY_UX` (import-first) | `LIBRARY_AUDIT §4` (Agent-first) — **caduc** : Passes 3 Council & 4 Système/Roadmap jamais exécutées |
| **État live de la bibliothèque** | `LIBRARY_UX` (18 briques testées), **mis à jour par** `IMPORT_PASS1_REPORT` (Passe 1 : chaînes + 6 agents + profils LM) | `LIBRARY_AUDIT` (état projeté, avant construction) |
| **État de CLAIM_MATRIX (4-lanes)** | `COMPLETENESS §3.2` (trou **builder** : pas de lane first-class ni enforcement) **et** `UX_STUDIO_MATRICES Volet 2 #4` (la source `CLAIM_MATRIX.md` est ACTIVE-AU-BOOT dans autopilot) — **deux couches, les deux vraies** | — (voir Tension #1 : ne pas lire l'une comme démentant l'autre) |
| **Statut du `kind:"matrix"`** | `UX_STUDIO_MATRICES` (Reco) : **pas de 7ᵉ kind justifié** — une seule donnée-matrice vivante (`tool_permission_matrix.json`), déjà capturée comme oracle | — |
| **Micro-briques / fragments** | `MICRO_BRICKS` (v1 = `modèle` seul via `<datalist>`) | — (0 fragment construit à ce jour) |
| **« Format de sortie » de la brique Agent** | `UX_STUDIO_MATRICES Volet 3` (3 lectures étayées, **non tranché** — décision Pierre) | — (question neuve, jamais posée avant) |
| **Chaîne canonique** (run_chain.py vs pipeline idée→IMP) | `ALL_CHAINS §4/§7` pose la question — **non tranché** (deux générations probables) | — |
| **Statut & runtime des matrices de gouvernance** | `UX_STUDIO_MATRICES Volet 2` (2 ACTIVE-AU-BOOT, le reste PASSIVE/DOCUMENTED_ONLY ; **AUTHORITY_MATRIX = DOCUMENTED_ONLY**, corrige un audit antérieur) | — |
| **Contenu openclaw (agents/skills/ponts)** | `OPENCLAW_CONTENT_AUDIT` (27/30 skills = shims, pas copies ; producteur_dur = claude-proxy **local** pas API payante ; 2 ponts actifs & sains ; extraction chirurgicale recommandée, pas de chantier import) | `UX_STUDIO_MATRICES Volet 1` (vue d'ensemble « dormant/bloqué ») |

## Tensions connues (résolues par ce document, pas par fusion)

1. **CLAIM_MATRIX « absent » vs « il est là ».** `COMPLETENESS §3.2` dit que les 4 lanes
   n'existent pas comme label first-class dans le **builder** ; `LIBRARY_UX`/`ALL_CHAINS`
   disent que le CLAIM_MATRIX 4-lanes « est ici » dans `doc_hygiene_chain.py`. Les deux
   sont vrais à des **couches différentes** (builder vs source TCS importable). → Voir la
   **note de correction en tête de `COMPLETENESS_AUDIT.md`**.
2. **Gisement principal : `autopilot.py` ou `lab/chains/` ?** `AUTOPILOT_MINING` centre la
   valeur sur le monolithe ; `LIBRARY_UX` puis `ALL_CHAINS` montrent qu'il n'était qu'une
   des trois familles, et pas la plus facile à importer. Réordonnancement de priorité, pas
   erreur factuelle. → Voir la **note de correction en tête de `AUTOPILOT_MINING_REPORT.md`**.
3. **« Référencer, pas forker » posée puis violée.** `LIBRARY_AUDIT §3/§5` recommande de
   référencer les registres TCS ; la première chaîne idée→IMP construite a **copié** les
   prompts (`LIBRARY_UX F7`). Écart build-vs-audit, **en cours de correction** (Passe 1
   attache désormais les briques réelles — `IMPORT_PASS1_REPORT`). → Voir la **note de
   correction en tête de `LIBRARY_AUDIT.md`**.

## Angles morts signalés par META_AUDIT (non encore traités)

- **Anti-régression double-run search/chat jamais reprise.** `LIBRARY_AUDIT §5.2`
  recommandait de garder les 3 EXAMPLES comme fixtures seed non supprimables pour ne pas
  casser le test critique du double-run search/chat. Posé une fois, **jamais re-vérifié**
  depuis — seul oubli pur de la série. À reprendre avant toute migration d'`EXAMPLES`.
- **Dérives de fraîcheur non signalées au moment où elles se produisent** : `IMPROVEMENT_LEDGER.yaml`
  compté **217** (07-01/02) puis **244** (07-03) ; `autopilot.py` cité « ~5200 lignes »
  (`CLAUDE.md` + `_CHARTER_STACK_MAP`) alors qu'il fait **9029** lignes. → Recommandation :
  **chaque futur audit qui cite un chiffre de ce type doit noter sa date de vérification.**
- **Plans de passes concurrents sans préséance déclarée.** Trois plans coexistaient
  (`LIBRARY_AUDIT §4`, `LIBRARY_UX`, `ALL_CHAINS §6`) sans dire lequel prime. → **CE
  DOCUMENT résout ce point pour l'avenir** : toute nouvelle priorisation doit être ajoutée
  à la table « Qui fait foi » ci-dessus, pas laissée comme un plan flottant sans lien avec
  les précédents.

---

*Index de préséance — ne remplace aucun audit, ne fusionne rien. Mettre à jour à chaque*
*nouvel audit produit.*
*software_verdict: N/A (documentation) · evidence_verdict: N/A · claim_verdict: NO_CLAIM_ALLOWED*
