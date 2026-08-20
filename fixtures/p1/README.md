# Fixtures P1 — non-régression du capteur qualité mécanique

- **Origine** : sondes de l'expérience P1.1 (`docs/forge/P1_1_PROTOCOL.md` v2, outcome **SUCCESS** 2026-07-12,
  résultats `docs/forge/P1_1_RESULTS.md`), promues **fixtures permanentes** sur décision Pierre :
  chacune porte UN défaut visuel connu que le capteur DOIT détecter. Si une détection disparaît,
  c'est une régression réelle du capteur — pas un flake.
- **Divergences vs les sondes expérimentées** (déclarées) : (1) le marqueur `_PROBE_NON_FORGE.md` reformulé ;
  (2) UNE ligne de profondeur dans chaque `run-oracle.mjs` (`fixtures/p1/` = un niveau plus profond que
  `games/`). Le contenu de jeu et les défauts sont octet-identiques aux sondes scellées de l'expérience
  (`lab/forge_sensors/_p11_evidence/sha_sondes_fin_phaseB.txt`).
- Jamais dans le ledger, jamais dans `oracles.json`.

## Rejouer la régression

```bash
node scripts/quality_sensor/collect.mjs p1_probe_contrast p1_probe_tiny_target p1_probe_invisible p1_probe_overflow p1_probe_clean
node fixtures/p1/check.mjs
```

`check.mjs` applique les règles figées du protocole (§5/§6, familles A1/A2/A3/A5) aux rapports
`lab/forge_sensors/p1_probe_*/visual_mechanical.json` et sort **0** si les 4 détections attendues
sont présentes et la fixture-contrôle silencieuse ; **1** sinon (régression).

## Attendus (référence expérience 2026-07-12)

| Fixture | Défaut | Détection attendue | Valeur de référence |
|---|---|---|---|
| probe_contrast | HUD `#3a3a46` | `A1_contrast:{#score,#lives,#level,.hud-label}` | 1.81 (<4.5) |
| probe_tiny_target | `#restart` réduit | `A2_target_size:#restart` | 16 px (<24) |
| probe_invisible | briques couleur de fond (3 littéraux, bordure incluse) | `A3_empty_density` | 0.961 (>0.92) |
| probe_overflow | `#stage` 1400px | `A5_h_overflow` | 250 (>0) |
| probe_clean | AUCUN | aucun signal du périmètre | — |

Hors périmètre (documentaire, ne compte pas) : `A6_render_alive` tire sur toutes les fixtures
(métrique invalidée, statut DROP) ; `A1_contrast:#overlayTitle` = `metric_unavailable` (masqué).
