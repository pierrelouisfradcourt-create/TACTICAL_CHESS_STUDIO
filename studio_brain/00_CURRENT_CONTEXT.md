# Contexte courant TCS
*(Handoff. Historique complet : `studio_brain/journal/2026-07-30_00_CURRENT_CONTEXT_archive.md`.)*

## Dernière session : 2026-07-30 (journée Opus + soirée Fable) — calibration close, convergence V2 planifiée

### Acquis mesurés du jour
- **Calibration N=3 FAITE** (runs cal1/cal2/cal3, archivés `_run_cal*_20260730/`) : sortie fonctionnelle
  **identique** aux 3 runs (OK / WITH_OBJECTION / mêmes 4 drapeaux) ; consommation : coût 20,07 %
  d'étendue/médiane (**dépasse le seuil 20 % fixé avant lecture** → la règle prescrit N=5, décision
  Pierre en attente), durée 17,35 %, tokens 20,93 %. Bruit concentré sur s11 (30-32 %) vs s9 (8-22 %).
  `s9 / construction depuis zéro : NOT_MEASURED` (Snake commité déjà construit).
- **`total_cost_usd` = équivalent tarif API** (vérifié au centime) — pas une dépense (abonnement).
  Le « coût » des rapports = proxy de consommation, cache inclus (contrairement à `tokens`).
- **CV-0 : 27 verdicts rejoués — s11 seul déterminant de `decision` : 1/27** (survival_arena, où il
  avait raison). Sous condition R2 : s11 ne tournerait que sur 4/27 (~85 % d'économie, 0 perte
  décisionnelle). R2 fondée sur données.

### Doctrine ratifiée Pierre 2026-07-30 (mémoire `forge_cognitive_diversity_routing` + `validator_without_producer`)
- **Routage = diversité cognitive, pas classement** : Opus archi (s4, s5) · Sonnet conception (s1) ·
  Qwen contradiction/code (s6, s11, s9→E7) · Gemini recherche (s2, repli Sonnet tracé+compté) ·
  Haiku simple. Matrice modifiable **uniquement après mesure sur tâche réelle**, jamais benchmark.
- **Prisme : critère = décorrélation mesurable** (Intra = même lentille rejouée ; Inter = entre
  lentilles ; panel utile ssi Inter > Intra). Pas de 5 agents artificiels. Lentilles prioritaires :
  joueur/fun · produit/marché (les 2 sans contrat).
- **Invariant : validateur sans producteur → créer le producteur, jamais durcir le validateur.**
- **Breakout = expérience externe hors campagne Forge** (pas une preuve de contamination). Snake =
  état de calibration, pas une mesure from-scratch. **Prochaine cible E7 = jeu VIERGE** (absent de
  `games/`), driver instrumenté (`state.json`+`verdict.json` = critère d'une campagne Forge).

### Documents produits (tous PROPOSED, AUCUN commité)
- `docs/forge/MASTER_SCHEMA_TRUTH_AUDIT_2026-07-30.md` — audit vérité du master schema (+6bis doctrines,
  +correction datée : panel Prisme = PASSIVE, pas NOT_FOUND).
- `docs/forge/INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md` — routage V2, matrice, protocole E4/E7 (sonde-contrôle,
  adjudication aveugle, critères fixés avant lecture).
- `docs/forge/PLAN_CONVERGENCE_FORGE_V1.md` — **LE plan de pilotage** : 6 audits délégués vérifiés,
  problèmes classés A→G (G = lot KB), CV-0…CV-19, 4 phases, décisions D-a…D-j.
- `docs/forge/MASTER_SCHEMA_UPDATE_PROPOSAL.md` — éditions É0→É9 ancrées et vérifiées pour le HTML
  canonique (application = après validation Pierre uniquement).

### Findings majeurs des audits délégués (tous re-vérifiés contre le dépôt)
- **Gel wiremap cassé en silence** : `frozen_features_from_wiremap` lit v1 (`features[]`), Snake est
  v2 (`lines[]`) → gel vide silencieux ; aucun gel posé pour Snake ; aucun oracle ne l'exige (CV-3).
- **Panel Prisme** : code câblé (`panel.py`, via `--charter`) mais hors porte de contrat, mono-modèle,
  sorties non écrites (méta-rapports). 1re mesure : `archidepot~gameplayprog = 0,909` Jaccard tags —
  ininterprétable sans Intra (jamais mesuré).
- **Réconciliation d'exigences** : productible mécaniquement (38/38 tags résolvent ; `resolveSourceRole`
  existe sans appelant) ; DERIVED improductible (0/32 entrées catalogue avec `provides`).
- **KB** : store de leçons **fantôme** (`lessons.jsonl` n'existe pas ; seul le fallback legacy à 3 leçons
  nourrit le pré-mortem) · `search` 5/5 zéro résultat · `apply_decisions` sans appelant · catalogue
  ~78 % jamais réutilisé (Snake : 3 réutilisations KB vs 25 depuis Pong).
- **Profils réels** : 16× standard_godot / 3× standard / 3× patch / 1× full — la chaîne complète du
  master schema a tourné 1 fois. Builder Godot jamais instruit de chercher (clause §2bis absente).

## Décisions Pierre EN ATTENTE (détail : PLAN_CONVERGENCE §fog, D-a…D-j)
D-a valider/appliquer la mise à jour du master schema · D-b clore la calibration (5 runs ou stop à 3) ·
D-c lots de dégel `scripts/forge/**` (TOUT le code en dépend) · D-d cible E7 (grille : MATCH-3 22/25,
PAC-MAZE 20/25) · D-e Prisme dans standard_godot ? · D-f lentille marché vs worldscan · D-g déclassements
Opus→Sonnet · D-h search/reuse : gate ou advisory · D-i learning_curve : lecteur ou journal-only ·
D-j catalogue `provides`/`requires` · + règle `deny` `reference_protected` (geste Pierre, jamais posée).

## MODE EXÉCUTION DÉLÉGUÉE — LOTS LIVRÉS (2026-07-30 nuit, rapport : docs/forge/RAPPORT_EXECUTION_CONVERGENCE_2026-07-30.md)
- **Lot dégel 1 FAIT + PROUVÉ** (suite 1287→**1321 passed**, garde DRIFT/8 = exactement le lot) :
  CV-3 gel v2 + garde absence · CV-4 clause SEARCH godot · CV-8 capture cache · CV-14 producteur
  failure_event (`_halt_step`, aucune leçon auto — doctrine 4 couches).
- **Lot KB FAIT** : CV-19 diagnostiqué (4/4 = catalogue vide du sujet — briques card_engine jamais
  promues, la promotion DORT dans la file) · CV-15 journal-only documenté · CV-16 câblé dans /gate.
- **CV-9 deny posées** (auto-verrouillantes, à ratifier) · **master schema APPLIQUÉ** (+104/−12,
  Détail L, homonymie RÉCONCILIATION levée) · **Breakout V2 = prochaine campagne** (désignation
  Pierre ; prep : docs/forge/BREAKOUT_V2_CAMPAIGN_PREP.md ; tension « cible vierge » tracée).

## LOT DÉGEL 2 LIVRÉ (2026-07-31) — la Forge dit vrai sur elle-même
- **Contexte opératoire compact** : `docs/forge/FORGE_CONTEXT_COMPACT_V1.md` (briefing unique
  des agents, remplace l'historique narratif — 8 sections, tenu à jour post-lot).
- **P1-P7 prouvés, suite 1287→1321→1350 passed / 1 skipped + node 35/35 (re-vérifiés orchestrateur)** :
  P1 `exigences_cognitives`+`memoire` RENDUS dans le prompt (champs jetés → clos) · P2 runs jeu
  lisent `playtest.jsonl` (leçon « bande de vitesse » atteint le builder) · P3 WHY d'escalade
  persisté au succès + `run.log`/run · P4 manifeste porte `tools_effective` (fin de la
  sous-déclaration signée) · P5 champ `reason` d'activation (défaut « ordre de profil ») ·
  P6 3 divergences contrat↔exécuteur ANNOTÉES à la source + skill.md distingue
  `orchestrator`/`run_orchestrator` · P7 `prompt_budget`+`ambient_context_note` (ancien nom
  en lecture legacy seule, testée). Vues VUE 3/VUE 4 mises à jour EN PLACE (zéro bloc changelog).
- **Garde** : DRIFT = exactement les fichiers des 2 lots autorisés. Re-baseline après commit Pierre.
- **Toujours ouvert (inchangé, ne pas re-auditer)** : boucles Jeux→KB et Lessons→KB [X] ·
  `lessons.jsonl`/`failure_events.jsonl` absents · pré-mortem position 16/18 (expérience, pas
  correctif) · s10d BLOCKED · 92 % contexte ambiant (jauge honnête depuis P7, ambiant non mesuré) ·
  2 curriculums non arbitrés · budget vs réutilisation réelle.

## Prochaine étape (gestes Pierre — rien d'autre ne bloque)
1. `node scripts/forge/apply_decisions.mjs --apply` (dry-run vérifié : 10 décisions, 0 conflit —
   bloqué classifieur pour l'agent, volontairement non contourné). 2. Ratifier CV-9. 3. Commit des
   lots (DRIFT/8 + docs/skill/README) puis ré-armer la baseline. 4. Arbitrages Breakout (option
   contamination — recommandé (a), charter). 5. D-b · D-e/f/g · D-i · D-j.

## Impasses connues (ne pas re-buter dessus)
- Aucun mécanisme d'exclusion de lecture pour un builder (`read: dépôt entier`) → seule contre-mesure
  E7 = cible vierge. · Confinement outils en défaut de format (`Bash(node:*)` vs `Bash`). ·
  `run_real` n'a pas de coupe-circuit budget intra-run (contrôle entre runs uniquement). ·
  qwen3.6 INTERDIT pour le JSON (thinking vide le content). · Godot headless ne rend pas de pixels
  (fenêtre GPU obligatoire pour l'oracle visuel).
