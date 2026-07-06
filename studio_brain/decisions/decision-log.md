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

## Template pour nouvelles entrées

```
## YYYY-MM-DD — [Titre de la décision]

**Décision** : 

**Contexte** : 

**Alternatives rejetées** :
- 

**Critères de révision** : 
```
