# Lot PRODUIT — progression → prestige → deuxième niveau → spatialisation → guidage (P0 → P5)

> **For agentic workers:** ce lot est un lot PRODUIT/GAMEPLAY : il se réalise PAR LA FORGE (intention → Prisme → contrat →
> build → preuves), pas à la main dans `games/kitten_clicker/`, et sans nouvel oracle, station, profil ni architecture.
> Un sous-agent ne commite jamais. Un commit de clôture (gate Pierre). Run 10 depuis la session de supervision.

*Date : 2026-08-23 · Source : HumanGate FAIL de Pierre sur le build run 9 + ses 4 causes ; direction produit P0 =
`studio_brain/gamedesign/kitten_clicker_direction_produit_v1.md` (PROPOSED).*

**Goal :** qu'un joueur ait spontanément envie de continuer après le premier prestige (P5), parce que le niveau 1 progresse
par possibilités nouvelles, que le prestige reset/conserve/bonifie/transforme, que le niveau 2 pose une nouvelle décision,
que l'espace est une règle lisible et que l'écran dit quoi faire en 5 secondes.

**Baseline produit (figée)** : `lab/forge_runs/kitten_clicker/_run9_20260823a/game_build9` — A→J 13/13, DECISION 6/6,
HumanGate FAIL (chatons décoratifs · prestige = bouton · places = mur arbitraire · guidage illisible).

**Invariants** : la mesure ne change pas (`loop.json` A→J + DECISION, sondes, gates) — seule l'INTENTION change (charter,
Prisme, tâches, contrat s9 en règles de produit). Aucun ajout à la chaîne de preuve. Les 4 causes doivent être
reconnaissables dans le Prisme comme exigences PLAYER observables, sinon elles ne traverseront pas jusqu'au Builder
(leçon des runs 5-7 : ce qui n'est pas dans le Prisme n'existe pas en aval).

---

### P0 — Direction produit (Pierre ratifie / corrige ; Fable rédige)
- Livrable : `kitten_clicker_direction_produit_v1.md` → statut RATIFIÉ. Questions à trancher par Pierre : (a) album de
  silhouettes comme promesse explicite (ou retrait total des chatons non gagnés) ; (b) seuil de prestige = « 5 chatons placés +
  jardin ouvert » ; (c) bonus permanent = cœurs +25 % ; (d) niveau 2 = croquettes + jardin/grenier comme 2ᵉ décision.
- Rien d'autre ne commence avant.

### P1 — Réparer la boucle joueur (ACTION → RÉCOMPENSE → DÉBLOCAGE → NOUVEL OBJECTIF) — par la Forge
**Files (intention seulement) :** `lab/forge_runs/kitten_clicker/design_intent.md`, `lab/forge_runs/kitten_clicker/tasks.json`
(s0, s1, s9), `scripts/forge/contracts/s9-build-godot-standard.yaml` (règles PRODUIT, pas de nouvelle preuve).
- design_intent : réécrit depuis P0 (niveau 1, prestige, niveau 2, espace, guidage) — c'est la source du charter s0.
- Tâche s1 : exigences PLAYER pour CHAQUE possibilité nouvelle (`placer`, `place`, `jardin`, `prestige`, `grenier`, chatons
  rares) avec `observe.appears` sur l'affordance/groupe qui apparaît ; NEXT_GOAL = phrases qui nomment l'action (jamais
  « Palier N — même phrase ») ; **le préfixe du contrat ne consomme pas les options de la DECISION** (correction du quirk du
  run 9 : les options ne sont pas aussi des PLAYER_ACTION avant la décision) ; 2 DECISION (niveau 1, niveau 2).
- Tâche s9 : règles produit — rien d'affiché avant d'être gagné sauf silhouettes ; affordance grisée = raison affichée ;
  coût + effet sous chaque bouton en VBox (jamais de chevauchement) ; objectif en haut, plus grande police, contraste.
- Contrat s9 (ajouts, section produit) : « PAS DE PROMESSE NON TENUE » (un élément visible est jouable ou marqué « ? ») ;
  « UN MUR EST UNE RÈGLE » (toute impossibilité affiche sa raison et la possibilité qui la lève).
- Preuve : run 10, `player_loop` A→J + 2 DECISION sans override ; `appears` satisfaits sur ≥ 4 possibilités nouvelles.

### P2 — Vrai prestige — par la Forge (même run 10)
- Tâche s1 : META_LOOP exige `resets` sur ronrons ET `appears:grenier` (la possibilité nouvelle) ; ADVANTAGE mesure le
  bonus permanent (cœurs) ; l'affordance `prestige` **n'existe pas** avant la fin de niveau 1 (`appears:affordance` au moment
  prévu, absente au boot — la sonde le constate via l'ensemble d'affordances au boot).
- Contrat s9 : les 4 propriétés du prestige (reset observable · conservé · bonus permanent · partie suivante différente)
  listées comme règle ; seuil de prestige = fin de niveau 1, jamais 1 ronron (red-team run 9 : `PRESTIGE_THRESHOLD=1`).

### P3 — Monde / placement — par la Forge (même run 10)
- Tâche s1 : `places` = hud `places` (`occupées/totales`) ; adopter impossible ⇒ objectif nomme le lieu à ouvrir ;
  exigence « chaque chaton adopté occupe une place visible » ; les 6 chatons du départ = silhouettes (ou absents).
- Contrat s9 : « le nombre de chatons n'est pas une variable : c'est une colonie placée » (chaque chaton = un nœud placé
  dans un lieu, jamais une liste empilée hors écran).

### P4 — UI / guidage — par la Forge (même run 10)
- Tâche s9 + contrat s9 : hiérarchie OBJECTIF → ACTION → CONSÉQUENCE → PROCHAINE POSSIBILITÉ ; objectif = police la plus
  grande, contraste maximal ; l'affordance courante est la seule mise en évidence ; ligne « Ensuite : … ».
- Pas d'oracle de lisibilité : c'est le HumanGate (5 secondes) qui juge. La capture après 5 clics est déposée en evidence.

### P5 — Deuxième HumanGate (Pierre)
- Build run 10 joué jusqu'au premier prestige. Question unique : **« Est-ce que j'ai spontanément envie de continuer après
  le premier prestige ? »** + les 4 causes revisitées une à une (chatons · prestige · espace · guidage).
- Tout FAIL reste une rupture localisée (intention / Prisme / build / balance), jamais un lot « plus d'oracles ».

## Exécution
1. P0 ratifié par Pierre (ou corrigé). 2. Fable rédige P1–P4 (intention, tâches, contrat) — petit et couplé, en direct ;
sous-agent Sonnet seulement pour la relecture de cohérence Prisme ↔ tâches. 3. Validation : `pytest test_contract_sync.py
test_contract.py test_s9_*`, dry-run 17, `node loop_spec.mjs` sur un Prisme synthétique de P1 (2 DECISION). 4. Un commit.
5. Archiver run 9 (déjà fait) → purger run_dir/build → run 10 `kitten_clicker-20260823b` depuis la session, Monitor.
6. Rapport format Pierre ; P5.

## Hors périmètre (explicitement)
Oracle LLM · nouvelle station/profil · narration · architecture · « plusieurs heures » · vocabulaire STANDARD/Prisme · reuse ·
red-team supplémentaire · gates historiques (e2e `DirAccess`, solvabilité argv, `check_wiremap_contract`) · retry BLOCKED.
