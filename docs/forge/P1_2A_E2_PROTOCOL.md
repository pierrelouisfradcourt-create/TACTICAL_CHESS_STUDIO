# PROTOCOLE EXPÉRIMENTAL — E2 « séparation FTUE par profil expérimental » (P1.2a, v2)

- **Date** : 2026-07-12 (v2 — v1 red-teamée AVANT ratification : 18 findings adjugés,
  sonde comptée v1 falsifiée par mesure ; annexe `P1_2A_E2_REDTEAM_ADJUDICATION.md`)
- **Statut** : **PROPOSED v2 — RATIFICATION PIERRE REQUISE** (dont l'acte de restriction
  §6 et les deux disclosures hors périmètre de l'annexe). Aucune implémentation avant.
- **Parent** : `P1_2A_FTUE_PROFILE_PROPOSAL.md` (cadrage RATIFIÉ + 2 règles Pierre) ·
  gabarit `P1_1_PROTOCOL.md`.
- **Question expérimentale (unique, v2)** : existe-t-il un défaut FTUE **orthogonal à P0**
  que les scalaires B bruts, évalués sous profil expérimental, **séparent** du prototype
  sain ? (Le red-team a établi que cette existence n'est PAS acquise sur breakout —
  la phase A la tranche par simulation AVANT tout run capteur.)

## 0. Règles Pierre (rang d'invariant)

1. **Profil gelé avant le premier test.** Modifié après lecture d'un résultat →
   **l'expérience est à refaire** — et toute expérience refaite exige : nouvelles sondes,
   nouvelle dérivation red-teamée, attestation d'exposition étendue aux résultats de
   l'E2 abandonnée (F-M10).
2. **Un échec est un résultat valide.** Documenté tel quel ; aucun paramètre modifié pour
   obtenir un « SUCCESS ». L'**ANNULATION pré-run** de phase A (§4) est un résultat valide
   du même rang.

## 1. Invariants (reconduits de v1, inchangés)

Cœur capteur figé bout en bout (`sensor.mjs`, `analysis.mjs`) ; `collect.mjs` gel 2 temps
(diff additif CONFIGS uniquement, consigné) ; `profile_eval.mjs` et `depouille_e2.mjs`
TDD, sha figés, zéro paramètre libre ; outcomes B du rapport CAPTEUR ignorés au
dépouillement (documentaires — seuils fixes `collect.mjs:334-345`) ; profils bornés aux
4 scalaires existants (chemin figé : `B1_dead_input_rate.measured`,
`B2_steps_to_first_reward.measured` + `.raw.ftue.steps_to_first_delta`,
`B3_longest_stall.measured` — vérifiés sur fixture) ; aucun run capteur sur sonde avant
phase C ; E2 one-shot ; évidence `lab/forge_sensors/_e2_evidence/` ; exécutant =
orchestrateur ; fixtures/p1 re-collectées + `check.mjs` exit 0 aux deux bornes
(insensibles aux outcomes B — vérifié) ; aucun LLM, aucun gating.

## 2. Attestation d'exposition et de dérivation (étendue — F-M2)

- Profils §3 dérivés des seules constantes de design citées, AVANT la conception des
  sondes (§4) ; les rapports `lab/forge_sensors/breakout|menagerie_tactics/` n'ont pas
  été consultés.
- **Exposition déclarée (exhaustive, docs parents)** : (a) qualitatif tactique — « 0
  progrès naïf est NORMAL en tactique » (`P1_MECHANICAL_RESULTS.md`) ; (b) **quantitatif
  breakout — « récompense au 1er input », B2 sain = 1** (même doc, confirmé fixture
  `p1_probe_clean`) ; (c) mesures du red-team v1 : **T_pre ≈ 2,3 s ; cadence ≈ 158 ms/input
  [153-183]** ; solvabilité pristine won=true à 26 752/30 000 pas.
- **Test de cohérence obligatoire** : toute dérivation doit être confrontée aux faits
  (a)-(c) ; une contradiction = dérivation fausse, à corriger avant ratification (c'est
  ce test, absent de v1, qui aurait attrapé F-M1).

## 3. Profils expérimentaux (GELÉS à la ratification — un par prototype)

### 3.1 `profil_experimental_breakout.json` (arcade continu — modèle temporel v2)

```json
{
  "prototype": "breakout",
  "stimulus_descriptif": { "kind": "keyboard", "alphabet": ["ArrowLeft", "ArrowRight"], "steps": 40 },
  "modele_temporel": { "t_pre_s": [2.0, 4.0], "cadence_ms": [150, 250], "note": "B2 est ABSOLU (baseReward=0, analysis.mjs:76-77) : tout score acquis pendant la phase A du capteur donne B2=1" },
  "seuils_profil_experimental": {
    "steps_to_first_delta":  { "op": ">", "horizon": 3,    "signal_si_null": true },
    "steps_to_first_reward": { "op": ">", "horizon": 32,   "signal_si_null": true,
                               "note": "la séparation attendue passe par null (récompense jamais obtenue) — robuste à tout le modèle temporel ; l'horizon 32 est conservé mais n'est PAS le séparateur attendu" },
    "dead_input_rate":       { "op": ">", "horizon": 0.35, "signal_si_null": false },
    "longest_stall":         { "op": ">", "horizon": 6,    "signal_si_null": false }
  }
}
```

Justifications : first_delta ≤ 3 robuste (raquette bouge à l'input 1,
`game.mjs:101-104`, `salientChanged` inclut paddleX `collect.mjs:48`) ; B1 ≤ 0,35 et
B3 ≤ 6 (clamp au mur seul input mort : 36 px/input, 360 px de mur, marche seedée) ;
B2 : cohérent avec l'exposition (sain = 1 — aucun signal), le signal ne peut venir que
de `null`.

### 3.2 `profil_experimental_menagerie.json` (tactique — dérivation corrigée F-M8/F-T8)

JSON identique à v1 (4 scalaires `non_discriminant`). Justification corrigée : le bon
invariant est **min(distance) > move + range** par bête et par tour — distances min
réelles : fulgor (4,7)→(5,2) = 6 > 4+1 = 5 (**marge d'UNE case** — tout tuning
bestiaire/positions la casse, consigné), embraseur 7 > 4, ondine 8 > 4
(`level.mjs:29-42`, `bestiaire.mjs:14`, `game.mjs:203-238` : move puis attaque même
tour, flags remis à zéro à endTurn seul) ; `#endTurn` hors alphabet (clics `#canvas`
uniquement, `collect.mjs:186-190`). Un profil qui ne peut jamais signaler ne peut pas
produire de FP — correction structurelle du mode d'échec P1, ET limite assumée (§8).

## 4. Sondes (liste FERMÉE — 4) et QUESTION PRÉALABLE de phase A

**Question préalable (issue du red-team — tranchée en phase A, AVANT tout run capteur)** :
le red-team a prouvé que sur breakout les défauts candidats sont pincés entre P0
(solvabilité attrape les défauts cinétiques — won=false mesuré pour vx:60/vy:-80 ; R8
`logic.test.mjs:167` attrape brickValue=0) et l'invisibilité B (T_pre + B2 absolu).
Le candidat compté v2 doit donc prouver STATIQUEMENT qu'il échappe aux deux mâchoires :

- **Vérification statique = simulation déterministe du moteur pur** (`BreakoutGame`
  headless, importé directement — ce n'est PAS le capteur) : sous la séquence d'inputs
  seedée mappée aux DEUX bornes du modèle temporel (§3.1) ET sous politique sans-input,
  le candidat doit donner **score = 0 sur toute la fenêtre** [t_pre_min ;
  t_pre_max + 40 × cadence_max ≈ 14 s] ; ET le bot de solvabilité (garde corrigée, cf.
  divergences) doit gagner (won=true < 30 000 pas).
- **Si le candidat échoue** : UN redesign géométrique. **Si le redesign échoue aussi :
  E2 est ANNULÉE pré-run** — conclusion documentée : « aucun défaut B-séparable
  orthogonal à P0 trouvé sur breakout sous ce capteur » — résultat valide (règle
  Pierre 2), retour à Pierre.

| Sonde | Base | Contenu | Prédiction (figée) | Comptée ? |
|---|---|---|---|---|
| **E2-SA-D′** | breakout | **Récompense inatteignable naïvement par LEVEL-DESIGN** (non-inverse-littéral) : briques confinées en colonne extrême (1 bloc modifié `level.mjs`) — contrôles intacts, R8 intact, gagnable (solvabilité attendue verte et plus rapide) | `steps_to_first_reward` = **null → SIGNAL** sous profil arcade ; B1/B3/first_delta silencieux | **OUI** |
| **E2-SA-C** | breakout | Copie conforme | **0 signal** sous profil arcade (B2 = 1 attendu — exposition §2) | **OUI** |
| **E2-ST-D** | menagerie | Neutralisation de la ligne template de `#objective` (`index.html:202`, 1 ligne JS — F-M9/F-T7 ; P0-vert confirmé : e2e lit `window.__objective`, jamais le texte du div) | **NON-SÉPARÉE** (prédit — limite du stimulus) | **NON** (documentaire) |
| **E2-ST-C** | menagerie | Copie conforme | 0 signal (vacuité structurelle déclarée) + **livrable contraste deux-couches** (F-M5) : sur le MÊME rapport, les outcomes B documentaires du capteur tirent, `profile_eval` non — la correction P1 démontrée par dérivation, pas par tuning | **NON** (documentaire) |

- **Divergences consignées des copies breakout** (uniques, auditées) : (i) `run-oracle.mjs`
  variante profondeur `fixtures/` (précédent p1 — F-T5) ; (ii) **garde de
  `solvability.mjs:127` corrigée** (`pathToFileURL`) pour que le volet (d) s'exécute
  RÉELLEMENT (F-T2 : il est vert à vide sous Windows partout ailleurs — disclosure à
  l'annexe, correctif repo-wide = gate séparé). Copies menagerie : aucune divergence
  (recherche ascendante OK, server autonome vérifié).
- Repli E2-ST-D : neutralisation `#help`/`#roster` (jamais `#legend` — asserté par
  e2e-ux, F-T6). Sondes sous `fixtures/e2/`, ports capteur 4640-4643 (libres —
  inventaire fait) ; les e2e des copies gardent leurs ports en dur → **phase B
  strictement séquentielle**. Provenance pinnée (breakout = commit courant ; menagerie =
  manifeste sha256 + worktree `87e9ec4` cité, jeu non tracké). Marqueur
  `_PROBE_NON_FORGE.md` partout.
- Rouge P0 : environnemental prouvé au log → UN re-run. Imputable au contenu → UN
  redesign (sondes à défaut). **Copie conforme rouge (F-M7)** : incrimine la base ou
  l'environnement, jamais la sonde — env prouvé → re-run ; sinon retour Pierre.

## 5. Dépouillement (périmètre figé)

Identique v1 + précisions : `depouille_e2.mjs` écrit avant le premier run de phase C,
lit UNIQUEMENT les rapports `profile_eval` ; hash canonique =
`{game, run.seed, run.mode, run.input_sequence}` + outcomes 3-états `profile_eval` par
scalaire (jamais les valeurs brutes) ; vérification alphabet (profil ≡ CONFIGS ≡
input_sequence) ; **hash ×2 divergent = INVALIDE technique, UN re-run, sinon retour
Pierre (F-M3)**.

## 6. Critères (figés avant run)

> **Acte de restriction (F-M4 — à ratifier explicitement)** : la ratification de ce
> protocole vaut **restriction de l'hypothèse du cadrage à la séparation arcade** ; la
> case tactique devient déclarative (profil non-discriminant : aucun FP possible par
> construction, la moitié tactique de l'hypothèse n'est pas testée).

- **SUCCÈS** (tous requis) : E2-SA-D′ séparée (`steps_to_first_reward` **null → signal**)
  ET E2-SA-C 0 signal ET P0 vert sur **les sondes retenues** (logs, volet solvabilité
  breakout RÉELLEMENT exécuté) ET reproductibilité hash canonique ×2 sur les sondes
  retenues ET gels intacts ET fixtures/p1 vertes aux bornes.
- **ÉCHEC (résultat valide)** : E2-SA-D′ non séparée (échec informatif ii) OU ≥1 signal
  sur E2-SA-C (échec informatif i — le mode P1). Aucun retuning.
- **ANNULÉE pré-run** (§4) : résultat valide, documenté, retour à Pierre.
- **Documentaire (hors comptage)** : E2-ST-D / E2-ST-C rapportées intégralement +
  contraste deux-couches ; une séparation tactique inattendue = anomalie à investiguer,
  jamais un succès.
- **INVALIDE (liste fermée)** : gel sha rompu (cœur capteur, collect post-A,
  profile_eval, depouille, profils, sondes) ; rapport capteur pré-phase-C sur une sonde ;
  alphabet divergent ; fixtures rouges ; P0 non prouvé sur une sonde retenue ; hash ×2
  divergent après re-run ; **signal émis sous un scalaire `non_discriminant` (bug de
  couche — F-M6)** ; **profil modifié après le premier test (règle Pierre 1)**.
  → Retour à Pierre.

## 7. Déroulé

- **Phase A — Gel, simulation, construction** : shas capteur ; profils §3 JSON + sha
  (GELÉS) ; **simulation préalable §4 (décide E2-SA-D′ ou ANNULATION)** ; 4 copies +
  diffs minimaux + divergences consignées ; CONFIGS additives (diff consigné →
  sha_post) ; `profile_eval.mjs` + `depouille_e2.mjs` TDD + shas ; fixtures/p1 borne
  d'entrée.
- **Phase B — P0 séquentiel** sur les sondes retenues (logs ; règles rouge §4) ; scellé
  sha des sondes.
- **Phase C — Runs capteur** ×2 par sonde (séquentiel, ports dédiés) ; `profile_eval`
  sur chaque rapport.
- **Phase D — Dépouillement** : re-vérification de tous les gels ; verdict §6 ;
  fixtures/p1 borne de sortie ; `P1_2A_E2_RESULTS.md` → décision Pierre (nom du futur
  contrat : recommandation `s10d-ftue-profile.yaml`, jamais `s10e-player-test`).

## 8. Ce que ce protocole ne prétendra pas

- Un SUCCÈS démontre la séparation d'UN défaut de level-design synthétique sur breakout
  + le silence des sondes saines sous profils dérivés — sur ces deux prototypes, rien
  d'autre. La limite tactique est structurelle au stimulus naïf, déclarée. B2 est absolu
  (bug capteur documenté, correction = incrément séparé).
- Une ANNULATION pré-run dit : « sous CE capteur gelé et CE stimulus, pas de défaut
  B-séparable orthogonal à P0 trouvé sur breakout » — c'est une conclusion sur le
  capteur, pas sur les jeux.

## Rapport de charter

```
software_verdict: (aucun — protocole)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
statut: PROPOSED v2 (red-teamée, 18 findings adjugés) — ratification Pierre requise
  (protocole + acte de restriction §6 + prise d'acte des 2 disclosures)
```
