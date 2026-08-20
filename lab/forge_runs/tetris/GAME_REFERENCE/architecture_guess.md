# Architecture Guess

Grid Representation: Dense 2D array (10x20) recommended for V1. Tetromino: {type,position(x,y),rotation[0..3],local_coords[rotation][4]}. Rotation: Collision-refusal (V1, FOG-1) vs SRS wall-kick (Guideline). Piece Generator: Bag randomizer (guarantee) vs pure random (probability). Game State Machine: MENU,PLAY,PAUSED(opt),OVER. Line Clear: Scan,remove,compact O(200). Oracle: Bot places greedily, survives N pieces AND clears >=1 line.

Reusable Bricks: sys-grid-nav-m01(CAUTION: navigation!=placement), sys-rotation-simple(High), sys-bag-randomizer(High), sys-line-clear(Medium), event-bus-godot(High), state-machine-fsm(High).

V1 Modules: Grid, Tetromino, Rotation, Collision, Bag Randomizer, Line Clear, Game Loop, Renderer, Input Handler, Gravity Tick, Bot/Oracle.

V1 Omit: Wall-kick, Lock delay, Event bus, Audio, Advanced menus, Persistence.

Sources: https://tetris.wiki/Tetris_Guideline, https://harddrop.com/wiki/SRS, https://puyonexus.com/wiki/Puyo_Puyo