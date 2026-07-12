# RAPPORT EXPÉRIMENTAL FINAL — tranche P1 mécanique-only

- **Date** : 2026-07-11
- **Contrat** : `docs/forge/P1_MECHANICAL_CONTRACT.md` (ACCEPTED, exécuté intégralement)
- **Statut de la tranche** : **CLOSED — EXPÉRIENCE FALSIFIÉE** (décision Pierre 2026-07-11)
- **Nature de la clôture** : l'hypothèse « des signaux mécaniques simples à seuils fixes détectent des défauts qualité réels que P0 ne voit pas » est **réfutée sur les jeux testés**. Le protocole, lui, a fonctionné exactement comme conçu : critères posés avant le test, mesure du bruit, verdict falsifiable. Ce n'est PAS un échec technique — c'est une expérience qui a rendu sa réponse.

## 1. Question expérimentale et réponse

> Des signaux mécaniques simples détectent-ils des défauts réels que P0 ne voit pas ?

**Réponse mesurée : NON, sur 2 jeux propres, avec les seuils-hypothèses v0.**
5 signaux tirés, 0 vrai positif, 5 faux positifs (100 % de bruit sur les signaux tirés).
Critère de succès du contrat (≥1 vrai positif) : **non atteint** → critère d'arrêt « tous faux positifs » déclenché → **no-go P1 complet**, conforme au contrat.

## 2. Dispositif (rappel, pour reproductibilité)

- Capteur : `scripts/quality_sensor/` (cœur pur testé 19/19 ; collecte Playwright).
- Jeux : `breakout` et `menagerie_tactics` (worktree), tous deux **verts P0** (solvabilité + mutation + e2e).
- Stimulus : exploration seedée (seed 1234, 40 inputs, rejouable bit-à-bit) — clavier (breakout), clics grille (menagerie).
- Rapports bruts : `lab/forge_sensors/<jeu>/visual_mechanical.json` + synthèse `lab/forge_sensors/SYNTHESIS_P1_TRANCHE.md`.

## 3. Conclusions enregistrées (ratifiées Pierre 2026-07-11)

1. **Isolation P0/P1 : VALIDÉE.** Aucun import de `scripts/forge/`, aucun branchement verdict/promotion, aucune modification du pipeline de preuve. P1 observe, P0 décide.
2. **Collecte déterministe : VALIDÉE.** Stimulus 100 % rejouable (seed + séquence enregistrées) ; navigateur réel piloté sans LLM ni adaptativité.
3. **Rapports reproductibles : VALIDÉS.** Format brut par métrique (mesuré · seuil-hypothèse · justification · raw · artefact), vocabulaire à 3 états, aucun agrégat. Limite honnête : micro-variance de timing sur les VALEURS mesurées côté navigateur (le stimulus, lui, est bit-à-bit stable) — à border si un hash strict du rapport est exigé un jour.
4. **A1/A2/A3/A5 (lisibilité) : utiles mais non suffisamment testées.** 0 faux positif, mesures discriminantes (densité 0.895 vs 0.396) — mais aucun vrai positif car les 2 jeux sont réellement propres sur ces axes. Leur pouvoir de DÉTECTION reste non prouvé.
5. **A6 (réactivité par diff plein-cadre) : INVALIDÉE dans sa forme actuelle.** Méthode-aveugle : tire sur un rendu épars (breakout : balle ~2 px → diff 0.0005) et sur un rendu statique-par-conception (menagerie : tour-par-tour → diff 0). Contredite dans le même rapport par les métriques FTUE (le jeu répond et score).
6. **FTUE v0 (B1/B2/B3) : INVALIDÉ comme métrique universelle sans notion de genre.** Les MESURES sont justes (breakout naïf-friendly : récompense au 1er input ; menagerie stratégie-requise : 0 progrès naïf) — c'est l'INTERPRÉTATION à seuil fixe qui est fausse : elle traite un comportement genre-approprié (tactique) comme un défaut. Défaut secondaire : l'état salient ignorait la sélection (réponse UI réelle) sur menagerie.

**Décision associée : pas de correction d'A6 ni du FTUE pour « refaire passer » le critère. Pas de tuning opportuniste.** Un seuil retouché après coup pour transformer un faux positif en vrai positif détruirait la valeur de l'expérience.

## 4. Statut par métrique

| Métrique | Ce qu'elle mesure | Résultat expérimental | **Statut** | Justification |
|---|---|---|---|---|
| A1 contraste WCAG | ratio texte/fond (computed styles) | 0 FP ; valeurs saines mesurées (4.86→17) ; détection non prouvée | **KEEP** | méthode saine et standard ; reste à prouver la détection sur défaut connu |
| A2 taille des cibles | min(w,h) des interactifs | 0 FP (34-37 px mesurés) ; détection non prouvée | **KEEP** | idem A1 |
| A3 densité d'écran vide | fraction de pixels = fond | 0 FP ; discriminante (0.895 vs 0.396) ; nota : breakout 0.895 frôle le seuil 0.92 — seuil fragile à calibrer sur défaut connu | **KEEP** | signal riche ; seuil à retraiter comme hypothèse ouverte |
| A4 couleurs distinctes | nb de couleurs canvas | signal brut collecté (15 vs 716) — jamais jugé | **KEEP (brut uniquement)** | ne devient un jugement qu'avec l'art bible (P2) |
| A5 débordement viewport | scrollWidth − innerWidth | 0 FP (0 sur les 2 jeux) | **KEEP** | trivial, sans coût, sans bruit |
| A6 réactivité (diff plein-cadre) | % pixels changés en 200 ms | **2/2 faux positifs** — méthode-aveugle (épars, tour-par-tour) | **DROP** (forme actuelle) | invalidée ; toute résurrection = NOUVELLE métrique à re-proposer (ex. diff sur région d'intérêt, ou horloge de jeu), jamais un retuning de celle-ci |
| B1 taux d'inputs morts | fraction d'inputs sans delta d'état | mesure juste, interprétation genre-aveugle (FP sur tactique) | **MODIFY** (proposition doc seulement) | machinerie de mesure conservée ; inutilisable sans contexte de genre + état salient incluant la sélection |
| B2 pas-avant-récompense | inputs naïfs avant 1er progrès | idem B1 (FP sur tactique, juste sur arcade) | **MODIFY** (doc seulement) | idem B1 |
| B3 plus long stall | inputs consécutifs sans effet | idem B1 | **MODIFY** (doc seulement) | idem B1 |

Aucun MODIFY n'est implémenté dans cette clôture — ce sont des orientations pour une éventuelle P1.1, document séparé.

## 5. Ce que la tranche a durablement établi (au-delà des métriques)

- Un **protocole d'expérience falsifiable** pour tout futur capteur qualité : contrat AVANT code, seuils déclarés hypothèses, vocabulaire 3-états sans pass/fail, table d'orthogonalité, comptabilité du bruit obligatoire. C'est réutilisable tel quel.
- Une **infrastructure de collecte** saine et isolée (stimulus seedé, configs par jeu, rapports bruts) qui n'a PAS besoin d'être réécrite pour une itération future.
- Un fait de conception : **le goulot n'est pas de mesurer, c'est d'interpréter** — les mesures étaient justes, les seuils fixes universels étaient le point de rupture. Tout P1 futur devra porter le contexte (genre, art bible) AVANT les seuils.

## 6. Gate de réouverture (ratifié)

**Pas d'ouverture P1 complet tant qu'un signal mécanique n'a pas démontré une détection orthogonale à P0** — c'est-à-dire : un défaut réel, détecté par le capteur, sur un jeu où P0 est vert, avec un bruit mesuré acceptable. La voie candidate pour produire cette démonstration est la proposition P1.1 (`docs/forge/P1_1_PROPOSAL.md`), document seulement, non engagée.

## Rapport de charter

```
software_verdict: (aucun — tranche advisory, aucun verdict produit ni modifié)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
advisory_only: true
experiment_outcome: FALSIFIED (protocole valide, hypothèse réfutée)
```
