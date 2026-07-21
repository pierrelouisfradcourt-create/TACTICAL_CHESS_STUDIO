# HumanGate 2026-07-19 — Extension du registre d'Events (renderer aveugle)

**Statut** : RATIFIÉ Pierre, 2026-07-19, en session.
**Verbatim Pierre** : « ratifié — les 3 events et les 6 champs, banc à 9 »

## Constat qui a déclenché le gate (vérifié, incrément 2.5)

INV-5 impose un **Renderer aveugle** : il ne lit jamais le GameState, son unique entrée est
l'Event Log. Or l'incrément 2 ne rend PAS l'état observable par ce seul canal :
- `Place` (banc↔plateau) n'émet **aucun** Event → la position des Units est indessinable.
- `Lock` n'émet **aucun** Event → l'état de verrou est indessinable.
- `ConfirmPreparation` n'émet **aucun** Event ; le commentaire de `handleConfirmPreparation`
  le justifie par « `state.phase` fait déjà partie du GameState retourné » — un raisonnement
  qui **suppose la lecture du GameState**, donc contredit INV-5.
- `UnitBought` ne porte **pas** `unit_instance_id` (choix explicite MED-4) → l'unité achetée
  n'est ni identifiable ni traçable par un Renderer aveugle.

## Décision — le registre passe de 19 à 22 Events

| Event ajouté | Bible propriétaire du payload | Motif |
|---|---|---|
| **UnitPlaced** | Core Rules / Decision | même famille que MergeTriggered/MergeResolved : action de Preparation non économique |
| **ShopLocked** | Economy | agit sur la Shop, domaine d'Economy (précédent : ShopRolled) |
| **PhaseChanged** | Core Rules | la phase appartient à la structure du Match |

## Décision — 6 champs ajoutés à des Events existants (registre inchangé)

| Event | Champs ajoutés | Motif |
|---|---|---|
| UnitBought | `unit_instance_id`, `bench_index` | sans eux l'unité achetée est indessinable et intraçable |
| UnitSold | `from_zone`, `from_index` | d'où l'unité est retirée à l'écran |
| MergeResolved | `to_zone`, `to_index` | où atterrit l'unité produite |

*(les identifiants des unités consommées par la fusion sont couverts par `consumed_count` +
la trace des `UnitPlaced`/`UnitBought` antérieurs — aucun champ supplémentaire ratifié ici)*

## Décision — valeur de travail

**Banc = 9 places** (sourcé TFT, gate n°5 délégué à l'orchestrateur). Le moteur déclare
aujourd'hui `BENCH_CAPACITY = 8` (`preparation/preparation.mjs:15`) : à aligner sur 9.

## Portée assumée

L'incrément 2.5 devient « compléter l'Event Log **puis** dessiner l'écran » : il modifie du
code de l'incrément 2 déjà mergé. Débordement de périmètre annoncé à Pierre AVANT la
ratification, et accepté par elle.

## Reste ouvert (non tranché à ce gate)

- **Boutique vide au démarrage** : la Shop ne se remplit qu'au premier `Reroll` payant.
  Aucune bible ne documente un tirage d'ouverture. Si le comportement de genre est retenu,
  il exigera son propre Event `ShopRolled` d'ouverture.
- **Déverrouillage manuel de la Shop** : `shop_locked` ne repasse à faux qu'au `Reroll` ;
  aucune bascule manuelle n'est documentée.
