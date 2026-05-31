import csv, json, chess

CSV = 'lab/puzzles/lichess_db_puzzle.csv'
OUT = 'lab/puzzles/level1.jsonl'

def apply_move(fen, uci):
    try:
        b = chess.Board(fen)
        m = chess.Move.from_uci(uci)
        if m not in b.legal_moves: return None
        b.push(m)
        return b.fen()
    except: return None

found = 0
new_puzzles = []

with open(CSV, encoding='utf-8', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if found >= 200: break
        themes = set(row.get('Themes','').split())
        if 'hangingPiece' not in themes: continue
        try: rating = int(row.get('Rating','0'))
        except: continue
        if rating >= 1200: continue
        moves = row.get('Moves','').split()
        if len(moves) != 2: continue
        puzzle_fen = apply_move(row['FEN'], moves[0])
        if not puzzle_fen: continue
        b = chess.Board(puzzle_fen)
        side = 1 if b.turn == chess.WHITE else 2
        pid = row['PuzzleId']
        new_puzzles.append(json.dumps({
            'case_id': 'lichess_' + pid,
            'fen': puzzle_fen,
            'side_to_move': side,
            'theme': 'hanging_piece',
            'best_moves': [moves[1]],
            'seed': 0, 'difficulty': 1,
            'validation': {'mate': False, 'fork_targets': [], 'material_gain_hint': 0},
            'lichess_id': pid,
            'lichess_rating': rating,
            'lichess_themes': list(themes),
        }))
        found += 1

with open(OUT, 'a', encoding='utf-8') as f:
    for p in new_puzzles:
        f.write(p + '\n')

print('Ajoute:', found, 'vrais puzzles hanging_piece 1-coup')
