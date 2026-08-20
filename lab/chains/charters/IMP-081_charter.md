# CHARTER IMP-081 — Unifier classement domaine + nettoyer roadmap
# Lane : SAFE_AUTO
# Fichiers autorises : autopilot.py + lab/chains/IMPROVEMENT_LEDGER.yaml

## RÈGLES ABSOLUES
- Aucun git write
- Source de verite unique : champ domain du ledger, jamais vide
- claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE (audit IMP-081)
6 pages roadmap, 1 seule vivante (roadmap-domaine).
3 logiques de classement divergent : _imp_domain (py), _ceo_domain (py copie), loadWorkflow (js brut).
3 IMPs sur 5 mal classes. Cause : domain:'' sur IMPs manuels.
Decision HumanGate : roadmap-domaine = vue canonique, tout le reste s aligne.

## FIXES (ordre audit)

### Fix 1 — IMP-078 domain vide -> studio
Dans IMPROVEMENT_LEDGER.yaml, corriger domain: '' -> domain: studio
pour IMP-078 et tout IMP avec domain vide ou absent.

### Fix 2 — roadmap-ia mort -> redirection
nav('roadmap-ia') produit un ecran noir (page-roadmap-ia inexistant).
Rediriger vers page-roadmap-domaine (activer la bonne div).
Masquer ou repointer le sidebar item "Roadmap IA".

### Fix 3 — Unifier _ceo_domain -> _imp_domain
Supprimer la copie _ceo_domain() (~ligne 5139), appeler _imp_domain().
Une seule logique de classement dans tout le backend.

### Fix 4 — loadWorkflow() JS coherent
Remplacer le groupement JS brut (i.domain === 'x', sans fallback)
par un appel a /api/imp-triage qui utilise _imp_domain().
Le dropdown Workflow et Roadmap domaines montrent alors
EXACTEMENT le meme classement. Plus de groupe "Autres" parasite.

### Fix 5 — Valider domain a la creation
Pipeline idea-to-imp + ajout manuel : rejeter domain:''
-> forcer une des 4 valeurs valides (rocky_moteur|ia_apprentissage|studio|jeux).
Defaut si absent : studio (jamais '').

### Fix 6 — Pages statiques jeux/moteur/design
Les dynamiser : chacune filtre le ledger par son domaine via /api/imp-triage,
sur le modele de roadmap-domaine. Si trop lourd, les rediriger vers
roadmap-domaine. Aucune page statique hardcodee ne doit survivre.

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py
# Verifier : dropdown Workflow et Roadmap domaines classent IMP-078 identiquement (studio)
# Verifier : IMP-008/011 classes pareil dans les deux surfaces

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
fixes: [imp078_domain, roadmap_ia_redirect, unify_ceo_domain, workflow_coherent, validate_domain, static_pages]
