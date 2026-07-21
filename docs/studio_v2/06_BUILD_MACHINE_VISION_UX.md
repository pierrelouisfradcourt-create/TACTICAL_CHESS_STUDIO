# STUDIO BUILD MACHINE — VISION, CÂBLAGE & UX SYSTÈME

*Fondé sur la cartographie du code réel (autopilot.py, kaizen/IMP, OpenClaw, factory/UX) — 2026-06-27.*
*Légende : **[RÉEL]** existe et fonctionne · **[CREUX]** défini mais hollow/no-op · **[ABSENT]** n'existe pas.*

---

## 1. LE BILAN — ce qui est relié à quoi, aujourd'hui

Le système a **deux plans**. L'un est solide. L'autre est une façade.

### Plan de contrôle — RÉEL et bon

```
                         ┌─────────────────────────────┐
                         │  autopilot.py  (port 7331)   │  [RÉEL]
                         │  cockpit HTTP + ~18 pages UI │
                         │  ~31 endpoints, terminals ws │
                         └──────────────┬───────────────┘
            ┌───────────────┬───────────┼───────────────┬──────────────┐
            ▼               ▼           ▼               ▼              ▼
   ideas→IMP pipeline   autoloop    LM Studio bridge  mémoire     metrics/dataset
   (roadmap→redteam→    (lanes)     (Qwen 14B/27B)    (fusion)    (ELO, pools)
    fusion→extract)        │            │
                           ▼            │
                   ┌───────────────┐    │
                   │ kaizen_loop.py│◄───┘   [RÉEL] SSOT ledger (recall/propose/close/add)
                   │ kaizen_autoloop│       [RÉEL] orchestrateur, dry_run, file-lock
                   └───────┬────────┘
                           ▼
                   ┌───────────────┐
                   │ governor.py   │   [RÉEL] gate déterministe fail-closed (lane/mission)
                   └───────┬────────┘
                           ▼
                   ┌───────────────┐
                   │ run_chain.py  │   [RÉEL] dispatch LM : translator→engineer→codex pack
                   └───────┬────────┘     + forbidden guards (.github/, src/engine/…)
                           ▼
                   IMPROVEMENT_LEDGER.yaml  [RÉEL] 198 entrées · golden_examples.jsonl (corpus LoRA)
```

**Ce backbone est exactement le bon substrat pour une machine « lance N jeux → teste → patche ».** L'unité IMP (1 fichier·1 fonction·1 lane·1 oracle), le governor déterministe, le lock anti-concurrence, le dry-run, l'auto-close sur verdict — tout ça se réutilise tel quel pour des *builds de jeux*.

### Plan de production (la « factory ») — CREUX

```
brief → IR → compiler → template → llm_logic → oracle → registry → publish → assets
        [RÉEL]  [CREUX]   [ABSENT]   [ABSENT]   [CREUX]  [ABSENT]  [ABSENT]  [ABSENT]
        schema  no-op      —          —          Snake     —         —         —
        +valide (l.66-67)                        only
```

- `studio_core/ir/` : schéma IR valide + 1 exemple Snake. **[RÉEL mais inerte]**
- `ir_compiler.py:66-67` : `compile()` renvoie le dict brut — **no-op [CREUX]**.
- `template_engine`, `llm_logic_engine`, `registry`, `publish` : **n'existent pas [ABSENT]**.
- `headless_sim.py` : simulateur Snake (test de non-crash), **pas un validateur de règles [CREUX]**.
- Jeu réel : `studio_core/games/snake_survivor_v1.py` (pygame, runtime **hardcodé**, n'utilise pas l'IR). Chess = manifeste hardcodé.
- **Godot** : le seul projet Godot est un *visualiseur 3D « garden »* archivé (`99_ARCHIVE/…`) — **pas un jeu**. Pas de bridge Godot. **[ABSENT]**
- **Génération d'assets** (sprites/figurines) : **n'existe nulle part [ABSENT]**.
- `neural_bridge.rs` : dans un repo `studioV2_MIGRATED_HOLD` (gelé), chess-only.

### OpenClaw — RÉEL mais DORMANT, et coûteux

- Tool npm installé, gateway 18789, 4 agents (coordinateur/producteur_routine/producteur_dur/council), registre de providers. **[RÉEL]**
- **MAIS** : `autopilot.py` ne l'appelle **jamais** (zéro dispatch câblé). C'est une couche de config + « future PHASE 2 ». **Dormant.**
- **Drapeau rouge bootstrap** : `producteur_dur` route vers `claude-proxy → API Anthropic (payante)` et `council` vers Gemini externe. Ça **viole** ta règle CLAUDE.md (« Jamais : API Anthropic externe ») **et** le budget < 2k€.

---

## 2. LE VERDICT HONNÊTE

> **La « machine qui construit tes jeux » n'existe pas encore.** Ce qui existe est un **cockpit de R&D échecs** très abouti, branché sur un moteur de suivi de travail (kaizen) excellent — mais dont le plan de production de jeux est une façade.

La bonne nouvelle : **tu n'as pas à reconstruire le cerveau.** Le plan de contrôle (cockpit + kaizen + governor + ledger + terminals + LM bridge) est de grande qualité et **directement réorientable**. Le travail réel = **construire le plan de production manquant** (Godot réel + génération + test + assets + publish) et **rebrancher le cockpit dessus**. C'est du « câbler et construire le maillon manquant », pas du « tout refaire ».

---

## 3. LA VISION — « Studio Build Machine »

Une seule machine, opérée depuis le cockpit existant, qui transforme **une idée de jeu** en **prototype jouable testé**, en parallèle, avec toi dans la boucle (tester, patcher), et l'IA en sous-main (code + brouillons d'assets).

### La boucle cible (réutilise le backbone)

```
TOI : brief de jeu ("survivor spatial, 3 armes, run 10 min")
   ↓                                   [intake = page Idées, déjà là]
PROJET créé dans le PROJECT LEDGER     [= IMP ledger réorienté]
   ↓
SCAFFOLD : Claude Code génère le squelette Godot depuis le template du genre
   ↓                                   [= autoloop + run_chain, réorientés "build"]
ASSET DRAFTS : génération de brouillons (figurines/sprites) → tu les retravailles en prompt
   ↓                                   [maillon ABSENT à construire — image gen local]
BUILD : export Godot headless (.exe/web)   [maillon à construire — CI locale]
   ↓
PLAYTEST : tu joues + télémétrie (rétention, rage-quit)   [= oracle business, à construire]
   ↓
VERDICT : PASS → garder / patcher ; FAIL → patch ou drop   [= governor + verdicts, déjà là]
   ↓
PUBLISH : itch.io via butler (auto) ; Steam = HumanGate    [maillon à construire — simple]
```

Plusieurs projets tournent **en parallèle** (le lock + les lanes du kaizen le permettent déjà). Toi tu arbitres : tester, patcher, doubler la mise, ou tuer.

---

## 4. INTERFACE / UX SYSTÈME

On **ne crée pas une nouvelle app** : on ajoute une page maîtresse au cockpit existant et on réoriente le vocabulaire (IMP→Projet/Build, lane→étape de build).

### Écran 1 — BUILD BOARD (page d'accueil de la machine)
Un tableau kanban de **projets de jeux**, chacun une carte, parallélisables.

```
┌─ STUDIO BUILD MACHINE ─────────────────────────────────────────────┐
│  [+ Nouveau jeu]   [Qwen local ●]  [Claude Code ●]  budget tokens   │
├──────────┬──────────┬───────────┬───────────┬──────────┬───────────┤
│  IDÉE    │ SCAFFOLD │  ASSETS   │  PLAYTEST │  PATCH   │  PUBLIÉ    │
├──────────┼──────────┼───────────┼───────────┼──────────┼───────────┤
│ Survivor │ Idle     │ Tower-def │ Roguelite │ Idle v2  │ Snake itch │
│ spatial  │ ferme    │ figurines │ (toi)     │          │ ▲ live     │
│          │ ▶ build  │ ◔ 4/12    │ rétJ1 31% │          │            │
└──────────┴──────────┴───────────┴───────────┴──────────┴───────────┘
```
Actions par carte : **Build** (scaffold), **Générer assets**, **Lancer**, **Patch**, **Publier**, **Drop**. Chaque carte = une entrée du Project Ledger.

### Écran 2 — PROJECT DETAIL
- **Brief & IR** : le brief texte + la spec du jeu (réutilise le schéma IR, mais comme *config de template*, pas compilateur magique).
- **Terminal live** : sortie de build/test en temps réel (xterm WebSocket — **déjà câblé** dans autopilot).
- **Assets** : galerie des brouillons générés, bouton « re-prompt » pour itérer, statut « brouillon / retravaillé / shippable ».
- **Oracles** : build (vert/rouge), playtest (rétention, complétion, rage-quit), verdict.
- **Patch** : diff proposé par Claude Code → tu valides → re-build.

### Écran 3 — TOOLS / ATELIER (ce que tu demandes : « qu'on manipule les outils, qu'on code »)
- Lanceur de commandes (Godot export, cargo, butler) + presets.
- **Atelier d'assets** : prompt → brouillons figurines/sprites → variations → export vers le projet. (Détail §6.)
- Bibliothèque de prompts Qwen validés (génération de logique, d'équilibrage, de variantes).

### Écran 4 — PORTFOLIO / REVENUE
Vue business (du V2) : par jeu publié → wishlists, ventes, reviews, rétention, prochaine action. Remplace les pages chess (metrics ELO, ligue) devenues secondaires.

**Réutilisation directe :** pages `ideas`, `chains` (autoloop), `logs`/terminals, `workflow`, `config`, `memory` existent **déjà** — on les renomme et les repointe. Le gros du front est là ; il manque surtout le **Build Board** et l'**atelier d'assets**.

---

## 5. CÂBLAGE : keep / réorienter / construire / couper

| Brique | Sort | Action concrète |
|---|---|---|
| Cockpit autopilot.py | **RÉORIENTER** | Ajouter Build Board + Atelier ; renommer pages chess→jeux |
| IMP ledger + kaizen_loop | **RÉORIENTER** | Devient Project/Build ledger (game_id, genre, étape, statut, oracle) |
| kaizen_autoloop + lock | **RÉORIENTER** | Devient Build Runner parallèle (N jeux scaffold/test) |
| governor.py | **KEEP** | Gate déterministe inchangé (publish = HUMAN) |
| run_chain.py + forbidden guards | **KEEP/RÉORIENTER** | Dispatch « brief→scaffold Godot » au lieu de « idée→codex » |
| terminals xterm ws | **KEEP** | Sortie build/test live (déjà parfait) |
| LM Studio bridge (Qwen) | **KEEP** | Génération de code/logique/variantes gratuite |
| golden_examples.jsonl | **KEEP (réoriente)** | Corpus de scaffolds réussis (réutilisation) |
| IR schema | **KEEP (rôle réduit)** | Config de template par genre, pas compilateur |
| ir_compiler no-op, template/logic/registry absents | **CONSTRUIRE** | Le vrai plan de production (Godot template + scaffold + publish) |
| Projet Godot réel | **CONSTRUIRE** | Le manque n°1 : un vrai template Godot jouable |
| Génération d'assets (figurines) | **CONSTRUIRE** | Atelier image gen local (§6) |
| Playtest/télémétrie oracle | **CONSTRUIRE** | Fun oracle (PostHog/Plausible) |
| Publish itch/Steam | **CONSTRUIRE (simple)** | butler (auto) + steamcmd (HumanGate) |
| OpenClaw (dispatch payant) | **COUPER / geler** | Dormant + viole budget+CLAUDE.md (API payante). Si gardé : **local-only Qwen**, jamais claude-proxy/Gemini |
| Boucle autonome nocturne, ML chess | **COUPER** | Hors scope (cf. V2/audit) |

---

## 6. L'ATELIER D'ASSETS (ta demande : brouillons de figurines à retravailler)

Besoin : **générer des brouillons de qualité que tu raffines ensuite en prompt.** Pipeline proposé, compatible bootstrap et règle « IA invisible » :

1. **Génération locale gratuite** : Stable Diffusion / ComfyUI en local (0 €, tourne sur ta machine comme Qwen). Évite les API payantes. Produit des **brouillons** de figurines/sprites/concepts.
2. **Boucle de raffinage** : tu re-promptes, fais des variations, choisis — l'atelier garde l'historique des prompts par asset.
3. **Garde-fou shippable** : un brouillon IA n'est **pas** un asset final. Avant ship, il doit être **retravaillé par toi** (édition/peinture par-dessus) — c'est exactement ce que tu décris. Raison [WEB] : l'art IA brut shippé = −53 % de reviews + non protégeable. Statut par asset : `brouillon → retravaillé → shippable`.
4. **Genres à art minimal d'abord** (idle) → l'atelier sert surtout au *concept/itération*, le risque visible est faible.

---

## 7. CRÉATION PARALLÈLE + TEST + PATCH (ta demande centrale)

Le modèle est déjà permis par le backbone :
- **Parallèle** : chaque jeu = un projet dans le ledger ; le Build Runner lance plusieurs scaffolds (le lock empêche les collisions sur un même projet, pas entre projets).
- **Tester** : tu lances le build depuis la carte → terminal live → tu joues ; la télémétrie remonte au Build Board.
- **Patcher** : tu décris le problème → Claude Code propose un diff (run_chain réorienté) → governor gate → re-build. Boucle courte.
- **Doctrine maintenue** : oracles non-LLM (build vert, télémétrie) tranchent ; le LLM propose ; toi tu gates le publish.

---

## 8. PREMIERS PAS (proposition, rien n'est lancé sans ton go)

1. **Décider d'OpenClaw** : geler le dispatch payant (local-only ou off). 🔴
2. **Construire le maillon n°1** : un **vrai template Godot jouable** (genre idle) + export headless. C'est le trou central. 🟠
3. **Réorienter le cockpit** : Build Board v0 + repointer ideas/autoloop/terminals sur des « projets de jeux ». 🟠
4. **Atelier d'assets v0** : brancher un générateur d'images local + galerie + statut brouillon/retravaillé. 🟠
5. **Boucle test/patch** : scaffold→build→play→patch sur le 1ᵉʳ jeu, de bout en bout. 🟠
6. **Publish itch via butler** (auto), Steam en HumanGate. 🟢/🔴

Ordre logique : **2 avant tout** (sans Godot réel, la machine n'a rien à produire). Le cockpit (3) se greffe ensuite, l'atelier (4) en parallèle.
