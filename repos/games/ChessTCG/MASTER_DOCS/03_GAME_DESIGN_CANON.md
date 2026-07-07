# Chess TCG Game Design Canon Candidate

status: DOCUMENTED_ONLY

## Authority Boundary

This document is a canon candidate only. It does not implement Chess TCG, change TacticalChessPureLab, create tests, create datasets, or authorize training, benchmarks, Chess960, ActionMask authority, DecisionController activation, or neural authority.

## Project Identity

| field | value |
|---|---|
| name | Chess TCG |
| genre | tactical board/card game candidate |
| source posture | docs-only reconstruction from passive design archives |
| runtime status | NOT_FOUND |
| claim_verdict | NO_CLAIM_ALLOWED |

## Product Promise

Chess TCG is a board-first tactical card game candidate.

The board remains the primary truth. Cards, resources, statuses, terrain, summons, and effects enrich spatial chess-readable tactics without replacing board clarity.

## Non-Goals

- Not the current TacticalChessPureLab runtime.
- Not proof of an implemented game.
- Not a neural-authority game logic system.
- Not dataset, training, benchmark, or Elo work.
- Not a Chess960 or DecisionController activation path.

## Canon Candidate Rules

| surface | status | candidate rule | source posture | conflicts |
|---|---|---|---|---|
| board/grid | DOCUMENTED_ONLY | 8x8 chess-like board is the primary candidate. | high-confidence drain from `extract V2.txt` | older handoff mentions a 5x5 prototype. |
| pieces/units | DOCUMENTED_ONLY | chess movement patterns plus HP/ATK/ARM are candidate unit foundations. | high-confidence drain | exact stats are not final. |
| cards | DOCUMENTED_ONLY | cards should be data definitions, not hardcoded runtime branches. | architecture roadmap candidate | not active implementation proof. |
| deck/hand/resource | DOCUMENTED_ONLY | future modules: Deck, Hand, DiscardPile, ResourceSystem. | architecture roadmap candidate | deck size, hand size, resource cadence missing. |
| turn structure | DOCUMENTED_ONLY | action, traversal, combat, cleanup, BRAWL, pressure, victory. | high-confidence drain | formulas differ across sources. |
| combat | DOCUMENTED_ONLY | damage formulas are unresolved. | mixed formula sources | `max(1, ATK - ARM)` conflicts with `max(0, incomingDamage - armor)`. |
| targeting | DOCUMENTED_ONLY | range, geometry, and filter-driven targeting. | high-confidence drain | no final target schema. |
| abilities | DOCUMENTED_ONLY | active, passive, triggered, deterministic event queue. | high-confidence drain | ability archive is too broad to be canon alone. |
| statuses | DOCUMENTED_ONLY | burn, poison, bleed, weakness, armor_break, regen, root, silence, disarm, freeze, fear, stun, charm. | high-confidence drain | pressure interactions unresolved. |
| terrain/zones | DOCUMENTED_ONLY | later-stage terrain and zone effects. | medium confidence | terrain should not be core first. |
| RNG/budget | DOCUMENTED_ONLY | per-piece/card budget with stat/effect/range/multitarget taxes. | high-confidence drain | needs HumanGate canonization. |
| win/loss | DOCUMENTED_ONLY | king kill, pressure collapse, or strict chess mate by mode. | medium confidence | pressure and victory mode unresolved. |

## Architecture Placement

| class | status | rule |
|---|---|---|
| active runtime code | NOT_FOUND | no Chess TCG runtime exists. |
| tests | NOT_FOUND | no Chess TCG tests exist. |
| outputs/runtime artifacts | NOT_FOUND | no Chess TCG artifacts exist. |
| canonical docs | DOCUMENTED_ONLY | this file is a local canon candidate only. |
| roadmap/docs-only | DOCUMENTED_ONLY | runtime planning remains blocked without explicit request. |
| inference | PASSIVE | reconstruction estimates are non-authoritative. |

