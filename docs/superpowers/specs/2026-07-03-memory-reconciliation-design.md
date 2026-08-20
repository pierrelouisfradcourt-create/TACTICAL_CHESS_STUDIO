# CT-4 — Réconciliation de la mémoire

**Date :** 2026-07-03 · **Source :** session Claude Code, sur go Pierre · **Roadmap :** `docs/audit/ROADMAP_ROI_2026-07.md` §CT-4
**Statut :** design ratifié en conversation (Pierre : « go »)

---

## Problème

Le studio a **six** référents de mémoire/état-session, dont trois morts encore pointés
comme canoniques, plus un `CLAUDE.md` physiquement corrompu. Un agent qui reprend après
une pause ne sait pas quel cerveau charger.

| # | Référent | Statut au 2026-07-03 |
|---|---|---|
| 1 | `memory/` (`~/.claude/.../memory/`) | 🟢 VIVANT — auto-chargé au boot (machine) |
| 2 | `studio_brain/00_CURRENT_CONTEXT.md` | 🟢 VIVANT — état session (humain/agent) |
| 3 | `studio_brain/` vault (14 autres) | 🟢 VIVANT — doctrine/décisions/archi (tier-2) |
| 4 | `AI_MEMORY/` | 🔴 MORT — README 194 o, tracké |
| 5 | `STUDIO_CONTEXT_LIVE.md` | 🟠 PÉRIMÉ — stub 638 o (2026-06-29), untracked |
| 6 | `COWORK_CONTEXT.md` | 🟠 PÉRIMÉ — 8,7 Ko (2026-06-27), untracked |

**Défauts structurels :**
- `CLAUDE.md` lignes 80-171 = doublon d'une ancienne version collé en liste échappée
  (2 en-têtes, 2 sections « Jamais », 2 « Rapport obligatoire »).
- La section « Mémoire persistante » de `CLAUDE.md` dit « lis `studio_brain/` » et
  **ne mentionne jamais `memory/`**, le seul réellement auto-chargé.
- `studio_brain/reference/sources-of-truth.md` liste les 3 morts (4/5/6) comme
  référents mémoire canoniques.

## Modèle canonique retenu — 3 rôles distincts

On ne fusionne rien de vivant ; on documente les frontières et on retire le mort.

| Rôle | Fichier canonique | Nature |
|---|---|---|
| **Faits durables** — « ce que je sais » | `memory/MEMORY.md` (+ fichiers) | auto-chargé au boot, machine (Claude) |
| **Handoff session** — « où on en était » | `studio_brain/00_CURRENT_CONTEXT.md` | un seul fichier, humain/agent, < 100 lignes |
| **Référence humaine** — « doctrine/vision » | `studio_brain/` vault | tier-2, à la demande |

Retirés : `AI_MEMORY/`, `STUDIO_CONTEXT_LIVE.md`, `COWORK_CONTEXT.md`.

## Livrables

1. **Réparer `CLAUDE.md`** : supprimer le bloc doublon (lignes ~80-171) ; réécrire la
   section « Mémoire persistante — règles de session » pour nommer les 3 rôles ci-dessus,
   `memory/` inclus comme source de faits auto-chargée.
2. **Nettoyer `sources-of-truth.md`** : remplacer la table « Mémoire & Contexte Session »
   par le trio canonique ; retirer les pointeurs vers les 3 morts.
3. **Archiver les 3 morts** dans `studio_brain/journal/` (préserve les 2 untracked),
   puis **supprimer les originaux** — la suppression sur go Pierre explicite.

## Frontières & invariants

- `00_CURRENT_CONTEXT.md` reste sous 100 lignes (règle CLAUDE.md existante conservée).
- `memory/` reste géré par le mécanisme auto-mémoire ; on ne le duplique pas à la main.
- Aucun contenu vivant supprimé — seuls les fichiers morts/périmés partent.
- Réversible : toutes les éditions doc via git ; les 2 untracked préservés par archive
  avant toute suppression.

## Comment on prouve que ça marche

- `CLAUDE.md` : un seul en-tête `# TACTICAL CHESS STUDIO`, une seule section « Jamais »,
  une seule « Rapport obligatoire », section mémoire nommant `memory/` + les 3 rôles.
- `sources-of-truth.md` : table mémoire ne cite plus AI_MEMORY / STUDIO_CONTEXT_LIVE /
  COWORK_CONTEXT.
- `grep` des 3 noms morts dans la doc vivante → zéro occurrence (hors journal d'archive).

## Hors scope

- Fusionner `memory/` et `studio_brain/` (rôles distincts assumés).
- Toucher au mécanisme auto-mémoire lui-même.
- Phase 3 Obsidian (CT-4 en est le prérequis, pas l'objet).
