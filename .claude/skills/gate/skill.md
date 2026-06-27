---
name: gate
description: HumanGate — ratifier ou rejeter une décision (oracle vert + HMAC + sign-off Pierre), puis consigner le verdict daté dans DREAMS.md.
---

# /gate

Le point de souveraineté. Un verdict signé (`/verdict`) n'est qu'une *éligibilité* ; `/gate` est l'acte où **Pierre** ratifie ou rejette, et où la décision devient mémoire institutionnelle dans `DREAMS.md`.

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
| **MERGE** | La décision est adoptée → consignée `RATIFIÉ` dans DREAMS.md |
| **REJECT** | La décision est refusée → consignée `REJETÉ` + raison |
| **FREEZE** | Mise en attente (info manquante, fog) → consignée `GELÉ` + ce qui débloque |

Aucune valeur par défaut. Pas de réponse de Pierre = pas de gate franchie.

---

## Phase 3 — Consigner dans DREAMS.md

Cible : `studio/openclaw-workspace/DREAMS.md` (à côté de `MEMORY.md`). **Créer le fichier s'il est absent** avec cet en-tête :

```markdown
# DREAMS.md — Journal des décisions ratifiées (HumanGate)

Mémoire institutionnelle des gates franchies. Append-only, daté.
Une ligne = une décision tranchée par Pierre. Ne jamais réécrire l'historique.
claim_posture: NO_CLAIM_ALLOWED
```

Puis **ajouter** (append, jamais réécrire) une entrée datée :

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
→ DREAMS.md : entrée <date> ajoutée
→ <action de suivi : merge effectif / rollback / attente>
```

Le merge git effectif (si MERGE) reste une action séparée et explicite — `/gate` consigne la ratification, il ne pousse jamais.

---

## Hard rules

- **Pierre décide**, jamais Claude. Pas de sign-off Pierre = pas de gate.
- DREAMS.md est **append-only** : on n'efface ni ne réécrit une décision passée. Une erreur se corrige par une nouvelle entrée datée.
- Pré-conditions MERGE non remplies (oracle rouge, HMAC KO, zone FORBIDDEN touchée) → MERGE indisponible, point.
- Jamais de `git commit`/`push` depuis `/gate` — la ratification est consignée, l'action git est séparée et explicite.
- `IMPROVEMENT_LEDGER.yaml` n'est pas édité à la main ici (passe par `kaizen_loop.py`).

## Cas d'erreur

| Situation | Action |
|---|---|
| `DREAMS.md` absent | Le créer avec l'en-tête, puis append |
| Pas de réponse Pierre | Gate non franchie — rien n'est consigné, on attend |
| Oracle `FAIL`/HMAC KO mais MERGE demandé | Refuser : signaler le bloqueur, proposer REJECT/FREEZE |
| Fichier FORBIDDEN dans le diff | Bloqueur dur — gate impossible, escalader |
| Conflit d'écriture DREAMS.md | Append en fin de fichier, ne jamais fusionner/réordonner |
