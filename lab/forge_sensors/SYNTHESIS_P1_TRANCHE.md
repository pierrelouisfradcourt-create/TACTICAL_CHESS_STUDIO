# Synthèse — tranche P1 mécanique-only (advisory) — 2026-07-11

Capteur `scripts/quality_sensor/` exécuté sur 2 jeux passant DÉJÀ P0 (breakout, menagerie_tactics).
Rapports bruts : `lab/forge_sensors/<jeu>/visual_mechanical.json`. Seed FTUE = 1234, 40 inputs, rejouable.
**Sortie advisory** — aucun branchement verdict/promotion. Cette synthèse ne produit AUCUN score.

## Table d'orthogonalité — P0 (vert) vs signaux P1

| Jeu | P0 (oracle) | P1 signaux détectés | Vrai positif ? |
|---|---|---|---|
| breakout | **vert** (solvabilité + mutation + e2e) | `A6_render_alive=0.0005` | **NON — faux positif** |
| menagerie_tactics | **vert** (solvabilité + mutation + e2e) | `A6_render_alive=0`, `B2_first_reward=null`, `B1_dead_input_rate=1`, `B3_longest_stall=40` | **NON — 4 faux positifs** |

Les métriques de **lisibilité** (A1 contraste, A2 taille, A3 densité, A5 débordement) n'ont **rien signalé** sur les deux jeux — et à raison : valeurs saines (contrastes 4.86→17, cibles 34-37px, débordement 0). Elles ont correctement **distingué** breakout (densité 0.895, très épars) de menagerie (0.396, riche) sans faux positif.

## Comptabilité des faux positifs

| Signal | Jeu | Mesuré | Vrai/Faux | Cause racine |
|---|---|---|---|---|
| A6_render_alive | breakout | 0.0005 | **FAUX** | rendu épars : balle ~2px en downsample 400×300 → diff < seuil, mais `B1=0`/`B2=1` prouvent que le jeu répond et score (pas figé) |
| A6_render_alive | menagerie | 0 | **FAUX** | tour-par-tour : rendu statique entre actions = *par conception*, pas « figé cassé » |
| B2_first_reward | menagerie | null | **FAUX** | clics aléatoires sans progrès = attendu pour un jeu tactique (exige de la stratégie) |
| B1_dead_input_rate | menagerie | 1 | **FAUX** | (a) tactique exige de l'intention ; (b) l'état échantillonné ignore la SÉLECTION (réponse UI réelle) → gonfle le taux |
| B3_longest_stall | menagerie | 40 | **FAUX** | même racine que B1 |

**Total : 5 signaux détectés, 0 vrai positif, 5 faux positifs (100% des signaux tirés).**

## Constat important (nuance)

Les **mesures** FTUE sont ACCURATE et reproductibles : breakout est *naïf-friendly* (`B2=1`, récompense immédiate), menagerie est *stratégie-requise* (`B2=null`). Le capteur mesure donc correctement la « progressabilité naïve » d'un jeu. **Le défaut n'est pas la mesure — c'est l'INTERPRÉTATION** : un seuil fixe qui traite « faible progrès naïf » comme un *défaut* alors que c'est *genre-approprié* pour la tactique. Les seuils étaient déclarés hypothèses ; l'expérience montre qu'ils sont **genre-aveugles**.

## Deux causes racines des faux positifs

1. **A6 (réactivité) est méthode-aveugle** : le diff plein-cadre downsamplé tire sur les rendus épars (breakout) ET statiques-par-conception (tour-par-tour). Il ne distingue pas « vivant mais épars/statique » de « figé cassé ».
2. **FTUE (B1/B2/B3) est genre-aveugle** : le stimulus clics-aléatoires + seuils fixes supposent un arcade temps-réel. Sur de la tactique, « aucun progrès naïf » est attendu, pas un défaut. De plus l'état salient ignore la sélection (réponse UI réelle).

## Réponse à la question expérimentale de la tranche

> « Une base mécanique simple détecte-t-elle des défauts réels que P0 ne voit pas ? »

- **Lisibilité (A1/A2/A3/A5)** : base **saine** (0 faux positif, mesures discriminantes), mais **aucun vrai positif** — parce que les 2 jeux sont réellement propres sur ces axes. Détection **non prouvée** (il faudrait un jeu à défaut de lisibilité connu).
- **Réactivité (A6) + FTUE (B)** : **inexploitables tels quels** (5/5 faux positifs, genre-/méthode-aveugles).
- **Critère de succès (≥1 vrai positif) : NON ATTEINT** sur ces 2 jeux.

## Recommandation (décision Pierre — pas d'implémentation sans go)

Selon le critère d'arrêt du contrat (« tous faux positifs → base insuffisante, ne pas engager P1 complet ») : **NO-GO pour P1 complet en l'état.**

Mais le résultat est actionnable, pas un cul-de-sac :
- La **sous-base lisibilité** est la plus prometteuse (saine, déterministe) — à re-tester sur un jeu à défaut connu pour prouver la détection d'un vrai positif.
- **A6** doit être repensé (mesurer la région animée, ou distinguer temps-réel/tour-par-tour) ou retiré.
- **FTUE** n'a de sens qu'avec des **seuils genre-conscients** (arcade vs tactique) et un état salient incluant la sélection.

Limite honnête : les VALEURS mesurées côté navigateur ont une micro-variance de timing frame-à-frame (le stimulus d'entrée, lui, est 100% reproductible via la seed) — à border si on veut un hash stable.
