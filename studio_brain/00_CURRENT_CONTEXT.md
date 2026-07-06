# Contexte courant TCS
Dernière session : 2026-07-06 — **Belote produit 1, bloc 1 « Règles, table & matériel » LIVRÉ**
(spec + plan + build). Sessions marathon 07-05→06 archivées : `journal/context-archive-2026-07-05.md`.

## Belote — bloc 1 livré (2026-07-06), NON poussé (gate Pierre)
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

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, session Claude 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Post-mortem à écrire ; branche gelée ; **aucune nouvelle session d'optimisation
  moteur sans HumanGate explicite**.
- **Factory réorientée** : gamme **jeux de cartes FR** — **Belote = produit 1**, **Tarot = produit 2**
  (après extraction d'un **moteur de plis** commun).
- **Prochain cycle — Action 1 (PRÉCÈDE le spec Belote) = RE-TRIAGE du ledger** : les IMP OPEN liés à
  **Rocky / moteur / training** → passés **FROZEN** (motif « pivot 2026-07-06 »). **Revue de la liste
  par HumanGate AVANT toute écriture.**
- **Prochain cycle — Action 2 = spec PRODUIT Belote** : parcours joueur, **IA à niveaux**, hook
  **défi-par-seed**, web statique **mobile-first / PWA**.
- **Étage 2** = table entre amis **WebRTC** ; multijoueur public **gated**.

## Chantier AI-OS — LIVRÉ (marathon), tout prouvé (run-validators ✅764 / vitest 85)
6 briques dans le builder llm-lego, toutes committées :
- **CT-4** `850a575` — mémoire 2 racines + faces HTTP `/api/memory` + vue Mémoire.
- **MCP** `462028f` — `studio-brain` + `studio-facts` dans Claude Desktop (MSIX + `cmd /c npx`). IMP-178 CLOSED.
- **Brique 2** `238c08f` — recall sémantique (LM Studio nomic-embed, fail-soft).
- **Brique 3a** `01938ec` + `55b0e80` — graphe mémoire + `memory-store` récursif (archive `journal/` exclue).
- **Brique 4 (interface pro) COMPLÈTE** : 4a `a8ee5ff` (design system : tokens + badge unifié + typo sans)
  · 4c `5493412` (cartes de nœud dégagées + onboarding) · **4b `3c8d1e0`** (cockpit Accueil :
  ledger/lanes/gates/mémoire, anti-mensonge dynamique). Accueil = onglet ; **canvas reste défaut**
  (l'auto-défaut masquait le canvas → cassait 10 validateurs ; oracle gardé intact).
- **3b (graphe codebase)** : **requalifié — plus « sine die »** mais à faire **au moment de l'extraction
  du moteur de plis (avant Tarot)**. **Brique 5 (capture)** : reportée sine die.
- **Évolution cockpit identifiée** : vue **lanes/IMP ordonnée**. **Question ouverte à instruire** : le
  ledger a-t-il un **champ de dépendances entre IMP** ? → détermine si c'est un simple **affichage** ou
  un **chantier schéma** (modifier le format du ledger).

## À pousser
- **4b (`3c8d1e0`) NON poussé** — le reste du chantier est déjà sur `origin/master` (push jusqu'à `a49be72`).
  Ce handoff aussi à pousser. Push au go Pierre.

## Points d'entretien ouverts (candidats IMP mineurs)
- **Stop hook — POINT OUVERT (pas de diagnostic sans preuve)** : **échec constaté** ; **script
  `stop-failure.sh` présent sur disque** (+ exécutable ; tous les hooks référencés existent) ; **cause
  NON confirmée** (hypothèse non prouvée : invocation `bash` sous Windows). **À reproduire et prouver
  AVANT tout correctif.**
- **`golden_collector` + writers `ledger_patch_*` NON gardés (unguarded)** — signalés par Pierre, à
  auditer/verrouiller (non vérifié cette session).

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire les IMP via `kaizen_loop.py`.
- `train.py` gelé (et de toute façon **Rocky = GEL**). `start_studio.ps1` OK (pas le `.sh`).
- Serveur builder : `node demo-server.ts` :3000 (`/api/memory*`, `/api/cockpit`).
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
