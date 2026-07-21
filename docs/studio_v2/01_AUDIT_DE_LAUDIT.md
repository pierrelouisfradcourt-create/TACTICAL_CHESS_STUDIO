# PHASE 1 — AUDIT DE L'AUDIT

*Chaque proposition antérieure classée KEEP / IMPROVE / DELETE / REPLACE, sans complaisance.*
*Référentiel : COWORK_CONTEXT.md, MEGA_ANALYSIS, le PLAN_100_ACTIONS, le delta contextuel, le bilan workflow, et le code réel.*

---

## A. Les grands paris stratégiques

| Proposition | Verdict | Justification |
|---|---|---|
| Moteur d'échecs Rocky comme produit | **DELETE (commercial)** → R&D/vitrine | Valeur marché ≈ 0 [WEB]. Décision Pierre actée. |
| Game Factory via **IR/DSL universel** | **DELETE** | Compilateur no-op (P0-C [CODE]) + les générateurs universels produisent du *jouable*, pas du *vendable* [WEB]. Remplacé par templates Godot par genre. |
| Boucle Kaizen **autonome** (dry_run→False, IMP-184 puis A10) | **DELETE/défer** | Automatiser la production d'un produit sans valeur marché ne crée pas de valeur. Pré-revenu = sur-ingénierie. |
| Doctrine HumanGate / oracles non-LLM / NO_CLAIM | **KEEP** | Discipline de production solide. Recâblée sur des oracles *business* (wishlists, rétention). |
| Ledger IMP / unité de travail = 1 fichier·1 fonction·1 lane | **KEEP** | Bonne granularité [confirmé par le bilan workflow]. |
| Stack LLM **locale** Qwen | **KEEP** | Inférence gratuite = critique en bootstrap < 2k€. |
| Ambition « des dizaines puis des centaines de jeux » | **IMPROVE** | Bonne ambition, mauvaise méthode. Pas via un compilateur universel mais via **portefeuille dans 1-2 genres** avec template réutilisable. |

---

## B. Les 7 P0 (registre MEGA_ANALYSIS)

| P0 | Verdict | Justification |
|---|---|---|
| P0-A — gate déploiement ML (`candidate.pt`) | **DELETE (priorité)** | Concerne le neural chess. Sans valeur commerciale → on n'y investit pas. Le *concept* (candidate→gate→deploy) est **réutilisé** pour les modèles de balance de jeu plus tard. |
| P0-B — `current_state.json` puits mort | **REPLACE** | La « boucle causale autonome » disparaît. Remplacée par un **Portfolio dashboard** qui lit des métriques *business* réelles (wishlists, ventes, reviews). |
| P0-C — IR décoratif | **DELETE** | On supprime l'IR. Problème dissous. |
| P0-D — `studio_core/` en 3 copies | **IMPROVE → résoudre vite** | Vrai problème d'hygiène [CODE : `./studio_core`, `./worktrees/dur/`, `./worktrees/routine/`]. Geler les 2 worktrees, garder une racine. Quick win. |
| P0-E — pas d'oracle qualité générique | **REPLACE** | Inutile sans multi-genres immédiat. Remplacé par un **Fun/Market Oracle** basé télémétrie joueurs réels (PostHog/Plausible [WEB]). |
| P0-F — CI ne teste rien / PR07 fantôme | **IMPROVE** | Vrai trou, mais nuance [CODE] : `chess-test.yml` lance `cargo check`+2 tests mais **manuel only pour raison de budget GitHub Actions**. → arbitrage coût : **git hooks locaux gratuits** portent les tests, CI réelle uniquement sur merge master. |
| P0-G — `execute_via_claude_code` EOF | **DELETE** | Concerne l'autoloop autonome qu'on abandonne. Disparaît. |

---

## C. Le PLAN_100_ACTIONS — par axe

**AXE A (Mémoire/tête pensante) — 10 actions.**
- **KEEP léger :** A01 `DECISION_LOG.md`, A02 checklist fin de session, A05/A08 mémoire/tribal knowledge → utiles, coût quasi nul.
- **DELETE :** A03/A04/A06/A07/A09 (brancher `current_state` + boucle causale + single-writer) → infra autonome sans ROI. A10 (armer la boucle) → supprimé.
- *Net :* garder 4 docs de discipline, supprimer toute la plomberie autonome.

**AXE B (Claude↔Qwen / tokens) — 10 actions.**
- **IMPROVE → fusionner :** B01 scope, B03/B07 prompt libraries Qwen, B10 routing 14B/27B → utiles car Qwen local = gratuit, le routing économise.
- **DELETE :** B02 query_router, B04 context_compressor, B06 token_budget, B08 llm_cache Redis → sur-ingénierie pré-revenu. Le « budget tokens » se gère à la main à ce stade.
- **REPLACE :** B05/B09 templates → remplacés par le **handoff mémoire** standard (déjà couvert par la mémoire persistante Cowork).

**AXE C (CI/oracles) — 15 actions.**
- **KEEP/IMPROVE :** C02 git hooks (le cœur, gratuit), C09 fix EOF *seulement si on garde un headless utile*, C11/C13 hygiène fetch/catch (dette légitime).
- **REPLACE :** C01/C03/C04/C08/C12 (CI cargo test/pytest/ELO en push) → recadrés : tests en **hooks locaux**, CI lourde uniquement merge master (arbitrage budget). C05/C06/C07/C10 (candidate.pt, deploy_gate, ELO signé, HMAC) → **DELETE** (chess ML).
- **DELETE :** C14 oracle_registry, C15 oracle générique → prématuré.

**AXE D (Multilane/Factory) — 12 actions.**
- **KEEP :** D01 geler worktrees (P0-D, quick win).
- **DELETE :** D02/D03/D04 (`--ir`, IR exécutable, variants Snake) → l'IR disparaît. D05 LANE_SPEC, D08 FORBIDDEN_MISSIONS → reportés.
- **REPLACE :** D06 cockpit lane JEUX → **Portfolio/Revenue dashboard**. D09 extraction `/static/` → seulement si autopilot survit comme dashboard.
- **KEEP (réorienté) :** D10 Rocky `--serve`, D11 frontend web, D12 Godot bridge → **deviennent la base du Titre 1 vitrine** (un petit jeu jouable), pas une infra abstraite.

**AXE E (Agents autonomes) — 15 actions.**
- **DELETE (quasi intégral) :** E01-E07, E09-E15 (SA0, council gate, red team, nightly audit, governor, kaizen v2, dispatch…) → **zéro ROI pré-revenu + risque anti-Skynet** (des LLM qui gatent des LLM). C'est le plus gros gisement de sur-ingénierie du plan.
- **KEEP léger :** E03 IMP_DECOMPOSER (utile à la main), E08 workflow audit template (discipline 30j).
- *Net :* on passe de 15 agents à ~0 agent autonome. Les sous-agents restent un **outil de recherche/à la demande**, pas une infra qui tourne la nuit.

**AXE F (ML/Dataset/Rocky) — 10 actions.**
- **DELETE (commercial) :** F01-F10 (dataset filter, Lichess Elite, φ encoder, batch inference, train, deploy gate, parity, LoRA) → tout est chess ML, sans revenu.
- **REPLACE (concept réutilisé) :** la discipline « dataset propre → train → gate ELO → deploy » est **transposée plus tard** à un *modèle de balance/difficulté de jeu* nourri par la télémétrie. Pas maintenant.

---

## D. Le bilan workflow humain↔Claude

| Axe proposé | Verdict | Justification |
|---|---|---|
| AXE 1 — `DECISION_LOG.md` | **KEEP** | Mémoire persistante = vrai point faible identifié. Coût nul. (Déjà partiellement couvert par la mémoire Cowork.) |
| AXE 2 — templates de rôle (archi/prompt/synthé) | **IMPROVE** | Bon, mais léger : 1 page, pas un système. |
| AXE 3 — SA0 vérif prémisses + SA_FINAL | **KEEP** | Réel gain qualité multi-agents (les prémisses fausses du run 6-agents l'ont prouvé). À appliquer aux runs de recherche. |
| AXE 4 — IMP auto-généré | **KEEP (manuel)** | Utile, mais déclenché à la demande, pas automatisé. |
| AXE 5 — checklist fin de session | **KEEP** | Coût nul, fort impact anti-perte-de-contexte. |
| AXE 6 — sessions paire/impaire | **IMPROVE → règle souple** | Bon principe (séparer analyse/exécution) mais ne pas le rigidifier ; le HumanGate sur l'irréversible suffit. |

---

## E. Synthèse de l'audit

**Ce qui survit (≈15 % du volume proposé) :** la doctrine (oracles/gates/NO_CLAIM, recâblée business), le ledger IMP léger, Qwen local, la discipline mémoire/workflow, le quick-win P0-D, l'hygiène CI via hooks locaux, et Rocky réorienté en *vitrine jouable*.

**Ce qui meurt (≈85 %) :** l'IR universel, la boucle autonome, les 15 agents, tout le ML chess, la plomberie `current_state`, et la moitié des « économies de tokens » prématurées.

**La règle d'or de cet audit :** *aucune ligne de code ne mérite de survivre si elle n'aide pas à vendre un jeu dans les 12 mois.* Le reste est de la dette déguisée en feature.
