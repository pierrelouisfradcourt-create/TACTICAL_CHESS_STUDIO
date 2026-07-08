# Chess TCG — Audit ciblé export MOBILE (Godot natif)

status: DOCUMENTED_ONLY
claim_verdict: NO_CLAIM_ALLOWED
date: 2026-07-08
poste: Windows 11 (win32)
projet audité: `games/chess_tcg/` (Godot 4.6) — code runtime situé HORS de ce shell docs-only
source: audit read-only (session Claude Code, inspection repo/poste) — rapport non-autoritatif, aucune décision d'architecture
contexte: fait suite à la **décision produit du 2026-07-08** (Godot natif, cible mobile Android/iOS ; le prototype existant est la base, pas une réécriture). Point zéro navigateur : `11_AUDIT_POINT_ZERO_NAVIGATEUR_2026-07-08.md`.

> **Périmètre / boundary.** Ce document *observe* un prototype runtime existant sous `games/chess_tcg/` ; il ne crée ni n'autorise aucun code, dataset, build ou artefact dans le shell `repos/games/ChessTCG/`. Le statut `runtime_status: NOT_FOUND` du charter reste vrai pour CE dossier.

Distinction : **VÉRIFIÉ** = constaté sur ce projet/poste. **RÉFÉRENCE** = fait connu Godot/stores, non mesuré ici.

## 0. Constat transverse
Le pivot mobile ne repart **pas** de zéro (contrairement au web) : la *logique* du prototype est réutilisable telle quelle. Mais « natif Godot » ≠ « mobile-ready ». **Quatre écarts réels** séparent le prototype desktop d'un build mobile — aucun bloquant conceptuellement, aucun « juste un export ».

## 1. Contraintes d'export mobile — outillage

| Élément | État | Source |
|---|---|---|
| Éditeur Godot 4.6 | **Installé** (`AppData/Roaming/Godot/editor_settings-4.6.tres`), mais **pas sur le PATH** | VÉRIFIÉ |
| Export templates | **Dossier `export_templates` VIDE** → aucun template installé | VÉRIFIÉ |
| `export_presets.cfg` (projet) | **ABSENT** → aucun preset Android/iOS configuré | VÉRIFIÉ |
| Export iOS depuis ce poste | **IMPOSSIBLE** — l'étape Xcode/signing iOS exige **macOS** ; ce poste est **Windows** | VÉRIFIÉ (platform win32) + RÉFÉRENCE |
| Export Android | Possible en principe, mais rien d'installé : templates + Android SDK/JDK + keystore de debug requis, **aucun vérifié présent** | RÉFÉRENCE + non installé |

**Conséquence :** aujourd'hui, **aucun export mobile n'est réalisable** sans d'abord (a) télécharger les export templates 4.6, (b) Android : SDK/JDK + keystore, (c) iOS : poste macOS + Xcode + compte Apple Developer (hors de portée de cette machine).

## 2. Input — souris/clavier vs tactile

`ui/game3d.gd::_unhandled_input` (VÉRIFIÉ, l.330-340) ne gère que :
- `InputEventKey` → `KEY_R` (reset caméra)
- `InputEventMouseMotion` → survol (hover highlight)
- `InputEventMouseButton` `MOUSE_BUTTON_LEFT` → picking par raycast

**Aucun** `InputEventScreenTouch` / `InputEventScreenDrag` / geste. `project.godot` ne fixe aucun réglage tactile (défauts Godot).

- **Tap** : fonctionnera *probablement* via le défaut Godot `emulate_mouse_from_touch=true` (toucher → clic gauche → picking). **Non testé** (Godot non lançable ici).
- **Survol** (`MouseMotion`) : **aucun équivalent tactile** → feedback de survol **mort** sur mobile.
- **Caméra tactile** (pan/pinch-zoom/rotation), multitouch : **absents**.

→ **Vrai chantier d'adaptation input**, pas un flag d'export.

## 3. Assets — budget mobile

| Fait | Valeur | Source |
|---|---|---|
| Poids GLB | **33 MB** (8 persos, ~3,6 MB/pièce), non compressés | VÉRIFIÉ |
| Compression textures | **`compress/mode=0` = Lossless** sur les 8 PNG (pas de compression VRAM) ; `detect_3d/compress_to=1` (Godot suggère VRAM mais l'import courant reste lossless) | VÉRIFIÉ |

Deux budgets à ne pas confondre :
- **Taille app store** (RÉFÉRENCE, non mesurée) : Play Store AAB jusqu'à ~200 MB base ; App Store sans plafond dur, limite cellulaire ~500 MB. → **33 MB de bruts n'est PAS le problème** côté téléchargement.
- **Mémoire GPU runtime** (le vrai risque) : textures **lossless = RGBA plein en VRAM**, lourd sur GPU bas de gamme. Les GPU mobiles veulent du **VRAM-compressé (ETC2 Android, ASTC Android/iOS)** — **absent**. C'est ici le gap réel.

## 4. Performance — renderer

| Fait | Détail | Source |
|---|---|---|
| Renderer du projet | **Aucune section `[rendering]`** dans `project.godot` → défaut = **Forward+ (Vulkan)** | VÉRIFIÉ |
| Adéquation mobile | Godot 4 : 3 renderers — **Forward+** (Vulkan, orienté desktop/haut de gamme), **Mobile** (Vulkan, réglé mobile), **Compatibility** (GLES3/OpenGL, portée max). Forward+ tourne sur mobile Vulkan mais non recommandé bas de gamme ; iOS via MoltenVK (supporté 4.6). | RÉFÉRENCE |

**Symétrie avec le point zéro web :** le Forward+ actuel n'est **pas** la cible mobile idéale. Bascule vers **Mobile** (ou Compatibility) très probablement nécessaire — décision d'architecture **à instruire, pas prise ici**. Le README mentionne éclairage + ombres (poids accru sur bas de gamme, non profilé).

## 5. Synthèse — point zéro mobile

**Réutilisable tel quel :** toute la **logique de jeu** (`core/`, headless), neutre au portage.

**Quatre écarts réels desktop → mobile (aucun = « juste un export ») :**
1. **Outillage** : aucun export template, aucun preset ; iOS impossible depuis Windows.
2. **Input** : souris/clavier only ; tactile à construire (tap émulable, survol mort, gestes absents).
3. **Assets** : textures non compressées VRAM → à recompresser pour la mémoire GPU bas de gamme.
4. **Renderer** : Forward+/Vulkan par défaut → bascule Mobile/Compatibility probable.

**Non-problème :** taille d'app store (33 MB largement sous les plafonds).

## 6. Réserves de fiabilité
- Godot non lançable ici (pas sur PATH) → **rien exécuté** : émulation tap, comportement renderer, FPS mobiles **déduits, non mesurés**.
- Limites stores/renderers = **référence**, pas mesures projet.
- Android SDK/JDK/keystore : présence **non vérifiée**.

---
```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
