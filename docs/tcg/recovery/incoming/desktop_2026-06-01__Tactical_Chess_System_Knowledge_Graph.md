
# TACTICAL CHESS — SYSTEM KNOWLEDGE GRAPH

Purpose:
Map relationships between mechanics, engine components, and databases so AI systems
can reason about the architecture.

## Core Layers

CANON
↓
ENGINE
↓
SYSTEM DATABASE
↓
SIMULATION / AI

## Core Entities

Piece
Ability
Status
Tile
Structure
Event
Action
Player
Board
MatchState

## Relationships

Piece -> Ability (uses)
Piece -> Status (affected_by)
Piece -> Tile (occupies)
Tile -> Terrain (modifier)
Ability -> Status (applies)
Ability -> Event (triggers)
Event -> Engine Resolver
Engine Resolver -> State Mutation
State Mutation -> Derived Maps
Derived Maps -> Pressure System
Pressure System -> Victory Conditions

## Tactical Subsystems

Traversal System
BRAWL System
King Pressure System
Fatigue System

## Derived Tactical Maps

ControlMap
TraversalThreatMap
RetaliationMap
BrawlExposureMap
KingEscapeMap
PressureBreakdownMap

## AI Evaluation Nodes

material_score
mobility_score
control_score
pressure_score
king_safety
attrition_score
fatigue_score

## Simulation Loop

generate → simulate → analyze → optimize

## Event Flow Graph

PlayerAction
 -> MoveValidation
 -> TraversalDamage
 -> CombatResolution
 -> Retaliation
 -> StatusTriggers
 -> BRAWL
 -> Cleanup
 -> PressureRecompute
 -> VictoryCheck

