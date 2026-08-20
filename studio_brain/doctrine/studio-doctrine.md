# Studio Doctrine
#doctrine #reference

> Source canonique : `docs/studio_v2/00_SYNTHESE_VISION_STRATEGIE.md` §5, `01_AUDIT_DE_LAUDIT.md`
> Date de dernière révision : 2026-06-28

---

## Vision (1 phrase)

> **Studio V2 est une micro-usine de jeux Steam opérée par un solo + IA, qui transforme la vélocité de production et l'automatisation totale du pipeline de distribution en un portefeuille de petits jeux rentables — en mettant l'IA partout où le joueur ne la voit pas, et la qualité humaine partout où il la voit.**

---

## Les 5 principes directeurs

### 1. Distribution > Production
Le pipeline marketing/wishlists est prioritaire sur la sophistication technique. Un bon jeu invisible = zéro revenu. La **vélocité de wishlists** est la variable pilote, pas les lignes de code.

### 2. IA Invisible (règle absolue)
- IA à fond sur : code, tooling, localisation, itération de variantes privées, balance de jeu.
- **Jamais** sur l'art visible shippé, les assets store, ou la musique principale.
- Raison légale : output IA pur = non protégeable par le droit d'auteur (USCO 2025, *Thaler v. Perlmutter* cert. refusé mars 2026).
- Raison commerciale : −53 % de reviews pour les jeux taggés IA (étude ~10k jeux, 2025).
- Art autorisé : humain, CC0 (Kenney), ou brouillon IA **retravaillé**.

### 3. Oracles Réels (anti-Skynet)
Les seuls juges valides ne sont **pas** des LLM :
- Build : `cargo build --release`, export Godot vert, `pytest`
- Fun : données joueurs (télémétrie, rétention J1, courbe d'abandon/min)
- Marché : vélocité wishlists, conversion visite→WL (cible >4%)
- Business : ventes mois 1, reviews positives
> Un LLM dit « c'est fun » ≠ une preuve. Seuls les joueurs prouvent le fun.

### 4. HumanGate sur l'Irréversible
Pierre décide seul de :
- Publier / dépenser (Steamworks 100 $, VPS)
- Merger / rejeter / freezer du code en prod
- Renommer une marque
- Écraser une production live
- Changer la doctrine

L'IA propose, exécute les tâches reversibles, auto-vérifie sur les oracles mesurables. Elle ne *gate* pas.

### 5. Portefeuille = Ferme à Tickets de Loterie
Aucun jeu unique n'est un pari unique. On multiplie les tentatives bon marché dans 1-2 genres. Chaque titre construit :
- De l'audience cumulative (Discord/wishlists)
- Un kit réutilisable (`studio_kit/models`)
- Une ligne dans le dataset causal (doc 09)

**Kill-criteria explicites par jeu** → on ne s'acharne pas.

---

## Business Model (verrouillé)

| Paramètre | Valeur |
|---|---|
| Modèle | Premium Steam (pas F2P, pas IAP, pas battle pass) |
| Prix idle | 4-7 € |
| Prix survivor-like | 6-10 € |
| Budget total An1 | < 2 000 € |
| Frais Steam | 100 $/titre |
| Art | CC0 / humain / retravaillé — zéro budget art payant |
| UA | Zéro (organique uniquement) |

---

## Règles absolues (jamais)

- Jamais `git commit/push` sans demande explicite Pierre
- `claim_verdict: NO_CLAIM_ALLOWED` dans tous les rapports
- Séparer `software_verdict` / `evidence_verdict` / `claim_verdict`
- Jamais modifier `IMPROVEMENT_LEDGER.yaml` manuellement (sauf exception Pierre explicite)
- Jamais supprimer `golden_examples.jsonl`
- Jamais utiliser l'API Anthropic externe (Qwen local = gratuit)
- Jamais art IA brut shippé (visuel joueur ou assets store)
- Jamais automatiser l'irréversible

---

## Ce qu'on a tué (et pourquoi)

| Artefact | Verdict | Raison |
|---|---|---|
| IR/DSL universel | DELETE | Compilateur no-op, produit du jouable pas du vendable |
| 15 agents autonomes | DELETE | Zéro ROI pré-revenu, risque anti-Skynet |
| Chess ML neural | DELETE (commercial) | ELO ~1200, valeur marché ≈ 0, Stockfish = gratuit |
| Boucle kaizen autonome | DELETE/defer | Sur-ingénierie pré-revenu |
| `current_state.json` puits | REPLACE | Remplacé par dashboard métriques business réelles |
| Moteur Rocky comme produit | R&D/vitrine | Sunk cost neutralisé. La compétence Rust reste. |

---

## Liens
- [[../decisions/decision-log|Decision Log]]
- [[../gamedesign/lessons|Leçons Gamedev]]
- Source : `docs/studio_v2/00_SYNTHESE_VISION_STRATEGIE.md`, `01_AUDIT_DE_LAUDIT.md`
