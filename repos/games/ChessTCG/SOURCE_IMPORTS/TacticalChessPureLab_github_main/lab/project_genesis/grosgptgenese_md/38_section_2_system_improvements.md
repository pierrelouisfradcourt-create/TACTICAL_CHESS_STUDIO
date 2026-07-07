# SECTION 2 - — System Improvements
A. Concrete upgrades to the design
1. Formalize a full card-generation vector
Recommended canonical generator schema:

piece_type

role_tag

rarity

stat_budget

hp

atk

arm

move_class

attack_geometry

range

traversal_mode

ally_interaction_mode

status_payload

passive_tag

trigger_tag

pressure_contribution

readability_cost

simulation_risk

This is the single most useful upgrade to procedural consistency.

2. Split statuses into four numeric tiers
Recommended status taxonomy:

Tier 1 — Attrition

burn

poison

bleed

corrosion

Tier 2 — Tempo

weakness

armor break

slow

mark

Tier 3 — Space control

root

shove

pull

silence

Tier 4 — Hard disruption

freeze

disarm

fear

charm

stun

The generator should rarely allow more than one Tier 4 payload per card and should heavily tax Tier 4 + multi-target combinations.

3. Add “board denial value” to pieces and spells
Many units are not overpowered because of damage but because they invalidate movement. This should be modeled explicitly.

Example formula concept:

denial_value = threatened_tiles × persistence × visibility_reliability × movement_constraint_factor

This is particularly important for bishops, rooks, terrain effects, and king pressure.

4. Add faction identity budgets
Each faction should have numerical caps such as:

max average range

max hard-control density

max summon density

max global-effect density

max pressure acceleration

max traversal punishment density

This stops procedural sets from drifting into each other.

5. Define rarity as complexity permission, not just power permission
Recommended use of rarity:

Common

low complexity

one main job

low board-text

Uncommon

one twist

stronger synergy hooks

Rare

stronger geometry or stronger system interaction

Mythic / Legendary if ever introduced

rule-bending, not just bigger numbers

This prevents “rare = same card but overtuned,” which is bad for long-term health.

6. Add an anti-degeneracy ban matrix to generation
Before simulation, reject cards or combinations that fit patterns like:

hard control + large area

hard control + long line

piercing + strong status + long range

king-pressure acceleration + forced movement + support denial

summon engine + revival + attrition immunity

A pattern-based ban layer is more scalable than hand-patching every bad outcome.

B. Engine improvements
7. Convert Tile into a terrain-capable object
The runtime object list already includes Tile. Extend it to support:

terrain tags

visibility modifiers

traversal hazard tags

occupancy state

aura occupancy effects

This prepares the engine for:

bushes

walls

hazard tiles

temporary terrain from spells

without rewriting movement later.

8. Give Event explicit provenance
Every event should store:

source piece

source player

source system

source tile

target tile(s)

generated_by event id

This is invaluable for debugging recursive or emergent chains in procedural content.

9. Add RuleSet or MatchConfig
The current runtime list is good, but a modular tactical game benefits enormously from one extra top-level object:

RuleSet or MatchConfig

It should define:

board variant

legal factions

legal generators

status package

promotion model

king pressure model

simulation profile

That makes set testing and franchise expansion dramatically easier.

