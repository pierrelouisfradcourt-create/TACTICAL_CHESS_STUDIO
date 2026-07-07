# Chess TCG Card And Ability Taxonomy

status: DOCUMENTED_ONLY

## Authority Boundary

This is a taxonomy candidate. It does not define executable schemas, create cards, or authorize generation.

## Families

| family | status | candidate meaning | constraints |
|---|---|---|---|
| triggered | DOCUMENTED_ONLY | resolves from events such as on_enter, on_hit, on_death, start_turn, end_turn, summon, brawl, counterattack | deterministic event order required |
| active | DOCUMENTED_ONLY | declared action branch: move, attack, cast ability/spell, summon, fusion, pass | must remain board-readable |
| passive | DOCUMENTED_ONLY | static modifiers, pressure thresholds, BRAWL modifiers, local support effects | avoid invisible complexity |
| aura | DOCUMENTED_ONLY | local radius effects, preferably adjacent or range 2 max | visible, low complexity, capped stacking |
| trap | DOCUMENTED_ONLY | placed board effects, zones, terrain mutation candidates | later-stage unless core rules are stable |
| terrain | DOCUMENTED_ONLY | tile, terrain, or zone modifier | after movement/control/king/BRAWL are stable |
| summon | DOCUMENTED_ONLY | creates units, possibly linked to invoker | cleanup semantics required if invoker dies |
| buff/debuff | DOCUMENTED_ONLY | ATK/ARM/status modifications | pressure interaction must be explicit |
| movement | DOCUMENTED_ONLY | chess movement plus push, pull, teleport, dash candidates | legality and targeting schema required |
| economy | DOCUMENTED_ONLY | resource, draw, discard, cost modification, deck/hand/discard loop | deck/resource rules unresolved |
| control | DOCUMENTED_ONLY | root, silence, disarm, freeze, stun, charm | hard control capped, rare, and downgraded when unreadable |

## Event Model Candidate

Status: DOCUMENTED_ONLY

Candidate triggers include:

- on_enter
- on_exit
- on_hit
- on_death
- start_turn
- end_turn
- summon
- brawl
- counterattack

Required future rule:

- every trigger must have stable deterministic ordering
- every trigger must expose source, target, timing, and cancellation behavior
- every hard-control effect must have duration and stacking rules

