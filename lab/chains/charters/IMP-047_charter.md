```markdown
# IMP-047: Architecture dual-model brain/router dans autopilot.py

## Objectifs
Améliorer l'architecture du système d'autopilote en implémentant une architecture dual-model pour le cerveau et la routeur. Cette amélioration vise à augmenter la fiabilité, l'efficacité et la robustesse du système.

## Contraintes

- Aucun accès git write.
- Tests obligatoires (pytest ou py_compile).
- Rapport final avec les verdicts suivants: software_verdict / evidence_verdict / claim_verdict = NO_CLAIM_ALLOWED.
- Compatible avec Windows PowerShell.
- Utilisation de markers ASCII [OK] [!] [X].

## Étapes

1. **Analyse et conception**
   - Comprendre le fonctionnement actuel du système autopilot.py.
   - Concevoir une architecture dual-model pour séparer les fonctions cerveau et routeur.

2. **Implémentation**
   - Implémenter la nouvelle architecture dans autopilot.py sans modifier d'autres fichiers autorisés.
   - Assurer que l'implémentation respecte les contraintes de sécurité et de performance.

3. **Tests unitaires**
   - Écrire des tests pytest pour vérifier le bon fonctionnement du système avec l'architecture dual-model.
   - Utiliser py_compile pour s'assurer que tous les fichiers Python sont valides.

4. **Validation**
   - Exécuter les tests et corriger tout problème détecté.
   - Assurer la compatibilité avec Windows PowerShell.

5. **Rapport final**
   - Préparer un rapport détaillant l'amélioration apportée, y compris le code modifié et les résultats des tests.
   - Inclure les verdicts software_verdict / evidence_verdict / claim_verdict = NO_CLAIM_ALLOWED.

## Verdicts

- **software_verdict**: NO_CLAIM_ALLOWED
- **evidence_verdict**: NO_CLAIM_ALLOWED
- **claim_verdict**: NO_CLAIM_ALLOWED

## Markers ASCII

- [OK] : Étape réussie.
- [!] : Attention, problème potentiel.
- [X] : Échec.

## Notes

Contexte sessions récentes:
  - 20260602_011304 chain=kaizen_autoloop verdict=?
  - 20260602_011644 chain=kaizen_autoloop verdict=?
  - 20260603_182744 chain=kaizen_autoloop verdict=?

```