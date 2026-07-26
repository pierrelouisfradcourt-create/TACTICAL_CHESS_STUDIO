# RUN_INDEX — suivi des runs Forge

Créé le 2026-07-26 (pré-run Troisième Cerveau, demande Pierre). **Append-only** : une entrée
par run, jamais réécrite — une correction est une nouvelle ligne datée. Les champs renvoient
aux sources primaires **par référence, jamais par copie** (les chiffres vivent dans les
instruments ; l'index sert à RETROUVER, pas à dupliquer).
`claim_verdict: NO_CLAIM_ALLOWED` — le champ « résultat » cite le verdict signé, il n'en
émet jamais.

## Format d'une entrée

```
## <run_id> — <date>
mission          : <nom + lien doc mission/contrat>
objectif         : <une phrase falsifiable>
décisions liées  : <D-x / entrées decision-log qui autorisent ce run>
instruments      : <ce qui mesure ce run + renvoi table de confiance si instrument suspect>
critères AVANT   : <posés avant le run — ce qui comptera comme succès/échec>
résultat         : <verdict signé + chiffres clés, avec chemins des preuves>
erreurs          : <renvoi error_journal (run_id) — jamais recopiées>
apprentissages   : <renvoi learning_curve / leçon ⚑ / entrée PROPOSED créée>
actions suivantes: <ce que ce run débloque ou bloque>
```

---

## M1-telemetrie-echec — préparé le 2026-07-26 (run NON lancé)
mission          : Télémétrie d'échec — `docs/forge/MISSION_M1_TELEMETRIE_ECHEC.md`
objectif         : rendre les échecs d'étape visibles dans la télémétrie (outcome, coût, modèle réel)
décisions liées  : D2-principe, go-préparation M1 (THIRD_BRAIN_DECISIONS_V1, PROPOSED 2026-07-26)
instruments      : pytest scripts/forge/tests/ (réf. 840 passed, 1 skipped) · forge_telemetry.jsonl (table de confiance §4.2 : ment sur échecs et modèle — c'est l'objet de la mission)
critères AVANT   : (a) un run avec ≥1 échec produit ≥1 ligne `outcome:HALT` ; (b) somme tokens d'un run ≥ valeur pré-patch ; (c) coût-par-succès shmup recalculé > chiffre optimiste actuel ; (d) zéro régression suite pytest ; (e) advisory strict — aucun verdict/gate modifié
résultat         : EN ATTENTE (exécution = validation séparée de Pierre)
erreurs          : —
apprentissages   : —
actions suivantes: après M1 + 1 run réel observé → fixer la valeur D2 → M2 (pool_retry) → M3 (jointure premortem) → exécution D5
