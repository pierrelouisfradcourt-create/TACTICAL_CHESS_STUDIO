```markdown
# IMP-087: Audit et dossier chaine prompts idee-to-IMP — carte roles zones-ombre calibration

## Objectifs
- Auditer la chaîne de prompt idée-to-IMP pour identifier les zones d'ombre.
- Cartographier les rôles et responsabilités dans le processus.
- Calibrer les paramètres pour améliorer l'efficacité du système.

## Contraintes
- Aucun accès git write autorisé.
- Tests obligatoires (pytest ou py_compile).
- Rapport final avec software_verdict / evidence_verdict / claim_verdict: NO_CLAIM_ALLOWED.
- Compatible Windows PowerShell.
- Markers ASCII [OK] [!] [X], pas d'emoji.

## Étapes

### 1. Préparation
[!] Vérifier l'environnement de travail pour la compatibilité avec Windows PowerShell.
[X] Installer les outils nécessaires (pytest, py_compile).
[OK] Cloner le dépôt en lecture seule si nécessaire.

### 2. Analyse
[X] Identifier les composants critiques de la chaîne idée-to-IMP.
[X] Cartographier les rôles et responsabilités dans le processus.
[X] Documenter les zones d'ombre identifiées.

### 3. Calibration
[!] Tester les paramètres actuels pour identifier les améliorations potentielles.
[X] Proposer des ajustements basés sur l'analyse précédente.
[X] Implémenter les modifications et tester à nouveau.

### 4. Validation
[X] Exécuter pytest ou py_compile pour valider le code modifié.
[OK] Documenter les résultats des tests.
[X] Préparer un rapport final avec les verdicts appropriés.

## Verdicts
- software_verdict: NO_CLAIM_ALLOWED
- evidence_verdict: NO_CLAIM_ALLOWED
- claim_verdict: NO_CLAIM_ALLOWED

## Notes
- Contexte sessions récentes:
  - 20260604_161708 chain=kaizen_autoloop verdict=?
  - 20260604_174413 chain=kaizen_autoloop verdict=?
  - 20260604_175212 chain=kaizen_autoloop verdict=?

```