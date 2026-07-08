# Contexte courant TCS
Dernière session : 2026-07-08 — **Chess TCG : pivot cible MOBILE ratifié** (`af21a6d`, poussé) + passage borné
des 7 directeurs (advisory, zéro écriture). Avant : council-audit LIVRÉ (`ebebb59`), board interactif
llm-lego (`4d4d1a9`), migration ledger IMP-256, Council→Factory v0 (`3c5f9de`).
Historique archivé : `journal/context-archive-2026-07-05.md` (marathon 07-05→06) +
`journal/context-archive-2026-07-06.md` (Council→Factory, Belote bloc 1, AI-OS, points d'entretien 07-06).

## Session 2026-07-08 (soir) — Chess TCG : PIVOT CIBLE MOBILE (ratifié Pierre)
- **Décision produit** : Chess TCG continue **sur Godot natif, cible MOBILE** (≠ navigateur, ce qu'écrivait la
  roadmap). Point zéro consigné (`af21a6d`) : proto Godot 3D jouable vs IA (~1800 l. GDScript), moteur de règles
  **pur headless testé (83/83 verts)**, assets CC0 KayKit 33 MB. Roadmap 7 jalons, **seul Jalon 1 audité**.
- **2 IMP AUDIT_REQUIRED ouverts** : **IMP-254** (fiche carte lisible, `ui/hud.gd`) · **IMP-255** (cascade de
  résolution étape-par-étape visible + verdict affichage-vs-règle, `ui/game3d.gd`+`core/rules.gd`, impact HIGH,
  « risque design n°1 lignée T »).
- **Passage borné 7 directeurs** (advisory, **zéro écriture**, aucun IMP créé) : 7/7 pertinents ; 8 exécutants
  hors scope (dont les 3 agents Rust/ML). Fil rouge = le **journal d'événements de `rules.gd`** est l'actif à
  exploiter (graine replay + cascade IMP-255 + check parité affichage↔règle). Risque n°1 = lisibilité/
  prédictibilité (converge IMP-254/255). Delta mobile non absorbé par la roadmap : entrée hover→tap, budget perf 33 MB.

## Session 2026-07-08 — council-audit LIVRÉ (`ebebb59`, poussé sur origin/master)
Bouton **« Auditer via council »** sur les cartes **AUDIT_REQUIRED** du board (panneau détail), **live-only** :
réutilise le graphe council in-file (`exampleCouncilGate`, 3 voix PLAN_REVIEW/RED_TEAM/DIVERGENCE) via le **même
`/api/execute` live** (Qwen :1234), **contexte IMP injecté** dans les prompts (le graphe seul ne le fait pas —
l'adaptateur ignore l'état amont). Synthèse = **règle déterministe** (BLOQUE l'emporte · mixte→ESCALADE ·
unparsed→ESCALADE), **aucun 4e appel LLM**. Parsing **ancré sur la ligne finale `VERDICT: X`** (prompt qui la
force), **durci contre l'auto-référence au nom de rôle DIVERGENCE** (régression **s6** : verdict réel + mention
tardive du rôle → ne se trompe pas ; fallback token nu puis ESCALADE). **LECTURE SEULE stricte** — n'écrit ni
ledger ni `HUMANGATE_DECISION_LOG.yaml` ; graphe sans pause mécanique (HumanGate conceptuel), fermer l'IMP reste
humain. Preuve : **39 suites / 794 verts** (`council-audit-validate.mjs` 14/14 dont s6), 2 audits live réels
(IMP-206 → ESCALADE puis BLOQUE). Fichiers : `llm-lego/builder.html` + `council-audit-validate.mjs`.

## Session 2026-07-07 — Migration ledger IMP-256 + board interactif (démarrage)
- **IMP-256 CLOSED (`1555173`, poussé)** : migration schéma ledger — `project`
  (factory 190 / rocky 72 / chess_tcg 2) + `theme` (10 valeurs) sur 264 entrées. Insertion pure
  (+545/-0), aucun autre champ touché ; mapping versionné `lab/chains/_ledger_tagging_proposal.csv`.
  belote / auto_battler / frosthaven = valeurs autorisées mais vides (ratifié Pierre).
- ⚠️ **`grep_guard_ledger` N'A PAS bloqué** l'écriture directe hors `kaizen_loop` au commit
  (`✅ pre-commit OK`) → **IMP-247 = vrai trou ouvert, pas théorique** : le write-path direct passe.
  (Mitigation posée depuis : `settings.json` ask-gate, cf. doctrine ci-dessous.)
- **Board interactif llm-lego — LIVRÉ (`4d4d1a9`, poussé)** : Accueil = board projet×lane
  (remplace tuiles Ledger+Lanes ; Gates+Mémoire en bande latérale). Endpoint read-only `GET /api/imp-board`
  (`imp-board.mjs`, parser sans lib YAML) lisant le ledger direct, n'écrit jamais. **Déployable =
  `status==OPEN && blocked_by vide`** → FROZEN/REJECTED/FAIL exclus PAR DESIGN (ne pas re-litiger).

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

## État git 2026-07-08 — tout poussé sur `origin/master`
- Poussés ce cycle : IMP-256 `1555173` · board `4d4d1a9` · council-audit `ebebb59` · **pivot mobile chess_tcg
  `af21a6d`** · ce handoff. Rien en attente.
- ⚠️ Non commité (hors périmètre, laissé tel quel) : validateurs `llm-lego/*.mjs` + `*_result.json`,
  `07_CURRENT_STATE.md`, e2e-shots belote — modifs de travail non liées au pivot.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire les IMP via `kaizen_loop.py`
  (exception ponctuelle autorisée : migration schéma IMP-256 en écriture directe, cf. session 07-07).
  **`.claude/settings.json` (`c7ba7e7`, durcissement IMP-247) : `Write/Edit(lab/chains/**)` déplacés de `allow`
  vers `ask`** → toute écriture directe sur le ledger (hors `kaizen_loop`) déclenche désormais une **confirmation**.
  C'est attendu, pas un bug — mitigation du write-path direct que `grep_guard_ledger` ne bloque pas (IMP-247).
- `train.py` gelé (et de toute façon **Rocky = GEL**). `start_studio.ps1` OK (pas le `.sh`).
- Serveur builder : `node demo-server.ts` :3000 (`/api/memory*`, `/api/cockpit`, `/api/imp-board`, `/api/execute`).
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
