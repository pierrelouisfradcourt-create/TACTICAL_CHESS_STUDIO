# IMP-G8 — ml/move_vocab.py + train_player.py + dataset_loader.py : vocab hash

## Contexte
Lane C — ml/ Python — SAFE_AUTO

## Problème identifié
`vocab_fingerprint()` existait dans move_vocab.py mais n'était jamais :
1. Exposé comme constante module-level (recalculé à chaque appel)
2. Comparé contre les données dans dataset_loader.py (champ présent mais jamais validé)
3. Loggué au démarrage de train_player.py (drift silencieux possible)

## Patches appliqués

### move_vocab.py
- Ajout `VOCAB_FINGERPRINT: str = vocab_fingerprint()` après la définition de la fonction
- Calculé une seule fois au chargement du module
- Fingerprint stable : `690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c`

### dataset_loader.py
- Import `VOCAB_FINGERPRINT` depuis move_vocab
- Ajout `validate_vocab_fingerprint(expected: str) -> None` — raise ValueError si mismatch
- Ajout `check_row_vocab_fingerprint(row: dict) -> None` — validation par row (si champ présent)

### train_player.py
- Import `VOCAB_FINGERPRINT` depuis move_vocab
- `print(f"vocab_fingerprint={VOCAB_FINGERPRINT}")` en tête de `train()` — tracé dans logs

## Erreurs évitées
- Ne pas forcer la validation sur toutes les rows (les datasets legacy sans le champ
  `move_vocab_fingerprint` sont préservés — check_row_vocab_fingerprint est permissif)
- Ne pas bloquer le training si le champ est absent (backward compatible)
- Ne pas toucher `validate_am_dataset_admission` (passif par design)

## Validation Python
```
vocab_size=4164 fingerprint=690ce94afd536cba...
validate_vocab_fingerprint(VOCAB_FINGERPRINT) → OK (self-check)
check_row_vocab_fingerprint({}) → no-op (champ absent)
```

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
