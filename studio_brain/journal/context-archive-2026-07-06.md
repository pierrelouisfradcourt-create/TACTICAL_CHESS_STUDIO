# Archive contexte — cycle 2026-07-06

Sections déplacées de `00_CURRENT_CONTEXT.md` le 2026-07-08 pour garder le handoff < 100 lignes.
Contenu **verbatim** (non réécrit). Ces chantiers sont LIVRÉS et poussés sur origin/master.

## Chantier Council→Factory — contrat v0 LIVRÉ (2026-07-06, `3c5f9de`, poussé sur origin/master)
Câble la sortie du Council (IMP-208) vers la factory via un contrat JSON versionné (le Council propose,
ne dispose pas). CHECK-0/1 OK ; 7 étapes livrées.
- **Modules** : `schemas/council_output_v1.schema.json`, `scripts/council_contract.py` (validateur
  fail-hard + transform + `run_factory_council`), `scripts/council_router.py` (D1/D2 + dedup, écrit via
  `kaizen_loop.cmd_add`), `scripts/council_factory_oracle.py` (oracle consolidé), câblage
  `kaizen_autoloop.run_council_factory` (hors boucle live), vue `cockpit /api/council-factory` (read-only).
- **Décisions HumanGate** : plancher AUDIT_REQUIRED (jamais SAFE_AUTO v0) · IMP OPEN+source=council (zéro
  modif schéma ledger) · Gemini retiré par construction (2-voix local) · garde write-path option-a (chemins
  descriptifs OK, commandes rejetées) · enum verdict unique OK/FAIL/BLOCKED · coexistence avec
  `council.validate_output` (IMP-198).
- **Preuve** : oracle **7/7, 127 tests, exit 0** ; run Qwen réel E2E (ledger temp) + corpus réel gelé.
  Ledger canonique JAMAIS touché → cockpit affiche 0 (correct ; passe à 1 au 1er transit réel).
- **Reste** : premier transit canonique = action explicite future ; push au go Pierre.

## Belote — bloc 1 livré (2026-07-06), poussé sur origin/master
Base : `llm-lego/experiments/belote-claude/` (le prototype prouvé, fait évoluer — pas de repart de zéro).
- **Spec** : `docs/superpowers/specs/2026-07-06-belote-bloc1-regles-table-materiel-design.md`.
- **Plan** : `docs/superpowers/plans/2026-07-06-belote-bloc1-regles-table-materiel-plan.md`.
- **Fait & prouvé** : cible 1000 défaut · **paquet fidèle** (mélange initial seedé → coupe réelle
  bornée → **ramassage déterministe**, `src/shoe.mjs`, rejouable depuis seed, parité driver≡moteur
  re-prouvée) · **annonces rituel 2 temps** (pool DÉCLARÉ, humain manuel via `/api/annonce`,
  exposition pli 2 de la seule meilleure ; non déclarée = perdue) · **belote/rebelote manuelles**
  (`/api/belote`, oubli = +0) · **main réorganisable** (drag Pointer : ranger horizontal ≠ jouer
  tap/tirer-tapis, le jeu ne re-trie jamais) · tri d'affichage + préférence.
- **Preuve** : 44 unit · real-play 0 violation · verify-parity/annonces/ritual PASS · e2e DOM
  sort/reorder/declare/belote/cards PASS. `software OK / evidence INCLUDES_UX_VALIDATION / claim NO_CLAIM_ALLOWED`.
- **2 points à trancher (Pierre)** : (1) **cartes** — set candidat LGPL SVG-cards rendu à 60px
  (`assets/preview.html`, capture `web/e2e-shots/cards-preview.png`) LISIBLE mais index de coin
  **anglais K/Q/J** ; production **inchangée** (coins R/D/V FR) tant que Pierre n'a pas choisi
  FR-Wikimedia vs fallback anglais (§8-Q8). (2) `web/e2e.play.mjs` (partie DOM complète) **crashe le
  renderer headless** sur ce poste (env, **aucune erreur JS** — cf. listeners) ; deals DOM + jeu
  moteur complets sont prouvés par ailleurs.
- **Défauts §8 appliqués** (ajustables) : COUPE_MIN=3 · pickup camp-preneur-d'abord · tri défaut
  couleur · déclaration = toutes annonces d'un coup · exposition 3s · seuils geste 12px/1.3.
- **Reste (blocs suivants)** : parcours joueur, IA niveaux, PWA, défi-par-lien (l'archi seed est prête).

## Chantier AI-OS — LIVRÉ (marathon), tout prouvé (run-validators ✅764 / vitest 85)
6 briques dans le builder llm-lego, toutes committées :
- **CT-4/MCP/Brique 2/3a** (`850a575`→`55b0e80`) : mémoire 2 racines + `/api/memory` + vue Mémoire ·
  MCP `studio-brain`/`studio-facts` (IMP-178 CLOSED) · recall sémantique nomic-embed · graphe mémoire.
- **Brique 4 (interface pro) COMPLÈTE** : 4a `a8ee5ff` (design system) · 4c `5493412` (nœuds + onboarding)
  · **4b `3c8d1e0`** (**cockpit Accueil** : ledger/lanes/gates/mémoire, anti-mensonge — *base du board*).
  Accueil = onglet ; **canvas reste défaut** (auto-défaut cassait 10 validateurs ; oracle intact).
- **3b (graphe codebase)** : à faire à l'extraction du moteur de plis (avant Tarot). **Brique 5** : sine die.
- **Évolution cockpit → LIVRÉE** (board interactif, `4d4d1a9`, cf. session 2026-07-07 en tête).

## Points d'entretien (résolus 2026-07-06)
- **Stop hook — RÉSOLU (prouvé)** : un bash nu = launcher **WSL** sur ce poste ; migration Node suivie
  par **IMP-240**. (Remplace l'ancienne hypothèse non prouvée.)
- **`golden_collector` + `ledger_patch_*` « non gardés » — FAUX POSITIF (fermé)** : `golden_collector`
  LIT le ledger et écrit `golden_examples.jsonl` ; les `ledger_patch_*` passent par `guarded_write`.
  Single-writer verrouillé au niveau primitive (IMP-194/205), gardé par AST `grep_guard_ledger.py`.
  Ne pas ré-auditer.
- **Limite worktrees/ hors scan AST (transitoire)** : relancer `grep_guard_ledger.py` après tout merge
  de worktree. **Caduque quand IMP-247 (B2, scope réduit : câblage pre-commit + worktrees/ + test-path,
  CI-wiring exclu → IMP-239) est CLOSED.**
