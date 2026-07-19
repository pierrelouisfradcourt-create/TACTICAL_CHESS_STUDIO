# Contexte courant TCS

## Session 2026-07-19 (chat déploiement Belote) — Belote PUBLIÉ en ligne + PWA installable
- Suite directe de l'arbitrage flagship (voir archive stratégie ci-dessous) : Belote (`llm-lego/
  experiments/belote-claude`) déployé réellement — repo GitHub `belote-claude` (privé) + Render
  free tier → **https://belote-claude.onrender.com** live, vérifié par requêtes prod (index/
  manifest/icônes/API 200). Committé+poussé `8d4145f` sur `feat/forge-oracle-gate`.
- PWA installable Android confirmée par la joueuse réelle (grand-mère de Pierre) après 2 itérations :
  icônes SVG seules insuffisantes pour l'installabilité Chrome → PNG 192/512 rasterisées via
  Playwright ; service worker cache-first corrigé en réseau-d'abord (servait une version périmée
  à chaque mise à jour, y compris pendant mes propres tests locaux — piège noté).
- Retours terrain corrigés : HUD score écrasé par les réglages (scindé en 2 lignes), cartes en
  main trop petites (agrandies 62×114, symboles 44px, recalculé pour ne pas déborder à 8 cartes).
- Limite documentée et acceptée telle quelle (décision Pierre) : la bande de geste Android (bas
  d'écran) provoque des retours involontaires en jouant une carte — hors de portée d'une PWA
  installée (pas un TWA), non corrigée sur décision explicite. Détail complet + leçons dans
  `llm-lego/experiments/belote-claude/JOURNAL_ERREURS.md` (Partie 4, E10-E12).
- Reste ouvert : suivi de la session parallèle auto battler (non dupliquée ici) ; ledger triage v2
  toujours à commiter (gate Pierre, voir archive stratégie).

## Session 2026-07-19 (chat stratégie productivité/entreprise — condensée)
Détail complet : `journal/context-archive-2026-07-19-strategie.md` — diagnostic « déclaré ≠ exécuté »
au niveau PRODUIT, 3 dossiers PROPOSED (ledger triage, S13 release, arbitrage flagship), retour
Pierre (triage v2 révisé, S13 ratifiée dans le principe, arbitrage résolu par l'action — voir
session Belote ci-dessus), mode figé RATIFIÉ (Fable/Opus/Sonnet), **triage v2 exécuté mais NON
COMMITÉ** (action pendante : commit gate Pierre, ne pas restaurer le ledger via checkout).

## Session 2026-07-19 (chat studio/méta — archivée)
Archive complète : `journal/context-archive-2026-07-19-audit.md` — audit « déclaré ≠ exécuté » :
3 strates mortes (fiches agents jamais chargées → 13 réparées, matrice permissions ignorant agent_id,
3 taxonomies), capteur `declaration_readers.mjs` (25 tests verts), doctrine Declared→Referenced→
Executed→Verified, 4 décisions Pierre en attente, leçon fiabilité sous-agents (1 citation fabriquée).

## Session 2026-07-19 (chat auto battler, suite) — Incrément 2 forgé + mergé, calibration Forge
- **Calibration Forge** : doc corrigée (hook dur `pretool_forge_guard` ACTIF depuis 2026-07-10,
  pas différé — 2 docs stales corrigées) ; `FORGE_FORMATS_REFERENCE.md` créé (formats réels
  wiremap/triage/blueprint oracle/verdict, exemples tirés du run i1) ; `COMBAT_GATE_PREP.md`
  créé (prérequis incrément Combat, ne tranche rien). Committé+poussé `501491f`.
- **Gates infra Combat posés** (ratifiés Pierre en session) : profil Forge `increment` ajouté
  à `scripts/forge/dispatch.py` (test dédié, suite verte 432 passed), convention run_dir
  `auto_battler_i<N>`, valeurs v0 (Board 8×8 miroir, Mana→0 après Cast, `tick_limit=50`
  calculé sourcé TFT). Committé+poussé `da15b37`.
- **QB-6 ratifiée** (anéantissement mutuel = match nul, aucune perte de Life) et **DP-9 ajoutée**
  (Bench plein → Buy refusé, gap signalé par 05_ECONOMY_BIBLE.md lui-même, comblé avant build) —
  verbatim dans `HUMANGATE_2026-07-19_QB6.md` / `HUMANGATE_2026-07-19_DP9.md`.
- **Incrément 2 « preparation + economy » FORGÉ EN RÉEL** (`auto_battler_i2`, profil `increment`,
  s3→s12 exécutés réellement — decompo/archi/wiremap/red-team-plan Qwen/build/oracles/
  mutation/red-team-code Opus/verdict signé). Red-team code a trouvé HIGH-1 (compteur
  module-global cassant le déterminisme replay, INV-19) → **corrigé et prouvé** avant merge.
  Verdict `HUMANGATE_READY_WITH_OBJECTION`, authentique (`forge.verify_run` exit 0).
  **HumanGate Pierre : MERGE ratifié** → committé `e72a0e4`. Petite itération déléguée pour
  les 4 findings MED (réservation Pool réelle, Buy lié à la Shop, payloads Events alignés
  bible, faux Event Spawn retiré) → **corrigés, re-vérifiés indépendamment** (92/92 tests,
  91/98 mutants=92.9%, 4 oracles verts), committé `bccbef9` (inclut aussi `shop/shop.mjs`
  oublié du commit de merge — repéré par re-vérification indépendante, pas par le sous-agent).
  **Rien poussé** (gate séparé, non demandé).
- Reste ouvert : incrément 3 Combat toujours bloqué sur l'incrément « economy » côté
  bibles/gate (celui-ci est maintenant FAIT — débloque potentiellement la suite), LOW-6
  (biais mineur tirage Shop, non traité, non demandé).

## Session 2026-07-18 (archivée)
Archive complète : `journal/context-archive-2026-07-18.md` — architecture 16 bibles auto_battler
RATIFIÉE, 4 HumanGates, corpus 00–07, run Forge `auto_battler_i1` s0→s12 mergé (`44592b3`).

## Historique 2026-07-09 → 2026-07-15 (archivé)
Archive complète : `journal/context-archive-2026-07-14-15.md` — mémoire qui compose (Forge),
shmup run1, pipeline 3D, factory contractuelle mergée master.

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Aucune session d'optimisation moteur sans HumanGate explicite.
- **Lane STUDIO : GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`, `scripts/studioV2/`, lanceurs.
  Lire OK, modifier = HumanGate. Hors gel : `tests/studioV2/`, `studioV2_MIGRATED_HOLD/`.
  ⇒ `lab/agent_policy/` + taxonomie `producer/code/qa` = **legacy de fait** ; plus que 2 taxonomies
  vivantes (`.claude/agents/` + contrats Forge). Détail : [[lane_studio_frozen]].
- **Factory réorientée** : jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun).
- Actions pendantes : re-triage ledger (IMP Rocky → FROZEN, revue HumanGate avant écriture) ; spec produit Belote
  (IA à niveaux, défi-par-seed, PWA mobile-first) ; étage 2 = table WebRTC, multi public gated.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
