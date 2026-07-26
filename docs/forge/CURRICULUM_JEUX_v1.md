# Curriculum de jeux — faire apprendre la Forge (v1)

> **Auteur** : Claude, 2026-07-21. **Source** : discussion Pierre ↔ Claude (arbre curriculum
> initial Gemini/ChatGPT amendé) + `docs/forge/FORGE_STANDARD_v1.md` (note de Pierre) +
> inventaire réel du catalogue au 2026-07-21. **Statut** : PROPOSED — à ratifier par Pierre.
> **claim_verdict** : NO_CLAIM_ALLOWED.

## Ce que ce document est, et n'est pas

C'est la **liste ordonnée** des jeux à produire pour faire apprendre la Forge, chaque jeu
étant un exercice d'entraînement supervisé qui dépose une brique réutilisable. Ce n'est
PAS un backlog à exécuter d'un bloc : chaque jeu est son propre cycle `spec → plan → build`,
et l'ordre est une **contrainte d'architecture** (vision cathédrale ratifiée), pas une
promesse de tout construire tout de suite.

Loi d'empilement (§7 du STANDARD) : `nouveau jeu = compétence(s) acquise(s) + 1 delta`.
L'ordre ci-dessous n'est PAS par difficulté croissante — il est par **levier** : les
premiers jeux sont ceux qui déposent la compétence la plus réutilisée en aval. C'est
l'optimisation que Pierre a désignée comme « la partie la plus importante du système ».

## Point de départ réel (inventaire 2026-07-21)

Ne pas repartir de zéro, mais ne pas surestimer non plus l'acquis :

- **Godot** : UNE seule brique, `sys-grid-nav-m01` (tier=candidate), déposée à l'étape 0
  comme **preuve de chaîne, pas comme jeu**. Rôle `role-grid-navigator` (candidate).
- **HTML/JS (ancien runtime, avant le pivot Godot)** : `sys-pursuer-mobile`,
  `sys-evader-basic`, `sys-guardian-zoc`, `sys-damage-floor`, `sys-reachability`
  (validated) + patterns. **Capital à PORTER sous Godot à la demande** (doctrine de
  substituabilité certifiée : même contrat de rôle, même bande, re-prouvé en Godot), PAS
  un acquis Godot direct.
- **Jeux déjà construits (ère HTML/JS)** : card_engine (V0, Run A), chess_tcg (Godot,
  moteur de règles pur), belote, auto_battler, shmup_slice, survival_arena, collect_runner.
  À traiter comme références internes et sources de portage, pas comme briques Godot prêtes.

Conséquence honnête : **le curriculum Godot commence quasiment à neuf.** Le premier vrai
jeu doit valider le FORGE STANDARD (contrat/repo/wiremap) sur un cas minimal, en
réutilisant au maximum ce qui existe déjà (M01 + portage des poursuivants).

## La liste — ordonnée par levier

Légende compétence : `M-xxx` = compétence-cible que le jeu doit déposer comme
system_contract/entity_contract portable (format §1/§6 du STANDARD).

| # | Jeu | Référence commerciale | Compétence déposée (delta) | Réutilise | Pourquoi ce rang (levier) |
|---|---|---|---|---|---|
| **0** | grid_nav_probe | — (preuve de chaîne) | `M-grid-navigation` ✅ candidate | — | FAIT. Prouve la chaîne Godot de bout en bout. Pas un jeu. |
| **01** | PAC-MAZE | Pac-Man | `M-poursuite-grille` (boucle score + ennemi poursuivant) | M01 + portage pursuer/evader | Premier VRAI jeu à delta minimal : valide le STANDARD contrat/repo/wiremap avec le moins de code neuf possible. |
| **02** | MATCH-3 | Candy Crush | `M-matrix-rule-engine` : état→modif→validation→cascade→récompense | — (neuf, mais central) | **Levier maximal.** Ce moteur de résolution est réutilisé partout : puzzle, merge, idle, toute résolution de tour. Placé tôt à dessein. |
| **03** | PLATFORMER | Mario | `M-character-controller` (accel/friction/saut/caméra) | — | Premier temps-réel. Physique 2D réutilisée par run&gun et action-RPG. |
| **04** | RUN & GUN / SURVIVOR | Contra / Vampire Survivors | `M-combat` (hitbox/dégâts/armes/vagues) | 03 + portage damage-floor | Combat = socle de tout jeu d'action. Réutilise le controller (03). |
| **05** | TACTICAL RPG | Fire Emblem / Frosthaven | `M-ai-decision` + `M-turn-scheduler` | M01 + portage zone-of-control + pipeline de chess_tcg | IA décisionnelle + résolution de tours. Réutilise la grille et la ZoC déjà prouvées. |
| **06** | CARD RPG / DECKBUILDER | Slay the Spire | `M-card-engine` (main/pioche/défausse/règles déclaratives) | portage card_engine V0 (Run A) | card_engine existe déjà en JS : c'est surtout un PORTAGE Godot + deck. Bon test de la doctrine de substituabilité sur une brique réelle. |
| **07** | ACTION RPG | Diablo | `M-loot` + `M-stats` + `M-inventory` | 04 (combat) + 03 (controller) | Trois systèmes d'un coup, tous adossés à des acquis. |
| **08** | MERGE / IDLE | Merge Mansion / AFK Arena | `M-economy` + `M-timer` + `M-offline-progress` | 02 (matrix engine) | Casual industriel. Réutilise directement le moteur matriciel (02). |
| **09** | ARENA MULTIJOUEUR | Clash Royale | `M-network-state` (réplication/prédiction) | tout l'acquis temps-réel | **Hard.** Dépend d'une interface d'action stable (cf. STANDARD §8, bot testeur). À ne pas attaquer avant que le standard soit rodé. |
| **10** | OPEN WORLD 3D | Genshin Impact | `M-3d-controller` + `M-streaming` | pipeline 3D (montée hors repo, mémoire `forge_3d_pipeline`) | **Le plus dur, en dernier.** 3D + streaming de monde. |

## Capital open source à digérer (pas à copier)

Règle non négociable (déjà en place, `external_sources/README.md`) :
`source externe → analyse → connaissance propriétaire → réimplémentation Forge`, JAMAIS
`dépôt trouvé → copier-coller → KB`. Les gardes de licence (R2/R4/R3/R5/R11) rendent la
règle exécutoire. Par jeu, cibler : contrôleurs Godot open source (03), frameworks de
projectiles/ECS combat (04), GOAP / behavior trees (05), moteurs de cartes (06), netcode
à rollback (09), assets CC0 Kenney/OpenGameArt/Quaternius (déjà partiellement ingérés).

## Comment chaque jeu dépose sa leçon (format STANDARD)

Chaque jeu produit, à sa clôture :
1. sa/ses brique(s) `M-xxx` au format §6 (contrat + deps + tests + preuve d'usage),
   `tier: candidate` puis `validated` seulement après gate de certification (mécanique +
   usage + verify_run AUTHENTIQUE) ;
2. une ligne dans `knowledge_base/learning_curve.jsonl` (reuse_ratio, oracle_iterations,
   joust_delta) ;
3. un amendement éventuel des oracles du standard, avec le pourquoi (ledger d'amélioration,
   §7). **Toute métrique servant à classer/générer/calibrer doit prouver sa variance**
   (invariant ADR-002 ajouté le 2026-07-21) — leçon de l'audit grid-navigator.

Le vrai livrable du curriculum n'est pas les 10 jeux : c'est la **courbe** que les 10 jeux
tracent — la preuve mesurée que la Forge apprend (reuse ↑, itérations ↓ à difficulté égale).

## Décisions ouvertes pour la nouvelle session (à trancher AVANT de bâtir)

1. **Réconciliation du STANDARD** avec la machinerie s0-s12 existante — remplacement /
   évolution / couche parallèle ? (voir la note de réconciliation en fin de
   `FORGE_STANDARD_v1.md`). Bloquant : ne pas écrire deux systèmes de « contrat » sans
   frontière.
2. **Ratifier l'ordre** ci-dessus, ou le réordonner (le levier est un jugement).
3. **Portage vs neuf** : Pac-Maze (01) réutilise-t-il un portage Godot des poursuivants HTML,
   ou repart-on d'une brique Godot neuve ? (impacte le premier vrai test de substituabilité).
4. **Promotion en attente** de `sys-grid-nav-m01` (candidate → validated) — verdict
   AUTHENTIQUE mais `is_clean_pass: False`, décision HumanGate, cf. étape 0.
