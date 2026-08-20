import json
from collections import Counter

for level, path in [(2, 'lab/puzzles/level2.jsonl'), (3, 'lab/puzzles/level3.jsonl')]:
    counts = Counter()
    with open(path) as f:
        for line in f:
            c = json.loads(line)
            counts[len(c['best_moves'])] += 1
    print(f'L{level} - longueur best_moves:')
    for k in sorted(counts):
        print(f'  {k} coups: {counts[k]} puzzles')
