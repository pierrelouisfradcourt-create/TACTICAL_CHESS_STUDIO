# PROTOCOL.md — Capteur de dominance d'issue (advisory) — protocole figé

Méthode P1_1 (gabarit `P1_1_PROTOCOL.md`) : seuils, K et sha figés **avant** toute mesure.
Date de gel : 2026-07-21. Mission ratifiée Pierre (gate 7 — « lance-le »).

## Statut

**ADVISORY STRICT.** Ce capteur n'entre JAMAIS dans `software_verdict`. Il n'est jamais gating,
jamais un juge du code. Fail-open : toute exception interne devient `sensor_error` dans le
rapport, jamais une exception qui remonte à l'appelant (`runDominanceSensorSafe`, jamais
`runDominanceSensor` directement, dans un pipeline Forge).

## Fichier capteur et sha figé

- Fichier : `lab/forge_sensors/dominance/dominance_sensor.mjs`
- **sha256 (figé à la date de gel ci-dessus)** :
  `3cd2521c9d0a2dc2680afb663e37af307414e6508195cbea0f27e679d6fba907`
- Recalcul : `sha256sum lab/forge_sensors/dominance/dominance_sensor.mjs`
- Toute modification du fichier après ce gel invalide le sha ci-dessus — un nouveau protocole
  daté doit être écrit avant de refaire confiance aux rapports produits.

## Constantes figées (`protocol_constants.mjs`, consommées par tous les probes)

| Constante | Valeur | Sens |
|---|---|---|
| `K_FROZEN` | 50 | seeds par affrontement, politique "random-seeded" uniquement (voir note K ci-dessous) |
| `THRESHOLD_FROZEN` | 0.70 | seuil de dominance "bat le champ" (annexe §4-B) |
| `EPSILON_FROZEN` | 0.10 | tolérance de déviation miroir autour de la symétrie A/B |

## Ce que mesure le capteur (V0)

- **Configs de board** : unité seule vs unité seule (1v1), board 8×8, TOUTES les paires
  `i <= j` sur les 15 UnitDef de `games/auto_battler/content/units.v0.mjs` (120 affrontements,
  dont 15 miroirs). Les "petites compositions" (§4-B, optionnelles "si trivial") ne sont **pas**
  implémentées en V0 — décision documentée, pas un oubli : `resolveCombat` est pur et sans
  builder de composition partagé côté sensor, ajouter des compositions 2v2+ aurait exigé une
  seconde couche de construction d'armée non triviale. TODO si le capteur est un jour étendu.
- **Étoile** : star 1 uniquement (v0). Les multiplicateurs d'étoile ne sont pas mêlés à la
  mesure — ce serait une seconde variable non contrôlée.
- **Politiques hétérogènes** (3, toutes déterministes) :
  1. `random-seeded` — cellules tirées par un mulberry32 seedé (seeds 1..K), self-contained,
     séparé de `engine/rng.mjs` pour garder le capteur étanche à tout import hors
     `combat/combat.mjs` + `combat/cell.mjs`.
  2. `greedy-stats` — placement fixe à distance manhattan maximale du board (7 cases).
  3. `heuristic-mirror` — placement fixe resserré (contact rapide).
- **Note K** : `resolveCombat` est **zéro-RNG par construction** (CBT-9, header
  `combat/combat.mjs`) — même setup, même sortie bit pour bit. La SEULE source de variance entre
  seeds est donc le placement choisi par la politique du capteur, pas le jeu. Les politiques
  `greedy-stats` et `heuristic-mirror` sont seed-indépendantes par construction (un seul run
  suffit, K répétitions donneraient K fois le même résultat) ; seule `random-seeded` exécute
  réellement K=50 seeds. Documenté ici pour ne jamais laisser croire à un aléa de combat qui
  n'existe pas.
- **Flag (a) dominance vs champ** : taux de victoire moyen d'une unité contre tout le reste du
  roster (moyenne sur tous les adversaires, par politique). Flag `dominant_agreed` si **toutes**
  les politiques dépassent le seuil (0.70) ; `dominant_uncertain` si seule une partie le
  dépasse (désaccord entre politiques — jamais résolu à la place de Pierre, rapporté tel quel).
- **Flag (b) déviation miroir** : pour un miroir (même unité des deux côtés), la mesure honnête
  n'est PAS `|winRate_A - 0.5|` — une paire identique qui s'annihile mutuellement à chaque tick
  (draw) donne `winRateA=0` ET `winRateB=0`, ce qui EST le résultat symétrique attendu, pas un
  biais de camp B. La mesure retenue est `winRateA - winRateB` (winRateB déduit de winRateA et
  drawRate) : un draw pèse pour rien, un vrai biais de camp pèse pleinement. Flag si `|asymmetry|
  > epsilon (0.10)` sur toutes les politiques (`mirror_deviation_agreed`) ou seulement certaines
  (`mirror_deviation_uncertain`).

## Périmètre d'import (étanchéité du capteur)

`dominance_sensor.mjs` importe UNIQUEMENT `games/auto_battler/combat/combat.mjs`
(`resolveCombat`) et `games/auto_battler/combat/cell.mjs` (`isValidCell`, `manhattan`) — lecture
seule stricte, aucune écriture, aucun import de `engine/`, `params.v0.mjs`, `bench/`, `pool/`,
`shop/`. `BOARD_WIDTH`/`BOARD_HEIGHT` sont redéclarés en dur (8×8, valeur connue de
`params.v0.mjs` au moment du gel) plutôt qu'importés, pour garder le capteur totalement
découplé — si le board change de taille un jour, ce protocole devient caduc et doit être refait,
pas silencieusement faux.

## Limite connue V0 (honnête, pas cachée)

Le taux "vs le champ" mélange tous les rangs (coût 1 à 5) sans normaliser par coût : une unité de
rang 5 qui bat une unité de rang 1 en 1v1 n'est PAS une preuve de déséquilibre — c'est attendu
(le coût achète la puissance). Les flags `dominant_agreed` observés sur le contenu réel (voir
sonde témoin sain) doivent être lus avec cette limite en tête : ils signalent des paires qui
méritent un regard humain, pas un verdict de déséquilibre. HumanGate (Pierre) décide, jamais ce
capteur.

## Sondes P1.1 (obligatoires, gel du sha AVANT exécution)

1. **Témoin négatif** (`probe_negative.mjs`) — `fixtures/units_rigged.mjs` (copie du contenu
   réel, `unit_1` ×10 hp/attack). DOIT flagger `unit_1` en `dominant_agreed`. Si non → capteur
   NON livrable.
2. **Témoin sain** (`probe_real.mjs`) — contenu réel intact, rapporté tel quel avec distinction
   accord/désaccord des politiques. Écrit `report_<date>.json`.
3. **Déterminisme** (`probe_determinism.mjs`) — deux exécutions même constantes → rapport
   identique bit pour bit (comparaison JSON.stringify stricte).

## Sortie

`lab/forge_sensors/dominance/report_<date>.json` (écrit par `probe_real.mjs`) : rapport brut +
flags. Consommation future par un pipeline Forge : uniquement via `runDominanceSensorSafe`,
jamais `runDominanceSensor` (qui peut lancer).
