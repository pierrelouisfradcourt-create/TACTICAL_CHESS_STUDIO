# Chess TCG Open Decisions

status: DOCUMENTED_ONLY

## HumanGate Required

Every item in this file requires explicit HumanGate before implementation.

## Product Identity

| decision | status | options |
|---|---|---|
| product mode | BLOCKED | Magic Mode branch, standalone product, or canon successor |
| board size | BLOCKED | 8x8 main candidate vs 5x5 prototype history |
| victory mode | BLOCKED | king kill, pressure collapse, strict chess mate, or mode-specific variants |
| TCG depth | BLOCKED | light card layer vs full deck/hand/resource economy |

## Rule Conflicts

| decision | status | conflict |
|---|---|---|
| damage floor | BLOCKED | `max(1, ATK - ARM)` vs `max(0, incomingDamage - armor)` |
| BRAWL formula | BLOCKED | several variants exist |
| pressure formula | BLOCKED | lab fatigue/divisor variants vs design pressure sum |
| control effects | BLOCKED | hard control needs duration, stacking, and readability caps |

## Missing Canon

| missing item | status |
|---|---|
| deck size | UNKNOWN |
| hand size | UNKNOWN |
| resource cadence | UNKNOWN |
| mulligan rules | UNKNOWN |
| draw rules | UNKNOWN |
| card copy limits | UNKNOWN |
| targeting schema | UNKNOWN |
| terrain timing | UNKNOWN |
| summon cleanup semantics | UNKNOWN |
| faction identity list | UNKNOWN |

## Source Cleanup

| task | status | notes |
|---|---|---|
| encoding cleanup | BLOCKED | old files show mojibake / broken display. |
| duplicate review | BLOCKED | multiple formula and bible variants exist. |
| mega bible read review | BLOCKED | old local reported read-denied; current copy exists but not canonized. |
| Crown v1 review | BLOCKED | current copy exists but role unknown. |
| source canonization packet | BLOCKED | required before treating any external file as truth. |

