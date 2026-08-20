# ADJUDICATION — revue adversariale du protocole P1.1 (annexe de ratification)

- **Date** : 2026-07-12
- **Objet** : disposition FINALE des 14 findings sérieux de la revue adversariale v1 (19 bruts, 5 nits foldés à part). Exigence Pierre : chaque finding **confirmé puis corrigé**, ou **réfuté avec preuve** — aucune objection vérifiable laissée pendante avant ratification.
- **Provenance** : run de revue `wf_de75201a-123` (2 attaquants × lentilles, sceptiques par finding). 9 findings adjugés par les sceptiques du run ; **5 sceptiques coupés par la limite de session → adjugés ici contre le code réel** (lecture + calcul mécanique, script scratchpad `adjudicate_s3_density.mjs`, sorties reproduites ci-dessous).
- Nota : la v1 du protocole a été réécrite en place (v2) ; les citations v1 vivent dans le journal du run de revue.

## Verdict global

**8 CONFIRMÉS → tous corrigés dans le protocole v2** (2 par les sceptiques du run + 5 orphelins confirmés ici + 1 auto-détecté avant revue). **7 RÉFUTÉS avec preuve.** Plus aucune objection ouverte.

---

## A. Confirmés par les sceptiques du run (corrigés en v2)

| # | Finding | Preuve (résumé) | Correction v2 |
|---|---|---|---|
| A1 | Branche fallback S3 : §6 non re-décliné — critères insatisfaisables/contradictoires si S3 abandonnée | Calcul du sceptique : 2 détections/3 = SUCCÈS selon §3 mais ÉCHEC selon §6 ; « P0 vert sur les 5 » sans 5ᵉ sonde = indéfini | §6 : **les deux branches écrites en entier** ; S3 abandonnée = pas INVALIDE, aucun rapport S3 au dépouillement |
| A2 | Gel asymétrique : capteur sha256é, sondes non scellées → « aucune modif après phase C » invérifiable (retouche S3 0.91→0.92 indétectable) | Vérifié : aucun hachage dans `scripts/quality_sensor/`, rapport sans empreinte du jeu mesuré ; marge S3 fine | §7 phase B : **sha256 de chaque fichier de chaque sonde** scellé, re-vérifié phase D ; divergence = INVALIDE (iii) |

(+ **A0**, auto-détecté avant la revue : profondeur des sondes — `games/_probes/<nom>/` cassait la résolution `../../` du harnais → sondes à même profondeur `games/_probe_<nom>/`, §3.)

## B. Orphelins adjugés ici (sceptiques coupés) — 5/5 CONFIRMÉS, corrigés en v2

### B1+B2 — S3 : bordure des briques hors « palette » (2 findings, même cœur) — **CONFIRMÉ, preuve par calcul**

**Faits code** : les couleurs de briques sont 2 constantes ([render.mjs:11-12](../../games/breakout/render.mjs)) MAIS la bordure est un littéral inline `strokeStyle "rgba(255,82,82,0.5)"` ([render.mjs:52](../../games/breakout/render.mjs)), tracé inconditionnellement pour chaque brique (l.51-54). Une S3 « palette seule » laisserait des contours rouges.

**Preuve quantitative** (script scratchpad, importe le VRAI `generateLevel(888,0)`, modélise le downsample de `collect.mjs` — blocs 4×4, tol=10) :

```
CALIBRATION jeu sain : modèle 0.8904 vs MESURÉ 0.895 (écart 0.0046 → modèle crédible)
S3 bordure CONSERVÉE : pire cas 0.9190 (< 0.92 → NON détectée, échec à tort)
                       meilleur cas 0.9564 — issue dépend de l'ANTIALIASING
                       (Δ bloc ≈ 7.5–15 autour de tol=10, indécidable statiquement)
S3 bordure INCLUSE   : 0.9564, marge +0.0364 = ~60× la variance mesurée (±0.0006)
```

**Verdict** : CONFIRMÉ — et plus sévère que la claim (« pile sur le seuil ») : le pire cas passe SOUS le seuil → vecteur d'ÉCHEC à tort. **Correction v2 §3** : le défaut S3 couvre obligatoirement les 3 littéraux (2 constantes + bordure l.52) ; densité attendue ≈ 0.956.

### B3 — Runs capteur pré-phase C non interdits + valeurs « indicatives » → itération sonde-contre-capteur sans trace — **CONFIRMÉ**

**Faits** : la v1 ne contenait aucune clause interdisant d'exécuter le capteur sur une sonde pendant sa construction ; les valeurs de défaut « indicatives » invitaient à itérer jusqu'à détection — un tuning invisible du même type que A2. **Correction v2 §1** : vérification STATIQUE seulement en phase A (calcul WCAG arithmétique, géométrie CSS, calcul de surface) ; « la découverte d'un rapport capteur antérieur à la phase C sur une sonde = INVALIDE » (§6 liste (iv)).

### B4 — Port e2e 4503 codé en dur × 5 copies : rouge environnemental indistinguable d'un rouge de sonde — **CONFIRMÉ**

**Faits code** : [e2e.mjs:15](../../games/breakout/e2e.mjs) `const PORT = 4503;` hérité par toute copie ; `startServer` rejette sur exit du serveur (l.24-31) → EADDRINUSE (validations parallèles) = volet e2e rouge → P0 rouge **spécieux**, menant à un redesign/abandon de sonde « pour une mauvaise raison » (cas (c)). **Correction v2 §4** : phase B **strictement séquentielle** + règle « rouge environnemental prouvé par le log = UN re-run technique documenté, pas un redesign ».

### B5 — Sha `collect.mjs` incohérent : il diverge PAR CONSTRUCTION (ajout CONFIGS autorisé §2) — **CONFIRMÉ**

**Faits** : la v1 exigeait « sha des 3 fichiers avant A, re-vérifié après C, divergence hors périmètre §2 = invalide » — or deux hashs ne peuvent pas décider « autorisé/non-autorisé » (un hash ne dit pas CE QUI a changé), et le sha de `collect.mjs` DOIT changer (les entrées CONFIGS y vivent). Critère mécaniquement inapplicable tel qu'écrit. **Correction v2 §1** : gel en 2 temps — `sensor.mjs`/`analysis.mjs` identiques de bout en bout ; `collect.mjs` : diff `sha_pre→sha_post` consigné et ratifiable en phase A, puis **`sha_post` = référence figée** jusqu'à D (comparaison d'égalité, mécaniquement décidable).

## C. Réfutés avec preuve (par les sceptiques du run — protocole inchangé sur ces points)

| # | Finding réfuté | Cœur de la preuve |
|---|---|---|
| C1 | « Dépouilleur non spécifié = liberté post-hoc » | Les règles §3+§5+§6 + le vocabulaire d'IDs émis par le capteur figé déterminent la classification de chaque outcome — zéro paramètre libre ; artefacts JSON rejouables |
| C2 | « Entrée CONFIGS trafiquée (bg/textTargets/seed) inattrapable » | Périmètre §2 binaire (« SEULS dir et port ») + diff obligatoire contre blob épinglé ; s'y soustraire = fraude aux preuves, hors modèle (gate humain + preuves brutes) |
| C3 | « Pas de politique de re-run → cherry-picking sur A3 à fleur » | Variance A3 réelle ~±0.0006 (balle = ~9 blocs/30 000 ; les briques ne peuvent pas être détruites avant la capture : balle à ≥2.25 s des briques, capture à ~0.4-0.8 s) — 40× sous la marge ; aucun outcome ne peut basculer entre deux runs |
| C4 | « Sorties `_probes/` impossibles avec le collect figé » | La clé CONFIGS détermine `outDir` ; `path.join` normalise ; `mkdir recursive` ; le verdict est insensible au chemin |
| C5 | « Signal de la métrique attendue sur un sélecteur non touché = ni détection ni FP » | Extensionnellement vide : seuls 3 cas S1×A1 divergent et aucun ne peut produire un signal (computed styles déterministes, valeurs baseline 4.86–17 vs seuil 4.5) ; v2 ajoute quand même la règle famille-de-métrique (§5) |
| C6 | « S5 “tout signal = FP” contredit §5 (A6 tirera à coup sûr) » | La définition §5 est scopée au périmètre A1/A2/A3/A5 ; A6 exclue AVANT run ; §6(b) restate le périmètre ; v2 note explicitement le fait A6-sur-S5 comme documentaire |
| C7 | « Clés CONFIGS “naturelles” → chemin de sortie non conforme » | Même preuve que C4 + liste INVALIDE fermée : l'emplacement d'écriture n'y figure pas ; v2 fixe la convention `_probe_<nom>` |

## D. Nits foldés en v2 (5)

`#brickCount` retiré du comptage S1 (non mesuré par `textTargets` figé — ×2 doublons) · ID attendu ABSENT du rapport = INVALIDE technique + 1 re-run documenté (§5) · phase B séquentielle (recoupe B4) · règle de comptage au niveau famille de métrique (§5) · granularité §3 = mécanisme attendu, §5 = règle de comptage.

---

## Conclusion

Les 14 objections sérieuses sont épuisées : **8 confirmées-corrigées, 7 réfutées avec preuve** (A0 inclus : 15 dispositions). Le protocole v2 intègre toutes les corrections ; aucune objection vérifiable n'est pendante. La ratification relève de Pierre.

```
software_verdict: (aucun — adjudication documentaire)
evidence_verdict: MECHANICAL_VALIDATION_ONLY   (lectures fichier:ligne + calcul calibré reproduit)
claim_verdict: NO_CLAIM_ALLOWED
```
