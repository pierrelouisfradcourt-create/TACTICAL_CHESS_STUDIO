# TACTICAL CHESS — AI STARTER PACK V5
## Transmission-focused master context

This document is the standard entry point for any AI assistant working on Tactical Chess.

Its purpose is not only to explain the project.
Its purpose is to **transmit stable knowledge** without forcing the user to re-explain the project in every conversation.

The assistant must prioritize:
- continuity
- structural consistency
- compatibility with the existing studio
- knowledge transmission over speculative expansion

Responses should stay concise.
No visible code unless explicitly requested.

---

## 1. PROJECT IDENTITY

Project name: Tactical Chess

Tactical Chess is a **modular tactical strategy engine** derived from chess movement logic and expanded into a data-driven system architecture.

It is not only a game project.
It is also:
- a tactical engine
- a system design framework
- a procedural strategy generator
- a knowledge base for tactical mechanics

The long-term objective is to create a stable system capable of:
- generating tactical games
- testing balance through simulations
- supporting AI evaluation
- preserving design knowledge through structured documents and tools

---

## 2. MASTER ARCHITECTURE

Canonical architecture:

MASTER_BIBLE  
→ DATA_SCHEMA_MASTER  
→ SYSTEM_DATABASE  
→ ENGINE_CORE  
→ SIMULATION_SYSTEM  
→ AI_SYSTEM  
→ CLIENT_APP

Meaning of layers:

MASTER_BIBLE  
Authoritative design intent.

DATA_SCHEMA_MASTER  
Authoritative structural rules for data.

SYSTEM_DATABASE  
Operational data layer.

ENGINE_CORE  
Runtime tactical logic.

SIMULATION_SYSTEM  
Balance and systemic testing.

AI_SYSTEM  
Evaluation and strategic modeling.

CLIENT_APP  
Visualization and playtesting interface.

This order must always be respected.

---

## 3. STUDIO STRUCTURE

The project is organized inside:

TACTICAL_CHESS_STUDIO

Stable directory structure:

01_MASTER_BIBLE  
02_SYSTEM_DATABASE  
03_ENGINE_SYSTEM  
04_SIMULATION_SYSTEM  
05_AI_SYSTEM  
06_CLIENT_APP  
07_PROTOTYPES  
08_UPDATES_HISTORY  
09_ARCHIVE  
10_LOGS  
DOCS  
BACKUPS  
TOOLS

This structure must not be casually changed.

Automated executables must respect it.

---

## 4. TRANSMISSION RULE

Tactical Chess must be treated as a **knowledge transmission project**.

That means:

- important system knowledge must be written into documents
- updates must strengthen documentation, not weaken it
- executable tools must reduce clutter, not create clutter
- every major update should improve the project's transmissibility to another AI or developer

The project should become easier to understand over time.

---

## 5. MASTER BIBLE ROLE

The Master Bible contains:
- mechanics
- system philosophy
- tactical roles
- abilities
- terrain logic
- status concepts
- balance direction

The Master Bible is the **source of intent**.

If a system, update, or AI output conflicts with the Master Bible, the Master Bible wins.

---

## 6. DATA_SCHEMA_MASTER ROLE

The Data Schema Master defines:
- table families
- mandatory fields
- allowed relationships
- validation constraints
- naming conventions
- update rules for automated tools

The Data Schema Master is the **source of structural truth**.

No update tool should bypass it.

---

## 7. SYSTEM DATABASE ROLE

The System Database contains operational tactical content.

Main domains:

UNITS  
ABILITIES  
STATUS  
TERRAIN  
INTERACTIONS  
ECONOMY  
BALANCE  
AI

Typical dependency flow:

UNIT  
→ ABILITY  
→ STATUS  
→ TERRAIN  
→ INTERACTION MATRIX  
→ ENGINE RESOLUTION

The database is the practical engine payload.

---

## 8. UNIT MODEL

A unit is composed from:

movement pattern  
abilities  
stats  
traits

Movement patterns are derived from chess logic.
Examples may include:
- linear movement
- diagonal movement
- knight-style movement
- hybrid movement

Units must remain readable in tactical space.

---

## 9. ABILITY MODEL

Abilities are modular primitives.

Each ability is defined through structured fields such as:
- effect
- target
- range
- cost
- cooldown
- trigger relations
- interaction rules

Abilities can interact with:
- status systems
- terrain systems
- resource systems
- trigger systems

---

## 10. ENGINE CORE MODEL

The engine resolves play through a structured deterministic sequence.

Core loop concept:

SETUP  
→ TURN_START  
→ RESOURCE_REFRESH  
→ ACTION_PHASE  
→ EFFECT_RESOLUTION  
→ STATUS_UPDATE  
→ TURN_END  
→ VICTORY_CHECK

Trigger priority concept:

ENGINE  
→ ABILITY  
→ STATUS  
→ TERRAIN

This structure exists to preserve predictability and avoid uncontrolled trigger chaos.

---

## 11. SIMULATION ROLE

The simulation layer is used to test:
- balance
- resource flow
- strategic dominance
- interaction instability
- meta metrics

Simulation is not cosmetic.
It is a structural stabilizer.

---

## 12. AI ROLE

The AI layer is used for:
- position evaluation
- threat analysis
- strategic planning
- multi-turn reasoning
- systemic analysis

AI should support both gameplay and design diagnostics.

---

## 13. CLIENT ROLE

The client layer is used for:
- tactical visualization
- manual testing
- UX iteration
- quick validation of gameplay ideas

The client is not the source of truth.
It is a testing surface.

---

## 14. CURRENT PROJECT STATE

Estimated maturity:

Concept design: very high  
System design: high  
Project structure: stabilized  
Documentation quality: improving  
Engine formalization: medium  
Simulation integration: partial  
AI integration: partial  
Studio tooling: early to medium

This means the project is now beyond the raw idea stage.
The main challenge is no longer invention.
The main challenge is **consolidation and transmission**.

---

## 15. REMAINING SHADOW ZONES

Important zones still requiring clarification:

- exact game loop variants
- final action economy model
- full trigger priority matrix
- procedural scenario generator rules
- full database relationship mapping
- final update workflow for studio tools

These are not signs of failure.
They are the next formalization targets.

---

## 16. EXECUTABLE TOOL POLICY

Executable tools are part of the studio maintenance layer.

They must:
- maintain the project structure
- validate or assist updates
- centralize documents
- generate reports
- reduce manual friction

They must not:
- duplicate documents in multiple places without reason
- leave temporary packages in the studio root
- scatter docs across the root folder
- create clutter after execution

Correct behavior for tools:

Documents  
→ go to DOCS

Logs and reports  
→ go to 10_LOGS

Backups  
→ go to BACKUPS

Executables  
→ go to TOOLS

Temporary downloads or packages  
→ cleaned or archived, not left in root

The studio root should stay clean.

---

## 17. CLEAN STUDIO RULE

A clean Tactical Chess Studio root should contain mostly:
- folders
- current tools
- very few loose files

Preferred root policy:

Keep:
- folders
- live executables
- core top-level reference if truly necessary

Move:
- design docs to DOCS
- maintenance tools to TOOLS
- legacy bundles to 09_ARCHIVE or delete them
- logs to 10_LOGS

Delete or archive:
- old zip packages
- temporary update bundles
- duplicate loose documents after centralization

---

## 18. KNOWLEDGE TRANSMISSION PRIORITY

When helping with the project, the AI should prefer outputs that improve transmission quality.

Best outputs are:
- stable structural documents
- update procedures
- system maps
- schema definitions
- integration references
- summaries that reduce future re-explanation

Worst outputs are:
- disconnected ideas
- redundant restatements
- speculative systems with no structural anchoring
- clutter-producing updates

---

## 19. WORKING RULES FOR AI

When assisting Tactical Chess:

- respect the current studio architecture
- respect the Master Bible
- respect the Data Schema Master
- avoid producing clutter
- prefer durable documents over temporary explanations
- improve project transmissibility
- keep answers concise unless detailed documentation is explicitly requested

If the task concerns updates, always consider:
1. where the update belongs
2. how it affects structure
3. how it affects transmission of knowledge
4. whether it creates clutter or reduces it

---

## 20. STANDARD TASK FORMAT

Future tasks can be given like this:

Context: Tactical Chess project

Task: [objective]

Priority:
[transmission / structure / engine / database / AI / tools]

Output:
[document / report / studio update / structural analysis]

Constraints:
- respect studio structure
- respect Master Bible
- respect Data Schema Master
- do not create clutter

---

## 21. CANONICAL DOCUMENT SET

The project now relies on these major structural documents:

AI_STARTER_PACK  
DATA_SCHEMA_MASTER  
ENGINE_CORE_SPEC  
SYSTEM_INTEGRATION_MAP  
GAME_DESIGN_COMPILER  
MAJOR_UPDATE_PREPARATION  
EXECUTABLE_UPDATE_SYSTEM

They form the **knowledge spine** of the project.

Future work should reinforce this spine.

---

## 22. PRIMARY DIRECTION NOW

Current strategic direction:

- stabilize knowledge
- centralize documents
- clean studio outputs
- make updates safer
- improve transfer to future AIs
- reduce the need for repeated explanations

Tactical Chess should increasingly behave like a **self-describing studio project**.