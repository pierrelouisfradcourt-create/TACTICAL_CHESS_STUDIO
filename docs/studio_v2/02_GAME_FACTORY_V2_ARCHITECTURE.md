# PHASES 2/3/5 — GAME FACTORY V2 : ARCHITECTURE

*Redesign complet, business-first. On ne se limite pas à l'existant.*

---

## 1. Principe d'architecture : la « micro-usine », pas le « compilateur universel »

L'erreur fondatrice à corriger : vouloir un système qui **génère n'importe quel jeu** depuis une représentation abstraite (IR/DSL). C'est un cimetière (P0-C + marché [WEB]).

Le bon modèle : une **micro-usine** = **1 template Godot solide par genre** + une **couche IA invisible** qui accélère la production de contenu/variantes + un **pipeline de distribution 100 % automatisé** + des **oracles business** qui disent quoi améliorer.

```
        ┌─────────────────────────────────────────────────────────┐
        │  STUDIO OS V2  (un solo + IA, orchestré par Cowork)       │
        └─────────────────────────────────────────────────────────┘
                                  │
   ┌──────────────┬──────────────┼──────────────┬──────────────────┐
   ▼              ▼              ▼              ▼                  ▼
PRODUCTION     CONTENU IA     DISTRIBUTION   ORACLES            PILOTAGE
(Godot+Rust)   (invisible)    (automatisée)  (business)         (Cowork)
   │              │              │              │                  │
 Template      Code gen        Build CI       Wishlist vel.     Portfolio
 par genre     Localisation    Steam/itch     Demo conversion   dashboard
 Logique Rust  Variantes       Store assets   Rétention télém.  DECISION_LOG
 (option)      Marketing copy  Télémétrie     Reviews sentiment  Ledger IMP
```

**Boucle vivante :** Produire → Publier → Mesurer (télémétrie + wishlists + reviews) → Apprendre → Itérer/Varier. Le LLM **propose** des améliorations ; les **oracles business tranchent** (héritage anti-Skynet, recâblé).

---

## 2. Les 5 sous-systèmes

### 2.1 PRODUCTION — Godot (+ Rust optionnel)
- **Godot 4** comme moteur de jeu principal (gratuit, open-source, export multi-plateforme headless [WEB]). Unity exclu (Muse mort, coûts, licence).
- **Template par genre** versionné : Titre 1 = template **idle/incremental** ; plus tard template **survivor-like**.
- **Rust** réservé aux cœurs de logique *où ça compte* (simulation économique idle, calcul de vagues survivor) via GDExtension — et **uniquement si** le profilage le justifie. Pas de Rust gratuit. Rocky devient une brique de démonstration, pas le centre.
- Règle : **réutilisabilité entre titres** (systèmes de save, options, succès, télémétrie, localisation = librairie partagée `studio_kit/`).

### 2.2 CONTENU IA — invisible uniquement
Là où l'IA est exemptée Steam, protégeable et sans stigmate [WEB] :
- **Code/logique** : Claude Code + Cursor sur Godot/GDScript et Rust → multiplicateur 10×, risque ~0.
- **Localisation** : gettext + traduction IA (DeepL/IA) en CI → invisible, fort ROI.
- **Génération de variantes/équilibrage** : Qwen local génère des tables d'équilibrage, courbes de progression, configs d'ennemis/items → testées par oracle, jamais shippées telles quelles.
- **Texte marketing/store** (brouillons) : rédaction assistée, **mais imagerie générée IA interdite sur la page store** (déclaration obligatoire + stigmate).
- **Art/musique** : **humain, libre de droits (CC0/Kenney), ou licencié.** Idle = besoin art minimal → contournement naturel du problème. Si SFX/musique : Stable Audio (risque légal le plus bas) ou packs licenciés. **Jamais d'art IA visible.**

### 2.3 DISTRIBUTION — automatisée (le cœur du ROI)
Stack confirmée faisable [WEB] :
- **Build CI** : Godot headless export via GitHub Actions (`firebelley/godot-export`) — **gratuit en repo public**.
- **Publication** : `butler` (itch.io, delta patch) + `steamcmd`/SteamPipe (Steam, branche beta auto, **branche publique = HumanGate**).
- **Store assets** : capsule generator + screenshots in-engine scriptés ; **trailer = montage humain** (un trailer qui convertit reste un craft, pas un CLI).
- **Télémétrie** : PostHog ou Plausible auto-hébergé, cookieless/GDPR-clean → events de rétention/difficulté.
- **Mur manuel assumé** : revue humaine de la page Steam (Valve), métadonnées/tags, trailer. On automatise le binaire, pas le marketing fin.

### 2.4 ORACLES — business, non-LLM
Les seuls juges valides (doctrine recâblée) :
- **Build oracle** : `cargo`/Godot export + git hooks locaux (gratuit) → rouge = pas de ship.
- **Fun oracle** : courbes de complétion, rage-quit (morts avant quit), durée de session, drop-off de funnel (PostHog) → signal d'équilibrage réel.
- **Market oracle** : **vélocité de wishlists**, conversion de démo, taux de conversion visite→wishlist (Steam récompense >4% [WEB]).
- **Review oracle** : sentiment des reviews (classif. par Qwen local, *advisory*) → backlog d'amélioration.
- Règle anti-Skynet maintenue : **un LLM ne valide jamais un ship.** Il propose ; l'oracle business ou Pierre décide.

### 2.5 PILOTAGE — Cowork
- **Portfolio/Revenue dashboard** (remplace le cockpit autonome) : par titre → wishlists, ventes, reviews, rétention, prochaine action.
- **Ledger IMP léger** + `DECISION_LOG.md` + mémoire persistante Cowork.
- **Cowork = cerveau de supervision** : décompose, prépare les runs Claude Code, lit les oracles, recommande ; Pierre gate l'irréversible (publier, dépenser, marque).

---

## 3. Triage des 50 composants demandés (Phase 5)

Classés **NOW** (Titre 1, 0-90j) · **LATER** (3-12 mois, quand justifié par le revenu) · **NEVER/CUT** (pas de ROI).

| Composant | Quand | Forme concrète |
|---|---|---|
| Build Oracle | **NOW** | git hooks + Godot export CI |
| Template Engine | **NOW** | template Godot idle (pas un moteur générique) |
| LLM Logic Engine | **NOW** | Claude Code/Qwen pour générer systèmes/configs |
| Telemetry | **NOW** | PostHog/Plausible auto-hébergé |
| Analytics (Portfolio dash) | **NOW** | dashboard Cowork |
| Game Registry / Portfolio Manager | **NOW** | simple table de titres + statut |
| Store Asset Generator (capsule/screens) | **NOW** | scripts ; trailer = manuel |
| Steam Metadata / Localization | **NOW** | gettext + IA, tags ×20 |
| CI/CD | **NOW** | GitHub Actions (repo public, gratuit) |
| Memory / Knowledge Base / DECISION_LOG | **NOW** | fichiers + mémoire Cowork |
| Balance Oracle / Fun Oracle | **NOW (v1)** | dérivés de la télémétrie |
| Market Oracle / Review Oracle | **NOW (v1)** | wishlist velocity + sentiment Qwen |
| Difficulty/Economy Simulator | **LATER** | utile pour idle/survivor, après Titre 1 |
| A/B Testing | **LATER** | hors-Steam (Steam n'a pas d'A/B natif [WEB]) |
| Asset/Music/SFX Generator | **LATER (prudent)** | seulement légalement propre + non-visible ; sinon packs licenciés |
| Dialogue/Quest/Enemy/Item Generator | **LATER** | pertinent surtout pour genres à contenu (pas idle minimal) |
| Trailer Generator | **LATER (semi)** | assemblage assisté, montage humain |
| ASO/SEO/Marketing/TikTok/YouTube Gen | **LATER** | brouillons assistés ; l'exécution reste humaine (organique) |
| Discord Bot | **LATER** | quand une communauté existe |
| Auto Patch / Auto Update | **LATER** | butler/SteamPipe le permettent déjà |
| Experiment Tracking / Replay | **LATER** | quand plusieurs titres tournent |
| Data Lake / Event Bus | **LATER (minimal)** | un simple endpoint events suffit au début ; pas de Kafka |
| Cloud / Backup / Observability / Monitoring | **NOW (minimal)** | git + Sentry Godot (alpha) + sauvegardes |
| Chaos Testing | **NEVER (à ce stade)** | aucun sens pour des petits jeux solo |
| Universal Game IR / Game DSL | **CUT** | cimetière (P0-C + marché) |
| Boucle autonome / 15 agents / council | **CUT** | zéro ROI pré-revenu, risque anti-Skynet |
| MLOps neural chess | **CUT (commercial)** | discipline réutilisée plus tard pour la balance |

**Lecture :** on passe de ~50 composants « à construire » à **~15 essentiels NOW**, la plupart étant de la **colle** (CI, hooks, télémétrie, dashboard) — pas de la R&D. C'est exactement « câbler plutôt que construire ».

---

## 4. Stack technique cible

| Couche | Choix | Coût | Raison |
|---|---|---|---|
| Moteur | **Godot 4** | 0 € | Open-source, export headless, pas de royalties |
| Perf critique | **Rust via GDExtension** (si profilé) | 0 € | Compétence existante ; seulement où ça compte |
| Code IA | **Claude Code + Cursor** | ~20-40 €/mo | Plus haut ROI/risque le plus bas [WEB] |
| Contenu/itération | **Qwen local (LM Studio)** | 0 € | Inférence gratuite en bootstrap |
| CI/CD | **GitHub Actions (repo public)** | 0 € | Gratuit public ; macOS = point de coût à éviter |
| Publication | **butler + steamcmd** | 100 $/jeu Steam | Standard, scriptable |
| Télémétrie | **Plausible/PostHog self-host** | 0 € (VPS ~5 €/mo) | GDPR-clean, fun oracle |
| Crash | **Sentry Godot SDK** (alpha) | 0 € tier | Combler l'angle mort post-ship |
| Art/SFX | **CC0 (Kenney) / Stable Audio / licencié** | 0-faible | Évite stigmate IA + risque légal |

Budget outillage mensuel cible : **< 60 €/mois** → tient dans < 2k€/an avec les frais Steam de 1-3 titres.

---

## 5. MLOps → « GameOps »

On ne jette pas la discipline MLOps, on la **réoriente** :
- *Avant* : dataset → train → gate ELO → deploy `latest.pt`.
- *V2* : **télémétrie joueurs → modèle/heuristique de balance → gate (rétention/complétion) → patch**. Même rigueur (candidate ≠ prod, gate avant déploiement, evidence signée), appliquée à l'équilibrage de jeu réel, pas aux échecs. **LATER**, quand un titre a assez de joueurs pour produire de la donnée.

---

## 6. Ce que cette architecture optimise (Phase 3 — business-first)

| Objectif business | Comment l'archi le sert |
|---|---|
| **Time-to-market ↓** | Template réutilisable + IA code + pipeline build/publish auto |
| **Coût d'inférence ↓** | Qwen local gratuit ; Claude réservé au stratégique |
| **Coût de maintenance ↓** | ~15 composants au lieu de 50 ; suppression des 15 agents |
| **Dette technique ↓** | CUT de l'IR/autonomie/ML chess ; `studio_kit/` partagé |
| **Scalabilité (portefeuille)** | Chaque titre réutilise kit + pipeline → coût marginal décroissant |
| **Vente ↑** | Distribution automatisée + oracles wishlist/rétention = on optimise la variable qui gate les ventes |

**Test appliqué à chaque composant : « est-ce que ça aide à vendre plus de jeux ? »** Si non → LATER ou CUT. C'est ce qui a éliminé 70 % du plan initial.
