# Decision Log
#decision #reference

> Registre chronologique des décisions irréversibles ou structurantes.
> Format : date · décision · contexte · alternatives rejetées · critères de révision.
> Seul Pierre peut ajouter/modifier des entrées dans ce log.

---

## 2026-06-27 — Pivot Studio V2 : micro-usine de jeux Steam

**Décision** : Arrêter le développement du moteur d'échecs Rocky comme *produit commercial*. Pivoter vers une micro-usine de jeux Steam avec l'IA invisible comme multiplicateur de production.

**Contexte** : Rocky = ELO ~1200 ; valeur marché ≈ 0 (Stockfish gratuit, marché verrouillé par chess.com/lichess). L'infrastructure 15 agents / IR universel ne génère aucun euro.

**Alternatives rejetées** :
- Continuer l'entraînement neural chess → DELETE commercial (voir `01_AUDIT_DE_LAUDIT.md`)
- Vendre le moteur B2B → marché inexistant pour ELO 1200
- Faire un jeu d'échecs Steam → concurrence avec produits existants

**Sort des actifs existants** :
- Rocky moteur → R&D/vitrine (compétence Rust réutilisable en GDExtension)
- Doctrine oracles/gates/lanes/NO_CLAIM → KEEP, recâblée sur signaux business
- Ledger IMP léger → KEEP
- Qwen local → KEEP (inférence gratuite = critique en bootstrap < 2k€)
- IR universel, 15 agents autonomes, ML chess → DELETE

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-06-27 — Genre : idle tête de pont + survivor-like moteur de revenus

**Décision** : Séquence produit = (1) idle (bas risque, systèmes > art, roder le pipeline), puis (2-3) survivor-like (plafond plus élevé, exige hook fort).

**Contexte** : Contrainte < 2k€ + zéro budget art + zéro audience de départ. L'idle nécessite zéro art payant (systèmes > visuels), parfait pour le bootstrap.

**Alternatives rejetées** :
- Roguelike deckbuilder → fatigue post-Balatro, éditeurs fuient en 2026
- Mobile hypercasual → dépend UA payante (budget inexistant)
- Co-op horror → co-op = complexité réseau, variance extrême
- Tout jeu art IA visible → −53 % reviews, non protégeable

---

## 2026-06-27 — Titre 1 : Snake: Survivor RPG — Genesis (et non idle)

**Décision** : Le Titre 1 est un survivor-like (Snake: Survivor RPG) et non un idle, car un hook mécanique fort (Constriction) a été identifié comme différenciateur viable dans un genre saturé.

**Contexte** : Le hook « corps du serpent = arme ET obstacle » + mécanique de Constriction est un créneau non exploité confirmé par la recherche marché 2026.

**Scope MVP** : variante 2 du GDD (premium Steam, no IAP), réduit à 1 biome + 1 boss, ~15 min de run. Vision AAA (5 biomes, F2P mobile, battle pass) = étoile nord uniquement, étagée sur succès MVP.

**Kill-gate P0** : hook fun en 2 min ? Pierre tranche. Si non → itérer ou abandonner avant d'investir dans le contenu.

**Kill-criteria** :
- < 1 500 WL à J-30 de la démo → reporter/repenser le hook
- < 1 000 ventes mois 1 → ne pas étager les biomes 2-5

---

## 2026-06-27 — Abandons explicites (décision d'architecture)

**Décision** : Supprimer / ne plus investir dans :
1. IR universel / game factory DSL (compilateur no-op, P0-C confirmé)
2. Boucle kaizen autonome (sur-ingénierie pré-revenu, risque anti-Skynet)
3. Council gates / red-team agents (LLM qui gatent des LLM = anti-pattern)
4. Dataset neural chess commercial (zéro revenu)
5. `current_state.json` puits mort (remplacé par dashboard métriques business)

**Critères de révision** : aucun de ces éléments ne revient sans décision HumanGate explicite Pierre + justification revenu dans les 12 mois.

---

## 2026-06-28 — Stack finale Snake: Survivor RPG

**Décision** : Godot 4 (2D top-down) comme moteur, Rust/GDExtension **uniquement si profilé** (les milliers d'entités = point chaud connu, mais on ne sur-ingénière pas avant mesure). `headless_sim.py` + `variants/*.json` pour la balance de jeu.

**Décision** : Art = CC0 (Kenney) + brouillon IA **retravaillé** uniquement. Règle absolue, non négociable.

**Décision** : Premium Steam (~5-8 € EA), no IAP, no F2P. Mobile exclu (pas de budget UA).

---

## 2026-07-03 — CT-1 : versionner llm-lego/ + studio_brain/ dans Git

**Décision** : Verser `llm-lego/` (171 fichiers, 1,6 Mo) et le vault `studio_brain/` (15 fichiers) dans Git pour lever le risque bus-factor-1 (perte disque).

**Contexte** : `node_modules` (105 Mo) exclu — pas de valeur à versionner. LFS envisagé puis écarté (l'essentiel du poids était `node_modules`, ignoré ; l'ajout réel de texte ne pèse que 1,6 Mo).

**Alternatives rejetées** : Git LFS (jugé inutile vu le poids réel).

**Décisions dérivées** : `*.png` (53 captures d'écran) gitignorées — repo lean. `state/loops-log.md` (2,4 Mo) et `lego.zip` exclus.

**Critères de révision** : aucun — décision d'hygiène repo, non structurante côté produit.

---

## 2026-07-03 — CT-4 : réconcilier la mémoire — 1 modèle canonique à 3 rôles

**Décision** : Un seul modèle de mémoire persistante, structuré en 3 rôles distincts : `memory/MEMORY.md` (faits durables, machine, auto-chargé), `studio_brain/00_CURRENT_CONTEXT.md` (handoff inter-sessions, < 100 lignes), `studio_brain/` tier-2 (doctrine/décisions/gamedesign/architecture, chargé à la demande).

**Contexte** : Avant CT-4, 3 référents mémoire concurrents et contradictoires existaient (`AI_MEMORY/`, `STUDIO_CONTEXT_LIVE.md`, `COWORK_CONTEXT.md`), source de dérive et de contenu périmé non détecté.

**Alternatives rejetées** : Ajouter Obsidian comme 4ᵉ référent mémoire sans réconciliation préalable (aurait aggravé la fragmentation) — Phases 2/3 (Graphify/Obsidian) restent gelées jusqu'à cette réconciliation.

**Sort des référents retirés** : `AI_MEMORY/`, `STUDIO_CONTEXT_LIVE.md`, `COWORK_CONTEXT.md` archivés dans `studio_brain/journal/archived-memory-referents-2026-07-03/`, ne plus lire ni écrire.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-06 — Vocabulaire de verdict unique : OK/FAIL/BLOCKED

**Décision** : Un seul vocabulaire de verdict dans tout le studio : `OK / FAIL / BLOCKED` (enum du contrat council v1, `schemas/council_output_v1.schema.json`). Tout futur contrat ou gate le réutilise tel quel.

**Contexte** : Le design « TCS Factory v2 » proposait un `gate-verdict-contract` en `PASS / CONCERNS / FAIL`, en collision avec l'enum council v1 déjà en prod (contre-audit 2026-07-06, attaque 3 : deux vocabulaires concurrents ⇒ mapping ad-hoc + dérive).

**Alternatives rejetées** :
- `PASS / CONCERNS / FAIL` (gate-verdict-contract proposé) — rejeté : introduit un 3ᵉ vocabulaire de verdict alors qu'un enum ratifié existe déjà.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-06 — CI : runner GitHub Actions auto-hébergé sur la machine studio

**Décision** : CI = runner GitHub Actions **auto-hébergé** sur la machine studio (Windows, RTX 5080). Vraie CI bloquante, pas un script post-push consultatif.

**Contexte** : La facturation GitHub Actions est ce qui a vidé la CI initialement (commentaire `Budget control` dans `canonical-ci.yml` → tous les jobs réels passés en `workflow_dispatch` manuel, contre-audit 2026-07-06 C1). Un runner local remet une CI réelle à coût externe zéro, cohérent avec la doctrine locale-first.

**Alternatives rejetées** :
- GitHub Actions facturé (runners hébergés) — rejeté : c'est précisément la contrainte de coût qui a tué la CI.
- Script post-push consultatif — rejeté : non bloquant, ne protège pas master.

**Limite acceptée** : la CI ne tourne que machine allumée.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-05/06 — PIVOT PRODUIT : Rocky gelé → gamme cartes FR (Belote produit 1)

**Décision** : Geler Rocky (aucune session d'optimisation moteur sans HumanGate explicite). Réorienter la factory vers une gamme de jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun). Snake: Survivor RPG — Genesis devient de fait [[../projects/snake-survivor-genesis|SUPERSEDED]] : son kill-gate P0 n'a jamais été tranché, le studio a changé de pari avant résolution.

**Contexte** : rattrapage tardif — cette décision, ratifiée par Pierre le 2026-07-05/06, n'avait pas été journalisée ici (seul `studio_brain/00_CURRENT_CONTEXT.md` la portait). Ajoutée le 2026-07-12 pour combler l'écart entre le handoff courant et le registre canonique.

**Actions pendantes** (héritées, toujours ouvertes au 2026-07-12) : re-triage ledger (IMP Rocky → FROZEN, revue HumanGate avant écriture) ; spec produit Belote (IA à niveaux, défi-par-seed, PWA mobile-first) ; étage 2 = table WebRTC, multi public gated. Bloc 1 Belote (règles/table/matériel) livré 2026-07-06 (`8e011fe`), non poussé.

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-11 — Forge 2.0 : P0 intégrité GELÉ

**Décision** : Geler le socle P0 de Forge (driver déterministe, preuve mutation signée, doctrine triage, `is_clean_pass()` comme seul prédicat de promotion propre) après 277 tests verts et 3 audits adversariaux fermés. Pas de P0.5, pas de workflow de conformité étendu, pas d'élargissement vers autopilot/kaizen sans HumanGate explicite.

**Contexte** : séparation ratifiée entre intégrité du système Forge (P0, gelé) et qualité des jeux générés (gate séparé, ex. `menagerie_tactics` — artefact, pas un bloqueur P0).

**Critères de révision** : HumanGate Pierre uniquement.

---

## 2026-07-19 — Lane STUDIO gelée (autopilot.py, scripts/studioV2/, lanceurs)

**Décision** : Geler la lane STUDIO — aucune session de travail sur `autopilot.py` (9029 lignes, inchangé depuis 2026-06-29), `scripts/studioV2/` (45 fichiers, inchangé depuis 2026-06-26), `start_studio.ps1` / `stop_studio.ps1` sans HumanGate explicite de Pierre. Ne pas corriger, ne pas étendre, ne pas « améliorer en passant ». Lire reste autorisé. Hors gel : `tests/studioV2/` (zone protégée, régime propre) et `repos/games/studioV2_MIGRATED_HOLD/` (déjà archivé).

**Contexte** : audit « déclaré ≠ exécuté » du 2026-07-19 (session studio/méta, déclenché par une comparaison ChatGPT du studio avec ECC/Donchitos) — 3 strates mortes trouvées dans la lane STUDIO : (1) `.claude/agents/*.md` (15 fiches) jamais chargées faute de `description:` (champ requis absent) ; (2) `lab/agent_policy/tool_permission_matrix.json` (62 règles) câblée mais `_check_tool_permission` (`autopilot.py` ~l.843) ignore `agent_id` et échoue en mode ouvert (matrice absente → ALLOW), contredisant son propre `deny_by_default: true` ; (3) 3 taxonomies d'agents concurrentes qui ne se parlent pas (`producer/code/qa/review/docs` de la matrice · `producteur-dur/qa-lead/...` de `.claude/agents/` · `builder/architect/...` des contrats Forge).

**Conséquence directe** : `lab/agent_policy/*.json` et sa taxonomie `producer/code/qa/review/docs` deviennent **legacy de fait** — il ne reste que 2 taxonomies vivantes : `.claude/agents/` et les contrats Forge. Le défaut `_check_tool_permission` est un défaut **connu et NON corrigé** tant que le gel tient.

**Réparation en session (NON commitée)** : 13 des 15 fiches d'agents corrigées (`description:` ajoutée, `model:` en alias, champs custom déplacés dans le corps, `disallowedTools: Write, Edit` câblé) et validées empiriquement (chargement à chaud confirmé). `gameplay-programmer` et `godot-shader-specialist` laissés intacts (rôles possiblement sans objet — décision Pierre en attente).

**Décisions Pierre en attente** : (a) correctif `_check_tool_permission` = lane STUDIO, donc sous gel ; (b) sort des 2 agents inertes ; (c) convergence des 3 taxonomies (prérequis à tout compilateur de politique) ; (d) `games/auto_battler/` (chantier actif) n'est le domaine d'aucun agent déclaré.

**Critères de révision** : HumanGate Pierre uniquement.

---

## Template pour nouvelles entrées

```
## YYYY-MM-DD — [Titre de la décision]

**Décision** : 

**Contexte** : 

**Alternatives rejetées** :
- 

**Critères de révision** : 
```
