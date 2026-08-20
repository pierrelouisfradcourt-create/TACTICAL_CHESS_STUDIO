# Réalité du Marché Steam
#reference #gamedesign

> Chiffres de sobriété — source : Gamalytic, GameDiscoverCo, Quantic Foundry, 2025-26.
> Distillé depuis `docs/studio_v2/00_SYNTHESE_VISION_STRATEGIE.md` §4, `03_BUSINESS_PLAN.md`.

---

## Distribution des revenus (dure réalité)

| Métrique | Valeur 2025 |
|---|---|
| Jeux sortis sur Steam | 20 282 en 2025 |
| % atteignant 1 000 reviews (~150k$) | ~3 % |
| Revenu médian tous jeux | ~249 $ |
| % qui font < 1 000 $ | ~66 % |
| % ne récupérant pas les 100 $ de frais | ~40 % |
| % vendant < 100 copies | ~47,5 % |

**Lecture** : l'année 1 est un investissement en machine et audience, pas un revenu. L'espérance est dominée par la variance → stratégie portefeuille obligatoire.

---

## Wishlists — la variable qui gate tout

| Seuil | Signal |
|---|---|
| < 1 000 WL à J-30 | Ne pas lancer — reporter ou pivoter |
| ~7 000 WL (fenêtre serrée) | Plancher visibilité « Popular Upcoming » |
| 25 000-50 000 WL | Zone de lancement confortable |
| > 100 000 WL | Hit confirmé avant lancement |

**Conversion wishlist → vente (1ʳᵉ semaine)** ≈ **0,15× les wishlists**
- < 5k WL : conversion ~15 %
- 40-100k WL : conversion ~23 %

---

## Sentiment IA (risques)

| Métrique | Valeur |
|---|---|
| Jeux taggés IA : impact reviews | −53 % |
| Joueurs négatifs envers IA générative | 85 % |
| Joueurs « très négatifs » | 63 % (pire que la blockchain) |
| Output IA brut | Non protégeable (USCO 2025, Thaler v. Perlmutter 2026) |
| Steam (révision janv. 2026) | Seul le contenu IA *vu par le joueur* doit être déclaré |

---

## Business Plan Snake: Survivor RPG (3 scénarios An1)

| Scénario | Wishlists/titre | Ventes An1 | Revenu net dev | Probabilité |
|---|---|---|---|---|
| Conservateur | 800-1 500 | ~600-1 500 copies | ~600-3 500 € | ~55-65 % |
| Probable | 3 000-8 000 | ~5 000-12 000 copies | ~13 000-30 000 € | ~25-30 % |
| Agressif | 1 titre à 25-40k WL | ~25 000-60 000 copies | ~85 000-210 000 € | ~5-10 % |

**Burn cash annuel** : ~700-900 € (outils + VPS) + 100 $/titre. Largement sous les 2k€.
**Point mort par titre** : ~130-150 € de ventes brutes.

**Lecture honnête** : le cas le plus probable de l'année 1 est en dessous d'un SMIC. An1 = R&D + audience. La machine paie à partir de An2-3 (effet catalogue + kit réutilisable).

---

## Seuils de décision business

| Signal | Seuil | Action |
|---|---|---|
| WL à J-30 du fest | < 1 500 | Reporter/intensifier/retravailler le hook |
| Conversion visite→WL | < 1,5 % | Re-tester capsule avant tout marketing |
| Rétention J1 idle | < 20 % | Re-équilibrer progression avant marketing |
| Revenu net cumulé 18 mois | < 10k € | Gate Pierre : réévaluer genre/GtM |
| Un titre dépasse 10k WL | — | Doubler la mise : suite/variante |

---

## Génération du studio_kit : coût marginal décroissant

```
Titre 1 : construction de tout le kit (save, UI, audio, télémétrie, spawner…)
Titre 2 : réutilise 50-70 % du kit → coût de production divisé
Titre 3 : réutilise 70-80 % + précédents causaux → encore moins cher
An2-3  : effet catalogue (long tail des anciens titres) + meilleurs paris
```

---

## Liens
- [[../doctrine/studio-doctrine|Doctrine]]
- [[../projects/snake-survivor-genesis|Snake: Survivor RPG]]
- [[../gamedesign/lessons|Leçons Gamedev]]
