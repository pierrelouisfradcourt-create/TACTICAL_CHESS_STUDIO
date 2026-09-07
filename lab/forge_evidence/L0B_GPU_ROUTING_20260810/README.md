# L0b — routage GPU du collecteur Godot (preuves d'exécution)

Date : 2026-08-10 · Poste : Godot 4.6.3, Vulkan 1.4.329, NVIDIA RTX 5080
`claim_verdict: NO_CLAIM_ALLOWED`

## 1. La mesure qui a décidé du design

Même binaire, même volet (`games/snake/07_TESTS/oracle/core_render_frame.gd`), deux modes :

```
--display-driver windows --rendering-driver vulkan --position -3000,-3000
  -> FORGE_ORACLE core_render_frame {"fails":[],"ok":true,"tete_a":[10,10],"tete_b":[16,10]}
     exit 0

--headless
  -> ERROR: Parameter "t" is null. at: texture_2d_get (dummy/storage/texture_storage.h:106)
     FORGE_ORACLE core_render_frame {"fails":["capture nulle (fenetre GPU absente ?)"],"ok":false,...}
     exit 1
```

**Conclusion opérationnelle** : en headless, un volet pixel ne rend pas un marqueur
« je n'ai pas pu mesurer », il rend un **rouge fabriqué**. Le mode d'exécution doit donc
être décidé **avant** le lancement, par lecture de la source — d'où la directive statique
`# forge:run_mode = gpu_window`, et non un routage sur le payload.

## 2. Preuve par le VRAI collecteur

`run_godot_product_oracle(Path('games/<jeu>'))`, binaire réel, runners par défaut.
Sortie intégrale : `collector_run.json`.

| Jeu | Volet | status | mode_execution |
|---|---|---|---|
| snake | core_render_frame | **OK** | **gpu_window** |
| snake | 8 autres volets | OK | headless |
| tetris | core_render | NOT_MEASURED | headless |
| tetris | 8 autres volets | OK | headless |

Deux lectures à ne pas confondre :

- **snake/core_render_frame → OK en `gpu_window`** : première preuve pixel obtenue
  *à travers le collecteur*, et non seulement en ligne de commande. C'est le critère de
  fin de L0b.
- **tetris/core_render → NOT_MEASURED en `headless`** : comportement **inchangé**,
  conforme à l'option (a) ratifiée Pierre le 2026-08-10. Le volet s'exécute, déclare
  `requires_gpu_window: true` dans son payload, et le collecteur le rend NOT_MEASURED —
  jamais FAIL (leçon `forge.oracle_fail_vs_not_measured_marker`). **Aucun vert fabriqué.**

## 3. Ce que ces preuves n'établissent PAS

- Rien sur Bomberman 3D : aucun fichier de ce jeu n'existe.
- Rien sur une **scène 3D** : le volet prouvé rend une scène 2D (`ColorRect`). Que la
  capture fonctionne sur une scène `Node3D` reste **non mesuré**.
- Rien sur un autre poste : `--display-driver windows` est spécifique à Windows et la
  dépendance matérielle de la preuve pixel Godot est inchangée.
- Rien sur les critères pixel plus fins demandés pour Bomberman (régions projetées qui
  changent) : le volet prouvé n'assert que « non monochrome » + « deux états diffèrent ».
