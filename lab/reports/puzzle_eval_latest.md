# Puzzle Eval

- schema_version: 2
- agent: hybrid
- total: 200
- solved: 5 (2.50%)
- partial: 24 (12.00%)
- failed: 171 (85.50%)

## By Theme

| theme | total | solved | partial | failed | solved_pct | partial_pct | failed_pct |
|---|---:|---:|---:|---:|---:|---:|---:|
| discovered_attack | 24 | 0 | 2 | 22 | 0.00 | 8.33 | 91.67 |
| fork | 50 | 2 | 4 | 44 | 4.00 | 8.00 | 88.00 |
| mate_in_2 | 96 | 2 | 11 | 83 | 2.08 | 11.46 | 86.46 |
| pin | 24 | 1 | 6 | 17 | 4.17 | 25.00 | 70.83 |
| promotion | 2 | 0 | 1 | 1 | 0.00 | 50.00 | 50.00 |
| skewer | 4 | 0 | 0 | 4 | 0.00 | 0.00 | 100.00 |

## Cases

| case_id | theme | selected_move | best_moves | solved | partial | failed | reason | used_search | completed_depth | score_before | score_after | delta |\n|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n| lichess_000Pw | fork | e5h8 | d4e2,e2c3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -690 | -778 | -88 |
| lichess_000Zo | mate_in_2 | e8b8 | e8e1,e1f1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -950 | -1016 | -66 |
| lichess_000hf | mate_in_2 | e2e1 | e2e6,e6f7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -318 | -334 | -16 |
| lichess_001m3 | skewer | c6a8 | h8h1,h1a1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -1111 | -1155 | -44 |
| lichess_002IE | fork | f3g1 | d4e5,e5f6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -374 | -386 | -12 |
| lichess_002KJ | discovered_attack | f3h2 | f3e5,e2g4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -54 | -70 | -16 |
| lichess_002Tf | fork | e7d8 | e7b4,b4b2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -176 | -178 | -2 |
| lichess_003S3 | pin | f3h3 | g5e6,e6c7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 8 | -10 | -18 |
| lichess_003Tx | mate_in_2 | c8a8 | f3d2,c8c1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -918 | -992 | -74 |
| lichess_003nQ | pin | g8b8 | f5g3,g8g3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -114 | -156 | -42 |
| lichess_004mT | skewer | f8g8 | f8a8,a8f3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 5 | -1344 | -1376 | -32 |
| lichess_005Bm | mate_in_2 | f6f2 | h4g6,f6h8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -802 | -862 | -60 |
| lichess_006pe | mate_in_2 | d1g1 | e7f5,f6g7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -190 | -264 | -74 |
| lichess_00734 | pin | c2b2 | d3f5,f5g6 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | 84 | 88 | 4 |
| lichess_007ku | mate_in_2 | f4h2 | h8h5,f4g5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -694 | -722 | -28 |
| lichess_008D5 | fork | e1f2 | d1a4,a4b4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -36 | -40 | -4 |
| lichess_009BH | mate_in_2 | e6g4 | e6h6,h6g7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -56 | -112 | -56 |
| lichess_009FS | discovered_attack | d8c8 | e3c4,e8e1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -332 | -350 | -18 |
| lichess_009wR | mate_in_2 | f2g2 | f2f1,f1g1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -313 | -359 | -46 |
| lichess_009zR | mate_in_2 | c2b1 | d2f3,c2g2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -146 | -170 | -24 |
| lichess_00AFG | discovered_attack | d1d4 | f5h6,h5c5 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | -70 | -42 | 28 |
| lichess_00Bg4 | mate_in_2 | d1c1 | a5d8,d1d8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -74 | -124 | -50 |
| lichess_00BnG | fork | g6h8 | d7e7,g6e7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | 28 | 0 | -28 |
| lichess_00Bul | discovered_attack | e2d1 | e5c6,c6d8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -234 | -248 | -14 |
| lichess_00C8e | pin | a2b1 | a2b1,b2c1 | 1 | 0 | 0 |  | 1 | 5 | -1130 | -902 | 228 |
| lichess_00Cwz | mate_in_2 | b8a8 | b8b1,a3c2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -376 | -400 | -24 |
| lichess_00Dke | discovered_attack | c7h2 | c4f7,c7c2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -116 | -168 | -52 |
| lichess_00Dt6 | pin | g5h6 | f5h4,h4f3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | 38 | 10 | -28 |
| lichess_00EEp | mate_in_2 | f4h2 | f4f8,f1f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -108 | -144 | -36 |
| lichess_00EXS | discovered_attack | e8f8 | f2e3,h2e2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 78 | 72 | -6 |
| lichess_00F5G | pin | f5h4 | f5h6,h6f7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -406 | -418 | -12 |
| lichess_00HLP | fork | e7e8 | d4e2,e2f4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 10 | -14 | -24 |
| lichess_00HZC | mate_in_2 | d3b1 | d3h7,h6f6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -598 | -642 | -44 |
| lichess_00HzX | fork | e8f8 | c2c1,c1h6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -414 | -480 | -66 |
| lichess_00IUW | mate_in_2 | h5h6 | h3g3,h5h1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -456 | -466 | -10 |
| lichess_00IqI | mate_in_2 | d2c1 | d2d8,d1d8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -468 | -486 | -18 |
| lichess_00KHR | mate_in_2 | e1h1 | g6h4,e1h1 | 1 | 0 | 0 |  | 1 | 4 | -782 | -638 | 144 |
| lichess_00KYU | mate_in_2 | g3h2 | g3d6,d6e7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -478 | -530 | -52 |
| lichess_00KhM | mate_in_2 | d5d4 | d5f7,d2d8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -387 | -399 | -12 |
| lichess_00L4x | promotion | d3f1 | e7e8q,e1e8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 178 | 140 | -38 |
| lichess_00LNH | pin | e6c8 | e6f5,g6f5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -220 | -228 | -8 |
| lichess_00Lh9 | mate_in_2 | e8h8 | e2g3,e8e1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -1162 | -1182 | -20 |
| lichess_00MFe | mate_in_2 | f1g1 | h5e8,e8f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 5 | -1163 | -1205 | -42 |
| lichess_00MIY | mate_in_2 | c2c7 | h6c1,c1d1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -1700 | -1708 | -8 |
| lichess_00Myw | fork | f4h2 | f4f6,f6h6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 116 | 90 | -26 |
| lichess_00NUS | mate_in_2 | g2b2 | f5c2,c2b2 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 3 | -382 | -232 | 150 |
| lichess_00NUc | mate_in_2 | b3b4 | b3h3,f2h2 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 2 | 74 | 78 | 4 |
| lichess_00Ngg | fork | f6g8 | d8a5,a5b5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -12 | -26 | -14 |
| lichess_00O37 | discovered_attack | d2e1 | e2a6,d2f2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -228 | -232 | -4 |
| lichess_00O8m | fork | c2a2 | d4d5,d5c6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 8 | -10 | -18 |
| lichess_00P6j | mate_in_2 | e4b1 | e4e8,e8f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -186 | -228 | -42 |
| lichess_00Pu5 | mate_in_2 | b4a4 | e1e8,b4f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -130 | -154 | -24 |
| lichess_00PvX | mate_in_2 | d5e6 | d5c5,a7c6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 6 | -1321 | -1335 | -14 |
| lichess_00Q4v | skewer | a6a8 | e7h4,h4e1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -540 | -548 | -8 |
| lichess_00QCe | fork | b1a1 | c5a6,a6c7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -734 | -738 | -4 |
| lichess_00QZ3 | mate_in_2 | d1c1 | d1f3,f3f7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -372 | -392 | -20 |
| lichess_00QnO | fork | g6h7 | g6e4,f8f4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -726 | -754 | -28 |
| lichess_00ROK | mate_in_2 | f5h5 | f5h7,g4g8 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 3 | -1813 | -1557 | 256 |
| lichess_00Rvy | fork | c5a3 | c5d5,d5d3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -371 | -415 | -44 |
| lichess_00T4i | discovered_attack | d7e8 | d7h3,a7f7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -150 | -178 | -28 |
| lichess_00TRo | mate_in_2 | f2h2 | h5e8,f2f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -1222 | -1254 | -32 |
| lichess_00Tll | fork | f8g8 | f2g3,g3c7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -566 | -624 | -58 |
| lichess_00Tya | mate_in_2 | f3h1 | f3f1,f8f1 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | 42 | 214 | 172 |
| lichess_00Ueq | mate_in_2 | d3b1 | h1h8,g6h7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -98 | -122 | -24 |
| lichess_00Us6 | mate_in_2 | e2d1 | e2g4,g4g7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -112 | -128 | -16 |
| lichess_00Uwn | fork | d1e1 | e3g5,g2g3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -76 | -118 | -42 |
| lichess_00VDN | discovered_attack | g7h8 | d5e4,d7d4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 116 | 112 | -4 |
| lichess_00Vdx | mate_in_2 | c6b8 | g8g2,g2g4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -1010 | -1028 | -18 |
| lichess_00WJN | skewer | f8h8 | f8a3,a3g3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 5 | -100 | -132 | -32 |
| lichess_00WqT | mate_in_2 | e3c1 | d3e2,e3g5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -1076 | -1096 | -20 |
| lichess_00YbZ | mate_in_2 | e5g5 | f4h4,e5e1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -980 | -1020 | -40 |
| lichess_00Z8S | fork | g6h5 | h3g1,g1f3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | 110 | 106 | -4 |
| lichess_00ZEc | mate_in_2 | d3b3 | g6g7,d3h7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -242 | -274 | -32 |
| lichess_00ZeT | pin | b8a8 | c4b5,b8b5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -642 | -658 | -16 |
| lichess_00a98 | mate_in_2 | f6h8 | f6f3,f3h1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -458 | -534 | -76 |
| lichess_00aDl | mate_in_2 | c4a5 | a1b1,a2a1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -576 | -616 | -40 |
| lichess_00aEe | fork | a2a1 | d4e2,e2c3 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | -328 | -184 | 144 |
| lichess_00aOF | fork | g6f7 | a5c5,c5e7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -26 | -30 | -4 |
| lichess_00abm | fork | f3h2 | d1a4,a4b4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -54 | -86 | -32 |
| lichess_00asK | mate_in_2 | c8a8 | b3d1,d1e1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -1336 | -1360 | -24 |
| lichess_00bou | mate_in_2 | e1f1 | e2h5,e1e8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -496 | -532 | -36 |
| lichess_00bri | fork | g2h1 | f3f6,d1c1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -290 | -302 | -12 |
| lichess_00csH | mate_in_2 | c3a2 | e2h5,h5g6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -508 | -532 | -24 |
| lichess_00dUW | fork | c7b8 | d4f3,f3d2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -42 | -54 | -12 |
| lichess_00dnp | fork | a7a2 | a7a2,a2b3 | 1 | 0 | 0 |  | 1 | 4 | -414 | -266 | 148 |
| lichess_00e63 | discovered_attack | d3f1 | d3b3,d1d4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -2 | -36 | -34 |
| lichess_00eWz | pin | g7h8 | e5e6,g7d4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -344 | -358 | -14 |
| lichess_00f1Y | discovered_attack | c1a1 | c5e6,c1c8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -294 | -344 | -50 |
| lichess_00ft3 | fork | c6f6 | e5d3,d3b2 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 3 | -734 | -672 | 62 |
| lichess_00gPT | mate_in_2 | e8f8 | e8e1,e1d1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -1588 | -1624 | -36 |
| lichess_00gcY | fork | d5a8 | d5d6,d6a3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 138 | 90 | -48 |
| lichess_00h41 | fork | e8a8 | h6g6,e8g6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -564 | -616 | -52 |
| lichess_00h8Z | mate_in_2 | h2g3 | c7c8,c8d8 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | -1536 | -972 | 564 |
| lichess_00iAF | fork | b7a6 | b7b8,b8e5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -66 | -74 | -8 |
| lichess_00isY | fork | d1b1 | d1a4,a4b4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -116 | -140 | -24 |
| lichess_00jCD | discovered_attack | d6d8 | f6g4,e7g5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -96 | -124 | -28 |
| lichess_00jPH | fork | b7a8 | d4e2,e2c3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -794 | -804 | -10 |
| lichess_00k2Z | mate_in_2 | d4h8 | d4c3,f8f1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -635 | -679 | -44 |
| lichess_00kZF | discovered_attack | d3f1 | e4e1,e1a1 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 3 | -822 | -614 | 208 |
| lichess_00lIV | discovered_attack | e7f8 | e7b4,e8e5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -168 | -172 | -4 |
| lichess_00mFI | mate_in_2 | e3d1 | f1f8,h6f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 80 | 52 | -28 |
| lichess_00mg9 | mate_in_2 | e7f8 | c7c2,c2c1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 5 | -212 | -228 | -16 |
| lichess_00nHy | discovered_attack | d8e8 | e5f3,g7d4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -32 | -46 | -14 |
| lichess_00o3m | pin | c1a1 | h3g5,f4g5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -120 | -130 | -10 |
| lichess_00o5f | pin | c7b7 | h5f6,f6g8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 5 | -399 | -423 | -24 |
| lichess_00oQO | fork | f4h5 | f4e2,e4e2 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | -104 | 92 | 196 |
| lichess_00oXF | pin | d1e1 | c2f5,e2d1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -278 | -318 | -40 |
| lichess_00ouE | mate_in_2 | c2h7 | c2b1,c7c1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 5 | 52 | 8 | -44 |
| lichess_00pER | mate_in_2 | b3a2 | b3g8,g5f7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -744 | -764 | -20 |
| lichess_00pVS | fork | c3b1 | d1h5,h5h3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -200 | -220 | -20 |
| lichess_00qX2 | mate_in_2 | d1b1 | c7h7,a7f7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | 166 | 100 | -66 |
| lichess_00qk4 | mate_in_2 | d8b8 | b4c2,d8d1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -618 | -670 | -52 |
| lichess_00r1D | mate_in_2 | d6a6 | d6d8,d1d8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -406 | -446 | -40 |
| lichess_00rKj | mate_in_2 | e1f1 | f3f7,e1e8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -356 | -402 | -46 |
| lichess_00rNc | mate_in_2 | b8a8 | b2a2,b8b2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -304 | -316 | -12 |
| lichess_00rwh | mate_in_2 | g5h6 | a3g3,g5e3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -412 | -432 | -20 |
| lichess_00rx9 | discovered_attack | f3g1 | g7e6,g5g8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -164 | -184 | -20 |
| lichess_00sHx | mate_in_2 | f7h5 | a2e6,f7f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -742 | -752 | -10 |
| lichess_00tB9 | pin | b8b7 | c5b3,b3d2 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 2 | -594 | -200 | 394 |
| lichess_00tTz | pin | d6b8 | h5g3,d6g3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -448 | -492 | -44 |
| lichess_00tgU | mate_in_2 | d3b1 | d5e7,g6h7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -350 | -376 | -26 |
| lichess_00umX | pin | f5h7 | f5f3,c8d7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -778 | -802 | -24 |
| lichess_00unD | fork | d1c1 | d1g4,g4g2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -74 | -88 | -14 |
| lichess_00voi | mate_in_2 | h6h5 | h3h4,h7f7 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | 134 | 326 | 192 |
| lichess_00wPZ | mate_in_2 | d4b6 | f2g1,e4f2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -84 | -100 | -16 |
| lichess_00wft | mate_in_2 | d3h7 | a5d2,d3d2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -412 | -440 | -28 |
| lichess_00xWV | fork | g4h4 | g4e6,e6e7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -617 | -637 | -20 |
| lichess_00xsd | fork | f6g8 | d8a5,a5g5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -46 | -62 | -16 |
| lichess_00y9H | mate_in_2 | d3b1 | e4f6,h3h7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -378 | -410 | -32 |
| lichess_00yDE | mate_in_2 | e7f7 | c4e6,e7f8 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | -270 | -102 | 168 |
| lichess_00yLn | fork | e6g5 | e6g5,g5f3 | 1 | 0 | 0 |  | 1 | 4 | -1037 | -1065 | -28 |
| lichess_00zQz | mate_in_2 | e8a8 | g4h3,e8e1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -316 | -370 | -54 |
| lichess_00zeF | mate_in_2 | c1b1 | c1c8,c8a8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -490 | -538 | -48 |
| lichess_00zkP | mate_in_2 | f7f8 | e2e1,a1e1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -300 | -320 | -20 |
| lichess_010wy | fork | f5h3 | c3d5,d5e3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -26 | -46 | -20 |
| lichess_011J1 | discovered_attack | d3b3 | d3g3,f5b1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -345 | -417 | -72 |
| lichess_011JG | pin | c8f8 | a4a2,a2b3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -506 | -540 | -34 |
| lichess_0123H | mate_in_2 | f7g8 | f7g8,g5f7 | 1 | 0 | 0 |  | 1 | 3 | -392 | -208 | 184 |
| lichess_01243 | fork | g7h6 | d7b7,b7e4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -544 | -552 | -8 |
| lichess_01273 | pin | g6g7 | g6h6,e2e3 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 5 | -488 | -260 | 228 |
| lichess_012Fq | pin | g4h4 | g4g3,g3h3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -396 | -408 | -12 |
| lichess_012QY | discovered_attack | b1a1 | d4e6,d1d8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -46 | -68 | -22 |
| lichess_013h1 | fork | e1f2 | d1a4,a4b4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -258 | -260 | -2 |
| lichess_0147O | pin | a6b7 | a6c4,c4d5 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 5 | -146 | 120 | 266 |
| lichess_014QG | mate_in_2 | f3g3 | f2g1,f3f1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | 34 | 24 | -10 |
| lichess_014vH | fork | b6a6 | b6d4,d4e5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -94 | -102 | -8 |
| lichess_015Di | mate_in_2 | e2f1 | e5c6,e2e8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -292 | -312 | -20 |
| lichess_015fL | mate_in_2 | c3b4 | h2h1,h1f1 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 5 | -849 | -475 | 374 |
| lichess_016BD | mate_in_2 | d1b1 | d1h5,h5f7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -38 | -64 | -26 |
| lichess_017Bw | fork | g5h4 | e2e4,b2c3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 4 | -12 | -16 |
| lichess_0181c | fork | e1f1 | e1e8,e8c8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -390 | -416 | -26 |
| lichess_018Bb | mate_in_2 | a6f1 | a6a7,a7c7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -478 | -496 | -18 |
| lichess_018ZF | fork | d6a3 | d6e6,e6c8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -199 | -219 | -20 |
| lichess_019Oa | discovered_attack | d8h8 | d5f6,d8d2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -40 | -84 | -44 |
| lichess_019cy | fork | d4a7 | d4b2,b2c1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -182 | -228 | -46 |
| lichess_019se | fork | c5a6 | c5b3,b3c1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -476 | -516 | -40 |
| lichess_01Bcd | fork | e1f1 | d5f6,f6h5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -344 | -354 | -10 |
| lichess_01Btz | pin | b6a7 | b6b3,e8f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 34 | 22 | -12 |
| lichess_01CAb | mate_in_2 | d7c7 | d7f5,f5e4 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 3 | -728 | -560 | 168 |
| lichess_01CKc | discovered_attack | e4e2 | g4f6,e4h4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -44 | -52 | -8 |
| lichess_01CQ7 | mate_in_2 | f8g8 | f1e1,f8f1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -1050 | -1108 | -58 |
| lichess_01Cb9 | discovered_attack | e7d8 | e7c5,e8e2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -457 | -465 | -8 |
| lichess_01Cqi | pin | h7h8 | d7f6,h7h6 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | -210 | -20 | 190 |
| lichess_01CvZ | pin | d4c3 | c8a6,a6b5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -334 | -338 | -4 |
| lichess_01CxB | promotion | g5g6 | g5g7,e2e1q | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 3 | -755 | -603 | 152 |
| lichess_01Dt6 | mate_in_2 | d1c1 | h5e8,d7e8q | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -360 | -372 | -12 |
| lichess_01EK4 | mate_in_2 | e8f8 | c8g4,g4g2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -64 | -112 | -48 |
| lichess_01EMd | mate_in_2 | e4f4 | h4h7,e4h4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -306 | -344 | -38 |
| lichess_01EUl | mate_in_2 | f6g8 | d4c3,d8d1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | 0 | -10 | -10 |
| lichess_01FU2 | mate_in_2 | d3f1 | d5f6,h6h7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -1548 | -1570 | -22 |
| lichess_01FXr | mate_in_2 | h2h7 | e7h4,h2g3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -294 | -354 | -60 |
| lichess_01GBu | mate_in_2 | f8g8 | a5e1,e5e1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -42 | -48 | -6 |
| lichess_01Gqt | mate_in_2 | g7h8 | d3a3,a3b2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -750 | -758 | -8 |
| lichess_01IUe | fork | g7h8 | d5f4,f4h5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -186 | -194 | -8 |
| lichess_01IW8 | mate_in_2 | e2g1 | h7f7,e5c4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -1356 | -1380 | -24 |
| lichess_01J3q | mate_in_2 | f2e1 | f2f7,h4g6 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | -344 | -342 | 2 |
| lichess_01JzG | discovered_attack | b5b7 | e5e4,b5g5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -132 | -152 | -20 |
| lichess_01LA9 | mate_in_2 | h6h2 | h6h8,h1h7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -496 | -552 | -56 |
| lichess_01LGs | mate_in_2 | c3a1 | d3h3,h3h8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -552 | -576 | -24 |
| lichess_01MOR | mate_in_2 | f4f6 | f4h4,h4h3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -680 | -716 | -36 |
| lichess_01NYs | pin | f5d3 | f5d7,d7c6 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | 280 | 420 | 140 |
| lichess_01NfS | mate_in_2 | e1c1 | e1e7,d6e7 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -428 | -486 | -58 |
| lichess_01OFy | mate_in_2 | d5h1 | h5h7,d1h5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | 28 | -8 | -36 |
| lichess_01PBg | pin | f3h3 | f3h5,h5h4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -120 | -148 | -28 |
| lichess_01PTR | discovered_attack | d5e4 | d5g8,d1d6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -102 | -104 | -2 |
| lichess_01Qdr | mate_in_2 | d4f6 | h4h2,g4h4 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 4 | 54 | 62 | 8 |
| lichess_01QgQ | mate_in_2 | g7h7 | g7f8,f8d6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -490 | -506 | -16 |
| lichess_01TLc | mate_in_2 | g1h1 | b6d4,d4f6 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -340 | -406 | -66 |
| lichess_01TgD | mate_in_2 | f6h8 | a7f2,f5g3 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -558 | -598 | -40 |
| lichess_01Tr3 | mate_in_2 | e1b1 | f5f4,f1h1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 5 | -885 | -917 | -32 |
| lichess_01U4x | fork | d1g1 | b5d6,d6f5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -258 | -276 | -18 |
| lichess_01UiU | mate_in_2 | f8b8 | a8h1,h3f4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -502 | -506 | -4 |
| lichess_01VQD | mate_in_2 | d4h8 | g5h6,h6h5 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 2 | -210 | -248 | -38 |
| lichess_01VZi | discovered_attack | c7a7 | b4b3,a5d2 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -206 | -216 | -10 |
| lichess_01VmQ | fork | d1a1 | e7g6,g6f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -172 | -246 | -74 |
| lichess_01WLY | fork | d1b1 | d1a4,a4c4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -68 | -90 | -22 |
| lichess_01WPJ | mate_in_2 | c3g3 | c3h3,h3h1 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 5 | -223 | -255 | -32 |
| lichess_01Wpf | fork | c3c1 | c3c4,c4f4 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 3 | -228 | -256 | -28 |
| lichess_01Wqv | mate_in_2 | c4c1 | d1d8,d8f8 | 0 | 0 | 1 | best_moves_invalid_after_reload | 1 | 4 | -454 | -506 | -52 |
| lichess_01X4v | fork | g8f8 | d5c3,c3d1 | 0 | 1 | 0 | best_moves_invalid_after_reload | 1 | 2 | -188 | 164 | 352 |
