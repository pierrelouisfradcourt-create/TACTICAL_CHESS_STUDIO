# SECTION 1 - — Extracted Knowledge
The encyclopedia establishes Tactical Chess as a deterministic tactical strategy project built on chess geometry, tactical combat, attrition systems, procedural generation, and AI-driven simulation balance, with a primary loop of generate → simulate → analyze → optimize. It already defines the core board size, piece roster, base stats, damage formulas, traversal damage, a King Pressure scaffold, a queue-driven event engine, and a simulation lab focused on self-play, meta discovery, balance validation, and strategy extraction. It also explicitly positions the encyclopedia as the canonical source and requires external AI systems to return one structured contribution report rather than rewriting canon. 


A. Structural knowledge that can strengthen the current system
1. Separate the engine into four numerical layers
The encyclopedia already has formulas and runtime objects, but the system will become more robust if every generated card is evaluated through four distinct layers:

Base stat budget

Attack geometry and targeting budget

Effect / status budget

Simulation risk budget

This is useful because many “balanced on paper” units become unhealthy only after geometry + traversal + status are combined in simulation. A fourth “risk budget” allows the generator to reject units that are mathematically fair in isolation but meta-warping in board contexts.

2. Distinguish three forms of power
Right now the encyclopedia has the ingredients for this, but not the vocabulary:

Local power: raw combat in one tile interaction

Positional power: control of lanes, diagonals, escapes, chokepoints

Systemic power: pressure, forced reactions, synergy with statuses, side mechanics

This distinction matters because rooks, bishops, and kings can have similar raw damage but radically different positional and systemic value. It improves both balance and AI evaluation.

3. Add “readability cost” as a generation parameter
The encyclopedia strongly implies a modular procedural system, but a real content pipeline benefits from one additional hidden metric:

Readability cost

Example:

single-target burn at range 2: low readability cost

diagonal piercing charm cone with terrain interaction: high readability cost

This allows the generator to cap not just power, but also cognitive load. It is one of the most important protections for a long-running franchise-like content model.

4. Convert the event engine into an explicit priority ladder
The queue model is good, but long-term stability improves if events are tagged with priority classes such as:

start-of-turn

movement

traversal

contact attack

retaliation

status application

death cleanup

promotion / spawn / replacement

end-of-turn cleanup

Without this, emergent order bugs will dominate simulation results more than actual design.

5. Treat King Pressure as a composite heuristic, not just a win condition
The current encyclopedia defines a formulaic structure for King Pressure. That is already a strong start. It can become much more useful if King Pressure is used in three places:

tactical evaluation

card generation risk scoring

post-match diagnostics

That makes it not just a rule but also a design and analytics instrument.

B. Combat and board-control knowledge worth integrating
6. Traversal should be treated as a first-class control system
The encyclopedia already defines traversalDamage = max(1, controllerATK - moverARM). That is powerful and unusual. 


A strong extension is to explicitly classify traversal controllers into:

line controllers

contact controllers

arrival-only controllers

terrain-mediated controllers

This enables clean differentiation such as:

bishop punishes crossing visible diagonals

knight only checks arrival square

sniper ignores allies but not walls

terrain hazard only punishes entry

That gives much richer content without multiplying rules arbitrarily.

7. Geometry should be treated as a combinatorial lattice
The encyclopedia lists pieces and formulas, but not a full geometry matrix. The project would benefit from formalizing attack shapes into a reusable lattice:

line

diagonal

cross

X

cone

blast

ring

lateral cleave

rear strike

piercing line

bounce chain

Each geometry should have:

threat width

visibility dependency

ally interaction mode

stop rule

traversal interaction class

That becomes the backbone of both generator logic and AI threat evaluation.

8. Retaliation and brawl need distinct mathematical identities
The encyclopedia defines retaliation and brawlDamage with similar formulas. 


A useful clarification is to make them conceptually different:

retaliation = reactive answer to direct engagement

brawl = contested occupation or support collapse in a dense exchange zone

This distinction gives more space for future effects like:

“cannot retaliate”

“reduced brawl damage”

“brawl support counts double”
without overloading one formula.

C. Simulation and AI-lab knowledge worth integrating
9. Add second-order metrics to the Simulation Lab
The current metrics are already strong: win rate, first player advantage, unit usage, meta stability, game entropy. 


To deepen the lab, add:

opening diversity index

threat map compression

pressure tempo slope

dead-card rate

match length variance

board lock frequency

non-interaction frequency

faction overlap score

generator rejection rate

These are especially useful for procedural systems, because many balance failures are not visible in win rate alone.

10. Build a three-stage simulation pipeline
A practical AI balancing workflow is:

Static legality pass

Heuristic board-value pass

Self-play simulation pass

This makes procedural generation cheaper and much more scalable than brute-forcing everything through full games.

11. Add meta clustering
Instead of only measuring “meta stability,” cluster generated sets by:

dominant geometry

dominant status family

average threat range

pressure pattern

board density

That lets you detect when two visually different factions are actually functionally the same.

