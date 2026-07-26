---
name: gate
description: HumanGate — ratifier ou rejeter une décision (oracle vert + HMAC + sign-off Pierre), puis consigner le verdict daté dans le decision-log versionné (studio_brain/decisions/decision-log.md). Destination ratifiée D4 2026-07-26 (ex-DREAMS.md legacy).
---

# /gate

Le point de souveraineté. Un verdict signé (`/verdict`) n'est qu'une *éligibilité* ; `/gate` est l'acte où **Pierre** ratifie ou rejette, et où la décision devient mémoire institutionnelle dans le **decision-log versionné du repo** (`studio_brain/decisions/decision-log.md`).

> Doctrine : *HumanGate décide merge/reject/freeze — pas Claude Code* (CLAUDE.md).
> Claude prépare le dossier et écrit la trace ; **Pierre seul tranche**.

---

## Phase 1 — Réunir le dossier

Avant de présenter une gate, rassembler les éléments opposables :

```
GATE — <objet> (IMP-XXX / HGD-xxx)
─────────────────────────────────────────────
oracle           : <PASS|FAIL|BLOCKED>   (<reason>)
HMAC             : <OK|INVALIDE|NON_SIGNÉ>
software_verdict : <OK|FAIL|BLOCKED>
evidence_verdict : <MECHANICAL_VALIDATION_ONLY|UNSIGNED>
claim_verdict    : NO_CLAIM_ALLOWED
fichiers touchés : <liste>
zones FORBIDDEN  : <aucune | LISTE — bloqueur>
─────────────────────────────────────────────
recommandation Claude : <MERGE | REJECT | FREEZE>  (RECOMMANDE uniquement)
```

Pré-conditions **dures** pour proposer un MERGE :

- oracle `PASS` **et** HMAC `OK` (sinon → la gate ne peut proposer que REJECT/FREEZE) ;
- aucun fichier dans `tests/ eval/ oracle/ bench/ puzzles/ .github/` ;
- `claim_verdict: NO_CLAIM_ALLOWED` présent.

Si une pré-condition manque → l'afficher comme bloqueur, ne pas présenter MERGE comme option.

---

## Phase 2 — Décision Pierre

Présenter les trois issues. **Attendre le choix explicite de Pierre** — ne jamais auto-ratifier.

| Décision | Effet |
|---|---|
| **MERGE** | La décision est adoptée → consignée `RATIFIÉ` dans le decision-log |
| **REJECT** | La décision est refusée → consignée `REJETÉ` + raison |
| **FREEZE** | Mise en attente (info manquante, fog) → consignée `GELÉ` + ce qui débloque |

Aucune valeur par défaut. Pas de réponse de Pierre = pas de gate franchie.

---

## Phase 3 — Consigner dans le decision-log versionné

Cible : `studio_brain/decisions/decision-log.md` (décision D4, Pierre 2026-07-26 — l'ancienne cible
`studio/openclaw-workspace/DREAMS.md` est LEGACY : ne plus y écrire ; son historique reste
en lecture). Le decision-log stipule « seul Pierre peut ajouter des entrées » : `/gate`
n'y écrit QUE le choix que Pierre vient de prononcer explicitement en session — le
sign-off Pierre (Phase 2) est la précondition absolue de toute écriture.

**Ajouter** (append, jamais réécrire) une entrée datée :

```markdown
## <date> — <objet> (IMP-XXX / HGD-xxx)
- décision   : RATIFIÉ | REJETÉ | GELÉ
- oracle     : <PASS|FAIL|BLOCKED>  ·  HMAC : <OK|…>
- fichiers   : <liste>
- raison     : <justification Pierre / ce qui débloque si GELÉ>
- ratifié par: Pierre — <date>
```

Encodage `utf-8` explicite. Écriture en append : ne **jamais** écraser une entrée existante.

---

## Sortie

```
GATE <FRANCHIE|REFUSÉE|GELÉE> — <objet>
→ decision-log : entrée <date> ajoutée
→ <action de suivi : merge effectif / rollback / attente>
```

Le merge git effectif (si MERGE) reste une action séparée et explicite — `/gate` consigne la ratification, il ne pousse jamais.

---

## Hard rules

- **Pierre décide**, jamais Claude. Pas de sign-off Pierre = pas de gate.
- Le decision-log est **append-only** : on n'efface ni ne réécrit une décision passée. Une erreur se corrige par une nouvelle entrée datée.
- Pré-conditions MERGE non remplies (oracle rouge, HMAC KO, zone FORBIDDEN touchée) → MERGE indisponible, point.
- Jamais de `git commit`/`push` depuis `/gate` — la ratification est consignée, l'action git est séparée et explicite.
- `IMPROVEMENT_LEDGER.yaml` n'est pas édité à la main ici (passe par `kaizen_loop.py`).

## Cas d'erreur

| Situation | Action |
|---|---|
| decision-log absent | Anomalie (fichier versionné) — STOP, ne rien créer, signaler à Pierre |
| Pas de réponse Pierre | Gate non franchie — rien n'est consigné, on attend |
| Oracle `FAIL`/HMAC KO mais MERGE demandé | Refuser : signaler le bloqueur, proposer REJECT/FREEZE |
| Fichier FORBIDDEN dans le diff | Bloqueur dur — gate impossible, escalader |
| Conflit d'écriture decision-log | Append en fin de fichier, ne jamais fusionner/réordonner |
