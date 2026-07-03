# Contexte courant TCS
Dernière session : 2026-07-03

## En cours
- Intégration Superpowers + Graphify + Obsidian + frontend-design (plan 5 phases)
- Phase 0 : ✅ PASS conditionnel — commit `.claude/` infra fait (9263d49).
  Working tree PAS littéralement clean : ~85 entrées restantes = rapports
  auto-générés (lab/reports/*, studio_state.json, events.jsonl) + docs non
  commités + 1 dossier parasite. Aucun WIP code risqué. Cause racine du
  "tree jamais clean" = rapports auto pas encore dans .gitignore (chantier séparé).
- Phase 1 (Superpowers install) : pas commencée

## Décisions récentes (ratifiées HumanGate)
- Option A : .claude/ (skills, agents, rules) versionné dans Git — FAIT
- CLAUDE.md racine = point d'entrée mémoire (tier-1)
- studio_brain/00_CURRENT_CONTEXT.md = état vivant inter-sessions

## Prochaine étape
- Phase 1 : git clone https://github.com/obra/superpowers.git → infra/superpowers
- Puis enregistrer comme plugin Claude Code, tester /superpowers:help
- (Optionnel avant/après) gitignore des rapports auto pour un vrai tree clean

## Impasses connues
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
