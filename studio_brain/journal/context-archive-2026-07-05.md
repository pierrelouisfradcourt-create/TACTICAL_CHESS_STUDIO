# Contexte courant TCS
Dernière session : 2026-07-05

## En cours
- llm-lego builder : wiredStatus + Brouillard d'audit + Ancrage brique sur edge
  ✅ LIVRÉ (2026-07-03). wiredStatus (unset/documented-only/wired/broken) = 3ᵉ axe
  d'enveloppe, dérivé sans migration (brickWiredStatus). Brouillard = flou léger .nbody
  (titre net) sur nœud sourceRef+non-vérifié ; danger = contour orange sur broken —
  exclusifs par construction (nodeAudit court-circuite). Edge : attachedBrickRef =
  référence non-exéc (tous kinds), badge 📎, exclu du moteur. Validé 24 checks +
  régression 572 (26 suites) + A1 réel LM Studio + vitest 46/46. Cadrage préalable :
  llm-lego/SCOPING_ORGANIC_FOG_EDGE.md. Idée 1 (vue organique) = HORS SCOPE, en attente
  décision Pierre (rosace vs jardin). Non poussé.
- CT-1 (audit ROI) : ✅ FAIT + POUSSÉ (05ca0b4, origin/master). llm-lego source
  (171 fichiers, 1,6 Mo) + studio_brain vault (15) versionnés. Exclus : node_modules
  (105 Mo), *.png (53 screenshots, décision Pierre = repo lean), lego.zip,
  state/loops-log.md (2,4 Mo). LFS écarté. Risque bus-factor-1 n°1 levé.
- Intégration Superpowers + Graphify + Obsidian + frontend-design (plan 5 phases)
- Phase 0 : ✅ FAIT. Commit `.claude/` infra (9263d49).
- Cleanup "tree jamais clean" : ✅ FAIT (commit 027de2a). Rapports auto runtime
  gitignorés + untrackés (director_*, learning_progress, search_profile_latest,
  studio_state, snapshot, events.jsonl, diagnosis/reflection/audit_daily/*_latest).
  Dossier parasite C:\...\ (bug chemin relatif) supprimé. Cause racine corrigée.
- Phase 1 (Superpowers) : ✅ TERMINÉE. Cloné infra/superpowers (v6.1.1, 14 skills,
  Windows OK), gitignoré (commit 5ba818e). Marketplace locale superpowers-dev
  enregistrée + plugin installé + reload OK (3 plugins, 6 agents, 1 hook, 1 LSP).
  Les 14 skills superpowers:* sont dispo (brainstorming, systematic-debugging,
  test-driven-development, writing-plans, dispatching-parallel-agents…).

## Décisions récentes (ratifiées HumanGate)
- Option A : .claude/ (skills, agents, rules) versionné dans Git — FAIT
- CLAUDE.md racine = point d'entrée mémoire (tier-1)
- studio_brain/00_CURRENT_CONTEXT.md = état vivant inter-sessions

## Séquençage amendé par audit ROI (docs/audit/ROADMAP_ROI_2026-07.md, 2026-07-03)
Le plan 5 phases est CONSERVÉ mais réordonné : le cœur (force moteur) prime
sur le méta. Phases 2/3 GELÉES jusqu'à CT-4.

1. CT-1 [✅ FAIT 2026-07-03, commit 05ca0b4 poussé] — llm-lego/ + studio_brain/
   versionnés. LFS s'est révélé inutile (112 Mo = node_modules ignoré ; vrai ajout
   1,6 Mo texte). Screenshots gitignorés (repo lean) sur décision Pierre.
2. CT-2 [SUIVANT] — via superpowers:writing-plans : suite de non-régression
   moteur (perft + anti-shuffle depuis startpos + tie-break + amorce EPD).
   Premier usage réel de Superpowers. Zone tests/ protégée → gate Pierre.
3. Phase 2 (Graphify) / Phase 3 (Obsidian) : GELÉES jusqu'à CT-4 (réconciliation
   mémoire : 1 système canonique = memory/MEMORY.md, corriger CLAUDE.md
   contradictoire). Sinon Obsidian = 4ᵉ référent mémoire.

Note : CT-3 (tree clean gitignore rapports auto) = DÉJÀ FAIT hier (027de2a).

## Impasses connues
- INCOHÉRENCE Belote (labo de méthode, relevée 2026-07-05) : le modèle mental « 3 implémentations
  Belote » (Claude / Qwen-généraliste cassé / Qwen-Coder fonctionnel du 1er coup) est FAUX.
  Réalité disque : **2 dossiers** dans llm-lego/experiments/ — `belote-claude/` (complet, 6 modules
  + CLI, 440 LOC, jouable et prouvé : 30/30 tests + real-play 576 coups 0 violation) et
  `belote-qwen/` qui EST déjà la version Qwen2.5-**Coder** (pilot.mjs → qwen2.5-coder-14b), PAS une
  « généraliste ». Cette version coder est **incomplète** (3 modules cards/deal/rules, ni scoring
  ni bidding ni game ni CLI → non jouable) et `rules.mjs` **crashe à l'import** (`import {cards}`
  inexistant + modèle FR/EN incohérent). Elle a pris 3+3 itérations (son propre JOURNAL) → ni
  « 1er coup » ni « jamais corrigé ». Aucun 3ᵉ dossier « généraliste » n'existe. Non commité.
  Détail + preuves : llm-lego/experiments/COMPARATIF_BELOTE.md.
- start_studio.sh (bash) : networking WSL↔Windows cassé pour détection cockpit
  → utiliser start_studio.ps1 (PowerShell) qui fonctionne
- train.py : NE PAS relancer avant IMP-163 (dataset) + IMP-184 (deploy gate)
- Boucle autonome : NE PAS armer avant IMP-184 fermé
- LEDGER : à lab/chains/, PAS à la racine
- Graphify : graphe graphify-out/ daté du 30 juin, périmé, non branché (rebuild manuel)
- Obsidian studio_brain/ : pas de MCP connecté ; mémoire auto réelle = dossier
  memory/ séparé (deux systèmes distincts)

## Rappels doctrine
- Une variable à la fois
- Fondations avant features
- Aucun commit sans approbation explicite Pierre
