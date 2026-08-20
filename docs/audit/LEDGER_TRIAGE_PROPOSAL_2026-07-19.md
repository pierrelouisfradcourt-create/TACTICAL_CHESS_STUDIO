# Re-triage du ledger — proposition 2026-07-19 (révision v2 après retour Pierre)

- **Statut : PROPOSITION v2 — AUCUNE ÉCRITURE EFFECTUÉE dans le ledger.** Exécution uniquement sur go explicite Pierre.
- v1 (même jour) : triage 42 → 27 FROZEN / 1 REJECTED / 14 KEEP, pensé pour préserver la machinerie kaizen/autoloop.
- **Retour Pierre (2026-07-19, verbatim)** : « je travaille plus que depuis ici maintenant en te demandant de déléguer, j'utilise plus les chaînes de kaizen et l'autoloop, le studioV2 je sais pas si ça vaut la peine ».

## Ce que ce retour change (analyse)

Le workflow réel du studio est devenu : **Pierre ↔ orchestrateur (sessions ici) ↔ délégation sous contrat + oracles + gates**. Les consommateurs de la machinerie ledger/kaizen sont tous dans le périmètre gelé ou dormant : autopilot/ceo-endpoints (lane STUDIO gelée), autoloop/tick (plus invoqués), council (dormant), cockpit. Le suivi VIVANT est ailleurs : `studio_brain/00_CURRENT_CONTEXT.md` (handoff), enregistrements HumanGate, `lab/forge_runs/` (preuves), tasks de session.

**Avis sur studioV2 : non, ça ne vaut plus la peine d'y investir.** La lane est déjà gelée (ratifié 2026-07-19) ; le workflow actuel offre de meilleures garanties (contrats, oracles signés, gates) que la boucle LM-Studio d'autopilot. Recommandation : rester au gel (coût zéro), garder IMP-133 (archivage) en FROZEN comme option de rangement un jour — pas une session à dépenser maintenant.

## Proposition v2

1. **Geler la couche kaizen/autoloop en bloc**, même régime que la lane STUDIO : lire OK, écrire = gate. Le ledger devient **archive vivante** : consulté comme historique, alimenté seulement par (a) propositions Forge ratifiées via `studio_link` (propose-only, mécanisme déjà en place), (b) demande directe de Pierre.
2. **Triage simplifié : 42 OPEN → 37 FROZEN · 1 REJECTED · 4 KEEP.**
3. La précondition IMP-253 de la v1 **tombe** : elle ne servait qu'à rendre FROZEN/REJECTED visibles dans `kaizen recall/metrics` — plus personne ne pilote par ces vues ; la source de vérité est le YAML lui-même.

### Les 4 vivants (KEEP)

| IMP | Titre court | Pourquoi vivant |
|---|---|---|
| 240 | Hooks git → Node | protège le workflow ACTUEL (incident stop-hook WSL réel) |
| 241 | Hooks PreToolUse edit-time | doctrine « garde centrale » issue de l'audit déclaré≠exécuté |
| 248 | Seed invalide uint32 (Belote) | ligne produit active — probablement traité dans la session Render Belote |
| 251 | Tests seed/uint32 (Belote) | idem |

(Aucun des 4 n'est urgent ; 248/251 appartiennent de fait à la session Belote.)

### Reclassés v1 → v2 (10 IMP de KEEP → FROZEN, avec motif)

| IMP | Motif du gel v2 |
|---|---|
| 253, 259, 257, 247, 229 | outillage kaizen/ledger — la machinerie qu'ils amélioraient n'est plus le workflow |
| 239, 187 | couche CI/push automatisée — la vérité passe par les oracles en session ; le flag menteur d'IMP-187 (note « FORBIDDEN » vs lane SAFE_AUTO, vérifiée l.4052-4054) est neutralisé par le gel même |
| 258, 261 | outillage council/board — dormant dans le workflow actuel |
| 213 | absorbé par S13_RELEASE_PROPOSAL (ratifiée dans le principe, différée playtests) |

### Lots inchangés depuis la v1

- **Lot A — gel Rocky (11)** : 057, 137, 163, 161, 162, 216, 219, 220, 230, 231, 232.
- **Lot B — gel STUDIO (3)** : 133, 215, 242.
- **Lot C — superseded doctrine vivante (9)** : 211, 223, 225, 226, 227, 243, 244, 245, 246.
- **Lot D — hors lignes produit (4)** : 141, 254, 255, 260.
- **REJECTED (1)** : 169 (sa propre note le dit WONTFIX candidat).

Contrôle : 11+3+9+4+10 = 37 FROZEN · 1 REJECTED · 4 KEEP = 42 ✓.

## Amendement CLAUDE.md proposé (propose-only, non appliqué)

Si Pierre ratifie le gel en bloc, deux retouches de doctrine à faire sur go :
1. Section « Mémoire persistante » : « Si un IMP a été touché → entrée ledger » devient « Ledger = archive vivante ; nouvelles entrées uniquement via proposition Forge ratifiée ou demande Pierre ».
2. Table de routing : marquer `/autoloop`, `/tick`, `/sprint-plan`, `/sprint-status`, `/imp-readiness`, `/council` comme legacy-gelés (invocables sur demande explicite seulement).

## Exécution v2 (sur go, un seul passage)

Lots A→D + reclassés v2 en un batch via `kaizen_loop.py` (outil préféré par CLAUDE.md — aucun nouvel outillage requis), REJECTED 169, puis note croisée 213 ↔ S13. Aucune suppression : tout FROZEN est réversible.

---
software_verdict : s'appliquera à l'exécution, pas à ce document.
evidence_verdict : MECHANICAL_VALIDATION_ONLY (comptages v1 re-vérifiés sur le YAML ; retour Pierre cité verbatim)
claim_verdict : NO_CLAIM_ALLOWED
