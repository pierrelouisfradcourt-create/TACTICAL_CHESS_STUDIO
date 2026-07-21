# ROADMAP — SNAKE: SURVIVOR RPG — GENESIS

*Du MVP au lancement, puis étagement de la vision AAA. Dérivé du CERFA (doc 10).*
*Gates : 🟢 SAFE_AUTO · 🟠 AUDIT (revue + /plan) · 🔴 HUMAN (Pierre).*

---

## PRINCIPE : distribution-first + tranche verticale d'abord

Deux choses sortent **avant** le jeu complet : (1) la **page Steam** (collecte de wishlists au plus tôt), (2) une **démo du hook** (Constriction). Le reste du contenu suit. La vision AAA n'est étagée **que si** le MVP valide.

---

## PHASE 0 — Fondations & hook prouvable *(semaines 1-4)*

| Priorité | Bloc | Dépend de | ROI | Gate |
|---|---|---|---|---|
| P1 | Projet Godot + `studio_kit` (save, options, audio, télémétrie) | — | réutilisable tous jeux | 🟠 |
| P1 | **Prototype du hook** : serpent (inertie/braquage) + auto-attaque + **Constriction** | kit | valide le différenciateur **avant** tout investissement | 🟠 |
| P2 | Boucle survivor minimale : spawn de fodder + orbes XP + level-up (3 cartes) | proto | core loop jouable | 🟠 |
| P3 | Télémétrie branchée (durée, mort, abandon/min) | kit | fun oracle dès le proto | 🟠 |

**Gate de sortie P0 (décision Pierre) :** le hook est-il *fun* en 2 minutes de jeu ? Si non → itérer le hook ou abandonner **avant** de construire le reste. C'est le premier kill-gate, et le plus important.

**Risque :** le hook Constriction n'est pas amusant/lisible en pratique. **Mitigation :** on le teste en tout premier, isolé.

---

## PHASE 1 — Tranche verticale + page Steam *(semaines 5-10)*

| Priorité | Bloc | Dépend de | ROI | Gate |
|---|---|---|---|---|
| P1 | **Ouvrir Steamworks (100 $) + page store** (tags ×20, capsule v1, GIFs du hook) | proto visuel | **démarre les wishlists** | 🔴 (dépense) |
| P1 | Tranche verticale : 1 biome (Berceau Brisé), 4-5 ennemis, ~8 armes, 2-3 éléments | Phase 0 | la démo | 🟠 |
| P2 | 2-3 synergies « game-breaking » + 2-3 ascensions d'armes | armes | le « theorycrafting » = rétention | 🟠 |
| P2 | Boss Aegis + mécanique Constriction-pour-briser-bouclier | hook | climax de run | 🟠 |
| P3 | Petit Arbre de l'Origine (~12-15 nœuds, 1 monnaie Essence) | méta | raison de rejouer | 🟠 |
| P3 | DA propre + lisibilité (poste d'effort #1 solo ; art retravaillé) | — | reviews/conversion | 🟠 |

**Risque :** scope creep vers la vision AAA + perf (milliers d'entités). **Mitigation :** budget perf décidé en passe 2 (Godot pur vs Rust) ; périmètre figé par le CERFA.

---

## PHASE 2 — Démo, communauté, wishlists *(semaines 10-16)*

| Priorité | Bloc | Dépend de | ROI | Gate |
|---|---|---|---|---|
| P1 | **Démo jouable sur page dédiée, lancée tôt** | tranche verticale | ≈2,5× wishlists vs démo au fest | 🟠 |
| P1 | Discord + r/roguelites/r/Survivorslike + devlog cadence | page Steam | audience cumulative (part de zéro) | 🟢 |
| P2 | Outreach 30-50 micro-streamers (genre ultra-streamable) | démo | 1 streamer = jusqu'à 14k WL/jour | 🟢 |
| P2 | Itération démo via télémétrie (drop-off, rétention) | télémétrie | qualité avant marketing | 🟠 |
| P1 | **Cibler Steam Bullet Fest 2026 + un Next Fest** (entrer ≥ 2 000 WL) | démo+audience | multiplicateur de visibilité | 🔴 |

**Gate business :** wishlists à J-30 du fest. < 1 500 WL → reporter le lancement, intensifier démo/streamers, ou repenser le hook. **Ne pas lancer dans le vide.**

---

## PHASE 3 — Lancement *(quand wishlists ≥ seuil)*

| Priorité | Bloc | ROI | Gate |
|---|---|---|---|
| P1 | Lancement EA ou 1.0 (5-8 €), déclencher la vague wishlists | ventes 1ʳᵉ sem ≈ 0,15× WL | 🔴 (publication) |
| P1 | Chasser les reviews vite (drive Discovery Queue + ventes mois 1) | rétention de visibilité | 🟢 |
| P2 | Hotfix/équilibrage J+1 à J+14 via télémétrie | reviews positives | 🟠 |
| P2 | `butler` itch.io en parallèle (canal secondaire) | longue traîne | 🟢 |

**Kill-criteria :** < 1 000 ventes au mois 1 → **ne pas étager les biomes 2-5** ; capitaliser l'apprentissage sur le titre suivant. (La discipline portefeuille : on ne s'acharne pas.)

---

## PHASE 4 — Étagement de la vision AAA *(seulement si le MVP valide)*

Débloqué **par paliers de revenu/wishlists**, dans cet ordre de ROI :

| Palier | Contenu (depuis le GDD) | Condition de déclenchement |
|---|---|---|
| 4.1 | **Biome 2 (Abysse Néon)** + ennemis/boss + 4ᵉ élément | ventes mois 1 ≥ seuil |
| 4.2 | Plus de synergies/ascensions + élites à coffres | rétention prouvée |
| 4.3 | **Mode Endless + seeds + classements hebdo** | communauté active (online en vaut la peine) |
| 4.4 | Biomes 3-4-5 + arche narrative complète | revenus récurrents |
| 4.5 | Codex/collection + prestige (Nœud Ouroboros) | complétionnistes engagés |
| ❌ | **Mobile F2P + battle pass + boutique + ads** | **nécessite équipe + capital UA + live-ops → hors portée solo** |

Chaque palier reverse ses briques génériques dans `studio_kit/models` → le **titre suivant** (idle ou survivor #2) coûte moins cher.

---

## CHEMIN CRITIQUE

```
P0 hook prouvé ──► page Steam (wishlists) ──► tranche verticale ──► démo tôt
                                                          │
                                   streamers + communauté ─┴─► Bullet Fest (≥2k WL)
                                                                      │
                                                                lancement ──► (si validé) étagement biomes
```

**Verrou n°1 : le hook fun en Phase 0.** S'il n'est pas amusant isolé, rien d'autre ne compte — c'est le premier go/no-go, avant tout investissement de contenu.

---

## RÉ-ANCRAGE DOCTRINE

- **Premium, no IAP** : on construit la variante 2 du GDD, pas le F2P mobile.
- **MVP avant vision** : 1 biome shippé bat 5 biomes jamais finis.
- **Distribution-first** : page Steam et démo avant le contenu complet.
- **Le 1ᵉʳ jeu shippé écrit la 1ʳᵉ ligne du dataset** (compilateur de design, doc 09) — c'est sa plus grande valeur après le revenu.
