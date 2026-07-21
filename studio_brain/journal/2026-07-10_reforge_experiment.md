# Journal studio — 2026-07-10 — Expérience de re-forge (audit)

**Source :** session Claude Code, branche `feat/forge-oracle-gate`. Généré par audit mécanique (oracles + mutation testing), pas de claim non prouvé.

## Protocole
Re-forger les jeux **de zéro** via le skill `/forge` durci (solvabilité obligatoire au contrat s9, tests stricts, leçons globales au pré-mortem). **Geler** les versions au commit `2066580` comme `games/*_legacy/` = points de comparaison. 3 forges fraîches (collect_runner ×2, survival_arena ×1, builder Sonnet) mesurées sur instruments identiques.

## Mesures
| Version | LOC | logic | properties | solvability | mutation |
|---|---|---|---|---|---|
| collect_runner_legacy | 247 | ✓ | ✓ | ✓ | 100% (durci main) |
| collect_runner_r1 | 218 | ✓ | ✓ | ✓ | 80% |
| collect_runner_r2 | 197 | ✓ | ✓ | ✓ | 67% |
| survival_arena_legacy | 253 | ✓ | absent | absent | 49% |
| survival_arena_r1 | 281 | ✓ | ✓ | ✓ | 52% |

## Ce que l'audit établit
1. **Le skill durci est reproductible sur l'essentiel** : 3/3 forges fraîches jouables, solvables (bot gagne), logique séparée du rendu (0 DOM), déterministes. Pas une chance : trois builds indépendants convergent.
2. **La solvabilité obligatoire attrape de vrais défauts** : survival_arena_r1 a découvert+corrigé pendant le build un bug d'équilibrage (jeu ingagnable en campant) que le legacy avait laissé passer avec verdict « OK » sur mécaniques cœur non testées. C'est la validation empirique du durcissement.
3. **Trou non fermé** : les tests auto des forges sont 67-80% mutation-forts (variance), jamais 100%. Le build agent n'auto-mutation-teste pas. Le legacy à 100% l'est parce qu'un humain a tué ses survivants à la main cette session.

## Décision proposée (à ratifier Pierre — HumanGate)
Ajouter un **gate de mutation** à l'oracle de jeu (le build itère jusqu'à un score cible ou reporte/triage les survivants équivalents). Sans ça, « oracle vert » ≠ « tests rigoureux ». Non ratifié à ce jour.

## Artefacts
`games/collect_runner_r{1,2}/`, `games/survival_arena_r1/` (forges fraîches, non commitées) ; `games/*_legacy/` (figés) ; `scripts/forge/mutation.py` (+ durci backup `.mutbak`).
