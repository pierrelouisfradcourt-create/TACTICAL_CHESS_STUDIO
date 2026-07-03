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

## Template pour nouvelles entrées

```
## YYYY-MM-DD — [Titre de la décision]

**Décision** : 

**Contexte** : 

**Alternatives rejetées** :
- 

**Critères de révision** : 
```
