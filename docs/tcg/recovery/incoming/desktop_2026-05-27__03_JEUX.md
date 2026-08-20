# Jeux — État et design

status: CANONICAL
date: 2026-05-27
authority: HumanGate

---

## Chess (classique)

| Élément | Statut |
|---|---|
| Moteur Rust | IMPLEMENTED |
| Règles complètes (roque, en-passant, promotion, 50 coups, répétition) | IMPLEMENTED |
| FEN complet | IMPLEMENTED |
| UCI | IMPLEMENTED |
| Rocky joueur | IMPLEMENTED (dataset à régénérer) |

---

## Chess 960

| Élément | Statut |
|---|---|
| 960 positions uniques | IMPLEMENTED — testées |
| Activation runtime | BLOCKED — HumanGate requis |
| Rocky adapté | BLOCKED — suit l'activation |
| LLM pre-move analysis | NOT_STARTED |

Décision : activer dès que dataset régénéré ?

---

## Chess Fantasy / Chess Battler → Chess TCG

Design docs disponibles :
- Plateau 8x8, pièces avec HP/ATK/ARM
- Budget par pièce : Pion 4 / Cavalier 6 / Fou 6 / Tour 7 / Reine 8 / Roi 9
- Système de statuts : burn, poison, gel, désarm, charme, stun...
- Matrice d'interdits (combos anti-abus)
- Factions + micro-sets
- Draft / sideboard
- Autobattler : placement stratégique + résolution automatique

Générateur de cartes :
- Un générateur fonctionnel existait (ancien disque dur)
- Séquence RNG : faction → rôle → budget → stats → portée → géométrie → interaction → effet → validation

| Élément | Statut |
|---|---|
| Design docs | DOCUMENTED_ONLY |
| Runtime Chess Fantasy | NOT_STARTED |
| Générateur cartes | UNKNOWN (récupérer ancien disque) |
| Rocky muté Fantasy | NOT_STARTED |
| Conflits formules | OPEN — damage floor, BRAWL, pressure |

Conflits à trancher (HumanGate) :
- Damage : max(1, ATK-ARM) vs max(0, incomingDamage-armor)
- BRAWL : plusieurs variantes
- Victory : king kill vs pressure collapse vs chess mate

---

## Coaching IA "rétro-engineering"

Concept :
- Rocky démarre nerfé selon le niveau du joueur
- Quand le joueur monte de niveau, Rocky récupère progressivement son code
- Rocky semble de plus en plus intelligent
- Il s'adapte via le dataset co-créé avec le joueur
- On reprend la décision tree de Rocky et on l'explique via LLM

Statut : NOT_STARTED — Phase 3

---

## Snake autour du monde

Statut : IDEA — Phase 3

---

## Belote

Statut : IDEA — Phase 3

---

## App seniors

Concept : flèches sur écran smartphone pour apprendre SMS/mail/photo.
Guidage vocal + visuel. Interface très simple.

Statut : IDEA — Projet parallèle indépendant du studio
Note : peut se développer rapidement en parallèle (stack différente)
