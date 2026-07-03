# État du Studio — 2026-06-28
#state

> Snapshot daté de l'état réel du studio TCS.
> Source : audit des fichiers du repo + sessions Cowork.
> claim_verdict: NO_CLAIM_ALLOWED — ce qui est noté ici est ce qui existe dans le code.

---

## Snake: Survivor RPG — Genesis (Titre 1)

### Modules GDScript présents (`games/snake_survivor/scripts/`)

| Script | Rôle |
|---|---|
| `Snake.gd` | Serpent : déplacement continu, braquage relatif (A/D), corps en traînée, mécanique Constriction (encercler → explosion de zone). Rendu néon : gradient + glow additive + taper de largeur. Fond animé (drifting dots) intégré. |
| `EnemyField.gd` | Champ data-oriented haute perf — MultiMeshInstance2D + tableaux parallèles + free-list. Cible 1000-3000 ennemis à 60 fps. |
| `SurvivorSystems.gd` | Boucle survivor-like : orbes XP, HUD, UI level-up, timer de run, wave director, élites, boss trigger à ~5 min. Floating damage numbers, screenshake, flash level-up. |
| `Weapons.gd` | Système d'auto-attaque par segments. 3 éléments : FIRE (AoE burn), ICE (slow + projectile), LIGHTNING (chain). Upgrade par slot. |
| `EnemyField.gd` | 5 types d'ennemis : FODDER, CHASER, ZONER (ranged), ELITE, BOSS. HP et vitesse scalés par run_time. ZONER tire des projectiles data-oriented. Boss : 2 phases (shield → vulnerable), attaques télégraphiées. |
| `Main.gd` | Orchestrateur v2 : câble Snake + EnemyField + SurvivorSystems + Weapons. Gère kill particles, constriction implosion, screenshake relay, boss HUD. |

### Ce que le jeu a aujourd'hui (existant confirmé)

- Combat : **3 éléments** (Fire, Ice, Lightning), chacun avec cooldown, radius, niveau upgradeable
- Ennemis : **5 types** (Fodder, Chaser, Zoner, Elite, Boss) + phases boss + attaques télégraphiées
- Juice : rendu néon glow, floating damage numbers, screenshake, kill particles, implosion arcs, fond animé
- Architecture performance : MultiMesh data-oriented (EnemyField), pas de Node2D par ennemi
- Boucle survivor complète : XP, level-up 3 cartes, wave director, boss à 5 min

### Bugs Godot résolus (session précédente)

- `Transform2D` constructor — appel incorrect corrigé
- `randomize()` — usage déprécié corrigé (passage à `RandomNumberGenerator.randomize()` per-instance)

### Ce qui n'est PAS encore là (hors snapshot actuel)

- Export Godot vert (non vérifié ce jour)
- Headless sim (`headless_sim.py`) — non trouvé dans le repo à cette date
- Télémétrie joueurs branchée (PostHog / Plausible)
- Page Steam ouverte
- Arbre de méta (constellation / Essence)

---

## Studio Brain (vault Obsidian)

### Créé ce jour (2026-06-28)

| Fichier | Statut |
|---|---|
| `workflow/skills-catalog.md` | Créé — 33 skills groupés, mécanique délégation |
| `workflow/studio-operating-flow.md` | Créé — boucle Pierre→Cowork→Exécution→Oracles→HumanGate |
| `meta/vault-usage-guide.md` | Créé — conventions, tags, cadence, DON'Ts |
| `state/current-state-2026-06-28.md` | Ce fichier |
| `000_HOME.md` | Mis à jour — sections Workflow, Meta, State ajoutées |

### Studio V2 UX

- `studio_v2_ux/build_board.html` — existe (tableau de build, dashboard)

---

## Infrastructure & Sessions

- Tâche hebdomadaire mémoire : **planifiée** (dimanche, revue vault)
- Vault Obsidian studio_brain : **créé et opérationnel** (7 notes existantes + 4 nouvelles)
- Modèle principal Cowork : claude-sonnet-4-6
- Qwen2.5-14B : LM Studio local port 1234 (Qwen3.6 INTERDIT pour JSON)

---

## Priorités identifiées (non-ordonnées, HumanGate pour arbitrage)

1. Valider le hook fun (Pierre joue — kill-gate P0)
2. Export Godot vert (oracle build)
3. Page Steam (CR-002 : ouvrir tôt)
4. Brancher télémétrie (oracle rétention)

---

## Liens
- [[../projects/snake-survivor-genesis|Snake: Survivor RPG — Genesis]]
- [[../workflow/studio-operating-flow|Studio Operating Flow]]
- [[../reference/sources-of-truth|Sources de Vérité]]
- [[../000_HOME|Home MOC]]
