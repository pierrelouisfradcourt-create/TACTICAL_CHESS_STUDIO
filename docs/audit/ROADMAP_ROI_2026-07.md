# ROADMAP STRATÉGIQUE ROI — TACTICAL CHESS STUDIO

**Date :** 2026-07-03 · **Branche :** master @ 9263d49 · **Méthode :** audit lecture seule, 4 investigateurs adverses (vérification état / nouvelle couche orchestration / DX-mémoire-coût / cœur moteur+ML), synthèse architecte.
**Périmètre :** ce document **n'est pas** une re-liste de l'audit `AUDIT_COMPLET_2026-06-27.md`. Il mesure la vélocité depuis, corrige ce que l'audit précédent a raté (la couche orchestration IMP-194→236 qu'il n'avait jamais vue), et ajoute la dimension **ROI priorisée** absente jusqu'ici. Il s'articule autour du plan 5 phases ratifié, sans le concurrencer.

```
software_verdict: BLOCKED   (le cœur — force du moteur — est stagnant : ELO delta 19.3→10.0, flat 5 jours, moitié de la barre)
evidence_verdict: MECHANICAL_VALIDATION_ONLY   (preuves fichier:ligne ; aucun build/test exécuté)
claim_verdict:    NO_CLAIM_ALLOWED
```

---

## 0. Thèse stratégique en 6 points (à lire en premier)

1. **La vélocité de remédiation est réelle et bonne.** 8 des 11 findings P0/P1 majeurs de l'audit du 27 juin sont **génuinement corrigés dans le code** en 6 jours (candidate.pt, hooks git câblés, HMAC fail-closed sur write, requirements UTF-8, deploy guard, rust-toolchain, branche CI master, zombie 02 supprimé). Ce n'est pas cosmétique. Le studio *sait* réparer sa dette quand elle est nommée.

2. **Mais l'effort va massivement au méta, pas au produit.** Sur ~43 IMPs traités depuis le 27 juin, l'écrasante majorité concerne la **machinerie d'orchestration** (ECG, Council multi-LLM, Agent Factory, error_journal, single-writer ledger, cockpit_server, Web Reality Agent, SOA router, semantic_oracle). Le **cœur — la force du moteur d'échecs — n'a pas bougé** : ELO delta hybrid−heuristic a *régressé* de 19.3 à 10.0 et stagne depuis 5 jours à la moitié de la barre de déverrouillage (+20). Le studio est devenu **une usine qui fabrique de l'outillage d'usine**, pendant que le produit qu'elle est censée manufacturer (un moteur plus fort) est à l'arrêt.

3. **Le motif « surface affichée > surface câblée » de l'audit précédent s'est reproduit, une couche plus profond.** La nouvelle couche orchestration est **à moitié câblée** : ECG / Council / error_journal / cockpit_server exécutent réellement ; `agent_factory`, `semantic_oracle`, `soa_router` sont du **scaffold prouvé par tests unitaires mais sans aucun appelant runtime** ; le Web Reality Agent est importé mais **nourri d'une liste vide** (`kaizen_autoloop.py:423`, commentaire aveu `l.418 "pas de fetch web ici"`). Progrès sur la forme (les passifs sont testés, pas fictifs), stagnation sur le fond (on continue d'ajouter de la surface non branchée).

4. **La piste neurale/ML a un ROI mesuré négatif aujourd'hui.** `neural = 1000.91 ELO` est le **plancher** du panel — 201 ELO *sous* l'heuristique pure. Le signal du réseau entre à poids `0.30` décroissant (`neural_agent.rs:1108,1145`) et est **numériquement noyé** par des bonus codés à la main plus gros (`finish_capture 0.60`, `finish_net 0.45`…). Pire : le dataset d'entraînement `pool_selfplay.jsonl` est **cassé** — ~40 % des labels `best_move` sont les oscillations A↔B↔A du bug de shuffle, plus la pollution debug-string Rust dans `top_moves`. Entraîner maintenant = apprendre au réseau à imiter l'heuristique faible qui l'a généré (la boucle circulaire que IMP-163 existe pour briser, et qui n'est **pas** faite : `lab/pool_elite.jsonl` MISSING).

5. **La ressource rare n'est pas l'argent, c'est l'attention de Pierre (bus factor = 1).** Coût LLM ≈ 0 $ (tout est local LM Studio :1234 ; seul Gemini dans `council.py` est payant, opt-in, non métré). Le vrai coût est **le cérémonial par IMP** (event HMAC + ledger + DREAMS.md + triple-verdict + HumanGate) et le **coût de démarrage à froid** (LM Studio GUI + 3 modèles à charger à la main + HMAC key hors repo + 3 mécanismes de bring-up divergents ps1/sh/supervisord). 112 Mo de travail `llm-lego/` et le vault `studio_brain/` sont **non versionnés** — une panne disque efface la Phase 4 et la Phase 3.

6. **La mémoire a trois référents contradictoires et aucun mécanisme de synchro.** `studio_brain/` (vault Obsidian, non commité sauf 1 fichier), `~/.claude/.../memory/` (auto-mémoire réellement chargée au boot), et la prose de `CLAUDE.md` (qui **se contredit elle-même** : le haut dit « lis `studio_brain/` », le système charge `memory/MEMORY.md`). La Phase 3 « Obsidian centralisation » **ajoutera un 4ᵉ référent** si elle ne commence pas par en supprimer un.

> **Verdict de synthèse :** le noyau moteur reste honnête et le socle de gouvernance est maintenant réellement câblé (vrai gain vs 27 juin). Mais Studio dépense sa vélocité sur la couche de contrôle pendant que sa raison d'être — un moteur d'échecs qui progresse — est gelée depuis une semaine, avec une piste ML dont la mesure est désormais *négative*. Le risque dominant n'est plus l'inertie des garde-fous (largement corrigée) : c'est la **mauvaise allocation de l'effort** — construire de la méta-machinerie autour d'un cœur stagnant.

---

## 1. Scorecard de vélocité — findings du 2026-06-27 re-vérifiés à HEAD

Mesure honnête de la vitesse réelle (preuves dans le code, pas dans les messages de commit).

| Finding 27/06 | État au 03/07 | Preuve |
|---|---|---|
| P0-1 train.py écrase latest.pt | ✅ **FIXED** | `ml/train.py:632-640` `save_candidate_checkpoint()` + guard RuntimeError si basename==latest.pt ; aucun write latest.pt (IMP-184) |
| P0-3 CI trigger `main` | ✅ **FIXED** | `canonical-ci.yml:11-13 push: branches:[master]` |
| P0-5 zombie 02_CHEATSHEET | ✅ **FIXED** | seul `08_COMMAND_CHEATSHEET.md` subsiste dans le dir canonique |
| P1-6 hooks non câblés | ✅ **FIXED** | `core.hooksPath → .claude/hooks` (pre-commit + validate-commit-msg réels) (IMP-186) |
| P1-7 HMAC fail-open | ✅ **FIXED** (write) | `ingest_event.py:277-338` `verify_event_log(raise_on_fail=True)` avant tout append (IMP-207) |
| P1-11 requirements UTF-16+BOM | ✅ **FIXED** | `requirements.txt` UTF-8 pur, `ml/requirements.txt` idem |
| P1-12 deploy_studio.sh écrase CLAUDE.md | ✅ **FIXED** | `deploy_studio.sh:20-23` guard `[ -f CLAUDE.md ]` |
| P2-8 pas de rust-toolchain | ✅ **FIXED** | `rust-toolchain.toml` présent (root) |
| **P0-2 CI ne compile/teste rien auto** | ⚠️ **STILL-OPEN** (par choix) | `canonical-ci.yml:4-19 paths:` exclut `src/**` et `ml/**` ; `chess-test.yml` reste `workflow_dispatch` — délibéré (« billing control ») mais aucun changement code ne déclenche de test |
| **P0-4 nav index → chemin mort** | ❌ **STILL-OPEN** | `00_NAVIGATION_INDEX.md:71` pointe encore `repos/games/TacticalChessPureLab/` (inexistant) — non touché |
| **P1-4 neural_config.rs panic! prod** | ❌ **STILL-OPEN** | `src/agents/neural_config.rs:15,61,68` panic! + unwrap :76,78,80 inchangés |

**Lecture :** vélocité solide sur le cluster infra/doc/encodage. Les 3 survivants sont révélateurs : P0-2 est un choix assumé (coûts CI), mais **P0-4 et P1-4 sont des corrections triviales (« supprimer/réécrire une ligne ») simplement jamais faites** — signal faible d'un backlog qui privilégie le neuf sur le nettoyage nommé.

---

## 2. Ce que l'audit du 27 juin a raté — la couche orchestration IMP-194→236

L'audit précédent s'arrêtait à IMP-183. Depuis, une couche de contrôle entière a été ajoutée. Verdict câblage (preuves d'appel réelles) :

| Sous-système | Verdict | Preuve |
|---|---|---|
| ECG state machine (IMP-195/203) | 🟢 **WIRED** | `governance/ecg.py` importé `kaizen_loop.py:45`, gate de close `l.243-256` |
| Council multi-LLM (IMP-198/208/211/236) | 🟢 **WIRED** | `scripts/council.py` appelé `kaizen_autoloop.py:814` (gated governor) + cockpit `POST /api/council/run` |
| error_journal (IMP-202/207) | 🟢 **WIRED** | `kaizen_autoloop.py:795,849,853` (BLOCK/FAIL/exception), best-effort non bloquant |
| cockpit_server.py :8770 (IMP-209/210) | 🟢 **WIRED** | démarré `start_studio.sh:145-166`, sert `/api/{ledger,elo,council,events}` file-backed |
| single-writer ledger guard (IMP-194/205/206) | 🟡 **PARTIAL** | `guarded_write` **est** le write path (`kaizen_loop.py:44`), mais l'enforceur AST `grep_guard_ledger.py` **n'est câblé à aucune CI/hook** — invariant tenu par convention, pas par machine |
| Web Reality Agent (IMP-200) | 🟡 **PARTIAL/mort** | importé `kaizen_autoloop.py:88` mais appelé `to_council_brief([])` liste vide `l.423` ; veille GitHub/HN/arXiv uniquement en CLI standalone |
| Agent Factory (IMP-197) | 🔴 **PASSIVE** | `agent_factory.py` + `capabilities.lock.json` référencés seulement par leur test ; le cockpit spawne un *autre* fichier |
| semantic_oracle (IMP-201) / SOA router (IMP-199) | 🔴 **PASSIVE** | importés uniquement par `test_imp201`/`test_imp199` — zéro appelant runtime |

**Nouvelle dépendance externe (à surveiller) :** `council.py:48,313,333` appelle Google Gemini (`generativelanguage.googleapis.com`). Env-gated (`GEMINI_API_KEY`), sanitizé, fallback Qwen, **non métré**. Ce n'est **pas** une violation « API Anthropic externe » (Claude passe par proxy local :8765, `council.py:303-304` refuse tout base_url non-localhost), mais c'est une **entorse à la posture offline** — et le seul chemin payant du studio est aussi le seul non compté.

**Bilan câblage :** 4 WIRED / 2 PARTIAL / 3 PASSIVE. L'écart affiché-vs-câblé **ne s'est pas résorbé, il a changé de nature** : les nouveaux passifs sont couverts par tests unitaires (« prouvés en isolation, non branchés en prod ») plutôt que fictifs. Progrès qualitatif, dette structurelle identique.

---

## 3. Compréhension globale — vue d'architecte (delta 2026-07)

Le socle décrit par l'audit du 27 juin tient (moteur Rust honnête, control-plane single-writer, doc canonique 00–11). Ce qui a changé et mérite d'être intégré au modèle mental :

- **Le spine de la boucle Kaizen est maintenant réel :** `autopilot → director → dispatch_bridge → kaizen_autoloop → governor.check → council gate → claude-code CLI → kaizen_loop(close via ECG + guarded_write) → ingest_event(HMAC) → state`. C'est un vrai pipeline gouverné, plus un scaffold. **Mais il tourne en dry-run par défaut** et la boucle pleinement autonome reste (à raison) désarmée tant que IMP-184 (fait) *et* la qualité dataset (IMP-163, non fait) ne sont pas réglés.
- **Deux serveurs coexistent :** `autopilot.py` :8765/:7331 (UI + API, monolithe BaseHTTPRequestHandler ~7900 L) et `cockpit_server.py` :8770 (FastAPI, mutations gouvernées + SSE). Chevauchement mineur (`/api/council` des deux côtés lisent le même fichier) — découplage volontaire cohérent avec la doctrine CEO. **À surveiller** : deux frameworks HTTP maison à maintenir par un solo dev.
- **Trois systèmes de bring-up divergent** : `start_studio.ps1` (fonctionne), `start_studio.sh` (WSL cassé), `supervisord.conf` (nouveau, non commité). `infrastructure/ports.yaml` liste LM Studio :1234 (manuel GUI), claude_proxy :8765, canvas_gateway :8766, autopilot :7331, + slots réservés non construits (:9000/:9001).
- **Trois référents mémoire non synchronisés** (cf. §0.6). Zone de confusion documentée par le code lui-même (`00_CURRENT_CONTEXT.md:30-31`).

**Zones insuffisamment documentées / à clarifier :** le destin des 3 modules PASSIVE (factory/oracle/soa), la relation exacte autopilot↔cockpit à terme (fusion ou séparation pérenne), le mode de bring-up canonique unique, et surtout **le fait qu'aucun document ne relie l'effort orchestration à un objectif de force moteur mesurable**.

---

## 4. Benchmark — pratiques modernes réellement pertinentes

Discipline anti-hallucination : chaque item est soit un fait vérifiable, soit marqué `[à vérifier]`.

- **CI sélective par path (chemin, pas tout-ou-rien).** GitHub Actions supporte nativement `paths:` filters et `paths-ignore:`. Studio l'utilise *à l'envers* (limite la CI aux docs). Pratique moderne : job `cargo test`/`pytest` déclenché **uniquement** sur `src/**`/`ml/**`, léger, ~2-3 min. Résout P0-2 sans exploser les coûts. **Fait vérifiable.**
- **Golden/regression testing d'un moteur d'échecs via perft + suites tactiques (WAC, EPD).** Standard de l'écosystème (Stockfish, `python-chess` fournit un parseur EPD). Studio n'a **aucun** test « Rocky évite cavalier-au-bord depuis startpos » ni suite EPD de non-régression. **Fait vérifiable.**
- **Curriculum data > self-play pur pour un moteur faible.** AlphaZero part de zéro *avec MCTS massif* ; à l'échelle solo-dev/CPU, l'amorçage sur parties fortes (Lichess Elite 2400+, ce que vise IMP-163) est la voie réaliste. **Fait vérifiable** (c'est déjà l'intention du studio, non exécutée).
- **Un seul système de mémoire, pas trois.** Les setups agentiques modernes convergent vers *une* source canonique + index (le pattern `memory/MEMORY.md` que Claude Code utilise déjà). Ajouter Obsidian par-dessus sans retirer l'existant = anti-pattern. **Principe vérifiable.**
- **`obra/superpowers` (Phase 1)** — framework de skills TDD pour agents. Existence réelle **[à vérifier]** au moment de l'install (repo public GitHub) ; sa valeur pour Studio dépend de son intégration comme plugin Claude Code, pas confirmable avant test.
- **Supervision de process : un superviseur unique.** `supervisord` est un standard éprouvé ; en faire coexister trois (ps1/sh/supervisord) est le vrai problème. **Fait vérifiable.**

Aucune de ces idées ne demande une équipe. Toutes sont portables par un solo dev.

---

## 5. Priorisation — grille ROI

Échelle : Impact utilisateur/technique (Très fort→Faible) · Coût (Très faible→Très élevé) · Complexité · ROI (Exceptionnel→Faible) · Urgence.

| # | Action | Imp. util. | Imp. tech. | Coût | Cplx | ROI | Urgence |
|---|---|---|---|---|---|---|---|
| 1 | Versionner `llm-lego/` + `studio_brain/` (anti-perte disque) | Fort | Très fort | T. faible | T. faible | **Exceptionnel** | **Critique** |
| 2 | Suite de non-régression moteur (perft + anti-shuffle + EPD) | Très fort | Très fort | Faible | Moyenne | **Exceptionnel** | **Critique** |
| 3 | Commit .gitignore rapports + fix bug dir-parasite (tree clean) | Moyen | Fort | T. faible | T. faible | Élevé | Importante |
| 4 | Réconcilier mémoire : 1 système canonique, corriger CLAUDE.md | Fort | Fort | Faible | Faible | **Élevé** | **Critique** (avant Phase 3) |
| 5 | CI réelle path-filtered `src/**`/`ml/**` (P0-2) | Moyen | Très fort | Faible | Faible | Élevé | Importante |
| 6 | P0-4 nav index + P1-4 panics (dette nommée non faite) | Faible | Fort | T. faible | T. faible | Élevé | Importante |
| 7 | IMP-163 pool_elite.jsonl (briser boucle circulaire dataset) | Fort | Très fort | Moyen | Moyenne | Élevé | Importante |
| 8 | Compteur tokens/coût Gemini (seul chemin payant non métré) | Faible | Moyen | T. faible | T. faible | Moyen | Souhaitable |
| 9 | Trancher les 3 modules PASSIVE (brancher ou archiver) | Faible | Fort | Faible | Faible | Moyen | Souhaitable |
| 10 | Bring-up unique (tuer sh/supervisord, garder ps1) + check LM Studio | Fort | Moyen | Faible | Faible | Élevé | Souhaitable |
| 11 | Améliorer eval/search ouverture (vraie cause du shuffle) | Très fort | Très fort | Moyen | Forte | **Élevé** | Importante |
| 12 | Instrumenter la survie du signal neural (décider go/no-go ML) | Moyen | Fort | Faible | Moyenne | Élevé | Importante |

---

## 6. Roadmap

### Court terme (0–2 mois) — s'insère DANS/ENTRE les phases 1-5 sans les bloquer

**CT-1 · Protéger le travail non versionné [AVANT toute autre chose].**
`llm-lego/` (112 Mo) et `studio_brain/` sont untracked ; une panne disque efface la Phase 4 et la Phase 3.
*Objectif :* décider quoi committer (via `.gitignore` sélectif + Git-LFS pour les gros binaires), pousser sur remote. *Bénéfice :* supprime le risque de perte totale bus-factor-1. *Effort :* 1-2 h. *Risque :* gonfler `.git` (déjà 1,8 Go) → LFS obligatoire. *Dépendances :* gate Pierre (nouveaux fichiers suivis). *ROI :* **Exceptionnel** (assurance quasi gratuite).

**CT-2 · Suite de non-régression du moteur.**
Le shuffle (IMP-234/230) est *contourné* (tie-break `.rev()` + pénalité −50) mais le seul test est `search.rs:2800 s7_removed_italian_not_a1b1` (un seul `!= a1b1`). Un refactor du root-loop réintroduirait le bug en silence.
*Objectif :* (a) test « depuis startpos, Rocky ne joue pas cavalier-au-bord » ; (b) test « tie-break à score égal choisit le mieux rangé » ; (c) amorce d'une suite EPD/perft. *Bénéfice :* le cœur cesse d'être une passoire à régressions. *Effort :* 1-2 j. *Risque :* zone `tests/` protégée → gate Pierre. *ROI :* **Exceptionnel** (protège la seule chose qui compte vraiment).

**CT-3 · Tree clean « vrai » redéfini.**
La porcelain ne sera **jamais** vide tant qu'autopilot tourne (il append des events pendant qu'on lit). *Objectif :* committer le bloc `.gitignore` (+25 lignes déjà écrites, non commitées) couvrant `diagnosis_*.json`/`reflection_*.md`/`director_*`/`studio_state.json` ; **fixer le bug de séparateur de chemin** qui crée le dir-parasite PUA `C\357\200\272…` (le `.gitignore` ligne `C:TACTICAL_CHESS_STUDIO/` ne matche pas la variante) ; redéfinir Phase 0 comme « aucun fichier *suivi* ne churne ». *Effort :* 1 h + traque du bug. *ROI :* Élevé (débloque le critère Phase 0 aujourd'hui inatteignable).

**CT-4 · Réconcilier la mémoire AVANT la Phase 3.**
Trois référents, zéro synchro, `CLAUDE.md` se contredit. *Objectif :* choisir **un** système canonique (recommandation : `memory/MEMORY.md` puisqu'il est réellement chargé au boot), faire de `studio_brain/00_CURRENT_CONTEXT.md` un simple miroir humain, corriger les deux sections mémoire contradictoires de `CLAUDE.md`. *Bénéfice :* un agent qui reprend après une pause ne charge plus le mauvais cerveau. *Effort :* 2-3 h. *ROI :* Élevé, **et prérequis de la Phase 3** (sinon Obsidian devient un 4ᵉ référent).

**CT-5 · Fermer la dette nommée non faite.**
P0-4 (`00_NAVIGATION_INDEX.md:71` → topologie réelle root `src/`+`autopilot.py`, auditer les 89 md qui citent le chemin mort) et P1-4 (`neural_config.rs:15,61,68` panic!→Result/fallback). *Effort :* 2-3 h. *ROI :* Élevé (corrections triviales, un agent suit sinon une carte morte).

**CT-6 · CI réelle mais chirurgicale (P0-2).**
Job `cargo test --release` + `pytest` déclenché **uniquement** sur PR touchant `src/**`/`ml/**` (path-filter à l'endroit). *Bénéfice :* une régression Rust/Python ne merge plus sans détection, coût CI borné. *Effort :* 0,5 j. *Risque :* coûts runner (mitigés par path-filter). *Dépendances :* .github FORBIDDEN → gate Pierre. *ROI :* Élevé.

### Moyen terme (2–6 mois) — structurant

**MT-1 · Briser la boucle circulaire du dataset (IMP-163).**
`pool_selfplay.jsonl` est BROKEN : ~40 % des labels sont des oscillations de shuffle + pollution debug-string ; `lab/pool_elite.jsonl` est MISSING. Tant que ce n'est pas réglé, **relancer train.py = empoisonner le modèle**. *Objectif :* ingérer Lichess Elite 2400+ → `pool_elite.jsonl` (draw_rate < 5 %), re-générer un pool self-play *après* les fixes shuffle, versionner la provenance. *Bénéfice :* condition sine qua non d'un ML non-négatif. *Effort :* moyen. *ROI :* Élevé (débloque la seule voie ML crédible).

**MT-2 · Attaquer la VRAIE cause du shuffle : l'éval d'ouverture plate.**
Le patch actuel traite le symptôme. La cause : en ouverture tous les scores racine sont ~0 → sélection arbitraire. *Objectif :* enrichir `eval.rs` (développement, contrôle du centre, sécurité du roi) pour que l'ouverture soit informative, mesurer via la suite EPD (CT-2). *Bénéfice :* attaque directe du delta ELO stagnant (le levier n°1). *Effort :* moyen-fort. *ROI :* Élevé — **c'est le chemin le plus court vers un moteur plus fort**.

**MT-3 · Décision go/no-go sur la piste neurale.**
Mesure actuelle : neural=1000 ELO (plancher), signal 0.30 noyé par des bonus ≥0.60. *Objectif :* instrumenter « combien de fois la prédiction neurale survit au rerank » + match ELO neural-pur vs heuristique-pure post-IMP-163 ; **décision explicite** : soit rééquilibrer le blend (monter le poids, réduire les bonus codés) et prouver un gain, soit **archiver la piste** et concentrer l'effort sur search+eval. *Bénéfice :* arrête de saigner de l'effort sur un track à ROI mesuré négatif. *ROI :* Élevé (clarté stratégique).

**MT-4 · Trancher les 3 modules PASSIVE + le Web Reality Agent nourri vide.**
`agent_factory`, `semantic_oracle`, `soa_router` : brancher derrière une gate explicite **ou** archiver dans `docs/_intentions/`. WRA : soit câbler le fetch réel avant PLAN (son intention), soit retirer l'import mort. *Bénéfice :* stoppe la reproduction du motif « affiché > câblé ». *ROI :* Moyen-élevé (réduit la surface à maintenir).

**MT-5 · Unifier le bring-up + démarrage à froid documenté.**
Tuer `start_studio.sh` (WSL cassé) et/ou choisir entre ps1 et supervisord — **un seul** mécanisme béni. Ajouter un check step-0 « LM Studio up + 3 modèles chargés + STUDIO_HMAC_KEY présent » avec message d'instruction. *Bénéfice :* le démarrage à froid ne dépend plus de la mémoire de Pierre (le mode de défaillance exact du bus-factor-1). *ROI :* Élevé pour la DX.

**MT-6 · Enforcement machine du single-writer + coût métré.**
Câbler `grep_guard_ledger.py` (AST) dans la CI/pre-commit (aujourd'hui asserté en docstring seulement). Ajouter un compteur tokens/coût dans `council.py` (Gemini = seul chemin payant non métré). *ROI :* Moyen.

### Long terme (6–18 mois) — vision réaliste solo-dev + agents

- **LT-1 · Autoloop réellement armé, mais seulement une fois le dataset sain (MT-1) et une gate oracle non-LLM en place.** Le spine est câblé ; le verrou restant est la confiance dans les données et dans `validate_report` (encore string-match du texte LM, `kaizen_autoloop.py:255-287`). Adosser la fermeture d'IMP à un oracle non-LLM (exit code / verdict signé) avant d'armer.
- **LT-2 · Décider le destin des deux serveurs HTTP maison.** À terme un solo dev ne maintient pas durablement un BaseHTTPRequestHandler de 7900 L *et* un FastAPI. Convergence recommandée : migrer l'UI derrière le FastAPI déjà présent, ou assumer explicitement la séparation et geler autopilot.py.
- **LT-3 · Auto-documentation via Graphify en post-commit hook** (Phase 2 aujourd'hui manuelle/stale, graphe daté du 30 juin). Rebuild automatique = carte du code toujours fraîche pour les agents.
- **LT-4 · Boucle d'apprentissage continu honnête :** self-play *amorcé* sur données fortes → gate ELO signé → déploiement candidate→latest conditionnel. L'infra (candidate.pt, gate) existe depuis IMP-184 ; il manque la donnée saine et la preuve de gain neural.
- **LT-5 · Réduction du cérémonial par IMP** (la vraie dépense). Automatiser la génération event+DREAMS+verdict pour ne laisser à Pierre que la décision de gate, pas la paperasse.

---

## 7. Opportunités cachées (max 5, chacune ancrée dans le repo)

1. **« Régression-gate » du moteur en une commande.** Le studio a déjà un shim UCI Rocky (IMP-232, `a817e37`) et un harnais cross-engine sunfish/stockfish/rocky. En brancher une suite EPD + un match rapide vs Sunfish comme *oracle de non-régression de force* transformerait « Rocky a-t-il régressé ? » d'une intuition en un feu rouge/vert automatique. **Effet wow crédible : un moteur qui refuse de merger un commit qui l'affaiblit.**

2. **Council comme second avis sur la *force*, pas sur la gouvernance.** `council.py` (Gemini+Qwen) est déjà câblé mais sert à juger des IMPs. Le pointer sur l'analyse de positions perdues vs Sunfish (« pourquoi Rocky a-t-il joué ça ? ») en ferait un *coach* de moteur — usage bien plus proche du produit que du méta.

3. **Error_journal → auto-proposition d'IMPs de force.** `error_journal.py` est WIRED et détecte déjà les échecs de boucle. L'étendre aux *défaites d'échecs récurrentes* (motifs de blunder capturés depuis les matchs) alimenterait le ledger en IMPs qui rendent Rocky plus fort, au lieu d'IMPs qui rendent l'usine plus grosse.

4. **Le graphe Graphify (19 933 nœuds) comme détecteur de code mort automatique.** Il existe déjà (`graphify-out/`). Un script trivial « nœuds à 0 appelant runtime » listerait `agent_factory`/`semantic_oracle`/`soa_router` et les ~40 scripts Codex — l'audit passif-vs-câblé deviendrait continu et gratuit (0 token, IMP-204 confirme le coût nul).

5. **Bring-up « preflight » qui vérifie la réalité avant de mentir.** `cockpit_server.py` sert déjà des données file-backed avec health-checks. Un endpoint `/preflight` qui affiche VÉRIFIÉ-par-oracle vs SUPPOSÉ (LM Studio répond ? 3 modèles chargés ? HMAC présent ? dernier ELO signé ?) tuerait le démarrage-à-froid tacite — extension directe du skill `/fog` existant.

---

## 8. Risques

| Risque | Gravité | Probabilité | Impact | Solution |
|---|---|---|---|---|
| **Mauvaise allocation de l'effort** : méta-machinerie vs cœur stagnant | **Élevée** | **Réalisée** | Le moteur ne progresse plus depuis 5 j pendant que le control-plane grossit | Intercaler MT-2 (eval ouverture) et CT-2 (tests régression) dans le plan ; définir un objectif de force mesurable |
| **Perte disque du travail non versionné** (llm-lego 112 Mo, studio_brain) | **Élevée** | Moyenne | Phase 4 et Phase 3 effacées, irrécupérables | CT-1 immédiat |
| **Bus factor = 1** : démarrage à froid dépend de la mémoire de Pierre | **Élevée** | Élevée (après chaque pause) | Studio inopérant après une interruption | MT-5 (bring-up unique + preflight) + CT-4 (mémoire réconciliée) |
| **Entraîner sur données empoisonnées** (pool_selfplay BROKEN) | Élevée | Élevée si train relancé | Modèle régresse en apprenant le shuffle | Verrou IMP-163 tenu (MT-1) avant tout relaunch |
| **Piste ML à ROI négatif poursuivie par inertie** | Moyenne | Élevée | Effort brûlé sur neural=1000 ELO | MT-3 : décision go/no-go explicite et datée |
| **Dette de garde-fous non-machine** : single-writer AST + validate_report string-match | Moyenne | Moyenne | Fermeture d'IMP contournable, invariant ledger par convention | MT-6 + LT-1 (oracle non-LLM) |
| **Dépendance Gemini non métrée** (posture offline + coût aveugle) | Faible | Faible (opt-in) | Coût surprise + entorse offline | Compteur tokens (MT-6), garder opt-in |
| **Deux serveurs HTTP maison à maintenir** (autopilot 7900 L + cockpit) | Moyenne | Certaine à terme | Charge de maintenance solo insoutenable | LT-2 : décider convergence vs gel |
| **Critique du plan 5 phases** (voir ci-dessous) | Moyenne | — | Le plan investit 100 % dans le méta | Intégrer, ne pas remplacer — cf. encadré |

**Sur le plan 5 phases (demandé : le critiquer dans les Risques, pas produire une roadmap parallèle).** Le plan est sain et ratifié ; je ne le remplace pas. Mais **ses 5 phases (Superpowers TDD, Graphify, Obsidian, frontend-design, couplage) portent toutes sur le méta — outillage dev, mémoire, UI — aucune sur la force du moteur.** Or c'est la force du moteur qui stagne. Recommandation : **conserver le plan, mais y intercaler explicitement CT-2 et MT-2** comme jalons de premier rang, et faire de la Phase 3 (Obsidian) un successeur de CT-4 (réconciliation mémoire) et non un ajout par-dessus. Deux ajustements d'ordonnancement, zéro remise en cause de fond.

---

## 9. Top recommandations

### Top 10 ROI (ordonné)

| # | Amélioration | Pourquoi maintenant | Effort | ROI | Horizon |
|---|---|---|---|---|---|
| 1 | Versionner llm-lego/ + studio_brain/ | 112 Mo à une panne disque de la disparition | 1-2 h | Exceptionnel | CT |
| 2 | Suite non-régression moteur (perft/anti-shuffle/EPD) | Le fix shuffle n'a qu'un test ; le cœur est une passoire | 1-2 j | Exceptionnel | CT |
| 3 | Réconcilier la mémoire (1 canonique, fix CLAUDE.md) | 3 référents contradictoires, prérequis Phase 3 | 2-3 h | Élevé | CT |
| 4 | Éval d'ouverture informative (vraie cause du shuffle) | Attaque directe le delta ELO stagnant — levier n°1 | Moyen | Élevé | MT |
| 5 | IMP-163 pool_elite (briser la boucle circulaire) | Sans ça, tout ML est négatif | Moyen | Élevé | MT |
| 6 | CI réelle path-filtered src/ml (P0-2) | Régression code merge aujourd'hui sans détection | 0,5 j | Élevé | CT |
| 7 | Décision go/no-go neural (MT-3) | ROI mesuré négatif, ne pas continuer par inertie | Faible | Élevé | MT |
| 8 | Fermer P0-4 nav + P1-4 panics | Dette triviale nommée, jamais faite | 2-3 h | Élevé | CT |
| 9 | Bring-up unique + preflight | Bus-factor-1 : démarrage à froid fragile | Faible | Élevé | MT |
| 10 | Trancher les 3 modules PASSIVE + WRA | Stoppe la reproduction affiché>câblé | Faible | Moyen | MT |

### Les 3 décisions les plus importantes pour l'avenir de Studio

1. **Réorienter l'effort du méta vers le cœur — ou l'assumer explicitement.** Studio a passé une semaine à câbler de la gouvernance pendant que la force du moteur régressait. La décision structurante : **définir un objectif de force mesurable (delta ELO ≥ +20, ou N points vs Sunfish) comme métrique nord**, et subordonner l'orchestration à ce but. Sans ça, le studio optimisera indéfiniment sa propre machinerie. *Impact 2-3 ans :* détermine si Studio produit un moteur fort ou seulement une belle usine.

2. **Trancher la piste neurale/ML sur preuve, pas sur espoir.** neural=1000 ELO (plancher), signal noyé, données empoisonnées. Soit on prouve un gain après IMP-163 + rééquilibrage du blend, soit on archive et on réinvestit tout dans search+eval. *Impact :* évite des mois d'effort sur un track dont la seule mesure objective est aujourd'hui négative — et clarifie l'identité du projet (moteur heuristique fort assumé vs pari neural).

3. **Résoudre le bus-factor-1 par l'infrastructure, pas par la mémoire humaine.** Mémoire canonique unique, bring-up unique avec preflight, travail versionné. *Impact :* détermine si Studio survit à une interruption de Pierre. Aujourd'hui, une pause de quelques semaines rendrait le démarrage à froid douloureux et risquerait la perte de 112 Mo non versionnés. C'est le risque existentiel le moins glamour et le plus réel.

---

## Articulation avec le plan 5 phases ratifié

| Phase ratifiée | Action de cette roadmap à intercaler | Pourquoi |
|---|---|---|
| Phase 0 (baseline) | CT-1, CT-3 | « Tree clean » est inatteignable tel quel ; protéger l'untracked d'abord |
| Phase 1 (Superpowers TDD) | CT-2 (suite non-régression moteur) | Un framework TDD sans tests moteur à faire tourner est vide ; CT-2 lui donne sa première cible |
| Phase 2 (Graphify) | Opportunité 4 (détecteur code mort) | Graphify déjà câblé ; l'exploiter pour l'audit passif-vs-câblé continu |
| Phase 3 (Obsidian) | CT-4 (réconciliation mémoire) **en prérequis** | Sinon Obsidian = 4ᵉ référent contradictoire |
| Phase 4 (frontend-design) | CT-1 (versionner llm-lego) **en prérequis** | 112 Mo de Phase 4 sont non versionnés |
| Phase 5 (couplage) | MT-4, MT-6, LT-1 | Ne coupler que des systèmes câblés et enforced-machine |

---

*Audit produit en lecture seule. Aucun fichier source, dataset, ledger, test ou golden modifié. Aucun git mutant, aucun build/test exécuté. Toutes les allégations reposent sur des références `fichier:ligne` vérifiées par 4 investigateurs adverses indépendants. Le working tree est vivant (autopilot append des events pendant l'audit) : les compteurs de statut sont une cible mouvante.*

software_verdict: BLOCKED · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED
