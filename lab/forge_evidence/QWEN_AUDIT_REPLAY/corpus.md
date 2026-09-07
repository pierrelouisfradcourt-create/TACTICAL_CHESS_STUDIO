# CORPUS — QWEN_AUDIT_REPLAY

Assemblé le 2026-08-07 depuis les fichiers réels du dépôt `C:\TACTICAL_CHESS_STUDIO`.
Ce corpus est le SEUL matériel montré à qwen2.5-14b-instruct pour les 3 audits rejoués
(A1/A2/A3). Il est identique pour les deux générations de chaque audit.

**Asymétrie de harnais (à documenter, pas à compenser)** : les audits Claude originaux
(post-mortem du 2026-08-07) étaient agentiques — lecture multi-fichiers outillée, recherche
libre dans le dépôt, capacité à recouper plusieurs sources. Qwen ici reçoit un corpus figé,
assemblé par l'expérimentateur, sans outils, en une seule complétion. Ce n'est PAS une
mesure de "Qwen égal à Claude" — c'est une mesure de ce que Qwen produit à partir d'un
paquet de preuves fixe. Toute différence de rappel doit être lue à travers ce filtre.

**Note de fraîcheur des données** : deux fichiers cités par la mission (`dispatch_audit.jsonl`,
`lab/reports/observer/pacman/observer_run.json`) ont visiblement changé depuis l'écriture du
post-mortem (2026-08-07, même jour, session antérieure) — voir §2 et §5 pour le détail. Le
corpus documente l'écart au lieu de le masquer.

---

## 1. verdict.json et verdict_v2.json (lab/forge_runs/pacman/) — champs clés

### verdict.json (run pacman-20260805-r1, V1)

```json
{
  "run_id": "pacman-20260805-r1",
  "software_verdict": "OK",
  "evidence_verdict": "MECHANICAL_VALIDATION_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED",
  "decision": "HUMANGATE_READY_WITH_OBJECTION",
  "oracles": {
    "code": { "status": "OK", "detail": { "returncode": 0, "mutation_gate": { "passed": true, "total": 150, "survivants_non_tries": [] } }, "ts": 0.0 },
    "archi": { "status": "OK", "detail": { "controle_positif": { "passed": false, "violations": [["06_RUNTIME","05_SYSTEMS"]], "lecture": "passed=False ATTENDU : prouve que l'oracle VOIT les imports" } }, "ts": 0.0 },
    "wiremap": { "status": "OK", "detail": { "passed": true, "features_manquantes": [], "obsoletes": [] }, "ts": 0.0 }
  },
  "redteam_reviewer": "claude-blind (fallback)",
  "redteam_ran": false,
  "ts": 0.0,
  "redteam_advisory": [
    "B1 bot en boucle ouverte (CORRIGE au build)",
    "B2 protocole de sortie exit non nul (CORRIGE)",
    "M6 scripts/forge/oracles.json ecrit hors du perimetre declare au charter (NON RESOLU, HumanGate)",
    "M1 7 lignes de wiremap dont requires traverse une arete interdite (NON RESOLU, HumanGate)"
  ],
  "humangate_flags": [
    "red-team dégradé: reviewer indépendant n'a pas tourné (fallback)",
    "redteam NON INDEPENDANT : lmstudio:1234 down, fallback claude-blind (meme famille de modele)",
    "preuve VISUELLE (pixel) non faite : --headless rend une texture nulle, fenetre GPU requise",
    "jouabilite humaine non evaluee : 12 criteres de demo du charter = fog HumanGate"
  ],
  "hmac": "1031b75d214b3f5a4f2560b209656654fb479ba1cdf6fc5f7df2421351037e7d"
}
```

### verdict_v2.json (run pacman-v2-20260805, V2)

```json
{
  "run_id": "pacman-v2-20260805",
  "software_verdict": "OK",
  "evidence_verdict": "MECHANICAL_VALIDATION_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED",
  "decision": "HUMANGATE_READY_WITH_OBJECTION",
  "oracles": {
    "code": { "status": "OK", "detail": { "returncode": 0, "assertions": 2212, "solvabilite": "50/50 sur 2 cartes", "mutation_gate": { "passed": true, "total": 263, "survivants_non_tries": [] } }, "ts": 0.0 },
    "archi": { "status": "OK", "detail": { "controle_positif": { "passed": false, "violations": [["06_RUNTIME","05_SYSTEMS"]] } }, "ts": 0.0 },
    "wiremap": { "status": "OK", "detail": { "passed": true, "wiremap_v1_non_regression": true }, "ts": 0.0 }
  },
  "redteam_reviewer": "qwen2.5-14b-instruct",
  "redteam_ran": true,
  "ts": 0.0,
  "redteam_advisory": [
    "qwen F1..F5 : 5 findings rendus, AUCUN falsifiable (tous de la forme 'le plan ne precise pas comment gerer X')",
    "qwen F4 classe BLOQUANT affirme que le plan ne dit pas comment traiter les cartes cassees — CONTREDIT par le materiel fourni, qui l'enonce en A5"
  ],
  "humangate_flags": [
    "redteam INDEPENDANT cette fois (LM Studio UP, preflight execute AVANT le run) — mais valeur des trouvailles NULLE : 0 finding falsifiable. V1 avec un fallback claude-blind NON independant avait rendu 2 BLOQUANTS reels et verifies.",
    "metrique 1 ATTEINTE : ajouter une carte = 0 fichier 05_SYSTEMS (baseline V1 : 4)",
    "preuve VISUELLE (pixel) toujours NOT_MEASURED : --headless rend une texture nulle",
    "jouabilite humaine non evaluee : 4 exigences a juge humain (R60-R63) + R41/R42 = 6 exigences qu'aucun oracle ne tranche (PROOF_KINDS n'a pas de valeur 'human')",
    "total mutants 267 -> 263 : la reecriture de la garde menu_model en forme positive a supprime 4 sites de mutation, en corrigeant un bug reel d'index negatif GDScript",
    "cout V2 = 63% de V1 (1 639 920 vs 2 598 728 tokens) pour un perimetre plus large — mais V2 est un INCREMENT, pas un second jeu : la question 'jeu 2 moins cher que jeu 1' reste OUVERTE"
  ],
  "hmac": "dd7cbfe00634cdf8cc0239343737f04f1abc792d5bc3d720de697b8a321bd2a0"
}
```

**Aucun `verdict_v3.json`, `verdict_v4.json`, `verdict_v5.json`, `verdict_v6.json` n'existe** dans
`lab/forge_runs/pacman/` (vérifié par listing, §5).

---

## 2. Comptages `dispatch_audit.jsonl` (recalculés cette session, honnêtement)

Fichier : `lab/forge_evidence/dispatch_audit.jsonl`.

**Recalcul mécanique (2026-08-07, cette session)** :
- total lignes : **1502** (JSON valide sur 100% des lignes)
- `event: "spawn_prepared"` : **748**
- `event: "spawn_executed"` : **597**
- `event: "spawn_authorized"` : **0** (cette clé n'apparaît NULLE PART dans le fichier — 0 occurrence même en recherche texte brute)
- 157 lignes n'ont AUCUNE clé `event` (schéma plus ancien, ex. `run_id: "chesscolor-run1"`, étapes `s0-contrat`/`s1-prisme`/`s2-worldscan` — pas des runs pacman)

**Écart avec la mission** : la mission cite 1418 lignes / 700 prepared / 561 executed / 0 authorized
(chiffres du post-mortem écrit plus tôt le même jour). Le fichier a grossi de 84 lignes depuis
(travail Asset Library, commit `04c14d9`, postérieur au post-mortem). Le seul chiffre qui reste
identique est **spawn_authorized = 0** : l'événement déclaré (voir `scripts/forge/audit.py`) n'est
toujours jamais écrit, avant ou après.

**Lignes spécifiquement liées à pacman (run_id contient "pacman")** : 57 lignes.

---

## 3. `forge_telemetry.jsonl` — lignes pacman

Fichier : `lab/forge_evidence/forge_telemetry.jsonl`. 20 lignes au total contiennent "pacman"
(recherche texte confirmée), réparties ainsi :

**Run `pacman-20260805-r1` (V1) — 13 lignes :**
```json
{"etape": "s0-contrat", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 140399}
{"etape": "s2-worldscan", "model": "claude-haiku-4-5-20251001", "outcome": "OK", "tokens": 74713}
{"etape": "s1-prisme", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 152584}
{"etape": "s1-prisme#repair", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 206019}
{"etape": "s3-decompo", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 149779}
{"etape": "s3-decompo#repair", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 185510}
{"etape": "s2-worldscan#repair", "model": "claude-haiku-4-5-20251001", "outcome": "OK", "tokens": 84586}
{"etape": "s2-worldscan#topup", "model": "claude-haiku-4-5-20251001", "outcome": "OK", "tokens": 61113}
{"etape": "s4-archi", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 152056}
{"etape": "s5-wiremap", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 210872}
{"etape": "s6-redteam-plan", "model": "claude-blind (fallback)", "outcome": "OK", "tokens": 144211}
{"etape": "s9-build-godot-standard", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 510245}
{"etape": "s9-build#mutation", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 526641}
```
Total V1 ≈ 2 598 728 tokens (recoupe verdict_v2.json humangate_flags).

**Run `pacman-v2-20260805` (V2) — 7 lignes :**
```json
{"etape": "s0-contrat#v2delta", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 200858}
{"etape": "s3-decompo", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 191152}
{"etape": "s4-archi", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 205896}
{"etape": "s4-archi#correction", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 232019}
{"etape": "s5-wiremap", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 220106}
{"etape": "s6-redteam-plan", "model": "qwen2.5-14b-instruct", "outcome": "OK", "tokens": 2100}
{"etape": "s9-build-godot-standard", "model": "claude-opus-4-8", "outcome": "OK", "tokens": 587789}
```
Total V2 ≈ 1 639 920 tokens.

**Aucune ligne de télémétrie ne contient `pacman-v3`, `pacman-v4`, `pacman-v5`, ou `pacman-v6`.**
Recherche confirmée : 0 correspondance.

---

## 4. Manifests V3-V6 — `reason.problem` / `reason.root_cause` (verbatim)

Fichiers : `lab/forge_runs/pacman-v{3,4,5,6}/context/s9-build-godot-standard.manifest.jsonl`

### pacman-v3
> **problem** : 6 ecarts produit mesures sur games/pacman apres V2 : touches affichees en
> keycode brut · placeholders visuels · pas de musique · map 2 rendue plus petite · fin du
> dernier niveau sans sortie · aucun reglage de volume
>
> **root_cause** : P1 controls_screen.liaisons_lisibles fait str(l) sur le keycode brut,
> aucune traduction · P2 rendu en primitives sans identite (formes/palette non travaillees)
> · P3 sound_bank porte 6 bruitages, aucune piste musicale · P4 maze_view.gd:12
> const COTE_CASE=20 fixe, ne derive ni de la carte ni du viewport · P5 Etat.FIN cable a UN
> seul endroit (app_shell.gd:107) et end_screen n'offre aucun choix, alors que le pur porte
> deja vers_partie/vers_titre et SUITE_CATALOGUE_TERMINE · P6 volume existe PAR SON dans
> sound_bank, aucun reglage global ni persistance

### pacman-v4
> **problem** : 4 ecarts releves au PLAYTEST HUMAIN sur games/pacman apres V3 : aucun son ·
> ecran de fin illisible (se melange a la carte) · comportement des fantomes non transmis au
> joueur · progression de niveau inconnue
>
> **root_cause** : P1 ELARGI PAR L'AUDIT — le defaut n'est pas 'musique absente' mais 'aucun
> emetteur audio'. audio.jouer() ET audio.jouer_musique() synthetisent un buffer puis
> l'ajoutent a _journal/_journal_musique et RETOURNENT. Aucun push_frame, aucun
> AudioStreamPlayer dans tout le jeu, et fabriquer_flux() n'est appele QUE depuis 2 fichiers
> de test. La synthese est complete, le chemin de LECTURE est absent. · P2 pas de couche UI
> modale au-dessus du monde · P3 les 4 ciblages EXISTENT (ghost_targeting
> ROUGE/ROSE/CYAN/ORANGE), seule la transmission au joueur manque · P4 hud.gd n'affiche
> aucun numero de carte ni total du catalogue

### pacman-v5
> **problem** : 3 derniers ecarts avant FREEZE de pacman comme jeu de reference : mode de jeu
> au contrat joueur illisible · 3 vies trop peu pour decouvrir le contenu · catalogue a 2
> cartes, il en faut une 3e pour clore l'arc apprendre/maitriser/terminer
>
> **root_cause** : P1 settings.gd NOMS=['NORMAL','TEST'] — le nom AFFICHE au joueur EST
> l'identifiant interne de l'enum, meme classe de defaut que le keycode 4194325 de V3. De
> plus le charter V2 a construit ce mode comme mode d'ACCESSIBILITE (dash, 'permettre aux
> nouveaux joueurs d'atteindre la fin'), pas comme mode developpeur : il est mal NOMME, pas
> mal concu · P2 params.VIES_INITIALES=3, constante unique dans le bloc de parametres · P3
> 03_WORLD/rules/level_catalog/catalog.json ne porte que 2 niveaux

### pacman-v6
> **problem** : Lot final avant VALIDATION de pacman : le mode de jeu est mesure INERTE (0
> divergence sur 200 ticks, dash.mode_autorise_dash rend valide(mode) donc vrai partout) ·
> l'easter egg de victoire n'existe pas
>
> **root_cause** : Le mode de jeu est un PRODUCTEUR SANS CONSOMMATEUR : porte par l'etat,
> clone, compare, valide, persiste, affiche, releve par la sonde — et il ne gouverne rien.
> Pierre a tranche le 2026-08-06 : le mode DOIT gouverner les vies (NORMAL 3 = defi,
> Decouverte 5 = marge d'erreur), ce qui lui donne enfin un consommateur et rend signifiante
> la condition d'easter egg 'mode NORMAL'.

**Aucun de ces 4 manifests (P1-P6, 15 root_causes au total) n'a de `lesson_id` et aucun
n'est référencé ailleurs dans le dépôt** (voir §6, lessons.jsonl).

---

## 5. Listing `lab/forge_runs/pacman/` (noms seulement)

```
blueprint.json          blueprint_v2.json       charter.yaml
charter_v2.yaml         context/ (dossier)      decompo.yaml
decompo_v2.yaml         distillation/ (dossier) featuremap.json
featuremap_v2.json      mutation_receipt.json   platform_correction.yaml
playtest_report.json    prisme.json             prisme.yaml
prisme_v2.json          redteam_v2_qwen.txt     verdict.json
verdict_v2.json         wiremap.json            wiremap_frozen.json
wiremap_v2.json         wiremap_v2_frozen.json  worldscan.json
worldscan.yaml
```

**Confirmé par recherche récursive : aucun fichier `state.json` et aucun `verdict_v3*.json` /
`verdict_v4*.json` / `verdict_v5*.json` / `verdict_v6*.json` n'existe dans ce dossier ni dans
les dossiers `pacman-v3/`, `pacman-v4/`, `pacman-v5/`, `pacman-v6/`.**

---

## 6. Table de couverture du rapport Observer + types de drift

**Rapport Observer d'origine (cité dans `studio_brain/journal/2026-08-07_postmortem_pacman_forge.md`
§0), citation verbatim** :

> Premier run Observer sur pacman exécuté ce jour (`lab/reports/observer/pacman/` : 4617
> événements, 9 runs, 114 faits, 100 drifts).
>
> Concorde avec le réel (re-vérifié) : tokens V1 2 598 728 / V2 1 639 920 (= télémétrie
> recalculée) · décision `HUMANGATE_READY_WITH_OBJECTION` · red-team qwen `redteam_ran: true`
> · drift `model_audit_differs_from_transcript` RÉEL (roles.yaml déclare `claude-opus-4-8`,
> transcripts mesurent `claude-opus-5`).
>
> Discorde — 2 défauts symétriques :
> 1. La Forge écrit `ts: 0.0` dans ses reçus signés (verdict_v2.json) → l'Observer reconstruit
>    une fenêtre 1970→2026 (durée 56 ans) sans garde-fou.
> 2. L'Observer se déclare aveugle (`NOT_OBSERVABLE`) sur mutation/solvabilité/tests alors que
>    `mutation_receipt.json` (263 mutants) existe et que `solvabilite: 50/50` figure dans le
>    verdict qu'il a lu — ses adaptateurs n'extraient pas ces champs.

**Note de fraîcheur** : le fichier vivant `lab/reports/observer/pacman/observer_run.json` a été
régénéré depuis (il est actuellement non suivi par git — `git status` le montre en `??`, signe
d'une régénération après le post-mortem). Sa table de couverture ACTUELLE montre désormais
`tests_executes`, `mutation` et `solvabilite` à `status: OBSERVED` (count 1 chacun) — la lacune
décrite ci-dessus semble avoir été corrigée après coup. Le corpus fourni à Qwen reste la version
D'ORIGINE citée par le post-mortem (NOT_OBSERVABLE), conformément à la mission — Qwen n'a PAS
accès à cette correction ultérieure.

**Types de drift émis par le run Observer actuel (9 catégories, régénéré, total 106 — diffère
du chiffre "100" du post-mortem pour la même raison de régénération)** :
```
dispatch_prepared_never_executed        18
tools_used_without_declaration          13
model_audit_differs_from_transcript     12
file_written_in_session_scratchpad      10
ts_declare_invalide                      6
prompt_sans_empreinte_declaree          20
lecon_routee_sans_consommateur          14
roadmap_doctrine_vs_mesure               8
architecture_declaree_vs_realite_mesuree 5
```

---

## 7. `scripts/forge/contracts/roles.yaml` — déclaration de modèle

```yaml
models:
  - id: anthropic/claude-fable-5
    name: Fable 5 — orchestrateur /forge (mode superpowers)
    roles: [orchestrator]

  - id: anthropic/claude-opus-4-8
    name: Claude Opus 4.8
    provider: claude-local
    reasoning: high
    roles:
      - run_orchestrator    # agent SPAWNÉ qui conduit un run (contrats/orchestrator.yaml).
                            # Opus — RATIFIÉ Pierre 2026-07-23 (« intention ≠ exécution »).
```
Deux autres lignes déclarent explicitement `model: lmstudio/qwen2.5-14b-instruct` pour des
rôles de red-team/critique (lignes 162 et 294 du fichier). Aucune ligne du fichier ne
mentionne `claude-opus-5`.

---

## 8. `lab/reports/lessons.jsonl` — recherche "pacman"

```
grep -c "pacman" lab/reports/lessons.jsonl  →  0
wc -l lab/reports/lessons.jsonl             →  23 lignes totales
```
0 des 23 lignes du fichier de leçons ne mentionne pacman.

**Signature de la fonction pré-mortem** (`scripts/forge/learning_memory.py`, fonctions
`format_premortem_lessons(annotated, limit: int = 5)` et `premortem_lessons(..., limit: int =
5)`) : la limite par défaut du nombre de leçons injectées en pré-mortem est **5**.

---

*Fin du corpus. Longueur approximative : ~3800 mots / ~5000 tokens de contenu factuel — sous
la borne 12-18k tokens de la mission (le corpus réel nécessaire tient dans un budget plus
serré que prévu ; aucune information n'a été omise pour tenir dans la borne).*
