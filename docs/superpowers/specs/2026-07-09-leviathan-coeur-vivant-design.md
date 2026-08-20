# Leviathan — Incrément « Le Cœur Vivant » — Design

- **Date :** 2026-07-09
- **Statut :** Approuvé (design validé par Pierre, brainstorming 2026-07-09)
- **Liés :** `docs/adr/ADR-001-moteur-stack-leviathan.md` (stack option B), IMP-260, bible Leviathan V2.0 §7 / §10 / §14 / §16 / §19
- **claim_verdict :** NO_CLAIM_ALLOWED — fun/feel = jugement Pierre.

## 1. Contexte & objectif

Projet greenfield (aucun code jeu). Stack ratifiée ADR-001 option B : **React/TS + Vite + Capacitor + PixiJS**, Android-first (iOS différé Mac).

« Le Cœur Vivant » est le **plus petit incrément testable**, PAS la Vertical Slice (§19, 6 mois). Son unique raison d'être :
1. **Dé-risquer le risque n°1** de l'ADR : la perf du **Titan animé en continu** en WebView (60 FPS §16 + batterie, risque #2 de la bible) — **mesurée sur device réel**, pas supposée.
2. **Tester que la boucle centrale (§10) est amusante** avant tout investissement dans le contenu.

## 2. Décisions de design (brainstorming 2026-07-09)

- **D1 — Titan représentatif dès le 1er build.** Pas de walking skeleton trivial (une forme géométrique ne teste pas le vrai risque). La première mesure device doit porter sur une charge représentative.
- **D2 — Baseline réaliste + molette de stress.** Scène = fond parallaxe + Titan placeholder animé + couche de particules (charge réelle de l'écran toujours-affiché), **plus un réglage debug** qui monte la charge → on mesure la **marge** (le niveau où on passe sous 60 fps), pas un simple pass/fail.
- **D3 — Ultime = interruption au timing (hook §7).** L'ennemi télégraphie un cast ; fenêtre où taper l'Ultime l'interrompt (réussite/raté). Pas un bouton de dégâts passif — c'est le seul moment interactif et le cœur du gameplay annoncé.
- **D4 — Vraie boucle §10 fermée.** idle produit → dépense pour lancer l'expédition (combat) → gagner crédite une récompense → nourrit la suite. Pas des widgets juxtaposés.
- **Architecture A** — systèmes purs (TS) + rendu Pixi + UI React, pontés par un store unique.

## 3. Périmètre

**Inclus :** Titan placeholder procédural animé + parallaxe + particules + molette de stress ; cycle idle (biomasse) + persistance locale ; combat 2 héros factices vs 1 ennemi + Ultime au timing ; boucle §10 fermée ; portrait une main ; build Capacitor + run sur **device Android réel** ; mesure perf (fps/batterie/stabilité).

**Exclu (non négociable pour ce spike) :** gacha, économie/tuning fin, 30 héros, 8 biomes, narratif, monétisation, backend/serveur (ADR-002), iOS, art final. Si le périmètre déborde → signal à Pierre.

## 4. Architecture & modules (Approche A)

```
games/leviathan/
  index.html · vite.config.ts · tsconfig.json · capacitor.config.ts · package.json · .gitignore
  src/
    main.tsx                # racine React
    App.tsx                 # shell portrait : monte le canvas Pixi + l'UI React par-dessus
    index.css               # portrait, safe-area, base glassmorphism
    store/gameStore.ts      # état partagé unique : biomass, phase (idle|combat), combatState, lastResult
    systems/                # LOGIQUE PURE (aucune dép Pixi/React) → testable vitest
      idle.ts               # accrue(state, now), spend(state, coût) ; plafond offline
      combat.ts             # step(state, dt, {ultimatePressed}) déterministe ; PRNG seedé
    game/                   # RENDU Pixi (lit l'état, ne le possède pas)
      pixiApp.ts            # init Application v8 (async), resize, devicePixelRatio
      titanScene.ts         # Titan placeholder + parallaxe + particules ; setStress(n)
      combatScene.ts        # arène confinée : héros/ennemi, barre de cast, feedback interruption
    ui/                     # React/DOM
      Hud.tsx · ExpeditionButton.tsx · UltimateButton.tsx · StressDial.tsx
    perf/fpsMeter.ts        # overlay FPS (rAF) — rig de mesure critère (a)
    gameLoop.ts             # driver unique (ticker Pixi) : avance systems, écrit le store
    tests/idle.test.ts · tests/combat.test.ts   # vitest sur systems/ uniquement
```

**Pont :** `gameStore` est la **seule source d'état partagé**. Les `systems/` calculent (fonctions pures), le store détient, React s'abonne, les scènes Pixi lisent à chaque tick. **Aucune logique de jeu dans `game/` ni `ui/`** (règle `.claude/rules` transposée au web).

## 5. Composants (rôle · dépend de · testable)

- **`systems/idle.ts`** (pur) — biomasse. `accrue(state, now)` : biomasse += taux × dt, **bornée** (catch-up offline plafonné) ; `spend(state, coût)`. Dépend de : rien.
- **`systems/combat.ts`** (pur, déterministe) — 2 héros + 1 ennemi, pas de temps **fixe**. Auto-attaques ; ennemi charge un cast ; `step(state, dt, {ultimatePressed})` expose `enemyCastProgress`, `interruptWindow`, `ultimateReady`, `phase (fighting|won|lost)`. Ultime dans la fenêtre → cast interrompu ; raté → gros coup encaissé. Dépend de : PRNG seedé (mulberry32, pur).
- **`store/gameStore.ts`** — détient `biomass`, `phase`, `combatState`, `lastResult`, `ultimateQueued`, `stressLevel`. API : `getState()`, `setState(partial)`, `subscribe(fn)`. Dépend de : rien.
- **`game/pixiApp.ts`** — init `Application` v8 (async), canvas, resize, DPR.
- **`game/titanScene.ts`** — parallaxe (2-3 couches) + Titan placeholder procédural (Graphics, pulsation + bob) + pool de particules dont le nombre suit `stressLevel`. `setStress(n)`. Dépend de : store (lecture stress).
- **`game/combatScene.ts`** — arène confinée pendant `phase==='combat'` : héros/ennemi, HP, barre de cast, indice fenêtre + feedback réussite/raté. Dépend de : `combatState` (lecture).
- **`ui/Hud`** (biomasse + phase, panneau glassmorphism) · **`ExpeditionButton`** (gate biomasse → passe en combat) · **`UltimateButton`** (actif **seulement** pendant la fenêtre) · **`StressDial`** (debug, règle `stressLevel`).
- **`gameLoop.ts`** — un seul driver : chaque frame → `accrue` idle + `step` combat (si en combat, avec l'input courant) → écrit le store.

## 6. Flux de données — boucle §10

1. **`idle`** — `gameLoop` appelle `idle.accrue` → `biomass` monte → `Hud` l'affiche. `titanScene` anime en continu = **la charge perf mesurée**.
2. **Lancer expédition** — `ExpeditionButton` actif quand `biomass ≥ EXPEDITION_COST`. Tap → `idle.spend` + `createCombat(seed)` + `setState({phase:'combat', combatState})`.
3. **`combat`** — `gameLoop` appelle `combat.step(dt, {ultimatePressed})`. Fenêtre d'interruption ouverte → `UltimateButton` s'allume. Tap → flag transitoire `ultimateQueued` dans le store, **consommé par le prochain `step`** puis remis à zéro (découple l'event React de la sim, garde `combat.step` pur).
4. **Résolution** — `won` → `biomass += REWARD` + retour `idle` ; `lost` → pas de récompense, retour `idle`. `Hud` montre le résultat.
5. **Retour idle** — boucle fermée : produire → dépenser → combattre → récompense → produire.

**Seed** dérivé du compteur d'expéditions (déterministe/reproductible, mais variant).

## 7. Gestion d'erreur & cas limites

1. **Init Pixi / contexte WebGL perdu** → fallback React lisible (pas d'écran noir) + log console (`chrome://inspect`) ; écoute `webglcontextlost`/restore → ré-init.
2. **Arrière-plan / reprise** (`visibilitychange`) : pause → stoppe le ticker ; reprise → `idle.accrue` rattrape (horloge murale **bornée**).
3. **Persistance** — `biomass` + compteur d'expéditions en `localStorage`, clé versionnée, **parse défensif** (corrompu/absent → défauts). Note : catch-up **trivialement triche-horloge** ; vérif horloge-serveur = ADR-002, hors scope (monnaie douce seulement).
4. **Déterminisme combat** — **pas de temps FIXE + accumulateur** : la sim est **indépendante du fps** (équitable 30 Hz vs 120 Hz, testable).
5. **Input Ultime** — flag consommé une fois ; double-tap / hors fenêtre → ignoré ; fenêtre ratée → coup ennemi résolu.
6. **Resize / orientation** — portrait verrouillé + `viewport-fit=cover` + `env()` (encoche/safe-areas Redmi).
7. **Nombres** — biomasse en unité entière de base (évite dérive float), affichage borné.

## 8. Tests & mesure perf

**A. Unitaires vitest (sur `systems/` — l'oracle logiciel)**
- `idle.test.ts` : accrue = taux×dt ; dt=0 inchangé ; dt<0 ignoré ; plafond offline ; spend ; spend>solde rejeté.
- `combat.test.ts` : même seed+inputs → issue identique ; auto-attaques baissent HP ; Ultime dans la fenêtre → interruption ; hors fenêtre → pas d'interruption ; invariance pas-de-temps-fixe.

**B. Mesure perf sur device (critère (a) — MESURÉ, pas supposé)**
- Build Capacitor → run sur le Redmi (`BYZL25032200106840`).
- **FPS** : overlay rAF (live) + `chrome://inspect` (profil soutenu ~5-10 min sur l'écran Titan idle + pendant le combat).
- **Balayage de stress** (molette D2) : FPS relevé à chaque cran → niveau où on passe sous 60 = **marge**.
- **Batterie** : `adb shell dumpsys batterystats`, fenêtre ~15 min actif, luminosité 50 % (§16) → %/h.
- **Stabilité** : boucle N min / N expéditions → crash / perte de contexte ?
- **Consigné** dans `docs/leviathan/coeur-vivant-mesures.md` : device (Redmi Note 15 Pro+ 5G — confirmer SoC/RAM/refresh), FPS baseline, table FPS-vs-stress, batterie %/h, crashs. Rappel : device probablement ≥ plancher A54 → pass **nécessaire mais non suffisant**.

## 9. Definition of Done & gate

vitest verts (idle, combat) · boucle jouable de bout en bout sur device · perf **mesurée + consignée** (baseline + marge + batterie) · jugement fun (c) = Pierre (NO_CLAIM_ALLOWED).

**Gate décisif :** FPS < 60 au **baseline réaliste** sur device → **déclenche le fallback Godot** de l'ADR-001, avant tout investissement contenu.

## 10. Séquence de build (après le plan d'implémentation)

`npm install` → `npm run build` → `npx cap add android` (si Gradle réclame `android-35` → `sdkmanager "platforms;android-35"`, cmdline-tools déjà présents) → `npx cap run android --target BYZL25032200106840` → mesures.

## 11. Constantes à fixer dans le plan (tuning ≠ design)

Taux idle, `EXPEDITION_COST`, `REWARD` (**récompense en biomasse, fixée `> EXPEDITION_COST`** → boucle net-positive, progression visible), HP/atk héros/ennemi, durée de cast, **largeur de la fenêtre d'interruption**, plafond de catch-up offline. Valeurs de départ posées dans le plan ; l'**équilibrage réel = jugement Pierre** (NO_CLAIM).
