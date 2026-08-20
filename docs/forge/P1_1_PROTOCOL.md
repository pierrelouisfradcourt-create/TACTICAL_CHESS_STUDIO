# PROTOCOLE EXPÉRIMENTAL — P1.1 « sondes à défauts injectés » (v2, red-teamé)

- **Date** : 2026-07-12 (v2 — v1 du 2026-07-11 durcie par revue adversariale AVANT ratification)
- **Statut** : **RATIFIÉ (Pierre, 2026-07-12) → EXÉCUTÉ phases A→D → outcome SUCCESS** — résultats : `P1_1_RESULTS.md`.
- **Parent** : `P1_1_PROPOSAL.md` (idée) · `P1_MECHANICAL_RESULTS.md` (tranche P1 falsifiée) · `P1_MECHANICAL_CONTRACT.md` (invariants advisory reconduits)
- **Revue adversariale v1→v2** : 19 findings bruts, 14 sérieux — **tous adjugés** (exigence Pierre : épuisement des objections vérifiables) : 8 confirmés→corrigés ici, 7 réfutés avec preuve. Disposition finale finding par finding, avec preuves fichier:ligne et calcul calibré : **`P1_1_REDTEAM_ADJUDICATION.md`** (annexe de ratification).
- **Question expérimentale (unique)** : les métriques lisibilité conservées (A1/A2/A3/A5) DÉTECTENT-elles des défauts visuels réels, connus, sur un jeu où P0 est vert ? (= la « détection orthogonale à P0 » exigée par le gate de réouverture P1.)

---

## 1. Invariants (reconduits, non négociables)

- **Aucun changement du pipeline Forge** : rien dans `scripts/forge/`, aucun branchement verdict/promotion.
- **Capteur figé — gel en 2 temps (mécaniquement vérifiable)** :
  - `sensor.mjs` et `analysis.mjs` : sha256 relevé AVANT phase A, **identique** jusqu'à la fin de phase D.
  - `collect.mjs` : sha256 relevé AVANT phase A (`sha_pre`) ; la phase A ajoute les entrées CONFIGS (périmètre §2) ; le **diff complet** `sha_pre → sha_post` est consigné et fait partie des preuves ratifiables ; `sha_post` (fin de phase A) devient LA référence figée, **identique** jusqu'à la fin de phase D. Toute divergence ultérieure = **INVALIDE**.
- **Aucun nouveau signal** : pas de nouvelle métrique, pas de résurrection d'A6, pas de retouche FTUE.
- **Aucun LLM** dans le chemin. Advisory only : sorties sous `lab/forge_sensors/_probe_<nom>/` (= la clé CONFIGS de chaque sonde, qui détermine le dossier de sortie), jamais promues.
- **Seuils FIGÉS aux valeurs v0** : A1 < 4.5:1 · A2 < 24 px · A3 > 0.92 · A5 > 0. **Aucun ajustement, ni entre les sondes, ni après lecture d'un résultat.** Un défaut raté à cause d'un seuil = un RÉSULTAT.
- **Aucun run capteur sur une sonde avant la phase C.** La conformité d'un défaut se vérifie STATIQUEMENT en phase A (calcul WCAG arithmétique pour S1 — fonctions pures de `analysis.mjs` sur papier, géométrie CSS pour S2/S4, calcul de surface pour S3) — jamais en exécutant le capteur. La découverte d'un rapport capteur antérieur à la phase C sur une sonde = **INVALIDE**.

## 2. Unique modification de code autorisée (déclarée d'avance, à ratifier)

Ajouter des **entrées de configuration** (données déclaratives) à la table `CONFIGS` de `collect.mjs` : une par sonde, clé `_probe_<nom>`, valeur = copie du template `breakout` où SEULS changent `dir` (dossier de la sonde) et `port` (4621-4625). Zéro changement aux fonctions de mesure/rapport ; preuves : le diff §1 + les 19 tests du cœur pur inchangés et verts. Si quoi que ce soit d'autre s'avérait nécessaire → **STOP, retour à Pierre**.

## 3. Les sondes (5) — un défaut UNIQUE, minimal, purement visuel par sonde

Copies intégrales de `games/breakout` sous `games/_probe_<nom>/` — **même profondeur que breakout** (obligatoire : le harnais `run-oracle.mjs`/`e2e.mjs` résout `node_modules` et le serveur par chemins relatifs `../..`). Jetables : marqueur `_PROBE_NON_FORGE.md` dans chaque dossier, jamais dans le ledger, jamais dans `oracles.json`, suppression après l'expérience (décision Pierre).

| Sonde | Défaut injecté (1 modification) | Fichier touché | Métrique ATTENDUE | Détection attendue |
|---|---|---|---|---|
| **S1 probe-contrast** | Couleurs des textes HUD **mesurés par le capteur** (`#lives, #score, #level, .hud-label` — les 4 cibles de `textTargets` ; `#brickCount` partage le style mais n'est PAS mesuré, il est modifié par cohérence CSS sans compter au dépouillement) → gris sombre (indicatif `#3a3a46`, ratio calculé ≈ 1.8:1) visant un ratio mesuré **< 3:1** | `index.html` (CSS) | **A1** | `signal_detected` sur ≥1 des 4 IDs `A1_contrast:{#lives,#score,#level,.hud-label}` |
| **S2 probe-tiny-target** | `#restart` réduit (`padding:2px 8px; font-size:11px`) visant min(w,h) **< 20 px** (marge sous le seuil 24) | `index.html` (CSS) | **A2** | `signal_detected` sur `A2_target_size:#restart` |
| **S3 probe-invisible** | Briques rendues quasi-couleur-de-fond : **les TROIS littéraux de couleur des briques** de `render.mjs` → `#101018` (±≤8/canal) — `COLOR_BRICK_BREAKABLE` (l.11), `COLOR_BRICK_INDESTRUCTIBLE` (l.12) **ET le littéral de bordure `strokeStyle "rgba(255,82,82,0.5)"` (l.52)**. La bordure est OBLIGATOIRE : conservée, le calcul calibré (annexe adjudication) donne densité ∈ [0.919 ; 0.956] selon l'antialiasing — **le pire cas passe SOUS le seuil 0.92 (échec à tort)**. Contenu logiquement présent (tests/solvabilité intacts), visuellement invisible | `render.mjs` (couleurs uniquement, 3 littéraux) | **A3** | `signal_detected` (densité attendue ≈ **0.956**, marge +0.036 ≈ 60× la variance mesurée ±0.0006 ; modèle calibré : jeu sain 0.890 calculé vs 0.895 mesuré) |
| **S4 probe-overflow** | `#stage { width:1400px; max-width:none; }` → débordement horizontal au viewport 900 px (mesure attendue ≈ +500) | `index.html` (CSS) | **A5** | `signal_detected` sur `A5_h_overflow` |
| **S5 probe-clean** | **AUCUN** (copie conforme, seule la clé/port CONFIGS diffère) | — | aucune | tout signal du périmètre = **faux positif** |

Chaque sonde : diff complet vs breakout documenté (quelques lignes — un diff qui grossit = sonde invalide).

**Fallback S3 (déclaré d'avance, branche complète en §6)** : si la variante `render.mjs` échouait en phase B (improbable : l'oracle ne vérifie aucun pixel), repli UNIQUE = niveau réduit à ≤2 briques (`level.mjs`). Si le repli échoue AUSSI en phase B → **S3 est ABANDONNÉE** (pas INVALIDE) : aucun run capteur sur S3, aucun rapport S3 n'entre au dépouillement, et les critères §6-branche s'appliquent.

## 4. « P0 vert par construction » — définition et vérification

- **Par construction** : les défauts ne touchent ni la logique ni les tests ni le harnais e2e — uniquement CSS (S1/S2/S4) et littéraux de couleur du rendu (S3) ; seul le fallback S3 touche `level.mjs`.
- **Vérifié mécaniquement** : pour CHAQUE sonde retenue, `node run-oracle.mjs` (logic + properties + e2e Playwright + solvabilité) doit sortir **exit 0**, log conservé. Périmètre honnête : « P0 » = l'oracle du jeu ; le chemin driver/mutation n'est pas rejoué (les sondes ne sont pas des runs forge).
- **Exécution STRICTEMENT SÉQUENTIELLE** des 5 validations : `e2e.mjs` porte un port codé en dur (4503) partagé par toutes les copies — un lancement parallèle produirait des rouges environnementaux spécieux (EADDRINUSE).
- **Rouge environnemental vs rouge de sonde** : un P0 rouge dont la cause est prouvée environnementale par le log (collision de port, timeout serveur) autorise UN re-run technique documenté — ce n'est pas un redesign. Un rouge imputable au contenu de la sonde → redesign (S1/S2/S4 : un seul redesign autorisé, sinon INVALIDE ; S3 : chemin fallback §3).
- Après le début de la phase C : plus AUCUNE modification de sonde (vérifiable — cf. gel §7).

## 5. Périmètre d'évaluation (figé AVANT le run — anti-cherry-picking)

- **Métriques évaluées** : A1, A2, A3, A5 uniquement (statut KEEP de `P1_MECHANICAL_RESULTS.md`).
- **A4** : signal brut, jamais jugé. **A6 et B1/B2/B3** : calculées par le capteur inchangé et présentes dans les rapports, mais **HORS évaluation** — exclusion décidée ICI, AVANT le run, sur leur statut acté (DROP/MODIFY), pas d'après ce qu'elles montreront. (Fait connu d'avance : A6 tirera sur S5 comme sur le jeu sain — documentaire, ni détection ni FP.)
- **Règle de comptage — niveau FAMILLE de métrique** (une seule règle pour le dépouilleur) : les observations se classent par préfixe d'id (`A1_contrast:*`, `A2_target_size:*`, `A3_empty_density`, `A5_h_overflow`).
  - *Détection attendue* : ≥1 `signal_detected` de la FAMILLE attendue de la sonde (§3 ; pour S1, la famille A1 ne compte que via les 4 IDs listés — les IDs A1 post-overlay comme `A1_contrast:#restart` restent dans la famille pour les FP mais ne valident pas S1).
  - *Faux positif* : tout `signal_detected` du périmètre dont la FAMILLE n'est pas celle attendue par la sonde — y compris TOUTE détection du périmètre sur S5.
  - *`metric_unavailable`* : ni détection ni FP — compté et rapporté à part.
  - **ID attendu ABSENT du rapport** (ex. `A3_empty_density` non émis car canvas non résolu) : ni « non détecté » ni FP — la sonde est **INVALIDE techniquement**, UN re-run technique documenté autorisé ; second échec → sonde exclue et comptée comme non-détection.

## 6. Critères succès / échec (figés avant run — les deux branches écrites)

**Branche nominale (S3 présente — 4 sondes à défaut + S5)** :
- **SUCCÈS** : ≥3/4 défauts détectés (familles attendues) ET 0 FP sur les 5 sondes (périmètre A1/A2/A3/A5) ET P0 vert prouvé sur les 5.
- **ÉCHEC** : <3/4 détectés OU ≥1 FP.

**Branche S3-abandonnée (3 sondes à défaut S1/S2/S4 + S5)** :
- **SUCCÈS** : ≥2/3 détectés ET 0 FP sur les 4 sondes restantes ET P0 vert prouvé sur ces 4. Aucun rapport S3 (il n'en existe pas — §3) n'entre au dépouillement.
- **ÉCHEC** : <2/3 détectés OU ≥1 FP.

**INVALIDE (l'expérience n'a pas eu lieu — liste fermée)** : (i) une sonde S1/S2/S4 rouge P0 après son unique redesign ; (ii) sha `sensor.mjs`/`analysis.mjs` modifié, ou sha `collect.mjs` ≠ référence post-phase-A ; (iii) empreinte d'une sonde ≠ celle scellée en fin de phase B (gel §7) ; (iv) rapport capteur antérieur à la phase C découvert sur une sonde ; (v) sonde re-runnée hors du cas technique documenté de §5. → Retour à Pierre.

- Un SUCCÈS satisfait le gate de réouverture P1 **pour la sous-base lisibilité** (décision d'ouverture P1 = séparée, Pierre). Un ÉCHEC clôt la piste capteur mécanique sans P1 complet.
- **Aucun résultat intermédiaire ne déclenche de retuning.** Le verdict se calcule mécaniquement depuis les rapports JSON par les règles §5/§6 (zéro paramètre libre) ; Pierre ratifie le protocole (avant) et la conclusion (après).

## 7. Déroulé (phases, avec conditions d'arrêt)

- **Phase A — Construction** : sha256 capteur relevés (§1) ; 5 copies + diffs minimaux ; entrées CONFIGS ajoutées ; diff `collect.mjs` consigné → `sha_post` = référence. Vérifications STATIQUES des défauts (calculs, jamais le capteur).
- **Phase B — Validation P0 (séquentielle)** : `run-oracle.mjs` exit 0 par sonde (logs conservés ; règle rouge-environnemental §4). **En sortie de phase B : sha256 de CHAQUE fichier de CHAQUE sonde retenue, consignés dans le log de run** (gel des sondes — symétrique du gel capteur).
- **Phase C — Run capteur (passe unique, ordonnée)** : `collect.mjs` sur les sondes retenues, **seed 1234, 40 inputs** (identique à P1). Rapports sous `lab/forge_sensors/_probe_<nom>/`. Aucune modification de quoi que ce soit ; seul re-run autorisé : cas technique documenté de §5 (rapport absent/crash avant écriture), une fois par sonde.
- **Phase D — Dépouillement** : re-vérification sha capteur ET sha sondes ; table attendu-vs-observé complète (tous IDs, toutes sondes) ; comptage §5 ; verdict par §6 ; rapport final `P1_1_RESULTS.md` → décision Pierre.

## 8. Ce que ce protocole ne prétendra pas (limites déclarées d'avance)

- Un SUCCÈS prouve la détection de défauts **synthétiques et grossiers** orthogonaux à P0 — il justifie d'ouvrir la discussion P1, pas de prétendre attraper les défauts subtils des vrais jeux forgés.
- Sondes mono-source (breakout) : généralisation inter-genres non couverte.
- Le stimulus FTUE tourne sans rien évaluer ; la question genre-consciente reste ouverte (hors périmètre).

## Rapport de charter (à la livraison, si go)

```
software_verdict: (aucun — expérience advisory, aucun verdict produit ni modifié)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
advisory_only: true
experiment_outcome: SUCCESS | FAILURE | INVALID (calculé mécaniquement, critères §6)
```
