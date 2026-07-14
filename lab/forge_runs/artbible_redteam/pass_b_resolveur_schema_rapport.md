Après avoir analysé le contrat et l'oracle mécanique, voici les résultats de mon attaque :

### Liste des failles identifiées

1. **Angle : Contraintes non vérifiées**
   - **Faille** : Le résolveur `asset_request.mjs` ne vérifie pas si la taille maximale (`max_size_kb`) est respectée pour les entrées du catalogue qui n'ont pas de valeur définie pour `size_kb`. Si une entrée du catalogue a un champ `size_kb` absent, elle peut passer le filtre malgré une contrainte `max_size_kb`.
   - **Correction proposée** : Ajouter une vérification supplémentaire dans la fonction `passesConstraints()` pour s'assurer que si `constraints.max_size_kb` est défini et non nul, alors `entry.size_kb` doit être défini et inférieur ou égal à `constraints.max_size_kb`. Si `entry.size_kb` est absent, le résolveur devrait considérer l'entrée comme non conforme.

2. **Angle : Acceptance_tests mal implémentés**
   - **Faille** : La fonction `runOneCheck()` pour le check `usage_referenced` ne vérifie pas correctement si les entrées du catalogue ont des exemples d'utilisation valides (`entry.usage_examples`). Elle retourne `true` même si l'entrée est dans un tier non validé et n'a pas d'exemples d'utilisation.
   - **Correction proposée** : Modifier la fonction `runOneCheck()` pour le check `usage_referenced` afin de vérifier que `entry.tier === 'validated'` ET `Array.isArray(entry.usage_examples) && entry.usage_examples.length > 0`. Si l'une des conditions n'est pas satisfaite, retourner un verdict `FAIL`.

### Verdict final
**GO-si-corrigé**

Les corrections proposées permettraient de fermer les angles morts identifiés et d'améliorer la robustesse du résolveur `asset_request.mjs`.