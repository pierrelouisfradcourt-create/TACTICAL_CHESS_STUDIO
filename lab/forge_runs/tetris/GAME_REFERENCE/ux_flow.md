# UX Flow

Tetris Guideline: HUD=Playfield(10x20)+Next+Score+Lines+Level+Ghost(opt). States=START->PLAY<-(pause)->PAUSE->OVER. Feedback=piece fall(gravity),line flash(clear),score bump,audio chime,input instant. Sources: https://harddrop.com/wiki/Game_interface

NES Tetris: HUD=Playfield(10x20)+Next+Score+Lines+Level+Type. States=TITLE->MODE_SELECT->LEVEL_SELECT->PLAY->OVER->RESULT. Feedback=piece fall(no tweening),line flash(grid),score,beep,no soft-drop. Sources: http://www.world-of-nintendo.com/manuals/nes/tetris.shtml

Puyo Puyo: Solo: Playfield(6x12)+Next+Score+Chain. Versus: Dual 6x12+Garbage queue. States=TITLE->MODE->PLAY->RESULT. Feedback=pair fall(smooth),match flash,cascade,garbage visual,audio escalates. Sources: https://puyonexus.com/wiki/Puyo_Puyo

V1 UX: Minimal=Playfield(10x20 center)+Next(right)+Lines(primary)+Score(secondary). States=MENU->PLAY->OVER. Feedback=piece move(instant),line flash(0.5s),counter increment,soft-drop visual,game-over overlay. Optional: audio.