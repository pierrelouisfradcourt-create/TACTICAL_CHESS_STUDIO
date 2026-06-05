# CHARTER IMP-082 — Usine Idee->IMP Phase 1 : reparer + unifier
# Lane : SAFE_AUTO
# Fichiers autorises :
#   - autopilot.py
#   - lab/chains/roadmap_to_ledger.py
#   - lab/chains/ROADMAP_PROPOSALS.yaml

## RÈGLES ABSOLUES
- Aucun git write
- Le ledger = file d attente (auto-inject OK). Le HumanGate reste a l execution.
- claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE (audit complet)
Bug central : _stage_proposals() ecrit humangate_verdict: null,
mais roadmap_to_ledger --inject exige APPROVED. Le bouton "Approuver tout"
ne fait rien. 52 proposals bloquees. 3 boutons font la meme chose.
Onglet "Idee->Roadmap" mort (pas de modal inject).

## OBJECTIF — chaine unique idee -> ledger qui marche end-to-end

### Fix 1 — CRITIQUE : reparer l injection
Probleme : pipeline ecrit null, inject exige APPROVED.

Solution : nouveau mode dans roadmap_to_ledger.py
  --inject-staged <session_id>  : injecte les proposals d une session
  donnee sans exiger APPROVED (mode auto-approve pour le flux UI)
  La dedup robuste (match exact + Jaccard) reste active.

Dans approvePipelineAll() / le bouton inject :
  → appeler /api/idea-inject avec le session_id de la run courante
  → backend appelle roadmap_to_ledger.py --inject-staged <session_id>
  → les IMPs de CETTE idee arrivent dans le ledger
  → afficher "N IMPs crees dans le ledger" + bouton "Voir CEO Brief"

### Fix 2 — Unifier les 3 boutons en 1
"-> Demarrer" et "↗ Generer roadmap" (cartes) font exactement
la meme chose (startIdeaPipeline). Et "⚡ Generer via LM Studio"
(onglet roadmap) lance le meme pipeline sans bouton inject.

Solution :
  - Carte Idee (status=backlog) : UN seul bouton "↗ Transformer en IMPs"
    → lance pipeline + modal avec inject fonctionnel
  - "-> Demarrer" supprime OU reaffecte au cycle de statut uniquement
    (backlog->wip->done) avec un label distinct "Changer statut"
  - Onglet "Idee -> Roadmap" : ajouter le meme modal d injection
    que la carte, OU le labelliser "Exploration libre (sans ledger)"

### Fix 3 — Purger les 52 proposals orphelines
Dans ROADMAP_PROPOSALS.yaml : supprimer toutes les proposals
avec humangate_verdict: null qui datent des tests (garder
seulement APPROVED + REJECTED comme historique).
Ajouter dans roadmap_to_ledger.py une commande --purge-stale
qui retire les proposals null plus vieilles que la session courante.

### Fix 4 — Transition idee apres injection
Quand les IMPs d une idee sont injectes avec succes :
  → l idee passe en status "applied" dans ideas.json
  → disparait du backlog (deja partiellement fait via pipeline_done,
    verifier que ca marche avec le nouveau flux)

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py
.venv312\Scripts\python.exe -m py_compile lab/chains/roadmap_to_ledger.py
# Test end-to-end : creer idee -> transformer -> verifier IMP dans le ledger via recall

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
fixes: [inject_staged, unify_boutons, purge_proposals, idea_applied]
