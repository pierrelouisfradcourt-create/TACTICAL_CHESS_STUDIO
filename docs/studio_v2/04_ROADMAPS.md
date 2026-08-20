# PHASE 6 — ROADMAPS

*30 jours / 90 jours / 1 an / 3 ans. Pour chaque horizon : priorités, quick wins, dépendances, ROI, risques, gates.*
*Gates : 🟢 SAFE_AUTO · 🟠 AUDIT (revue Cowork) · 🔴 HUMAN (décision Pierre).*

---

## ROADMAP 30 JOURS — « La machine + la première munition »

**Objectif :** pipeline build→publish→télémétrie opérationnel ET page Steam du Titre 1 (idle) en ligne pour commencer à collecter des wishlists **dès le jour le plus tôt possible** (le facteur n°1 du lancement [WEB]).

| # | Action | Quick win | Dépend de | ROI | Gate |
|---|---|---|---|---|---|
| R1 | Geler les 2 worktrees `studio_core/` (P0-D), figer une racine | ✅ | — | Hygiène, stoppe la dérive | 🟢 |
| R2 | Créer repo public Godot + `studio_kit/` (save, options, télémétrie, i18n) | | — | Réutilisable tous titres | 🟢 |
| R3 | CI GitHub Actions : Godot headless export Win/Linux/Web (`firebelley/godot-export`) | | R2 | Build auto gratuit | 🟢 |
| R4 | Git hooks locaux : `cargo fmt/clippy` + tests (porte les tests, gratuit) | ✅ | R2 | Oracle build sans coût CI | 🟢 |
| R5 | Prototype jouable Titre 1 (idle) : boucle core + 1 courbe de progression | | R2 | Le produit | 🟠 |
| R6 | Télémétrie : Plausible/PostHog self-host (VPS ~5€/mo), events rétention | | R2 | Fun oracle v1 | 🟠 |
| R7 | **Ouvrir Steamworks (100$)** + page store Titre 1 (tags ×20, capsule testée) | ✅ | R5 | **Démarre les wishlists** | 🔴 (dépense) |
| R8 | `butler` push itch.io (canal test, feedback précoce) | ✅ | R3 | Test concept à 90% net | 🟢 |
| R9 | `DECISION_LOG.md` + checklist fin de session + mémoire Cowork à jour | ✅ | — | Anti-perte de contexte | 🟢 |

**Risques 30j :** sur-investir le prototype au lieu de publier la page tôt (la page Steam doit sortir ~12 mois avant l'idéal, donc *le plus tôt possible*). **Mitigation :** page store avant polish du jeu.

**Sortie 30j attendue :** un `git push` produit un build jouable sur itch + branche Steam beta ; page Steam live collectant des wishlists ; télémétrie qui remonte.

---

## ROADMAP 90 JOURS — « Lancer le Titre 1, apprendre le go-to-market »

**Objectif :** publier le Titre 1, jouer le cycle wishlists/démo/Next Fest, en tirer les leçons GtM.

| Priorité | Bloc | Dépend de | ROI | Gate |
|---|---|---|---|---|
| P1 | Démo Titre 1 sur sa propre page store, **lancée tôt** (≈2,5× wishlists vs démo au fest [WEB]) | R5,R7 | Élevé | 🟠 |
| P2 | Communautés : Discord + 2-3 subreddits genre, devlog régulier (contribuer avant promouvoir) | R7 | Audience cumulative | 🟢 |
| P3 | Emailer 30-50 micro-streamers (1-10k) avec le build démo | P1 | 1 streamer = jusqu'à 14k WL/jour [WEB] | 🟢 |
| P4 | Entrer au Next Fest **seulement avec ≥ 2 000 WL** (sinon reporter) | P1-P3 | Multiplicateur, pas lanceur | 🔴 |
| P5 | Lancement Titre 1 : déclencher la vague wishlists, chasser les reviews vite | P4 | Ventes 1ʳᵉ sem ≈ 0,15× WL | 🔴 (publication) |
| P6 | Fun oracle v1 : lire la télémétrie (complétion, rage-quit) → backlog d'équilibrage | R6 | Qualité/rétention | 🟠 |
| P7 | Démarrer template **survivor-like** (Titre 2) en parallèle du marketing Titre 1 | studio_kit | Plafond de revenus | 🟠 |

**Risque 90j :** lancer sous 1 000 WL (sous le plancher de visibilité ~7k [WEB]). **Gate :** R5/P5 ne se lancent pas tant que le seuil wishlists n'est pas atteint ou la décision Pierre prise.

**ROI 90j :** principalement de l'**apprentissage GtM** + une première audience. Revenus probablement modestes — c'est attendu (cf. business plan, An1 = R&D).

---

## ROADMAP 1 AN — « Catalogue + flywheel »

**Priorités :** 3 titres publiés ; kit de production mûr ; audience (Discord + wishlists cumulés) qui rend chaque lancement plus facile ; au moins un titre visant 25-50k WL.

| Trimestre | Focus | Gate clef |
|---|---|---|
| T1 (fait en 90j) | Titre 1 idle + machine | 🔴 publication |
| T2 | Titre 2 survivor-like avec **un hook fort** (différenciation obligatoire [WEB]) | 🟠 design |
| T3 | Itération/variante du meilleur titre + 2ᵉ survivor-like | 🔴 si suite |
| T4 | Optimisation pipeline (store assets semi-auto, localisation IA, A/B hors-Steam) | 🟠 |

**Quick wins An1 :** réutilisation `studio_kit` (chaque titre coûte moins) ; localisation IA (marchés FR/DE/zh à coût ~0) ; capsule A/B (un swap = jusqu'à 20× ventes).

**Risques An1 :** découragement (revenus < SMIC), dispersion (trop de genres). **Mitigation :** jalons en wishlists ; rester sur idle+survivor.

**Gates business An1 :** revenu net < 10k€ à 18 mois → réévaluation Pierre du genre/GtM.

---

## ROADMAP 3 ANS — « Portefeuille rentable »

**Vision :** 15-25 titres, effet catalogue (long tail + ventes saisonnières/queues Steam), 1-2 « Gold » (25-50k WL → 250k$+), revenus récurrents permettant le plein temps durable.

| Pilier | Contenu | Dépend de |
|---|---|---|
| Catalogue | Portefeuille dans 2-3 genres adjacents systèmes-lourds | kit mûr |
| GameOps | Modèle de balance/difficulté nourri par la télémétrie (MLOps réorienté) | volume de joueurs |
| Audience | Discord/newsletter > X k, lancement « warm » par défaut | flywheel An1-2 |
| Optionnalité | 1 suite/franchise du meilleur titre | un hit identifié |
| Outillage | Store/marketing/loc gen assistée, Discord bot, experiment tracking | revenu qui le justifie |

**Risques 3 ans :** dépendance plateforme Steam (changement d'algo/politique), burnout solo, banalisation de l'IA-code (l'edge s'érode → l'edge devient le *goût de game design* + l'audience). **Mitigation :** diversifier les canaux (itch, éventuellement éditeur pour 1 titre), franchiser un succès, garder l'humain sur le design.

---

## Chemin critique (résumé)

```
R2 (kit) → R3/R4 (CI/hooks) → R5 (proto idle) → R7 (page Steam = wishlists)
                                                      │
                                         P1 (démo tôt) → P3 (streamers) → P4 (Next Fest ≥2k WL)
                                                                              │
                                                                      P5 (lancement) → P6 (télémétrie)
                                                                              │
                                                                      P7 (Titre 2 survivor) → An1 catalogue
```

**Règle d'or des roadmaps :** la page Steam et la collecte de wishlists sont sur le chemin critique **avant** le polish du jeu. À zéro budget, *la distribution se construit en premier.*
