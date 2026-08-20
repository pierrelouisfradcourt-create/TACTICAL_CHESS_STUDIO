# PHASES 8/9 — RISK REGISTER · AUTOCRITIQUE · ADR · KPIs · BACKLOG

> Note de méthode : le mandat demandait « top 50 » dans 5 catégories (250 items). Conformément à la doctrine du projet (*preuve d'exécution, pas d'existence ; câbler plutôt que gonfler*), je livre des registres **priorisés par signal**, pas une liste padée à 250. Au-delà des items ci-dessous, le rendement décroît — je peux étendre n'importe quelle section sur demande.

---

## 1. AUTOCRITIQUE — ce qui peut faire échouer CE plan

### 1.1 Risques (impact × probabilité)

| # | Risque | I×P | Mitigation |
|---|---|---|---|
| Rk1 | **Le solo sait coder mais pas marketer** → jeux invisibles | 🔴🔴 | Traiter le GtM comme produit n°1 ; jalons en wishlists ; suivre Zukowski/GameDiscoverCo |
| Rk2 | **Page Steam sortie trop tard** → wishlists insuffisants au lancement | 🔴🔴 | Page live AVANT le polish (chemin critique R7) |
| Rk3 | **Burnout** avant que la machine produise du revenu | 🔴🟠 | An1 cadré R&D ; petits jeux finissables ; jalons motivants non-monétaires |
| Rk4 | **Stigmate IA** (un art IA visible review-bombe un titre) | 🔴🟠 | Règle absolue : zéro art IA visible (ADR-003) |
| Rk5 | **Mauvais choix de genre / pas de hook** dans un genre « sain » mais saturé | 🟠🔴 | Différenciation obligatoire ; idle d'abord (faible saturation art) |
| Rk6 | **Dépendance Steam** (algo/politique change) | 🔴🟠 | Diversifier itch ; newsletter/Discord = canal possédé |
| Rk7 | **Dispersion** sur trop de genres/idées | 🟠🟠 | Limiter à idle+survivor An1 ; ledger IMP |
| Rk8 | **Surinvestir l'outillage** (refaire l'erreur « usine ») au lieu de shipper | 🟠🔴 | Règle « est-ce que ça vend ? » ; composants NOW = ~15 max |
| Rk9 | **Lancement sous le plancher de wishlists** (~7k) | 🟠🟠 | Gate : ne pas lancer < seuil sans décision Pierre |
| Rk10 | **Échec à amorcer une audience** (zéro départ) | 🔴🟠 | Discord + subreddits + micro-streamers dès la démo |
| Rk11 | **Long tail** : variance domine, peu de hits | 🟠🟠 | Portefeuille = ferme à tickets, pas pari unique |
| Rk12 | **Coût macOS/iOS CI** | 🟢🟠 | Restreindre ces builds ; PC/Web d'abord |
| Rk13 | **Légal assets** (output IA non protégeable, infraction) | 🟠🟢 | CC0/licencié pour l'art ; IA = code only |
| Rk14 | **Erosion de l'edge IA-code** (tout le monde l'a) | 🟠🟠 | L'edge migre vers *goût de design* + audience cumulée |
| Rk15 | **Démo qui déçoit** → reviews négatives précoces | 🟠🟠 | Fun oracle (télémétrie) avant marketing |

### 1.2 Erreurs probables à éviter
Publier sans page store mûre · viser la perfection du jeu 1 au lieu d'en finir 3 · ignorer les tags Steam · lancer le même jour qu'un AAA · négliger les reviews de la 1ʳᵉ semaine · construire un dashboard avant d'avoir un jeu · réintroduire la boucle autonome « parce que c'est cool » · payer de la pub avec un budget qu'on n'a pas · croire qu'un devlog TikTok = un canal (reach effondré [WEB]) · sous-estimer le temps de marketing (≈ 50 % du temps total).

### 1.3 Simplifications abusives dans ce plan (assumées)
- « Idle = facile à vendre » → **faux** : facile à *produire*, pas à *découvrir*. (Atténué : Titre 1 = apprentissage.)
- Projections de revenus = jugements, pas mesures (variance énorme).
- « Le pipeline est 100 % automatisable » → faux pour le marketing fin/trailer (mur manuel assumé §02).
- « L'audience est cumulative » → vrai *si* on l'entretient ; pas automatique.
- Estimations d'effort S/M/L = approximatives.

### 1.4 Dette technique future à surveiller
`studio_kit` qui diverge entre titres · scripts de pipeline non testés · télémétrie sans schéma stable · secrets Steam/itch dans la CI · absence de versioning des saves (casse les patchs) · couplage Rust/GDExtension fragile · dépendance à des outils IA tiers (pricing/disponibilité volatils — ex. Gemini CLI déprécié, Udio download coupé [WEB]).

---

## 2. ADR — Architecture Decision Records

| ADR | Décision | Statut | Conséquence |
|---|---|---|---|
| **ADR-001** | Reléguer le moteur d'échecs en R&D/vitrine ; ne pas le viser comme produit | ✅ Pierre | Sunk cost neutralisé |
| **ADR-002** | Supprimer l'IR/DSL universel et la boucle autonome | ✅ | −70 % de surface ; fin de P0-C/G |
| **ADR-003** | **IA invisible only** : code/tooling/loc/itération ; jamais d'art/musique IA visible shippé | ✅ | Évite −53 % reviews + non-protégeabilité |
| **ADR-004** | Godot 4 comme moteur ; Rust via GDExtension seulement si profilé | ✅ | Coût 0, pas de royalties |
| **ADR-005** | Genre : idle (Titre 1) puis survivor-like (Titres 2-3) | ✅ | Bas risque puis plafond |
| **ADR-006** | CI lourde uniquement sur merge master ; tests via git hooks locaux | ✅ | Maîtrise coût GitHub Actions |
| **ADR-007** | Oracles = business (wishlists, rétention, build), non-LLM ; LLM = conseil | ✅ | Doctrine anti-Skynet recâblée |
| **ADR-008** | Qwen local pour contenu/itération ; Claude réservé au stratégique | ✅ | Coût d'inférence minimal |
| **ADR-009** | Page Steam + wishlists sur le chemin critique avant le polish | ✅ | Distribution-first |
| **ADR-010** | Télémétrie self-host GDPR-clean (Plausible/PostHog) | ✅ | Fun oracle réel |

---

## 3. KPIs (tableau de bord)

**Production :** time-to-prototype (cible < 2 sem idle), time-to-store-page (cible < 4 sem), titres publiés/an (cible 2-3 An1).
**Distribution (les plus importants) :** wishlists/titre au lancement (cible ≥ 5k, viser 25k), conversion visite→wishlist (cible > 4 %), wishlists gagnés/jour, conversion wishlist→vente (réf. 15-25 %).
**Rétention/qualité :** rétention J1/J7 (idle cible J1 > 25 %), taux de complétion tutoriel, rage-quit rate, % reviews positives (cible > 80 %).
**Business :** revenu net/titre, revenu net cumulé, point mort par titre (~150 €), coût outils/mois (< 60 €).
**Audience (actif cumulatif) :** membres Discord, abonnés newsletter, wishlists portefeuille total.

---

## 4. BACKLOG D'EXÉCUTION — premiers IMPs

*Format : ID · quoi · lane · oracle · effort.*

**Sprint 0 (semaine 1-2) — hygiène + fondations**
- IMP-A1 · Geler worktrees `studio_core/`, figer racine · 🟢 · `grep` imports = 0 hors racine · S
- IMP-A2 · Archiver/tagger la lane chess comme R&D (geler, ne pas supprimer) · 🟠 · build chess encore vert · S
- IMP-A3 · Repo public Godot + `studio_kit/` (save/options/i18n/télémétrie stubs) · 🟢 · projet ouvre, export Web OK · M
- IMP-A4 · CI GitHub Actions export headless Win/Linux/Web · 🟢 · artefact build produit · M
- IMP-A5 · Git hooks locaux (fmt/clippy/tests) · 🟢 · commit rejeté si rouge · S

**Sprint 1 (semaine 3-6) — Titre 1 + distribution**
- IMP-B1 · Boucle core idle jouable + 1 courbe de progression · 🟠 · session jouable 10 min · M
- IMP-B2 · Télémétrie self-host + events rétention · 🟠 · events visibles dashboard · M
- IMP-B3 · Ouvrir Steamworks + page store (tags ×20, capsule v1) · 🔴 · page live · M
- IMP-B4 · `butler` push itch.io canal test · 🟢 · build téléchargeable · S
- IMP-B5 · `DECISION_LOG.md` + checklist + Portfolio dashboard v0 · 🟢 · 1 titre suivi · S

**Sprint 2 (semaine 7-12) — démo + GtM**
- IMP-C1 · Démo Titre 1 sur page dédiée, lancée tôt · 🟠 · démo live + reviews · M
- IMP-C2 · Discord + subreddits + devlog cadence · 🟢 · communauté active · S
- IMP-C3 · Outreach 30-50 micro-streamers · 🟢 · ≥ 5 réponses · S
- IMP-C4 · Fun oracle v1 (lecture télémétrie → backlog équilibrage) · 🟠 · rapport produit · M
- IMP-C5 · Décision Next Fest (gate wishlists ≥ 2k) · 🔴 · go/no-go tracé · S

---

## 5. Plan d'exécution — règles

1. **Distribution-first** : aucune semaine sans action wishlists/audience une fois la page live.
2. **Un titre se *finit* avant d'en lancer un nouveau** (sauf parallélisation marketing T1 / dev T2).
3. **Tout 🔴 (publier, dépenser, marque) attend Pierre.**
4. **Tout 🟠 passe par revue Cowork** avant exécution Claude Code.
5. **Jalons en wishlists**, pas en € (An1).
6. **Règle de survie de composant** : si ça n'aide pas à vendre un jeu sous 12 mois → CUT ou LATER.

---

## 6. Prochaine décision pour Pierre

Trois portes :
- **(a)** Valider la stratégie globale (genre idle→survivor, IA-invisible, distribution-first) → je lance le **Sprint 0** (IMP-A1→A5, tout SAFE_AUTO/quick wins).
- **(b)** Ajuster un pari (genre, séquence, ou périmètre) avant de figer.
- **(c)** Approfondir un document (ex. game design du Titre 1 idle, ou playbook marketing détaillé).
