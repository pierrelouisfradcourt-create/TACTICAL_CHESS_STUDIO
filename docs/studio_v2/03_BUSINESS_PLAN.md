# PHASE 7 — BUSINESS PLAN

*3 scénarios. Aucun chiffre n'est une certitude — chaque ligne repose sur des hypothèses explicites.*
*Sources de marché : voir les briefs de recherche (Gamalytic/VGI, GameDiscoverCo, howtomarketagame, 2025-26).*

---

## 1. Hypothèses de cadrage (communes aux 3 scénarios)

| Hypothèse | Valeur | Source / justification |
|---|---|---|
| Profil | Solo, temps plein, < 2k€, zéro audience, zéro Steam au départ | Pierre, 2026-06-27 |
| Frais Steam | 100 $ / titre (≈ 92 €), récupérables dès ~€ de ventes | Steam Direct |
| Part Steam | 30 % (70 % net dev) | Standard Steam |
| Coûts outils | ~40-60 €/mois (Claude Code/Cursor + VPS télémétrie) | Devis stack §02 |
| Art/SFX | CC0 / licencié / minimal → quasi 0 € (idle) | Stratégie IA-invisible |
| Prix idle | 4-7 € | Benchmarks genre [WEB] |
| Prix survivor-like | 6-10 € | Benchmarks genre [WEB] |
| Conversion wishlist→vente | 15 % (<5k WL) → 23 % (40-100k) ; 1ʳᵉ semaine ≈ 0,15× WL | GameDiscoverCo [WEB] |
| Réalité dure | ~3 % des jeux atteignent 1 000 reviews ; médian ≈ 249 $ ; 40 % ne récupèrent pas 100 $ | Gamalytic 2025 [WEB] |

**Coûts annuels fixes (tous scénarios) :** outils ~600 €/an + télémétrie VPS ~60 €/an + frais Steam (100 $ × nb titres). Soit **~700-900 €/an** hors frais Steam. Le « burn » réel est le **temps**, pas le cash. **Point mort cash par titre ≈ 130-150 € de ventes brutes** (récupérer 100 $ + part outils).

---

## 2. La logique du modèle : ferme à tickets de loterie

Les revenus indés sont une **distribution à longue traîne** : la majorité des titres font peu, quelques-uns font beaucoup. La stratégie rationnelle d'un solo zéro-budget n'est **pas** « réussir LE jeu » mais **multiplier les tentatives bon marché** dans 1-2 genres, en réinvestissant l'apprentissage (et l'audience Discord/wishlists accumulée) d'un titre au suivant. Chaque titre = un ticket + un actif d'audience cumulatif.

**Variable pilote = wishlists au lancement.** Tout le business plan se résume à : *combien de wishlists chaque titre accumule avant son lancement.* La production est secondaire.

---

## 3. Les 3 scénarios (Année 1)

### Hypothèses différenciantes

| | Conservateur | Probable | Agressif |
|---|---|---|---|
| Titres publiés An1 | 2 (1 idle + 1 idle/survivor) | 3 (1 idle + 2 survivor-like) | 3-4, dont 1 hit |
| Wishlists moyens / titre au lancement | 800-1 500 | 3 000-8 000 | 1 titre à 25-40k, autres 3-8k |
| Maîtrise marketing organique | Faible (on apprend) | Moyenne (flywheel amorcé) | Forte (un titre « perce ») |
| Prix moyen net (après 30%) | ~3,5 € | ~4,5 € | ~5 € |

### Projection de revenus bruts An1

| | Conservateur | Probable | Agressif |
|---|---|---|---|
| Ventes 1ʳᵉ année (cumulé) | ~600-1 500 copies | ~5 000-12 000 copies | ~25 000-60 000 copies |
| **Revenu brut** | **~2 000-6 000 €** | **~20 000-45 000 €** | **~120 000-300 000 €** |
| − Part Steam 30% | | | |
| − Coûts (~0,8k€ + Steam) | | | |
| **Revenu net dev An1** | **~600-3 500 €** | **~13 000-30 000 €** | **~85 000-210 000 €** |
| Probabilité estimée | **~55-65 %** | **~25-30 %** | **~5-10 %** |

> Les probabilités sont un jugement d'expert, pas une mesure. Lecture honnête : **le cas le plus probable de l'année 1 est en dessous d'un SMIC.** L'année 1 est un investissement en *machine* et en *audience*, pas un revenu.

### Cash-flow / burn
- **Burn cash** : ~700-900 €/an + 100 $/titre → **largement sous les 2k€**. Le projet ne meurt pas faute de cash ; il meurt si la **vélocité de wishlists** ne décolle pas.
- **Cash positif** dès qu'un titre dépasse ~150 € de ventes (très atteignable) — mais « cash positif » ≠ « salaire viable ».
- Pas de CAC/LTV pertinents (zéro UA payante). Le « coût d'acquisition » est en **temps de marketing organique**.

---

## 4. Trajectoire pluriannuelle (esquisse)

| | An 1 | An 2 | An 3 |
|---|---|---|---|
| Titres cumulés | 2-3 | 6-10 | 15-25 |
| Hypothèse clef | Construire la machine + 1ʳᵉ audience | Catalogue + 1-2 titres « Gold-ish » (25-50k WL) | Portefeuille + revenus récurrents (queues, ventes saisonnières) |
| Revenu net (cas *probable*) | ~13-30k € | ~30-70k € | ~60-150k € |
| Levier dominant | Apprentissage GtM | Réutilisation kit + audience cumulée | Effet catalogue (long tail) + meilleurs paris |

**Hypothèses structurantes :** (1) la vélocité de production augmente (kit réutilisable) ; (2) l'audience (wishlists/Discord) est cumulative entre titres ; (3) au moins un titre/an gagne en notoriété. Si l'une casse, on glisse vers le scénario conservateur.

---

## 5. Seuils de décision (gates business)

| Signal | Seuil | Décision |
|---|---|---|
| Wishlists d'un titre 1 mois avant lancement | < 1 000 | Reporter le lancement, intensifier la démo/streamers, ou pivoter le titre |
| Conversion visite→wishlist page Steam | < 1,5 % | Re-tester capsule/tags (un swap capsule = jusqu'à 20× ventes [WEB]) |
| Rétention J1 idle (télémétrie) | < 20 % | Re-équilibrer la courbe de progression avant marketing |
| Revenu net cumulé à 18 mois | < 10k € | Réévaluer le genre / le go-to-market en gate Pierre |
| Un titre dépasse 10k WL | — | Doubler la mise : suite/variante du même titre |

---

## 6. Risques business majeurs (détail dans 05)

1. **La distribution, pas la production, tue le projet** — un solo qui sait coder mais pas marketer fera de bons jeux invisibles. → traiter le marketing organique comme le produit n°1.
2. **L'année 1 ne paie pas** — risque d'abandon par découragement. → cadrer An1 comme R&D financée par le temps, jalons en *wishlists* pas en €.
3. **Stigmate IA** — un seul faux pas (art IA visible) peut review-bomber un titre. → règle absolue IA-invisible.
4. **Long tail = peu de hits** — espérance dominée par la variance. → portefeuille, pas pari unique.

---

## 7. Conclusion investisseur

En tant que VC, je ne financerais pas « un studio qui fait des jeux » (trop de variance, pas de moat). Mais le **modèle bootstrap** ici est sain : **burn quasi nul, optionnalité élevée, actif cumulatif (kit + audience + compétence GtM)**. Le pari n'est pas financier — c'est un pari sur **la capacité de Pierre à apprendre le go-to-market organique** plus vite qu'il n'épuise sa motivation. Le rôle du Studio OS V2 est de **rendre chaque tentative quasi gratuite** pour pouvoir en faire beaucoup. C'est la seule stratégie rationnelle à < 2k€.
