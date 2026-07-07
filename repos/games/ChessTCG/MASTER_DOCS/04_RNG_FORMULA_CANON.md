# Chess TCG RNG Formula Canon Candidate

status: DOCUMENTED_ONLY

## Authority Boundary

This document records formula candidates from the knowledge drain. It does not implement RNG, generate cards, create datasets, run simulations, or authorize balance claims.

## Piece Budgets

Source candidate: `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\archive\01_MASTER_BIBLE\game desi.txt`

| piece | budget | status |
|---|---:|---|
| Pion | 4 | DOCUMENTED_ONLY |
| Cavalier | 6 | DOCUMENTED_ONLY |
| Fou | 6 | DOCUMENTED_ONLY |
| Tour | 7 | DOCUMENTED_ONLY |
| Reine | 8 | DOCUMENTED_ONLY |
| Roi | 9 | DOCUMENTED_ONLY |

## Rarity And Variance

| item | candidate value | status |
|---|---|---|
| common | 60% | DOCUMENTED_ONLY |
| uncommon | 30% | DOCUMENTED_ONLY |
| rare | 10%, budget +1 | DOCUMENTED_ONLY |
| weak variance | 20% | DOCUMENTED_ONLY |
| average variance | 60% | DOCUMENTED_ONLY |
| strong variance | 20% | DOCUMENTED_ONLY |

## Stat Costs

| stat | value | cost |
|---|---:|---:|
| HP | 4 | 0 |
| HP | 5 | 1 |
| HP | 6 | 2 |
| HP | 7 | 3 |
| HP | 8 | 4 |
| HP | 9 | 5 |
| ATK | 1 | 0 |
| ATK | 2 | 1 |
| ATK | 3 | 2 |
| ATK | 4 | 3 |
| ARM | 0 | 0 |
| ARM | 1 | 2 |
| ARM | 2 | 4 |

## Projection And Effect Costs

| item | cost |
|---|---:|
| adjacent | 0 |
| line 3 | 1 |
| diagonal | 1 |
| cone | 1 |
| zone | 2 |
| full line | 3 |
| burn | 1 |
| poison | 1 |
| weakness | 1 |
| armor break | 1 |
| root | 2 |
| freeze | 2 |
| disarm | 2 |
| fear | 2 |
| charm | 3 |
| range 1 | 0 |
| range 2 | 1 |
| range 3 | 2 |
| range 4+ | 3 |
| one target | 0 |
| two targets | 1 |
| line target | 2 |
| zone target | 3 |

## Anti-Broken Constraints

Status: DOCUMENTED_ONLY

- forbid `freeze + full line`
- forbid `charm + zone`
- forbid `stun + range > 3`
- forbid `double major debuff`

## Repair Order

Status: DOCUMENTED_ONLY

1. downgrade range
2. downgrade geometry
3. downgrade secondary effect
4. downgrade ATK
5. downgrade HP
6. downgrade ARM
7. add restriction
8. reject

## Reject Conditions

Status: DOCUMENTED_ONLY

- forbidden combo remains
- budget remains over target
- readability is low
- faction identity is broken
- draft health risk is high
- abuse score is suspect
- card answers too many problems at once

## Known Formula Conflicts

| formula area | status | conflict |
|---|---|---|
| direct damage | DOCUMENTED_ONLY / CONFLICT | `max(1, attackerATK - defenderARM)` vs `max(0, incomingDamage - armor)` |
| BRAWL | DOCUMENTED_ONLY / CONFLICT | `max(1, ATK - ARM)` vs `max(1, finalAttackValue - 1)` vs generic `Damage amount N` |
| pressure | DOCUMENTED_ONLY / CONFLICT | lab divisor/fatigue variants vs design pressure sum variants |

