# Rapport pré-production — vertical slice shoot'em up 2D

> Date : 2026-07-14 · Source : audit multi-agents (5 auditeurs + contre-audit, workflow
> `supervision-forge-shmup-baseline`, ~700k tokens, preuves fichier:ligne re-vérifiées par
> exécution) · Auteur : Fable 5, directeur de production Forge (Mission 0)
> `claim_verdict: NO_CLAIM_ALLOWED` — ce rapport décrit l'état observé et un plan ; il ne
> certifie pas le résultat du run à venir.

## 0. Objet et scope de référence

Premier projet de validation de la Forge : shoot'em up 2D solo (inspiration Space
Invaders / Pop'n TwinBee). **Scope figé (addendum Pierre 2026-07-14)** : joueur
contrôlable, tir joueur, ennemis, patterns d'attaque simples, collisions, score, vies,
3 petites maps, 3 boss simples, écran victoire/défaite, build jouable. Toute dérive
au-delà sera signalée, pas absorbée. Réussite double : (1) jeu fonctionnel,
(2) apprentissages sur la Forge elle-même.

## 1. Verdict de readiness

**NO-GO immédiat → GO après préparations bornées (P1–P3 mécaniques + charter P5).**

La chaîne contractuelle est réelle et gouvernée (16 contrats complets, dry-run full
exit 0, 309 tests pytest collectés, hook dur `pretool_forge_guard` ACTIF dans
`.claude/settings.json` — les docs qui le disent « différé » sont périmées). Mais :

- **Aucun run `full` réel n'a jamais eu lieu** (seul `patch` 4 étapes prouvé —
  `lab/forge_runs/driver_smoke/`, verdict re-vérifié AUTHENTIQUE exit 0).
- **Bloqueur n°1 (mécanique, prouvé fichier:ligne)** : l'exécuteur réel
  `scripts/forge/run_real.py` est incapable de greenfield —
  `_STEP_TOOLS["s9-build"] = ("Edit","Read")` (l.39 : Edit ne CRÉE pas de fichier),
  s4/s5 sans canal d'écriture (`blueprint.json`/`wiremap.json` jamais posés →
  s10b/s10c BLOCKED structurels, comportement prouvé par
  `test_full_sans_blueprint_va_au_bout_mais_verdict_blocked`),
  `context["model_override"]` jamais lu (l.117 : l'escalade haiku→sonnet→opus décidée
  par le driver est un **no-op silencieux** en run réel), timeout 600s (l.73) déjà
  dépassé par le seul s9 full mesuré (888s, breakout), `is_game=False` en dur (l.189).
- Point de doctrine décisif : le contrat ratifié s9-build **autorise déjà**
  `create: fichiers de son ownership` + `run: l'oracle code`
  (`s9-build.yaml:55-58`). Le correctif est donc un **alignement exécuteur↔contrat**
  (précédent exact : s2.5-artbible a reçu `("Write","Read","Bash")` pour la même
  raison, `run_real.py:41-44`), **pas** une modification de contrat.

## 2. Le découpage est-il réaliste ?

Oui sur le fond (le scope est un vertical slice honnête), mais il est **2–3 crans
au-dessus du maximum démontré** par la chaîne :

| Axe | Max démontré (preuve) | Demandé |
|---|---|---|
| Temps réel + projectiles | survival_arena, tir AUTO non testé par l'oracle (advisory rouge dans son propre verdict) | tir joueur dirigé + tirs ennemis |
| Patterns de tir ennemis | **NOT_FOUND dans tout le repo** (tous les ennemis existants = contact/poursuite) | patterns simples |
| Boss | 1 boss max, jamais par la chaîne Forge en temps réel | 3 boss |
| Multi-maps | 3 niveaux paramétriques (breakout — sans verdict signé ; collect_runner — verdict FAIL) | 3 maps conçues |
| Verdict 3-oracles OK temps réel | AUCUN (le seul 3-oracles OK + mutation 100% = menagerie_tactics, tour-par-tour, worktree non mergé) | requis |
| Taille | ~1 600 lignes temps réel (breakout) | estimé ×2–3 |

**Décision de pilotage** : scope final INCHANGÉ, mais build **jalonné à l'intérieur du
run** — Jalon A : 1 map + 1 boss + patterns, prouvé par solvabilité/e2e/mutation ;
Jalon B : extension 3 maps + 3 boss. Le jalon A est le point d'arrêt honnête si la
chaîne casse (on saura précisément où).

## 3. État par étape (vocabulaire imposé)

| Étape | Statut | Preuve / écart clé |
|---|---|---|
| s0-contrat → s6-redteam | TESTED (schéma+dry-run+dispatches réels) | dry-run full exit 0 ; s6 dépend LM Studio :1234 — **vérifié UP le 2026-07-14** |
| s2.5-artbible | TESTED, **hors profil full** (décision Pierre) | profil dédié `--profile artbible` ; à séquencer explicitement |
| s9-build | TESTED (contrat) / **BLOCKED (exécuteur)** | contrat autorise create ; exécuteur Edit-only — P1 |
| s10a oracle-code | TESTED | entrée `oracles.json` shmup à créer au format breakout |
| — volet solvabilité | **DOCUMENTED_ONLY** | exigé par la prose du contrat, **aucune garde mécanique** (grep `solvab` dans static_oracles.py = 0) — trou n°1, leçon survival_arena/collect_runner (2 jeux injouables verts) — P2 |
| — garde e2e | TESTED | aveugle au multi-niveau : un e2e map-1-seulement passe — compensé par charter+WireMap (P5) |
| — gate mutation | TESTED | multi-fichiers OK ; suite de tests à garder rapide ; tests éclatés ⇒ `test_argv` explicite |
| s10b/s10c archi/wiremap | TESTED | BLOCKED structurel tant que P1(b) non fait |
| s10d oracle-visual | PASSIVE (advisory, hors chaîne) | seuils calibrés Breakout uniquement ; config par jeu hardcodée — **exclu du run v1, déclaré** |
| s11-redteam-code | TESTED | Qwen UP vérifié |
| s12-verdict + verify_run | TESTED | **bug console cp1252** : warning ⚠ → UnicodeEncodeError → exit 1 à tort dès dérive git — P3 |
| Précédent genre shmup | **NOT_FOUND** | première sur 4 axes simultanés |
| Assets (vaisseau, 3 boss, 3 fonds) | **BLOCKED** | catalogue KB : 0 asset utilisable ; aucun générateur câblé nulle part |
| Briques KB réutilisables | IMPLEMENTED (2 pertinentes) | sys-pursuer-continuous (candidate, jamais prouvée en jeu), sys-damage-floor (validated) ; reuse_ratio atteignable ~0.15–0.30 |

## 4. Préparations avant lancement (préparation ≠ production du jeu)

| ID | Quoi | Nature | Fichiers |
|---|---|---|---|
| **P1** | Exécuteur greenfield : (a) s9-build → `Write,Edit,Read,Bash` bornés (alignement au contrat) ; (b) matérialisation déterministe `blueprint.json`/`wiremap.json` dans run_dir depuis les artefacts s4/s5 (préférer le canal exécuteur au don d'outils LLM) ; (c) honorer `model_override` ; (d) timeout CLI (défaut relevé) ; (e) flags `--is-game/--logic-files/--mutation-test-argv/--oracle-config/--pool-size` ; (f) `task_by_step` couvrant toutes les étapes ; (g) injecter `premortem` | Alignement exécuteur↔contrat | `run_real.py` + nouveaux tests |
| **P2** | Garde `check_solvability_wired` symétrique à `check_e2e_harness`, câblée au driver au même titre que la garde e2e | Enforcement d'une exigence contractuelle déjà ratifiée (s9-build tests_oracles) | `static_oracles.py`, `driver.py` + nouveaux tests |
| **P3** | Fix crash cp1252 de `verify_run.py` (sortie ASCII-safe ou stdout utf-8) | Bugfix 1 ligne | `verify_run.py` + test |
| **P4** | Création `games/<shmup>/` + entrée `oracles.json` au moment du run | Acte d'orchestrateur, tracé au gate d'entrée du run | — |
| **P5** | Charter shmup : critères mesurables (cf. §6) | Rédaction orchestrateur, entrée de s0 | `lab/forge_runs/<run>/charter.yaml` |
| **P6** | Config capteur s10d pour shmup | **REPORTÉ** (advisory, gate séparée requise par son contrat) | — |

Règles respectées : aucun commit (gate Pierre) ; aucun fichier de test existant modifié
(ajouts uniquement) ; `tests/**` racine intouché ; contrats intouchés.

## 5. Risques majeurs

1. **Première full réelle** : chaque étape LLM du profil full n'a jamais été enchaînée
   par le driver avec un vrai exécuteur — s'attendre à des casses d'orchestration, les
   documenter (c'est le 2e livrable).
2. **Solvabilité shmup = problème plus dur que tout précédent** : un bot déterministe
   doit finir 3 maps et battre 3 boss (esquive+tir ; risque de faux INJOUABLE si bot
   naïf — averti par le template l.47-48). Mitigation : exigences charter §6
   (déterminisme seedé, patterns esquivables par construction, hooks debug par niveau).
3. **Builder Haiku par défaut** sur le plus gros build temps réel jamais tenté ;
   l'escalade n'est correcte qu'après P1(c). Pool best-of-2 au même tier en amortisseur.
4. **Identité visuelle** : 0 asset, pas de générateur — voie par défaut = canvas dessiné
   en code (voie prouvée), art bible en amont pour la cohérence. L'écart esthétique vs
   Pop'n TwinBee est un fait assumé, tranché à HumanGate.
5. **Fragilité des preuves** : tous les verdicts passés sont non commités (`??` git) ;
   les verdicts legacy sont REJET à la re-vérification. Le run shmup doit produire un
   verdict re-vérifiable (P3) et ne subir aucun commit pendant le run (TOCTOU).
6. **Périmètre mutation** : logique shmup riche en `>=`/`&&` ⇒ beaucoup de mutants ;
   suite logic+properties à garder < 2–3 s.

## 6. Exigences à encoder dans le charter (issues du contre-audit)

- `criteres_succes[]` nommant explicitement : 3 maps, 3 boss, vies, écran
  victoire/défaite, transition de map prouvée, `boss_defeated` par boss.
- **Déterminisme** : logique headless `step(DT=16ms, input)` seedée, découplée du rendu
  (accumulateur temps fixe côté rAF) — condition de possibilité de solvabilité,
  properties et mutation. Interdit : `Math.random()` nu.
- **Patterns vérifiables** : chaque pattern = données (pas cascade de branches), trace
  golden seedée + invariant d'esquivabilité (un couloir sûr existe à chaque frame de la
  simulation de référence).
- **Hooks PLAYABLE_CONTRACT étendus** : `window.__game` expose `{level, lives, score,
  over, bossHp}` ; `window.__game_debug` expose `setLevel(n)`, `spawnBoss(n)`,
  `forceWin()`, `forceLose()` — l'e2e DOIT visiter les 3 maps et vaincre les 3 boss via
  ces hooks + un parcours réel map 1.
- Sémantique de progression : score/vies conservés entre maps ; boss vaincu ⇒
  transition ; défaite ⇒ restart du run ; à écrire noir sur blanc.
- Livrable « build jouable » : `node server.mjs` + log « interface jouable » + README
  2 lignes (lancement + contrôles) — checklist HumanGate = /playtest (bugs oracle vs
  feel Pierre).
- Perf (advisory) : plafond de projectiles simultanés déclaré + pooling ; mesure fps
  non gatée, consignée.

## 7. Décisions

**Décisions d'orchestrateur (réversibles, tracées ici, ratifiables au gate final)** :
séquencement `artbible` en profil dédié après s1 (respecte la décision Pierre de ne pas
l'inclure dans full) ; assets = canvas-only (aucun octet réseau — l'ingestion CC0 type
Kenney Space Shooter reste une option OUVERTE offerte à Pierre, jamais exécutée sans
gate) ; s10d exclu du run v1 ; jalonnage A/B du build ; aucune écriture durable
(ledger/commit) sans go.

**Restent à Pierre (gates explicites, AUCUNE exécutée par la Forge)** : commit des
préparations et du run ; ingestion d'assets réseau ; promotion de briques KB candidates ;
merge/reject du jeu ; toute écriture ledger.

## 8. Budget (première estimation honnête — aucune baseline full n'existe)

Base observée : s9 patch réel = 888 s / ~5–6k tokens facturés par appel (télémétrie
breakout/driver_smoke) ; panel Prisme = 6 appels à s1 ; 8 étapes LLM + escalades/pool
possibles (cap 2 escalades + best-of-2). Enveloppe estimée : **15–30 appels `claude -p`,
1–3 h wall-clock**, coût $ capturé en réel par `total_cost_usd` par appel. Critère
d'arrêt : 2 étapes consécutives HALTED/BLOCKED non auto-corrigeables → STOP + rapport,
pas d'acharnement.

## 9. Rapport obligatoire

```
software_verdict: BLOCKED   (chaîne full non exécutable en l'état — P1..P3 requis)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
