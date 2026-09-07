# 🧠 Studio Brain — Map of Content
#moc #reference

> **Tactical Chess Studio** — micro-usine de jeux Steam, solo + IA, opérée par Pierre.
> Obsidian = mémoire persistante entre sessions. Règle: tout ce qui est décidé ici est *actable*, pas simplement archivé.

---

## Doctrine & Règles absolues
→ [[doctrine/studio-doctrine|Studio Doctrine]] — HumanGate, oracles non-LLM, IA-invisible, distribution-first, NO_CLAIM

---

## Projets actifs

> **Revue hebdomadaire 2026-09-06** — période 08-24 → 09-06 (2 semaines, la revue du 08-30 n'a pas eu lieu) :
> **55 commits, 100 % Forge, 0 ligne produit joueur, 0 playtest.** Deux changements que la section
> ci-dessous ne portait pas : (1) le chemin critique n'est plus Kitten Clicker mais l'**expérience
> Libre vs Dirigé** puis, depuis le 09-03, la **construction Studio V2** ; (2) `games/kitten_clicker/`
> **n'existe plus dans le dépôt** (voir ligne suivante).
>
> **Revue hebdomadaire 2026-08-23** — cette section décrivait encore la semaine du 07-26. Réalignée sur le git réel : semaine 08-17→08-23 = **66 commits, 100 % Forge / Kitten Clicker, 0 ligne produit ailleurs**.

→ ⚠️ **`games/kitten_clicker/` — ABSENT du dépôt (mesuré le 2026-09-06).** Le dossier n'est **ni présent
sur disque, ni suivi par git, ni ignoré** (`git log --all -- games/kitten_clicker` = 0 commit ;
`git check-ignore` = non ignoré). Le code des runs 1→9 n'a donc jamais été commité et n'est plus là.
**Ce qui survit** : les archives de preuve `lab/forge_runs/kitten_clicker/_run1…_run9` (commitées le
2026-08-28, `d78983de`), `lab/reports/observer/kitten_clicker/`, `lab/prototypes/kitten_noyau_sonde/`,
et tout le corpus de design ci-dessous. **Conséquence** : la baseline produit du 08-23 reste
documentée et argumentée, mais le **build** qui l'a produite n'est plus rejouable. Historique de la
campagne (paliers V1→V4, Gameplay Contract A→J 12/12, DÉCISION 13/13 + 6/6, **HumanGate FAIL du
run 9 = baseline produit**) conservé au [[decisions/decision-log|Decision Log]] (`KITTEN_PALIERS_V1_V4`,
`KITTEN_HUMANGATE_BASELINE_V1`). **Question ouverte pour Pierre : le dossier a-t-il été supprimé
volontairement, ou perdu ? Si perdu, l'accepter comme tel et le noter.**
→ **Expérience Libre vs Dirigé (L/D) — chemin critique 08-29 → 09-02.** Jeux-sondes appariés
(`p1_alpha`/`p1_beta`, `p2_alpha`/`p2_beta`, `p3_alpha`/`p3_beta`, `chain_probe_v1`,
`tower_defense_sonde`, `micro_sonde_v1`). État au 09-06 : **aucune paire valide** — paire pilote close,
PAIRE 2 requalifiée (L2 invalide expérimentalement, finding n°7), PAIRE 3 et PAIRE 4 pré-enregistrées
sans dépense LLM. **Toute inférence L/D exige ≥ 2 paires valides : `claim_verdict: NO_CLAIM_ALLOWED`.**
Détail vivant : [[00_CURRENT_CONTEXT|Contexte courant]].
→ **Studio V2 — nouveau chantier déclaré le 2026-09-03, statut PROPOSED.** `docs/forge/STUDIO_V2_CARTE_VERITE_20260903.html` (audit lecture seule) puis
`docs/forge/STUDIO_V2_PLAN_CONSTRUCTION_20260903.md` (lots 0→4, slice vertical). Le plan déclare un
**second dépôt hors `C:\TACTICAL_CHESS_STUDIO`** (`…\Desktop\Studio`, HEAD `7f201fd`, **aucun remote**)
qui **dépend de V1 pour tourner** (aucun venv Python propre) — non vérifiable depuis cette revue, à
confirmer par Pierre. Décision **D0 non tranchée : la construction V2 n'a pas de destination canonique.**
→ [[projects/snake-survivor-genesis|Snake: Survivor RPG — Genesis]] — **SUPERSEDED** depuis le 2026-07-12. Kill-gate P0 jamais résolu (0 playtest enregistré), **page Steam jamais ouverte, 0 wishlist**. `games/snake_survivor/` inchangé depuis le 2026-07-26. Fiche conservée pour historique/apprentissages, pas de reprise sans HumanGate explicite.
→ **Belote (pivot 2026-07-05/06)** et **`games/auto_battler/`** — ⚠️ **dormants : dernier commit de contenu produit le 2026-07-21 (`26e809d1`), soit 33 jours.** (Un balayage Forge du 08-06 a touché leurs `mutation_triage.json` — c'est de l'outillage, pas du produit.) Aucun arbitrage HumanGate écrit ne les a fermés ni repriorisés. Ils restent nominalement « produit 1 » et « chantier actif » dans les décisions du 07-05/06 et du 07-18, alors que la Forge est le seul chemin réellement travaillé depuis. **Question ouverte pour Pierre : les clore explicitement, ou les reprendre.**
→ **Forge 2.0** (`scripts/forge/`) — usine contractuelle QA/oracle du studio. P0 intégrité **GELÉ** (décision Pierre 2026-07-11, 277 tests verts). P1 mécanique-only falsifiée puis **P1 OUVERTE** (2026-07-12) : sondes A1/A2/A3/A5 promues fixtures permanentes `fixtures/p1/`. P1.1 SUCCESS (4/4 défauts détectés, 0 FP). s10d (oracle visuel advisory) incrément P1-1 COMPLET, poussé (`f6bfab8`). Profil `increment` ajouté 2026-07-19 pour servir `auto_battler`. **MàJ 2026-07-26** : Godot devient le 1ᵉʳ backend certifié (contrat `s9-build-godot`, ratifié Pierre 2026-07-21) — mutation GDScript, garde fail-closed, brique `M01` (grid-navigator) mesurée ; la tautologie R9 trouvée en revue (le générateur consultait la brique testée) a été corrigée (`bb6ea2fa`, ré-mesurée). `DISPATCH_SPAWN_AUTHORITY_V1` (dispatch ≠ autorisation de spawn) livré en 2 phases. **Grosse session de consolidation git le 07-26** : 7 branches + 5 worktrees fusionnés en une seule branche master (0 fichier sale), 5 conflits résolus par union/addition, rien poussé — détail : [[00_CURRENT_CONTEXT|Contexte courant]]. 2 décisions rédigées attendent la ratification explicite de Pierre : `studio_brain/decisions/PROPOSED_2026-07-26_ratifications.md` (ne pas les traiter comme actées).
→ **Lane STUDIO : GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`, `scripts/studioV2/`, lanceurs. Voir Décisions.
→ `games/menagerie_tactics/` — jeu Forge (Pokémon × Fire Emblem), forgé 2026-07-11, verdict signé OK vérifié. N'existait que dans un worktree non commité ; récupéré et commité lors de la consolidation du 07-26 (`b9ec14e5`). Rien poussé.
→ `games/kb_tactics/` — jeu tactique HTML assemblé par ingestion depuis une knowledge base (`knowledge_base/`, mission Pierre 2026-07-12). Réussite mécanique, **NON commité**, gates Pierre en attente (ratifier contrat, conclusion §5, go Kenney download, commit).
→ `games/leviathan/` (Capacitor/Vite, idle+combat) et `games/chess_tcg/` (Godot, pivot mobile) — prototypes expérimentaux actifs, hors chemin critique produit principal.
→ `llm-lego/` — outil interne (builder visuel de chaînes LLM). Activité continue (belote-claude/belote-qwen experiments, wireframes).

---

## Design & Apprentissage
→ [[gamedesign/lessons|Leçons Gamedev]] — règles extraites de la recherche marché + post-mortems
→ **Kitten Clicker — corpus de design (2026-08-23)** : [[gamedesign/kitten_clicker_decision_significative|Décision significative]] (définition contre-factuelle, ratifiée) · [[gamedesign/kitten_clicker_direction_produit_v1|Direction produit V1]] (PROPOSED) · [[gamedesign/kitten_clicker_gameplay_loop_content_contract_v1|Gameplay Loop & Content Contract V1.1b]] (ratifiée 08-23) · [[gamedesign/kitten_clicker_progression_contract_v1|Progression Contract V1]] (C.1 ratifié) · [[gamedesign/kitten_clicker_calibration_v1|Calibration V1]] / [[gamedesign/kitten_clicker_calibration_v2|V2]] (V2.1 non ratifiée)
→ CERFA Template — manifeste d'instanciation par jeu : `docs/studio_v2/08_GAME_MANIFEST_CERFA.md` (fichier vault jamais créé — lien direct vers la source, pas de wikilink mort)

---

## Décisions
→ [[decisions/decision-log|Decision Log]] — registre chronologique des décisions irréversibles

---

## Références
→ [[reference/sources-of-truth|Sources de Vérité]] — où lire les données réelles dans le repo
→ [[reference/market-reality|Réalité du Marché Steam]] — chiffres de sobriété (médiane, wishlists, conversion)

---

## Workflow
→ [[workflow/skills-catalog|Skills Catalog]] — les 33 skills du projet groupés par finalité, mécanique de délégation
→ [[workflow/studio-operating-flow|Studio Operating Flow]] — boucle Pierre→Cowork→Exécution→Oracles→HumanGate, règle no-plan-no-patch

---

## Architecture
→ [[architecture/system-vision|System Vision]] — cockpit comme point de connexion unique : autopilot, openclaw, qwen-local, vault, jeux

---

## Meta
→ [[meta/vault-usage-guide|Vault Usage Guide]] — conventions du vault : dossiers, tags, wikilinks, cadence de mise à jour, DON'Ts

---

## State
→ [[state/current-state-2026-06-28|État Studio — 2026-06-28]] — snapshot daté : modules Godot existants, bugs résolus, vault créé

---

## Dashboard rapide

| Chemin critique réel | **Forge — expérience Libre vs Dirigé** (08-29 → 09-02), puis **construction Studio V2** (déclarée 09-03, `PROPOSED`). Plus aucun jeu-produit sur le chemin critique. |
|---|---|
| Dernier gate franchi | Sas moteur / sas 2-3 (acquittement mesurable, jointure observable) — **tout en advisory**, 09-01/09-02 |
| Dernier gate ÉCHOUÉ | **HumanGate Pierre 2026-08-23, build Kitten run 9 : FAIL « jeu complet »** — 4 causes : chatons décoratifs · prestige = un bouton · espace trop pauvre · guidage illisible. Reste la **baseline produit** ; le build n'est plus dans le dépôt. |
| Verdict expérimental L/D | **`NO_CLAIM_ALLOWED` — aucune paire valide à ce jour** (D2 seul bras valide ; la règle exige ≥ 2 paires). PAIRE 3 et PAIRE 4 pré-enregistrées, non exécutées. |
| Prochain jalon | Décision **D0** (destination canonique du code V2) + Lot 0 du plan de construction ; GO gestes 2 et 3 du refresh CLAUDE.md |
| Titre 1 (historique) | Snake: Survivor RPG — Genesis — **SUPERSEDED 2026-07-05/06**. Kill-gate P0 jamais tranché (0 playtest, 2 builds jamais réconciliés). **Page Steam jamais ouverte, 0 wishlist.** `games/snake_survivor/` + `games/snake_genesis/` inchangés depuis le **2026-07-26 (42 j)**. |
| Dormants non clos | Belote (produit 1 nominal du pivot 07-05/06) et `auto_battler` — **dernier commit produit le 2026-07-21, soit 47 jours**, aucun arbitrage écrit. **7ᵉ revue hebdomadaire consécutive à le signaler.** |
| En parallèle | Forge 2.0 (QA/oracle interne, Godot 1ᵉʳ backend certifié 07-21, cible pipeline figée 08-13) · `pacman` (V5 = jeu de référence, validé Pierre 08-06) · `tetris`, `bomberman_3d`, `breakout_v2` (baselines) · `menagerie_tactics`, `kb_tactics` (gates Pierre en attente) |
| Budget | < 2 000 € total (contrainte studio globale, inchangée) |
| Lane STUDIO | **GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`/`scripts/studioV2/`/lanceurs, lire OK modifier = HumanGate |
| Repo | `master` = `origin/master` + **1 commit non poussé** (`3a9ef2d3`) · dernier push `49eacd3a`, **2026-09-03** · arbre sale : 14 fichiers modifiés + ~11 dossiers non suivis (sondes `p1_beta_E1`/`p3_alpha`/`micro_sonde_v1` conservées comme évidence sur décision Pierre — **un `git clean` les emporterait**) |
| Dernière revue vault | **2026-09-06** (revue hebdomadaire mémoire ; la revue du 08-30 a été sautée) |

---

## Cadence de mise à jour
Voir [[reference/sources-of-truth#Cadence]] — revue hebdomadaire en fin de session.
