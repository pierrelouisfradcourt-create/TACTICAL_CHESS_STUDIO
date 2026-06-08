# IMP-G6 — search.rs : 4 patches séquentiels

## Contexte
Lane D — src/chess/search.rs — AUDIT_REQUIRED

## Patches appliqués (ordre strict, cargo test entre chaque)

### Patch 1 : Suppression imports inutilisés
- Retiré `piece_value` de l'import `crate::chess::eval` (ligne 3)
- Retiré `root_decision_breakdown` de l'import `crate::chess::root_decision` (ligne 12)
- cargo test Patch 1 : 6 passed, 1 failed (pré-existant)

### Patch 2 : Suppression re-export inutilisé
- Ligne 112 : `pub use crate::chess::decision::{choose_best_action, choose_best_action_for_mode};`
  → `pub use crate::chess::decision::choose_best_action;`
- cargo test Patch 2 : 6 passed, 1 failed (pré-existant)

### Patch 3 : Variable non utilisée `context` → `_context`
- Signature de `fn search_root_in_place()` : `context:` → `_context:`
- La variable est reçue mais jamais lue dans le corps de la fonction
- cargo test Patch 3 : 6 passed, 1 failed (pré-existant)

### Patch 4 : Suppression écriture morte `prev_score = mate_search_score`
- Ligne 334 : `prev_score = mate_search_score;` supprimée
- La fonction retourne immédiatement après cette ligne (`return Some(RootSearchResult { ... })`)
  donc l'assignation n'est jamais lue
- cargo test Patch 4 : 6 passed, 1 failed (pré-existant) ✓

## Erreurs évitées
- Chaque patch est atomique : un seul changement sémantique
- Ne pas toucher la logique aspiration window ni le calcul des scores
- Ne pas supprimer `root_practical_margin` (utilisé dans la même importation)
- `prev_score` correctement mise à jour aux lignes 295 et 375 (ces deux usages sont CONSERVÉS)

## Notes importantes
- Toutes les 4 warnings pré-IMP avaient un caractère cosmétique (dead code, pas de bug)
- Aucune modification du comportement de jeu

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
