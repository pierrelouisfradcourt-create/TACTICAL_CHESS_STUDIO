# CADRAGE — incrément P1.2a « ftue-profile-eval » (FTUE par profil expérimental, déterministe)

- **Date** : 2026-07-12 (v3 — ex-`S10E_CONTRACT_PROPOSAL.md` : v1 → v2 amendée Pierre →
  v3 red-teamée, 16 findings tous adjugés : `P1_2A_REDTEAM_ADJUDICATION.md`)
- **Statut** : **RATIFIÉ (Pierre, 2026-07-12) avec DEUX RÈGLES ajoutées** (ci-dessous).
  Ordre ratifié : cadrage → protocole E2 → implémentation → E2 → décision contrat.
  Renommé (F-T7) : **`s10e-player-test` est RÉSERVÉ au vrai M4** (player agent — hors
  périmètre, exclusion ferme Pierre) ; cet incrément n'a pas de player.
- **RÈGLES PIERRE (ratification 2026-07-12 — non négociables, même rang que les invariants)** :
  1. **Le profil est gelé avant le premier test.** S'il est modifié après avoir vu les
     résultats, **l'expérience est à refaire** (pas d'amendement en cours de route).
  2. **Un échec est un résultat valide.** Si E2 ne confirme pas l'hypothèse, on le
     documente ; **on ne modifie pas les paramètres pour obtenir un « SUCCESS »**.
- **Décisions Pierre 2026-07-12 (intégrées)** : déterministe d'abord, LLM player HORS
  périmètre · profil v0 écrit à la main (intégration rubrique s1 = future) · amendements :
  « séparation expérimentale » (pas « détection ») · capteur brut indépendant du profil ·
  « seuils profil expérimental » · conclusions limitées aux deux prototypes testés.
- **Parent** : `FORGE_2_DESIGN.md` §8 P1.2 · `P1_MECHANICAL_RESULTS.md` (FTUE genre-aveugle) ·
  leçons s10d/P1.1 reconduites.

## 1. Le problème (acquis de la falsification P1 — corrigé F-T3)

Le capteur émet trois observations FTUE — **B1** `dead_input_rate`, **B2**
`steps_to_first_reward` (avec `steps_to_first_delta` niché dans `raw.ftue`), **B3**
`longest_stall` — **jugées à seuils fixes genre-aveugles à chaque run**
(`collect.mjs:334-345` : B1 >0.5, B2 >20, B3 >8). Ces outcomes sont documentaires et hors
périmètre de non-régression (`fixtures/p1/check.mjs` ne lit que A1/A2/A3/A5), mais ils
existent : « 0 progrès naïf » y est un défaut pour un arcade continu et un comportement
NORMAL pour un tactique tour-par-tour. Mesures justes, interprétation fausse.

## 2. Hypothèse expérimentale (unique — et ses réfutations possibles, F-M3)

> Les 4 scalaires B bruts existants permettent une **séparation expérimentale** — les
> prototypes à défaut FTUE injecté se distinguent des prototypes sains, sans FP — quand
> l'évaluation applique des **seuils profil expérimental** déclaratifs, dérivés de la
> spec du prototype (jamais des mesures), et figés avant les sondes.

**Échecs informatifs (ce qui réfuterait)** : (i) une sonde SAINE tire sous un profil
honnêtement dérivé — le mode d'échec exact de P1 ; (ii) un défaut **non-inverse-littéral**
du profil n'est pas séparé. Un SUCCESS sans ces deux risques réels ne vaudrait rien —
d'où les contraintes anti-circularité du §4.

## 3. Architecture (capteur brut indépendant — précisée F-T1/T2/T5)

- **Cœur du capteur intouché** : `sensor.mjs` + `analysis.mjs` sha figés bout en bout.
  `collect.mjs` : **diff additif CONFIGS uniquement** (entrées déclaratives des sondes,
  dir/port — gel 2 temps P1.1 : sha_pre → diff consigné → sha_post = référence). Pas de
  « zéro diff » : un diff borné, audité (F-M5/M7).
- **Évaluation par profil = couche déterministe SÉPARÉE en aval**
  (`scripts/quality_sensor/profile_eval.mjs`, nom à figer au protocole) : lit le rapport
  brut + `profil_experimental.json` → rapport d'évaluation advisory distinct. Les
  outcomes B du rapport capteur sont **IGNORÉS par le dépouillement E2** (statut A6) —
  l'évaluation faisant foi est celle du profil ; le double-verdict est déclaré, celui du
  capteur reste documentaire (F-T2). TDD cœur pur, aucun LLM, aucun gating, 3 états.
- **Profil expérimental v0** (données déclaratives, écrit à la main) : **borné aux 4
  scalaires existants** (aucune métrique nouvelle — la trace pas-à-pas n'est pas
  persistée, F-T4). **UN profil par prototype, identique pour toutes ses sondes, gelé
  avant la construction des sondes** (F-M8). L'**alphabet du profil est DESCRIPTIF** :
  il ne pilote pas le stimulus (câblé par config) ; il est vérifié mécaniquement
  ≡ `CONFIGS[jeu].input.alphabet` et `run.input_sequence ⊆ alphabet`, divergence =
  INVALIDE (F-T5). Intégration rubrique s1 = future, hors périmètre.
- **LLM player (M4) : HORS périmètre** — exclusion ferme Pierre.

## 4. Expérience E2 — esquisse structurelle (protocole détaillé figé après ratification)

**Anti-circularité (F-M1/M2 — structure obligatoire, non négociable au protocole)** :
1. Préexistence déclarée : les rapports B sains des deux prototypes sont DÉJÀ publiés
   (`lab/forge_sensors/*/visual_mechanical.json`, commit `3ac10cc`). E2 en tient compte :
   les profils sont **dérivés et justifiés ligne à ligne depuis la spec/design du
   prototype, SANS consultation des rapports existants**, gelés AVANT la conception des
   sondes (attestation d'ordre dans l'évidence) ;
2. **Red-team dédié des profils** avant le run (substitut au double-rédacteur en solo) ;
3. **≥1 sonde à défaut par prototype NON-inverse-littéral** d'un datum du profil (défaut
   de level-design/équilibrage — le défaut vit dans le jeu, pas dans le seuil).

**Structure fermée à 4 cases minimum** (F-M4 — « et/ou » supprimé) :

| | défaut injecté | sain (contrôle) |
|---|---|---|
| **arcade (breakout)** | ≥1 sonde dont 1 non-littérale | copie conforme évaluée sous profil arcade |
| **tactique (menagerie)** | 1 sonde à défaut FTUE tactique | copie conforme évaluée sous profil tactique (le test que P1 a échoué) |

Liste exacte des sondes figée au protocole, fermée avant run.

**Reconduits d'office (s10d/P1.1)** : critères succès/échec/INVALIDE figés avant run ·
one-shot · gels sha (cœur capteur bout en bout, collect 2 temps, couche d'évaluation,
sondes, **pin du commit source des prototypes** — F-M9) · sondes dans le **repo
principal** `fixtures/e2/` (modèle `fixtures/p1/`, jamais le worktree destructible —
F-T6), ports dédiés · exécutant nommé · évidence `_e2_evidence/` jamais écrasée ·
dépouilleur zéro-paramètre écrit avant le premier run · **hash canonique : outcomes
3-états du profile_eval + `run.input_sequence` — JAMAIS les valeurs B mesurées brutes**
(micro-variance actée — F-M6) · fixtures/p1 re-collectées + check exit 0 aux bornes.

**Conclusion maximale autorisée** : la séparation expérimentale est démontrée (ou non)
**sur les deux prototypes testés** — aucune généralisation à leurs genres, à d'autres
jeux, ni à des défauts non synthétiques.

## 5. Livrables si ratifié (dans l'ordre)

1. Protocole E2 détaillé (profils dérivés+gelés, sondes, critères) — **red-team du
   protocole ET des profils** → ratification.
2. Implémentation TDD bornée : `profil_experimental.json` ×2 + `profile_eval.mjs`
   (cœur capteur intouché ; CONFIGS additives).
3. E2 + `P1_2A_E2_RESULTS.md` → décision Pierre sur le futur contrat (nom = décision
   Pierre à cette étape ; recommandation : `s10d-ftue-profile.yaml`, annexe sœur de
   s10d-oracle-visual — PAS `s10e-player-test`, réservé à M4) + MAJ design §8.

## 6. Gate

**Ratification Pierre de ce cadrage v3** — puis protocole E2 (lui-même red-teamé).

## Rapport de charter

```
software_verdict: (aucun — document de cadrage)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
statut: PROPOSED v3 (red-teamée, adjudication annexée) — ratification Pierre requise
```
