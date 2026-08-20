---
name: council
description: Délégation parallèle Gemini+Qwen sur IMPs AUDIT_REQUIRED. Synthèse du verdict, escalade Pierre si désaccord.
---

# /council <IMP-ID>

Soumet un IMP `lane: AUDIT_REQUIRED` à une revue multi-modèles en parallèle avant gate Pierre.

---

## Pré-conditions

- `lane: AUDIT_REQUIRED` — sinon stopper : "IMP-ID ne requiert pas de council"
- `status: OPEN` — sinon stopper
- `blocked_by: []` — sinon lister les bloqueurs

---

## Phase 1 — Brief du council

Lire l'IMP dans `lab/chains/IMPROVEMENT_LEDGER.yaml`. Construire le brief :

```
COUNCIL — IMP-ID : <titre>
Objectif  : <objective>
Fichiers  : <files>
Acceptance: <acceptance>
Risques   : <à évaluer par le council>
Question  : Approuver AUDIT_REQUIRED → SAFE_AUTO ? Ou escalader Pierre ?
```

---

## Phase 2 — Délégation parallèle

Soumettre le brief **simultanément** à :

| Modèle | Rôle | Via |
|---|---|---|
| Gemini (conseil externe) | Revue architecture + sécurité | claude_proxy ou direct |
| Qwen 2.5-Coder-14b | Revue implémentation + faisabilité | LM Studio port 1234 |

Chaque modèle répond indépendamment :
- `APPROUVE` — IMP peut passer SAFE_AUTO
- `BLOQUE` — raison + condition de déblocage
- `ESCALADE` — décision Pierre requise

---

## Phase 3 — Synthèse

```
COUNCIL — verdict IMP-ID
─────────────────────────────────────────────
Gemini  : <APPROUVE|BLOQUE|ESCALADE> — <raison courte>
Qwen    : <APPROUVE|BLOQUE|ESCALADE> — <raison courte>
─────────────────────────────────────────────
Synthèse : <voir tableau ci-dessous>
```

| Gemini | Qwen | Action |
|---|---|---|
| APPROUVE | APPROUVE | Proposer à Pierre : passer IMP en SAFE_AUTO |
| APPROUVE | BLOQUE | Escalader Pierre avec les deux avis |
| BLOQUE | APPROUVE | Escalader Pierre avec les deux avis |
| BLOQUE | BLOQUE | Marquer bloqueur, rapporter à Pierre |
| ESCALADE (l'un ou l'autre) | — | Escalader Pierre obligatoirement |

---

## Phase 4 — Gate Pierre

Présenter la synthèse à Pierre. Options :

- **Passer SAFE_AUTO** : modifier le ledger `lane: SAFE_AUTO` après go explicite
- **Garder AUDIT_REQUIRED** : ajouter une note de council dans le champ `notes:` du ledger
- **Bloquer** : `blocked_by: [council-<date>]` dans le ledger

---

## Hard rules

- Ne jamais changer la `lane` sans go explicite Pierre.
- Ne jamais merger après council — oracle vert + sign-off Pierre restent requis.
- Un seul council actif par IMP à la fois.
