```markdown
# IMP-060: Champ domain dans le ledger — rocky_moteur/ia_apprentissage/studio/jeux pour routing CEO Brief

## General Information
**ID:** IMP-060  
**Titre:** Champ domain dans le ledger  
**Lane:** SAFE_AUTO  
**Fichiers autorises:** []  
**Acceptance:** TBD  

## Contexte
### Sessions recentes:
  - **20260604_151401** chain=kaizen_autoloop verdict=?  
  - **20260604_161708** chain=kaizen_autoloop verdict=?  
  - **20260604_174413** chain=kaizen_autoloop verdict=?  

## Objectifs
- Ajouter un champ `domain` dans le ledger pour faciliter le routing des requêtes CEO Brief.
- Assurer la compatibilité avec Windows PowerShell.

## Contraintes Techniques
- Aucun accès git write autorisé.
- Tests obligatoires (pytest ou py_compile).
- Rapport final doit inclure les sections `software_verdict`, `evidence_verdict` et `claim_verdict`: NO_CLAIM_ALLOWED.

## Etapes de travail

1. **Analyse**
   - Comprendre le besoin d'un champ `domain` dans le ledger.
   - Identifier où ce champ sera utilisé pour le routing des requêtes CEO Brief.

2. **Développement**
   - Ajouter un nouveau champ `domain` au modèle du ledger.
   - Mettre à jour les scripts de lecture/écriture pour inclure ce nouveau champ.
   - Assurer la compatibilité avec Windows PowerShell.

3. **Tests**
   - Écrire des tests unitaires (pytest) pour vérifier le bon fonctionnement du nouveau champ `domain`.
   - Utiliser py_compile pour s'assurer que les scripts sont exécutables sans erreur sous Windows PowerShell.
   
4. **Validation**
   - Exécuter tous les tests écrits et corriger les erreurs si nécessaire.
   - Valider manuellement quelques cas d'utilisation pour confirmer le bon fonctionnement du nouveau champ.

5. **Documentation**
   - Mettre à jour la documentation technique concernant l'ajout du champ `domain`.
   - Ajouter des exemples de scripts PowerShell pour illustrer son utilisation.

## Validation

### Tests
- [ ] Test unitaires passés avec succès.
- [ ] Scripts exécutables sans erreur sous Windows PowerShell.

### Rapport Final
```markdown
# Rapport Final IMP-060

## Software Verdict
[OK] Le nouveau champ `domain` a été ajouté et fonctionne correctement dans le ledger.

## Evidence Verdict
[!] Vérifier manuellement quelques cas d'utilisation pour confirmer la validité des tests automatiques.

## Claim Verdict
[X] NO_CLAIM_ALLOWED

```
```