# CAMPAGNE BREAKOUT V2 — RAPPORT DE FIN DE BOUCLE (dossier de gate)

*Date : 2026-07-31 · Orchestrateur : Fable 5 (session poste de commande) · Mandat : « MODE
ORCHESTRATEUR V2 — BOUCLE COMPLÈTE BREAKOUT » + « GATES VALIDÉES » (Pierre, verbatim).*

```
software_verdict : OK          (verdict signé run 3, verify_run overall=True)
evidence_verdict : MECHANICAL_VALIDATION_ONLY
claim_verdict    : NO_CLAIM_ALLOWED
decision (driver): HUMANGATE_READY — la décision finale appartient à Pierre
```

---

## 1. État initial → état final

| | Début de boucle | Fin de boucle |
|---|---|---|
| Jeu | inexistant (`games/breakout_v2/` = charter+design+wiremap seuls) | jeu Godot complet, DÉMARRE, se joue à l'écran |
| Charter | proposé, 2 arbitrages en attente | ratifié révision 3 (GATES VALIDÉES), 10 params A_EQUILIBRER |
| Registre capacités | 7 ids Breakout absents | étendus (dérivés des `provides`), `check_collisions` vert |
| Tests | 0 | 305 assertions vertes (28+ fichiers), politique flottante stricte |
| Mutation | non mesurée | **73/73 mutants tués** (run 1 : 59/73 → corrigé run 2) |
| Solvabilité R9 | non mesurée | **50/50 parties gagnées** (bot, max_ticks 10000) |
| Volets observables | 0/11 | 8/11 verts mesurés + 3 render confirmés par capture GPU (§5) |
| Verdict signé | — | OK / HUMANGATE_READY, HMAC vérifié, git ancré `2b38702` |

## 2. Les 3 runs (boucle observer→classifier→corriger→vérifier)

| Run | Résultat | Cause classée | Correction |
|---|---|---|---|
| run 1 (`-082705`) | s9 timeout 1800 s → HALTED, puis reprise : build complet mais s10a BLOCKED (oracle non enregistré), s10s FAIL (orphelin `main.gd`), mutation 59/73 → verdict signé **BLOCKED** honnête | timeout = **harnais** (défaut calibré pour du correctif, pas un greenfield 52 lignes) ; oracle absent = **enregistrement manquant** (orchestrateur) ; orphelin = adresse hors carte ; 14 survivants = tests trop faibles | `--step-timeout 5400` ; `breakout_v2` enregistré dans `scripts/forge/oracles.json` (gabarit Snake, solvabilité du game_contract) ; mission corrective run 2 |
| run 2 (`-101252`) | **chaîne verte premier coup, zéro retry** : mutation 73/73, index propre, verdict OK/HUMANGATE_READY | — | archivé `_run2_20260731/` |
| run 3 (`-111149`) | s9 vert 1er essai (fix F1 + protocole sondes) ; s11 tombé 1× (claude -p rc=1, transitoire) puis OK en reprise ; verdict final **OK/HUMANGATE_READY** | échec s11 = **infra transitoire** | reprise pilotée du driver (aucune intervention sur l'état) |

Mécanismes de la Forge exercés EN PRODUCTION pour la première fois : pool retry même tier
(2/2, run 1), reprise pilotée après HALT (3×), failure_event produit par `_halt_step`
(CV-14), sections cognitives P1 + manifests P4 (dispatch wm1), pré-mortem relisant le
journal à jour entre tentatives (P2).

## 3. Ce qui a été prouvé (preuves mécaniques, rejouables)

- `check_charter` / `check_contract_completeness` / `check_collisions` : passed (GATES 1+2).
- Oracle produit : `node scripts/forge/godot_oracle.mjs games/breakout_v2` → **ALL CHECKS
  PASSED** (305 assertions, solvabilité 50/50).
- Mutation (descripteur signé) : 73/73 tués, budget respecté, baseline verte.
- `verify_run` sur le verdict run 3 : `overall=True` (HMAC, évidence, mutation, git).
- Les 5 oracles standard rejoués après amendement F-A : tous verts (§4).
- Captures GPU : 2 PNG différents, jeu jouable à l'écran (§5).

## 4. Divergences et arbitrages (rien d'absorbé en silence)

1. **F-A (HIGH, red-team run 3) — AMENDEMENT EN ATTENTE DE RATIFICATION** : la promesse
   gelée de `runtime.fixed_step_accumulator` (« aucun rattrapage, EXACTEMENT 1 tick »),
   héritée en CONCEPT de Snake (`no_time_catchup.test.gd`), impose un jeu au ralenti sous
   ~62,5 fps — contradiction avec le critère ratifié DETERMINISME SUR PAS DE TEMPS FIXE.
   L'orchestrateur a amendé `expected_proof` (reste conservé, rattrapage borné
   `MAX_TICKS_PAR_FRAME`, écrêtage anti-spirale) et documenté le tout en **fog F17**
   (`ARBITRAGE_ORCHESTRATEUR_2026-07-31_RATIFICATION_GATE_EN_ATTENTE`). La copie wm1
   historique (`lab/forge_runs/breakout_v2/wiremap.json`) reste intacte. **Geste Pierre :
   ratifier ou inverser (F17.arbitrage_demande).** Leçon inter-jeux proposée : §6-L3.
2. **Gel de règles jamais posé** : le profil `standard_godot` n'a pas s5 (seul poseur du
   gel) et la garde F5d refuse un gel pré-posé — garde d'absence CV-3 (advisory) notée sur
   les 3 runs. Même régime que la calibration Snake. Chantier connu, pas nouveau.
3. **3 volets render FAIL en headless** = artefact d'instrument : le runner
   (`product_oracle_godot.py`) n'exempte que `core_render_frame` codé en dur ; les volets
   pixel de Breakout ont été lancés headless (texture nulle). Sémantique vraie :
   NOT_MEASURED. Compensé par la capture GPU (§5). **Proposition de dégel ciblé** :
   exemption par marqueur (pas par nom), à ratifier.
4. **Red-team non indépendant, par contrat** : s11 déclare `provider=claude-local`
   (opus-4-8 = même famille que le builder) ; LM Studio est UP avec Qwen chargé, mais le
   routage V2 ratifié interdit de changer la matrice sans mesure sur tâche réelle. Le
   drapeau du verdict dit exactement cela. Candidat mesure série E.
5. **Findings advisory restants (run 3)** : F-B (propriété énoncée sans condition de
   plafond), F-C (sondes-adaptateurs sans garde `passed > 0` — latent), F-D (collecteur
   clé par nom de fichier, pas par nom FORGE_ORACLE émis), F-E (pas de garde delta négatif,
   inatteignable en Godot). Consignés, aucun ne gate.
6. **Incidents d'exploitation orchestrateur** (autocritique) : un `cd` dans une commande
   composite a pollué le cwd persistant (2 faux départs de run 3, zéro coût LLM) ;
   scripts PowerShell en ASCII pur désormais (5.1 lit l'UTF-8 sans BOM en ANSI).
7. **Copie wm1 divergée puis restaurée** : le builder a écrit des constats (périmés, état
   run 2) AUSSI dans la copie historique `lab/forge_runs/breakout_v2/wiremap.json` — deux
   vérités vivantes. Résolution : copie divergée PRÉSERVÉE en
   `_run2_20260731/wiremap_rundir_constats_stale.json`, copie historique régénérée depuis
   HEAD (aucune destruction ; le verrou git-guard a refusé le checkout, respecté). Candidat
   leçon : la mission s9 doit nommer LA copie à tenir (la STANDARD), l'autre est en
   lecture seule.

## 5. Playtest

- **Mécanique/visuel (fait)** : jeu lancé en fenêtre GPU (Vulkan, RTX 5080), 2 captures
  écran à T+4 s et T+12 s (`lab/forge_runs/breakout_v2/playtest/`). Constaté : HUD chiffré
  « Vies: 3 · Score: 10→50 » (leçon Pong appliquée), grille seedée 6×10, destruction de
  briques visible (canal vertical creusé — signature du rebond central strict `vx'==0.0`),
  départ immédiat, `points_par_brique=10` observable au score. Captures différentes,
  non monochromes.
- **Ressenti (geste Pierre)** : le feel, le juice, la difficulté — HumanGate. Le studio
  sait depuis shmup que « software_verdict OK ≠ vivant à jouer ».
  Lancer : `<godot> --path games/breakout_v2 --rendering-driver vulkan`

## 6. Leçons — VALIDÉES 2026-07-31 (voir `BREAKOUT_V2_LESSONS_VALIDATION_2026-07-31.md`)

*Les 5 lessons ci-dessous, proposées à la clôture de campagne, ont été validées par Pierre
le 2026-07-31 et écrites dans `lab/reports/lessons.jsonl` (schéma `forge.lesson.v1`,
statut `validated`, génération 2) — première écriture réelle de ce mécanisme. Aucune
implémentation de leur destination (standard/schema/wiremap) n'a été exécutée : chantier
futur distinct.*

- **L1 (harnais)** : un s9 greenfield Godot ≥ 50 lignes de carte dépasse le step-timeout
  par défaut (1800 s) ; 5400 s a suffi (40 min réels). Candidat : défaut par profil.
- **L2 (chaîne)** : l'enregistrement `oracles.json` est un prérequis de campagne non gardé —
  aucun pré-vol ne le vérifie, le trou ne se voit qu'à s10a (BLOCKED tardif). Candidat :
  garde de lancement dans `run_real` (producteur, pas validateur durci).
- **L3 (inter-jeux, la plus précieuse)** : un `reused_from: CONCEPT` transposé sans
  requalification de genre peut être FAUX dans le nouveau contexte (no-catchup : juste
  pour une grille discrète, faux pour une physique temps réel). Candidat : toute reprise
  CONCEPT inter-genres exige une ligne de justification dans la wiremap.
- **L4 (instrument)** : un oracle qui rend FAIL sur ce qu'il ne peut pas mesurer envoie
  réparer la mauvaise chose — la distinction FAIL/NOT_MEASURED du standard doit couvrir
  les volets pixel par marqueur, pas par nom codé en dur.
- **L5 (protocole)** : la convention `FORGE_ORACLE` ne vit que dans le code Snake et le
  runner — aucun document du standard ne la déclare. Candidat : une ligne dans SCHEMA.md.

## 7. Fichiers et gestes de la campagne

- Jeu : `games/breakout_v2/**` (05_SYSTEMS 22 fichiers, 06_RUNTIME 13, 07_TESTS 30+,
  project.godot, main.tscn, tests/run_tests.gd, solvability.gd).
- Artefacts : `lab/forge_runs/breakout_v2/` (state/verdict/rapport red-team run 3 en place ;
  `_run1_20260731/`, `_run2_20260731/` archivés ; `playtest/` ; `tasks_run{1,2,3}.json` ;
  `context/` manifests wm1).
- Studio : `scripts/forge/oracles.json` +breakout_v2 · `scripts/forge/standard/capabilities.yaml`
  +7 ids (commit `2b38702`) · wiremap vivante amendée (F17).
- Effort LLM : 3 runs, 9+5+6 étapes exécutées, 1 pool retry, 0 escalade de tier,
  builder/red-team = opus-4-8 (contrats en vigueur).

## 8. Gestes Pierre à la gate (dans l'ordre)

1. **Ratifier ou inverser l'amendement F-A/F17** (§4.1 — le seul point structurel ouvert).
2. Playtest ressenti (§5) → verdict humain sur le feel.
3. Décider le sort des leçons L1-L5 (§6) et des dégels ciblés proposés (§4.3, L2, L4).
4. Merge/reject/freeze de la campagne (le verdict signé est HUMANGATE_READY, pas décidé).
```
claim_verdict: NO_CLAIM_ALLOWED
```
