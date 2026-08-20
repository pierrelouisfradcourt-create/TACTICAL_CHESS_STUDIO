```markdown
# IMP-048 Charter

## General Information
**ID:** IMP-048  
**Title:** state_updater.py — MAJ automatique docs studio depuis sources reelles apres chaque session  
**Lane:** SAFE_AUTO  
**Files Allowed:** []  
**Acceptance:** TBD  

## Contexte sessions recentes:
  - **20260602_011644 chain=kaizen_autoloop verdict=?**
  - **20260603_182744 chain=kaizen_autoloop verdict=?**
  - **20260604_131853 chain=kaizen_autoloop verdict=?**

## Requirements
- Aucun git write.
- Tests obligatoires (pytest ou py_compile).
- Rapport final avec software_verdict / evidence_verdict / claim_verdict: NO_CLAIM_ALLOWED.

## Implementation Details

### Fonctionnalités requises:
- MAJ automatique des docs studio depuis les sources réelles après chaque session.
  
### Contraintes techniques:
- Windows PowerShell compatible.
- Markers ASCII [OK] [!] [X], pas d'emoji.

### Tests
- **pytest** ou **py_compile** doivent être utilisés pour assurer la qualité du code et sa compatibilité avec les contraintes spécifiées.

## Validation

### Évaluation:
Le module doit être testé dans un environnement Windows PowerShell pour s'assurer qu'il répond aux exigences sans générer d'erreurs ou de claims non autorisés.

### Rapport final
- **software_verdict:** NO_CLAIM_ALLOWED
- **evidence_verdict:** NO_CLAIM_ALLOWED
- **claim_verdict:** NO_CLAIM_ALLOWED

## Markers
- [OK] pour les tests réussis.
- [!] pour les avertissements ou erreurs mineures.
- [X] pour les échecs majeurs.

```