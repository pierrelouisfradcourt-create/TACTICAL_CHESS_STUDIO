# Post-mortem stratégique Forge — run Pac-Man (V1→V6, freeze b22a980)

*Date : 2026-08-07 · Source : session Fable 5 (poste de commande), 2 agents Explore (Sonnet) + Forge Observer (premier run sur pacman) + contre-vérifications orchestrateur. Chaque fait recoupé sur au moins 2 sources indépendantes.*
*software_verdict: OK (analyse) · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED*

---

## 0. Confrontation Observer ↔ réalité (demande Pierre)

Premier run Observer sur pacman exécuté ce jour (`lab/reports/observer/pacman/` : 4617 événements, 9 runs, 114 faits, 100 drifts).

**Concorde avec le réel (re-vérifié)** : tokens V1 2 598 728 / V2 1 639 920 (= télémétrie recalculée) · décision `HUMANGATE_READY_WITH_OBJECTION` · red-team qwen `redteam_ran: true` · drift `model_audit_differs_from_transcript` RÉEL (roles.yaml déclare `claude-opus-4-8`, transcripts mesurent `claude-opus-5`).

**Discorde — 2 défauts symétriques** :
1. La Forge écrit `ts: 0.0` dans ses reçus signés (verdict_v2.json) → l'Observer reconstruit une fenêtre 1970→2026 (durée 56 ans) sans garde-fou.
2. L'Observer se déclare aveugle (`NOT_OBSERVABLE`) sur mutation/solvabilité/tests alors que `mutation_receipt.json` (263 mutants) existe et que `solvabilite: 50/50` figure dans le verdict qu'il a lu — ses adaptateurs n'extraient pas ces champs.

---

## 1. Chaîne réelle reconstituée (faits mesurés)

Cadre : tout V1→V6 s'est déroulé en working-tree non commité sur 2 jours (tous les `git_head` des manifests = `feaf0df`, le commit AVANT le freeze), puis commité d'un bloc (`b22a980`, 307 fichiers).

| Maillon | Réalité mesurée | Statut |
|---|---|---|
| Intention (charter) | charter.yaml consommé par prisme + check_charter | IMPLEMENTED |
| Interprétation (worldscan/prisme) | Correction humaine `platform_correction.yaml` (Web/JS→Godot) intégrée en amont de s4, tracée, jamais effacée | IMPLEMENTED |
| Contrats | Tous existants, `contract_sha256` vérifié par dispatch ; contrat s9 a changé de contenu entre V2 et V3 | IMPLEMENTED |
| Orchestration | `prepare_dispatch` utilisé partout (700 prepared / 561 executed) MAIS **0 state.json** : `driver.py` bout-en-bout n'a jamais tourné — dispatch manuel étape par étape | PASSIVE (driver) |
| Agents | V1 : s0→s6+s9 · V2 : 6 étapes · **V3-V6 : s9-build SEUL** (lots de correction post-playtest Pierre). Opus dès s0, aucune escalade exercée | IMPLEMENTED |
| Production | games/pacman/ : 232 .gd, 3 cartes, harnais de tests | TESTED |
| Validation | godot_oracle + mutation gate + wiremap : reçus JSON signés pour V1/V2 SEULEMENT. Chiffres V3-V6 (2389→2740 assertions) = prose de manifest, **aucun reçu machine** | TESTED (V1/V2) · DOCUMENTED_ONLY (V3-V6) |
| Preuve | verdict.json + verdict_v2.json signés HMAC ; **aucun verdict_v3/4/5/6.json** — le freeze « v5 VALIDATED » s'appuie sur le verdict V2 + affirmations non signées | TESTED (V2) · UNKNOWN (V5) |
| Lesson | **0 entrée pacman dans lessons.jsonl et failure_events.jsonl** (les lecteurs de `learning_memory.py`). 12/12 erreurs résolues dans error_journal/**html**.jsonl (routage `_domain()` : jeu→"html", godot.jsonl vide). 15 root_causes P1-P6 dans les manifests V3-V6, signés HMAC, **sans lesson_id, jamais relus** | PASSIVE |
| Amélioration | mutation_registry.json (25 entrées process) : 0 pacman · agent_recipes intact · mesuré par l'orchestrateur lui-même : « produire un jeu ne remplit pas ces layers » | PASSIVE |

**Correction du handoff** : « 7 leçons pacman écrites, 5 remontées » (00_CURRENT_CONTEXT) n'a AUCUN reçu dans les fichiers que `premortem_lessons()` lit — affirmation narrative sans trace mécanique.

## 2. Câblages défaillants (liste consolidée, prouvée)

- **Producteurs sans consommateur** : platform_correction.yaml (0 réf dans scripts/) · playtest_report.json (`check_playtest_report.py` existe, appelé par personne) · root_causes des manifests V3-V6 · tool/reasoning_observability.jsonl (lus par leur CLI et les tests uniquement) · chaîne V2 entière.
- **Consommateurs sans producteur** : verify_run/check_wiremap/mutation receipt pour V3-V6 · run_cost() pour V3-V6 (0 ligne télémétrie) · error_journal/godot.jsonl (0 entrée, jamais écrit) · `spawn_authorized` (déclaré audit.py:45, **jamais écrit, 0/1418** — le hook ne journalise pas, le chemin headless le contourne).
- **Boucle de décision V2** (candidate_selector→execution_binding→mcts_selector→agent_factory→execution_proof + search_usage) : île auto-cohérente et testée, **0 référence dans driver.py**, jamais invoquée pour pacman. search_usage structurellement NOT_WIRED lane Godot.
- **Auto-audit aveugle** : studio_selfaudit.mjs surveille une liste fermée de 3 connecteurs — la chaîne V2, check_prerun, mutation_registry dormants sont invisibles → `ok: true` trompeur.
- **check_prerun.py** : créé 3h10 APRÈS le dernier run pacman, prouvé rétroactivement (incident 04_CONTENT, 232k tokens), jamais câblé, jamais testé.
- **Manifest best-effort silencieux** : s4-archi V1 — observability écrite, manifest absent (échec silencieux d'un try/except).

## 3. État des boucles

| Boucle | État | Preuve |
|---|---|---|
| Intention (humain→WHY→mission) | FERMÉE | charter + platform_correction consommés en aval |
| Contrat (mission→contract→validation) | PARTIELLE | contrats vérifiés par hash, mais autorisation (`spawn_authorized`) jamais tracée ; un incident de surcharge manuelle du format de sortie |
| Production (plan→agent→artefact) | FERMÉE | 561 spawn_executed, jeu réel |
| Preuve (artefact→oracle→evidence) | PARTIELLE, **dégradante** | complète V1/V2, purement narrative V3-V6 |
| Apprentissage (erreur→lesson→mutation→run) | **CASSÉE au 2e maillon** | erreurs journalisées (12/12 html.jsonl) mais 0 promotion en lesson, 0 mutation, registres intacts |

## 4. Le paradoxe red-team (mesuré)

V1, reviewer NON indépendant (claude-blind fallback) : 2 BLOQUANTS réels, corrigés. V2, reviewer indépendant (qwen) : 5 findings, 0 falsifiable, F4 contredit par le matériel fourni. **L'indépendance a été obtenue au prix de la valeur.** Aucun contrat n'exige la falsifiabilité d'un finding.

## 5. Ce que seul le playtest humain a vu

Les 15 défauts corrigés en V3-V6 (touches keycode brut, audio jamais émis malgré synthèse complète, mode INERTE 0 divergence/200 ticks, écran fin illisible…) ont TOUS été détectés par Pierre, avec `"oracle": "AUCUN — godot_oracle est VERT"` dans les manifests. Les oracles actuels prouvent la mécanique, pas l'expérience. Le capteur différentiel (0 divergence = producteur sans consommateur runtime) n'a été utilisé qu'en V6, à la main.

## 6. Verdict d'architecte (synthèse en fin de rapport de session)

1. Plus grosse faiblesse : la boucle d'apprentissage est décorative — la production n'écrit dans aucun magasin que le run suivant consomme.
2. Amélioration max autonomie : promotion mécanique manifests.root_cause → lessons.jsonl (+ domaine godot).
3. Premier MCTS : LESSON-PROMOTION (voir rapport).
4. Perte de temps : étendre la chaîne MCTS V2 ou changer le modèle red-team avant de les câbler/contractualiser.
5. Capacité de changement d'échelle : run driver.py bout-en-bout avec state.json + verdict signé par lot de correction.
