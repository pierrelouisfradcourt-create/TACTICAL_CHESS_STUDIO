# Design — Gate e2e de la forge (axe 1/3 : preuve « le jeu tourne vraiment »)

- **Date** : 2026-07-11
- **Source** : session Claude Code, branche `feat/forge-oracle-gate`
- **Auteur** : Claude Code + Pierre (HumanGate sur les décisions de fond)
- **Statut** : design ratifié Pierre (go 2026-07-11), plan d'implémentation à écrire
- **Verdict discipline** : NO_CLAIM_ALLOWED — toute preuve = exécution mécanique

## Contexte et problème

L'expérience de re-forge auditée (`studio_brain/journal/2026-07-10_reforge_experiment.md`)
a mesuré, sur données réelles, que la forge durcie a **relevé la rigueur des tests unitaires
mais baissé le niveau global de production** des jeux qu'elle sort. Régression mesurée :

| Axe de production | Legacy | Re-forges fraîches |
|---|---|---|
| Preuve navigateur (e2e + captures) | ✓ **2/2** | ❌ **0/3** |
| Contenu de niveau (`level.mjs`) | ✓ (collect_runner) | ❌ 0/3 |
| Traçabilité plan→code (wiremap) | — | ❌ collect_runner BLOCKED |
| Tests (mutation) | 100% (tué à la main) | 67–80%, pas de gate |

**Cause racine e2e** : la forge lance `run-oracle.mjs` et lit « vert = exit 0 ». Le legacy
faisait tourner *logic + properties + e2e Playwright* dans ce `run-oracle.mjs` ; **rien
n'oblige** le build (étape s9) à produire un `e2e.mjs` ni un `run-oracle.mjs` qui l'inclut.
Les re-forges ont donc écrit un oracle sans volet e2e → « oracle vert » sans qu'aucun
navigateur n'ait jamais confirmé que le jeu est jouable par un humain.

**Doctrine déjà écrite, non appliquée** : le skill `/forge` (`.claude/skills/forge/skill.md`,
step s10a) documente déjà que « l'oracle d'un JEU à UI = click-through Playwright ». Mais
c'est du texte de doctrine — **aucun check structurel ne vérifie que le build l'a produit**.
Le renfort de cet axe = transformer cette doctrine en **gate déterministe**.

**Objectif produit ratifié** (Pierre, 2026-07-11) : « les deux, dans l'ordre » — d'abord
fiabiliser la machine, ensuite la prouver sur un vrai jeu fini. Sévérité : **bloquer +
auto-corriger**. Découpage : **un axe à la fois**. Cet axe (le plus critique) = la preuve e2e.

## Décisions de fond ratifiées

1. **Contrat de jouabilité figé** — une convention stable que tout jeu forge respecte, pour
   qu'un e2e puisse piloter n'importe quel jeu de façon uniforme.
2. **Garde structurelle anti-e2e-bidon** — un check déterministe qui vérifie que l'`e2e.mjs`
   produit *pilote réellement* le jeu, pas une coquille qui imprime `PASS`.
3. **Boucle bloquer + auto-corriger bornée à N=3** — sur échec e2e, re-build automatique
   (modèle qui escalade) jusqu'à N essais, puis BLOCKED + flag HumanGate.

## Composants

### C1 — Contrat de jouabilité (`scripts/forge/contracts/PLAYABLE_CONTRACT.md`)

Convention figée que tout jeu web forge DOIT respecter :

- Le serveur (`server.mjs`) log `interface jouable` sur stdout quand il est prêt.
- Le jeu expose `window.__game` : objet d'état lisible (au minimum les scalaires pilotés
  par les règles du jeu — ex. position joueur, score/compteur, `over`, `level`).
- Le jeu expose `window.__game_debug` : hooks de test déterministes — au minimum de quoi
  **forcer une fin de partie** (défaite et/ou victoire) sans dépendre du timing réel.
- DOM : `#overlay` (écran fin de partie, classe `hidden` quand caché), `#restart`
  (bouton rejouer).

Ce contrat est la surface d'accroche de l'e2e ; il est **référencé par le contrat s9**
(le build doit s'y conformer) et **vérifié par la garde structurelle C3**.

### C2 — Contrat de build s9 durci

Le contrat de l'étape s9 (`scripts/forge/contracts/`) gagne des critères d'acceptance
**obligatoires** :

- Produire `e2e.mjs` : click-through Playwright réel (démarre le serveur, ouvre la page,
  envoie de vraies touches, inspecte `window.__game`, force une fin via `window.__game_debug`,
  vérifie l'overlay + clic `#restart`, capture des screenshots, finit par `RESULT: PASS`/`FAIL`).
- Produire `run-oracle.mjs` qui enchaîne **logic + properties + solvabilité + e2e**, exit 0
  seulement si tous passent, échec explicite si l'environnement manque (jamais vert déguisé).
- Se conformer au contrat de jouabilité C1.

Acceptance absente ⇒ contrat s9 non rempli ⇒ pas de dispatch (règle existante : aucun agent
sans contrat complet).

### C3 — Garde structurelle e2e (`scripts/forge/static_oracles.py`) ⭐ cœur

Check **non-LLM, déterministe** qui lit les fichiers produits et rejette les coquilles :

- `run-oracle.mjs` invoque bien `e2e.mjs` (spawn/import détecté), pas seulement logic.
- `e2e.mjs` est **réel** :
  - lance un navigateur (référence `chromium`/`playwright`) ;
  - envoie de vraies entrées (`keyboard.down`/`up`/`press` ou clic) ;
  - fait **≥ K assertions** (défaut K=3) qui référencent `window.__game` et/ou les ids DOM
    du contrat de jouabilité (`#overlay`/`#restart`) — preuve qu'il observe l'état, pas
    qu'il imprime `PASS`.

Sortie : `{passed: bool, raisons: [...]}` — même forme que les autres oracles statiques.
C'est l'équivalent, pour l'e2e, du mutation-testing (« tester le test »).

### C4 — Volet e2e dans l'exécution oracle

`oracles.json` pour un jeu forge pointe le `run-oracle.mjs` **complet** (qui inclut e2e).
L'exécution réelle + capture de preuve + timeout existent déjà (`oracle.py`,
`run_oracle`, timeout 300 s). Indisponibilité navigateur/Playwright ⇒ **FAIL explicite**.
Aucun changement de contrat d'`oracle.py` ; on garantit seulement que la commande pointée
lance le run-oracle complet.

### C5 — Boucle bloquer + auto-corriger (RÉUTILISE l'existant, pas de nouvelle orchestration)

La boucle d'auto-correction **existe déjà** dans le skill `/forge` (step s10a, lignes 77-84) :
après le build et son oracle, `forge.escalate.escalation_decision(model, oracle_ok=..., ...)`
décide de **ré-spawner le même contrat** avec un modèle qui escalade (haiku→sonnet→opus),
cap `MAX_ESCALATIONS` ; au sommet en échec, **ne boucle pas** → remonte à HumanGate.

Le renfort ne crée donc **aucune orchestration nouvelle**. Il suffit que **l'échec e2e
fasse `oracle_ok = False`** :

```
build (s9) → oracle-code s10a { logic + properties + solvabilité + garde C3 + e2e C4 }
   │ oracle_ok = False (C3 rouge OU e2e rouge OU e2e absent)
   ▼
escalation_decision → ré-spawne LE MÊME contrat, modèle ↑ (mécanisme existant)
   │ borné par MAX_ESCALATIONS (= N, valeur ratifiée 3)
   ▼
sommet atteint, toujours rouge ⇒ pas de boucle ; verdict BLOCKED + humangate_flags
```

- Bornée par `MAX_ESCALATIONS` (déjà en place ; on fixe/vérifie la valeur = 3).
- Le rapport d'échec (raisons C3 + log oracle e2e) est le contexte réinjecté au re-spawn.
- **Le seul travail** : brancher C3 + le volet e2e dans le résultat de l'oracle-code s10a
  pour que sa `.ok` reflète honnêtement l'e2e. La boucle réagit ensuite toute seule.

## Flux de données

1. s9 produit les artefacts jeu (`game.mjs`, `render.mjs`, `input.mjs`, `server.mjs`,
   `index.html`, tests, `e2e.mjs`, `run-oracle.mjs`).
2. C3 lit `run-oracle.mjs` + `e2e.mjs` (statique, aucun run) → passed/raisons.
3. Si C3 passe : C4 exécute `run-oracle.mjs` (dynamique, navigateur réel) → passed/preuve.
4. C5 : si C3 ou C4 rouge → re-build borné ; sinon → verdict signé (inchangé) inclut la
   preuve e2e.

## Gestion d'erreur

- **Navigateur/Playwright indisponible** : FAIL net (pas de vert déguisé) — déjà la
  philosophie du `run-oracle.mjs` legacy, conservée.
- **Oracle qui pend** : timeout 300 s existant → FAIL avec preuve partielle capturée.
- **Boucle** : bornée N=3, puis BLOCKED — pas de correction infinie.
- **e2e bidon** : attrapé par C3 avant même de tourner.

## Comment on prouve que ça marche (exécution, pas existence)

1. **Unitaire C3** :
   - vrai `e2e.mjs` legacy (`games/collect_runner_legacy/e2e.mjs`) → PASS ;
   - stub `console.log("RESULT: PASS")` → REJET ;
   - `run-oracle.mjs` sans volet e2e → REJET.
2. **Intégration** : re-forger `collect_runner` avec s9 durci → artefacts incluent un vrai
   `e2e.mjs`, l'oracle le lance, `RESULT: PASS`, verdict inclut la preuve e2e.
3. **Auto-correction** : simuler un build qui zappe l'e2e → C5 détecte (C3 rouge),
   re-dispatche, et corrige ou BLOQUE après N=3 (preuve : log de la boucle + verdict final).

## Hors périmètre (axes suivants, un à la fois)

- Traçabilité plan→code contraignante (wiremap) — axe 2.
- Gate de mutation + richesse de contenu (`level.mjs`) — axe 3.
- Jeu-preuve « vraiment fini » de bout en bout — phase 2, après les 3 axes machine.

## Fichiers touchés (prévision)

- `scripts/forge/contracts/PLAYABLE_CONTRACT.md` (nouveau, C1)
- `scripts/forge/contracts/` — contrat s9 (édition acceptance, C2)
- `scripts/forge/static_oracles.py` (garde structurelle e2e `check_e2e_harness`, C3)
- `scripts/forge/tests/` (tests unitaires C3, preuve 1)
- `.claude/skills/forge/skill.md` — step s10a : brancher C3 + volet e2e dans `oracle_ok`
  (C4/C5) ; l'e2e passe de doctrine à gate. **Zone protégée `tests/**` non touchée.**
- `scripts/forge/gate.py` / `oracle.py` si le câblage de `.ok` l'exige (à confirmer au plan)
- `scripts/forge/oracles.json` (garantie C4 : commande = `run-oracle.mjs` complet)
