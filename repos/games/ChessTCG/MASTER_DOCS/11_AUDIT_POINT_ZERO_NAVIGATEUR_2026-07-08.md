# Chess TCG 3D — Audit « point zéro » (cible NAVIGATEUR, périmée)

status: DOCUMENTED_ONLY
claim_verdict: NO_CLAIM_ALLOWED
date: 2026-07-08
source: audit read-only (session Claude Code, inspection repo) — rapport non-autoritatif, aucune décision d'architecture
scope: état de départ pour la cible **navigateur** telle que la roadmap `roadmap-chess-tcg-3d` l'écrivait à l'origine (2026-07-04)

> **Note de contexte.** Cet audit a établi le point zéro **avant** la décision produit du 2026-07-08. La cible « navigateur » a depuis été **corrigée en mobile (Godot natif)** — voir `12_AUDIT_MOBILE_2026-07-08.md` et la roadmap `llm-lego/library/roadmap-chess-tcg-3d.json`. Ce document est conservé comme trace de la photo de départ et de la raison du pivot.

## 1. Le constat qui structure tout

Le mot « 3D » recouvrait **deux objets différents** :

| | Cible roadmap Jalon 1 (à l'époque) | Ce qui existe réellement |
|---|---|---|
| Plateforme | **Navigateur** (WebGL/WebGPU) | **Godot 4.6 natif desktop (Vulkan)** |
| Statut | intention pure, 0 ligne | prototype **jouable** |

**Aucune base de code navigateur n'existe.** Recherche exhaustive dans `games/**` : **zéro** occurrence de `three.js`, `babylon`, `webgl`, `webgpu`, `wasm`, `emscripten`, `canvas.getContext`. Pour la cible navigateur, le point zéro était **greenfield total**.

Un vrai jeu 3D **existe** — mais en **Godot natif**, pas navigateur.

## 2. Ce qui existe VRAIMENT (vérifié)

### 2a. Prototype jouable Godot 4.6 natif — `games/chess_tcg/`
Tracké en git (39 fichiers), non ignoré. ~1 800 lignes de GDScript :
- **Moteur de règles pur** (`core/`, ~683 lignes, testable headless) : `piece.gd`, `board.gd` (8×8), `moves.gd` (128 l.), `rules.gd` (215 l. — pipeline traversée→attaque→riposte→victoire), `cards.gd`, `match.gd`, `ai.gd` (IA 1-ply).
- **Rendu 3D + UI** : `ui/game3d.gd` (605 l. — plateau perspective, picking raycast, animations Tween), `ui/hud.gd`.
- **Tests** : `tests/run_tests.gd` (338 l., oracle headless).

⚠️ Le README revendique « VERT (83/83) » et « 54/54 » — **claims non re-vérifiés** (Godot absent du PATH de ce poste, oracle non exécuté).

### 2b. Assets 3D — `games/chess_tcg/assets/`
- **8 personnages GLB riggés + animés**, pack **KayKit** (Kay Lousberg), licence **CC0 1.0**. Factions Ordre (Adventurers) vs Horde (Skeletons).
- **33 MB, GLB non compressés (~3,6 MB/pièce)**. Usage = placeholders de faction.

### 2c. Canon design — `repos/games/ChessTCG/`
Statut **`DOCUMENTED_ONLY`**. MASTER_DOCS ratifiés : charter, roadmap docs-only, game design canon, formule RNG, taxonomie cartes, décisions ratifiées 2026-07-06, arch review, build slices. Canon des règles, pas du code.

### 2d. Corpus de récupération — `docs/tcg/recovery/`
~40 fichiers bibles/extractions (Crown v1 → Tactical Chess), matrices RNG. Matière première, non canonique.

### 2e. Cartographie llm-lego
`roadmap/artefact/goal/chain-chess-tcg-3d*` : **cartographie pure** dans le Lego Builder — « aucune construction, hors périmètre du Lego Builder ». Pas un build-order réel.

## 3. Contraintes navigateur du Jalon 1 — état à l'époque

| Contrainte | État |
|---|---|
| Base de code navigateur | NÉANT — greenfield |
| WebGL / WebGPU | Non adressé. Le prototype Godot est **Forward+/Vulkan** (défaut) qui **ne tourne pas sur le web** ; un export web exigerait le renderer *Compatibility* (WebGL2) avec perte de fonctionnalités. |
| Budget mémoire | Non mesuré. 33 MB d'assets bruts = très au-dessus d'un budget web raisonnable. |
| Compatibilité | Non évaluée (dépend d'un choix de renderer non fait). |
| Outillage | Godot absent du PATH ; aucune toolchain web (bundler, wasm). |

## 4. Point zéro — synthèse (navigateur)

- **Cible navigateur : rien n'existe.** Départ à blanc.
- **Actif réutilisable majeur : la logique de jeu** (`core/`, headless) — portable comme *spécification exécutable*, pas comme code JS/wasm transplantable.
- **Piège :** croire que « le jeu 3D existe donc le Jalon navigateur est à moitié fait ». Prototype natif et cible navigateur partagent le **design**, pas la **plateforme technique**.

**→ C'est ce constat qui a motivé la décision produit du 2026-07-08 :** continuer sur Godot natif (cible mobile) plutôt que jeter un prototype jouable réel pour une réécriture web.

## 5. Réserves de fiabilité
- « 83/83 » / « 54/54 » = claims non re-vérifiés (Godot non installé/PATH).
- Inventaire d'existence et de structure, pas audit ligne-à-ligne du canon.

---
```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
