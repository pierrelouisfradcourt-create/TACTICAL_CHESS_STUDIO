# ADR-001 — Moteur & stack pour Leviathan (RPG gacha mobile)

- **Status :** Accepted
- **Date :** 2026-07-08
- **Décideur :** Pierre (gate HumanGate — [PROCÉDER] sur option B, 2026-07-08)
- **Auteur :** technical-director (émulé, passage borné)
- **Liés :** IMP-258, IMP-259, passage directeurs 2026-07-08, bible Leviathan §10 / §14 / §15 / §16 ; suivi : ADR-002 (backend état-par-joueur) à produire.
- **claim_verdict :** NO_CLAIM_ALLOWED

## Contexte

Projet greenfield total (aucun code préexistant, contrairement à Chess TCG). RPG gacha **mobile portrait** (iOS/Android), **solo-dev**, live-service pluriannuel. Le choix moteur/stack est une décision fondatrice et quasi-irréversible : il conditionne des années de vélocité. Cet ADR est le véhicule du gate moteur (doctrine : aucun choix moteur sans ratification Pierre explicite).

## Drivers de décision

Contraintes §15 **non négociables** (filtres durs) :
- Arrière-plans 2D parallaxe uniquement, aucun 3D temps réel.
- Combats en arène confinée (auto-battler léger, non-réflexe).
- Taille d'installation < 2 Go.
- Serveur léger : état-par-joueur + événements, pas de sync temps réel type MMO.
- Portrait uniquement, jouable à une main.

Axe central (§14) : **UI dense et riche** — glassmorphism, fenêtres superposées, hiérarchie d'info. Le document décrit « un vrai jeu d'interface autant que d'action ». Ratio structurant : **~80 % du développement = UI / économie / contenu ; ~20 % = rendu-spectacle** (Titan animé §14 + juice de combat). Ce ratio est le cœur de l'arbitrage.

Critères solo-dev (mêmes que l'audit mobile Chess TCG) : outillage réellement disponible sur le poste (mesuré), taille d'app réaliste, capacité UI dense, coût/licence, courbe d'apprentissage vs réutilisation.

## Réalité outillage sur le poste (mesurée le 2026-07-08, pas supposée)

| | Godot 4 | Web (React/TS + Capacitor) | Unity 2D |
|---|---|---|---|
| Présent aujourd'hui | Éditeur 4.6 utilisé (Chess TCG, snake_survivor, wavevale) ; **export mobile NON monté** (export_templates vide) | **Node 24.16 + npm 11.13 + Vite + TypeScript 5.6 + Vitest installés & utilisés** (llm-lego) | **Absent** (ni PATH ni Program Files) |
| À installer pour build Android | Templates + JDK + Android SDK/NDK | Capacitor (`npm i`) + Android Studio + JDK + SDK | Unity Hub + Editor (plusieurs Go) + module Android + JDK/SDK |
| iOS | Mac/Xcode requis | Mac/Xcode requis | Mac/Xcode requis |

**Constats communs :** aucune chaîne mobile n'est prête ; JDK + Android SDK à installer quel que soit le choix (coût ~égal, non différenciant). **iOS impossible sur ce poste Windows** pour les trois → Android-first, iOS différé à un Mac (physique / cloud-Mac / CI). Le stack web part avec une longueur d'avance (Node/Vite/TS déjà là et exercés).

## Options considérées

### A. Godot 4 (2D) — GDScript
- Réutilisation réelle (4.6, agents godot-*, `.claude/rules/godot-scripts.md`), zéro courbe moteur.
- Rendu Titan/combat : **fort** (natif — particules soutenues 60 fps + batterie mieux maîtrisées ; dé-risque le risque #2 thermie/batterie, n°1 technique).
- UI dense : **correct mais pas son point fort** (Control/Theme verbeux ; glassmorphism = shader custom ; fenêtres superposées = à la main).
- Licence MIT (zéro coût). Monétisation/live-ops : le plus faible (plugins Android manuels). Taille lean.

### B. Web-mobile : React/TS + Capacitor + PixiJS (canvas WebGL) — **RETENU**
- Réutilisation fraîche et exercée (llm-lego : Vite/TS/React), déjà installé.
- UI dense : **best-in-class** — glassmorphism = `backdrop-filter` CSS natif ; fenêtres superposées / hiérarchie / animations = trivial. C'est là que ce genre passe l'essentiel de son temps.
- Rendu Titan/combat : **le seul vrai risque** — PixiJS/WebGL fait tourner un auto-battler non-réflexe + un Titan idle, mais 60 fps soutenu + batterie sur le Titan particulaire toujours-affiché en WebView est moins garanti qu'en natif. Testable et mitigeable.
- Licence OSS/MIT (zéro coût). Monétisation/live-ops : bon (plugins IAP Capacitor, remote-config = fetch JSON). Taille : la plus petite.

### C. Unity 2D — C#
- Meilleurs SDK monétisation/live-ops, UI Toolkit correct. Mais courbe neuve (C#), **risque licence/business** (Runtime Fee 2023, coûts au seuil), absent du poste, builds plus gros. **Dominé pour un solo-dev.**

### D. Flutter + Flame (Dart) — considéré, rejeté
UI-first excellente mais langage neuf (Dart) + couche jeu (Flame) plus faible : double pénalité, dominé par B sur la réutilisation.

## Décision

**Option B — Web (React/TS + Capacitor + PixiJS).** Le jeu est majoritairement un jeu d'interface (§10/§14) ; le web écrase le champ sur les 80 % qui coûtent le plus de temps sur des années, avec une expertise fraîche déjà exercée et le coût/licence le plus bas. Godot gagne sur les 20 % de rendu-spectacle, mais ce n'est pas là que se joue la vélocité d'un solo-dev, et ce risque est testable dès le premier incrément.

**Caveat (seul point qui pourrait renverser la reco) :** §16 impose 60 fps constants + ≤15 % batterie/h sur l'écran-Titan animé en continu (risque #2). Plus risqué en WebView qu'en natif. → **Godot 4 (2D) = fallback documenté** : si l'incrément « Le Cœur Vivant » échoue le seuil de perf sur device réel, bascule sur Godot **avant** tout investissement contenu.

## Conséquences

- Monter la chaîne mobile avant tout build : Android Studio + JDK 17 + Android SDK/NDK ; pour B, `npm i @capacitor/*`.
- **Android-first ; iOS différé** à un accès Mac (engine-agnostic, à acter séparément).
- **Backend §15.5 = ADR-002 séparé** (lean provisoire : fonctions serverless + DB managée, claim idle vérifié horloge-serveur contre la triche ; jamais un MMO).
- Gap monétisation reconnu : à revisiter avant la tranche monétisation, pas avant l'incrément cœur-de-boucle.
- Premier jalon = incrément « Le Cœur Vivant » (Titan animé + idle minimal + 1 combat auto-battler), buildé Capacitor et **mesuré sur Android mid-range réel dès le jour 1** pour dé-risquer la perf. Détail dans le plan d'implémentation associé.

## Verdict

**[GATE PIERRE] → ratifié [PROCÉDER] B le 2026-07-08.** Fallback A (Godot) conservé comme sortie de secours conditionnée au seuil de perf de l'incrément.
