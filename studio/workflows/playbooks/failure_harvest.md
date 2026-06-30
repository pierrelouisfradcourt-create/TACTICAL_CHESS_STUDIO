# Failure Harvest playbook — chaque erreur devient une règle permanente (IMP-224)

oracle_type: structure | claim_verdict: NO_CLAIM_ALLOWED

> Une erreur subie deux fois est une erreur de processus, pas de malchance.
> Ce playbook transforme une erreur récurrente en protection permanente.

## Pipeline

```
erreur  ->  cause  ->  règle  ->  workflow  ->  protection permanente
```

| Étape | Question | Sortie |
|---|---|---|
| **erreur** | Qu'est-ce qui a cassé, mot pour mot ? | Texte d'erreur brut → `error_journal` |
| **cause** | Pourquoi (cause racine, pas symptôme) ? | 1 phrase de diagnostic |
| **règle** | Quelle règle l'aurait empêchée ? | 1 invariant testable |
| **workflow** | Où vit la règle pour être ré-appliquée ? | Entrée dans `checklists/` ou `policies/` |
| **protection permanente** | Comment garantir qu'on ne la subit plus ? | Item `- [ ]` automatisé + (si possible) `KnownPattern` dans `error_journal` |

## Branchement sur error_journal (mécanique exacte)

Le harvest n'est pas manuel pour les erreurs récurrentes : il est piloté par
`governance/error_journal.py`.

### Où lit-on les occurrences ?
- Journal append-only : `lab/reports/error_journal.jsonl`.
  Chaque ligne = `{ts, signature, matched, excerpt, hmac}`. La `signature`
  (hex 16) normalise la CLASSE d'erreur (nombres/hex génériques → dédup voulue).
- Comptage : `error_journal._count_signature(journal, sig)` compte les lignes
  partageant la même `signature`.

### Quel format / quel seuil ?
- Seuil d'escalade : **`ESCALATE_THRESHOLD = 3`**. Au 3e passage d'une signature
  déjà proposée, `record_error` émet **une** entrée d'escalade (idempotente par
  signature, garde `_is_escalated`).
- Format de l'entrée d'escalade (dans `lab/reports/error_proposals.jsonl`) :
  ```json
  {"proposal_id": "PROP-<sig>", "status": "PROPOSED", "escalated": true,
   "occurrences": <n>, "title": "[auto-escalated xN] erreur recurrente: ...",
   "error_signature": "<sig>", "lane": "AUDIT_REQUIRED", "oracle_type": "code"}
  ```
- Invariants durs (RED TEAM C1) : `lane = AUDIT_REQUIRED` (jamais SAFE_AUTO →
  jamais auto-pické par l'autoloop), `closed = false`, JAMAIS de mutation du
  ledger réel `IMPROVEMENT_LEDGER.yaml`. Une erreur ≥ 3 occurrences génère donc
  une PROPOSITION, pas un IMP autonome.

### Quelle checklist reçoit l'entrée ?
- L'entrée d'escalade `AUDIT_REQUIRED` est l'entrée de file d'attente du harvest.
  À la ratification humaine (Pierre), on transcrit la règle dérivée en item
  `- [ ]` permanent dans la checklist du domaine concerné, sous `checklists/` :
  - erreur moteur / audit Rocky → `checklists/rocky_audit.md`
  - erreur de processus transverse → nouvelle checklist `checklists/<domaine>.md`
  - règle de gouvernance dure → `policies/`
- Protection définitive (si l'erreur a un pattern stable) : ajouter un
  `KnownPattern` à `error_journal.KNOWN_PATTERNS` → l'erreur devient « connue »,
  le fix est rappelé automatiquement et plus aucune proposition n'est émise.

## Procédure manuelle (étapes)

1. **Capturer** l'erreur : `python governance/error_journal.py "<texte erreur>"`
   (journal défaut `lab/reports/error_journal.jsonl`, proposals
   `lab/reports/error_proposals.jsonl`).
2. **Relire** la sortie : `KNOWN` (fix rappelé) | `PROPOSED` (1re fois) |
   `DUPLICATE` | escalade (≥ 3).
3. **Sur escalade** : ouvrir l'entrée `error_proposals.jsonl`, diagnostiquer la
   cause racine, formuler la règle.
4. **Ancrer** la règle : item `- [ ]` dans la bonne checklist + (si pattern
   stable) `KnownPattern` dans `error_journal`.
5. **Gate Pierre** pour toute promotion en IMP ledger réel (lane décide).

## Posture
- evidence_verdict: MECHANICAL_VALIDATION_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
- Aucune mutation du ledger réel par ce pipeline — uniquement des propositions
  AUDIT_REQUIRED ratifiées par un humain.
