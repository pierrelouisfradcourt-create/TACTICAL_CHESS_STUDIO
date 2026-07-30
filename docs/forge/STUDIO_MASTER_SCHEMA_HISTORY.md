# Historique des révisions — STUDIO_MASTER_SCHEMA

Ce fichier porte l'historique des révisions du schéma maître (`docs/forge/STUDIO_MASTER_SCHEMA.html`).
Il a été sorti du canon le 2026-07-30 (ordre Pierre : « je ne veux plus un changelog du
système, je veux que le schéma représente directement l'état actuel ») — le schéma décrit
désormais l'état courant, cet historique porte le cumul des mises à jour successives qui
s'y étaient accrétées.

Ordre chronologique, le plus récent en haut.

## Table de correspondance — ancienne référence → où lire maintenant

| Ancienne référence (dans le canon avant le 2026-07-30) | Où lire maintenant |
|---|---|
| « Détail L » | VUE 3 — `FORGE_V2_COGNITIVE_RUNTIME.html` |
| bloc « ⚠ MISE À JOUR JJ-MM » (07-20, 07-26, 07-30) | ce fichier (`STUDIO_MASTER_SCHEMA_HISTORY.md`) |
| « Coupe B » | reste dans VUE 1 (`STUDIO_MASTER_SCHEMA.html`), inchangé |

---

## 2026-07-30 — dégel + audit de vérité (tout re-vérifié par l'orchestrateur)

**Verdict d'audit** : document globalement honnête, écarts **chronologiques**, aucune fausse affirmation trouvée.

**4 mécanismes réels invisibles au schéma** : profil `standard_godot` · oracle `s10s` (6 sondes) · garde de référence `reference_guard.py` (détecte sans empêcher) · calibration N=3 (bande ~20 %). Détail développé à l'époque : ancien « Détail L », désormais VUE 3.

**Statut Breakout corrigé (ratifié)** : **expérience externe, hors campagne Forge** — le critère mécanique d'une campagne Forge est la présence de `state.json` + `verdict.json` signés.

**Invariant ratifié** : **producteur avant validateur**.

**Doctrine de routage V2** : renvoi vers `INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md` (ce document renvoie, ne duplique pas).

**Distribution réelle des profils** : **16× standard_godot · 3× standard · 3× patch · 1× full · 1× artbible** — la chaîne complète dessinée par ce schéma a tourné une fois.

**Lot de dégel 1 — LIVRÉ ET PROUVÉ** (suite 1287 → **1321 passed / 1 skipped, zéro régression**, re-vérifiée par l'orchestrateur) : **CV-3** gel des règles compatible schéma v2 + garde d'absence advisory (`static_oracles.py:740`, driver) · **CV-4** clause « SEARCH d'abord » portée au contrat Godot (`s9-build-godot-standard.yaml:57`) · **CV-8** champs de cache capturés (`run_real.py:453-459`, propagés au state) · **CV-14** producteur automatique de `failure_event` branché sur `_halt_step` (`driver.py:840`) — **aucune leçon auto-créée** (doctrine 4 couches, écriture jamais ascendante).

**CV-9** : règles deny posées dans `.claude/settings.json` (`reference_protected.yaml` + `settings.json` lui-même, auto-verrouillant) — geste posé sous mandat d'exécution, ratification Pierre **en attente**.

**CV-16** : câblage `/gate → apply_decisions.mjs` appliqué (cas conditionnel queues Forge). Dry-run prouvé : 10 décisions ratifiées applicables, 0 conflit, 1 orpheline ; le `--apply` final = geste Pierre (bloqué par permissions, volontairement non contourné).

**CV-19** : diagnostic fouille — 4/4 requêtes = catalogue vide du sujet (les briques `card_engine` jamais promues au catalogue ; la promotion attend dans la file du point précédent). Recommandation : ne pas toucher `search.mjs`.

**CV-15** : `learning_curve.jsonl` documenté journal-only (décision D-i en attente).

**Campagne suivante désignée Pierre** : **Breakout Forge V2** (profil `standard_godot`, driver instrumenté) — document de préparation `docs/forge/BREAKOUT_V2_CAMPAIGN_PREP.md` ; tension avec la ratification « cible vierge » du matin **signalée non arbitrée** (le doc de prep la trace pour la gate). E7 (comparaison builder propre) reste découplé.

**Gel wiremap v1/v2** — défaut **détecté et corrigé le 2026-07-30**, correction prouvée par 17 tests : `wiremap_frozen.json` avait un lecteur v1 (`features[]`) inapplicable au schéma v2 (`lines[]`), gel jamais posé pour Snake, défaut silencieux — corrigé par CV-3.

---

## 2026-07-26 — audit d'alignement (tout vérifié sur master, commits cités)

**Consolidation git** : 7 branches + 5 worktrees → `master` seul, poussé (`87e9ec4..1481d6d`) ; Menagerie Tactics et Pong récupérés de worktrees non commités.

**Boucle d'apprentissage** (commit `ffd0703`) : courbe `knowledge_base/learning_curve.jsonl` ré-indexée `subject{type: brick|game, id}` (3 lignes réelles) · hook driver best-effort · mesure d'adoption `skipped_validation` (filled/declared_empty/absent) · décisions HumanGate enrichies (portée/validations/risques, optionnels).

**Instruments — table de confiance** (protocole §4.2) : `forge_telemetry` n'écrit que les SUCCÈS et porte le modèle du CONTRAT (pas l'exécuté) · `state.json` écrase à chaque tentative · `builder_runs` double-compte 1 invocation · le journal écrit « réparé » quand l'étape FINIT, pas quand l'artefact est bon. **Mission M1 (télémétrie d'échec) PRÉPARÉE, non lancée** : `docs/forge/MISSION_M1_TELEMETRIE_ECHEC.md`.

**Décisions D1→D6 tranchées par Pierre** (consignées `studio_brain/decisions/PROPOSED_2026-07-26_ratifications.md`, promotion decision-log en attente) : échelle 4 crans mécaniques · plafond tokens accepté-valeur-différée · sunset 30 j · `/gate` migré vers le decision-log versionné (commit `954ca38`, ex-DREAMS.md legacy) · injection mesurée acceptée-différée · commits 3 lots faits.

**Nouveaux référentiels du rôle C** : protocole Troisième Cerveau (PROPOSED) · `studio_brain/decisions/DEFERRED.md` (12 différés à condition de réveil) · `lab/forge_runs/RUN_INDEX.md`.

---

## 2026-07-20 — cumul des vérifications depuis le 12-07

Cet instantané datait du 12-07, cumul des vérifications depuis :

**07-15** — auto-audit `scripts/forge/studio_selfaudit.mjs` : **6 cases marquées « cible » existaient déjà** (search.mjs · role_sim.mjs · reuse_ratio.mjs · pool.py · s2.5-artbible.yaml · roles/pursuer-mobile.yaml).

**07-20** — nouveautés VÉRIFIÉES sur le repo : profil de chaîne `increment` (`scripts/forge/dispatch.py`, saute s0/s1/s2 sur un projet existant, refait archi/wiremap) · outils Knowledge Resolver V1 `scripts/forge/knowledge_trace.mjs` + `pending_review.mjs` (41 tests, 24+17) · 2ᵉ jeu forgé de bout en bout `card_engine` (verdict signé `HUMANGATE_READY_WITH_OBJECTION`, `python -m forge.verify_run` confirme HMAC/évidence/mutation authentiques) · ledger triagé en archive vivante (4 OPEN, cf. `CLAUDE.md`) · chaîne décisionnelle canonique auditée (`docs/audit/DECISION_LAYER_AUDIT_2026-07-19.md`, PROPOSED) · mission Forge V2 lancée (P1 autopsie / P2 patterns / consolidation, toutes PROPOSED, gate Pierre).

Les mentions « (cible) » restantes à l'époque étaient à vérifier au cas par cas. État factuel auto-généré : `docs/forge/STUDIO_STATUS.generated.md`.

**07-20 (soir)** — §4-A câblé+commité (7 commits `1143682→8c5ccf0`) · Run A `card_engine` ACCEPTÉ (HumanGate) · capteur dominance advisory EXISTE (`lab/forge_sensors/dominance`, sondes P1.1 vertes) · `pending_review` 11/11 disposé · drafts P0 Bibles BAS déposés (gate à venir).
