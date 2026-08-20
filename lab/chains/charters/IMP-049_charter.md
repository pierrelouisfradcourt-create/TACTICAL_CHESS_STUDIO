```markdown
# IMP-049: Cablage state_updater.py dans autopilot.py — appel auto apres close_imp et run_chain

## Objectifs
- Améliorer l'intégration de `state_updater.py` dans `autopilot.py`.
- Assurer que les appels automatiques se produisent après la fermeture du processus et l'exécution de la chaîne.

## Contraintes
- Aucun accès git write.
- Tests obligatoires (pytest ou py_compile).
- Rapport final avec `software_verdict`, `evidence_verdict` et `claim_verdict`: NO_CLAIM_ALLOWED.
- Compatible Windows PowerShell.
- Utilisation de markers ASCII [OK] [!] [X].

## Étapes

1. **Analyse du code existant**
   - Examinez le fichier `autopilot.py` pour comprendre comment il interagit avec `state_updater.py`.
   - Identifiez les points d'intégration nécessaires.

2. **Modification du code**
   - Assurez-vous que l'appel automatique se produit après la fermeture du processus et l'exécution de la chaîne.
   - Ajoutez des tests unitaires pour vérifier le bon fonctionnement de cette intégration.

3. **Tests**
   - Utilisez pytest ou py_compile pour exécuter les tests.
   - Assurez-vous que tous les tests passent avec succès.

4. **Rapport final**
   - Documentez les modifications apportées et les résultats des tests.
   - Incluez `software_verdict`, `evidence_verdict` et `claim_verdict`: NO_CLAIM_ALLOWED.

## Validation
- [ ] Analyse du code existant effectuée.
- [ ] Modification du code effectuée.
- [ ] Tests exécutés avec succès.
- [ ] Rapport final rédigé et soumis.

## Notes
- Aucun fichier autorisé pour cette amélioration.
- Acceptance: TBD

---
```