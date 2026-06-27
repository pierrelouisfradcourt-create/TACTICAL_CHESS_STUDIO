---
name: sprint-status
description: Snapshot read-only des IMPs en cours — lecture du ledger, aucun write, aucune mutation.
---

# /sprint-status

Produit un instantané **read-only** de l'état du sprint à partir du ledger canonique. Aucune écriture, aucune mutation, aucun appel LLM : ce skill lit, agrège et affiche. C'est le pendant lecture de `/sprint-plan` (qui, lui, planifie).

> Règles absolues (CLAUDE.md) : `claim_verdict: NO_CLAIM_ALLOWED`, séparer `software_verdict` / `evidence_verdict` / `claim_verdict`. Ne jamais modifier `IMPROVEMENT_LEDGER.yaml` ici — lecture seule stricte.

---

## Source unique

```
lab/chains/IMPROVEMENT_LEDGER.yaml
```

Champs lus : `id`, `status`, `lane`, `blocked_by`, `files`, `acceptance`. Aucun autre fichier n'est écrit ou touché.

---

## Procédure

1. **Lire** le ledger (read-only). Si illisible/absent → `software_verdict: BLOCKED`, stop.
2. **Agréger** les compteurs par `status` : OPEN / CLOSED / FAIL / total.
3. **Filtrer** les IMPs « en cours » = `status` ∈ {OPEN, IN_PROGRESS}.
4. **Trier** les IMPs en cours : BLOCKED (dépendance non CLOSED) en tête, puis par lane (SAFE_AUTO → AUDIT_REQUIRED → HUMAN_REQUIRED → FORBIDDEN).
5. **Marquer** pour chaque IMP en cours :
   - `blocked_by` non vide avec un IMP non CLOSED → ⛔ bloqué
   - lane `HUMAN_REQUIRED` / `FORBIDDEN` → 🔒 non auto-pickable
   - `acceptance` absent ou contenant `TBD` → ⚠ acceptance à préciser
6. **Afficher** le tableau. Ne rien modifier.

```
# Lecture rapide (PowerShell) — read-only
Select-String -Path lab/chains/IMPROVEMENT_LEDGER.yaml -Pattern "status: OPEN" -Context 0,4
```

---

## Format de sortie obligatoire

```
SPRINT-STATUS — snapshot read-only (<timestamp ISO>)
──────────────────────────────────────────────
Ledger : CLOSED <n> / OPEN <n> / FAIL <n> / total <n>
──────────────────────────────────────────────
IMPs en cours (<n>) :
  IMP-XXX  <lane>           <flags>   <résumé court>
  IMP-YYY  <lane>           <flags>   <résumé court>
  …
──────────────────────────────────────────────
Bloqués : <n>   |   Auto-pickables (SAFE_AUTO/AUDIT_REQUIRED, non bloqués) : <n>
──────────────────────────────────────────────
software_verdict  : OK | BLOCKED
evidence_verdict  : MECHANICAL_VALIDATION_ONLY
claim_verdict     : NO_CLAIM_ALLOWED
```

Légende flags : ⛔ bloqué · 🔒 non auto-pickable · ⚠ acceptance à préciser.

- `software_verdict: OK` = ledger lu et agrégé mécaniquement.
- `software_verdict: BLOCKED` = ledger illisible/absent, snapshot impossible.
- `software_verdict: FAIL` = ne pas utiliser ici (réservé à l'exécution de code).

---

## Hard rules

- **Read-only absolu** : ce skill n'écrit jamais, ne ferme aucun IMP, ne modifie pas le ledger.
- Pour planifier/sélectionner un sprint → `/sprint-plan`. Pour valider un IMP avant pickup → `/imp-readiness`.
- Ne jamais inventer un statut : si un IMP n'a pas de champ `status`, le compter « inconnu » et le signaler, pas le supposer.
- `claim_verdict: NO_CLAIM_ALLOWED` en toute circonstance.
