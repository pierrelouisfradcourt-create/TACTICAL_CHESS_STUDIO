"""
S0 Headless Simulation Engine
Runs N sessions with a random-AI pilot and prints structured metrics.

Usage:
  from sim.headless_sim import run_simulation
  run_simulation(n=1000)

  or standalone:
  python headless_sim.py [N]
"""

import os
import sys
import json
import random
import math
import time
from collections import defaultdict
from typing import Dict, Any, List

_here        = os.path.dirname(os.path.abspath(__file__))
_studio_core = os.path.dirname(_here)
for _p in (_studio_core, os.path.join(_studio_core, "runtime")):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from runtime.engine   import GameSession  # noqa: E402
from runtime.entities import Vec2         # noqa: E402

SIM_DT = 1.0 / 30.0  # 30 ticks/s — fast enough, deterministic


# ── AI pilot ─────────────────────────────────────────────────────────────────

def _ai_input(session: GameSession, direction: Vec2) -> Dict[str, Any]:
    """
    Wall-avoiding random-walk AI.
    Steers away from arena edges, makes random micro-turns 5% of ticks,
    boosts when charge > 0.5 with 30% probability.
    """
    snake  = session.snake
    head   = snake.head()
    x0, y0, x1, y1 = session.arena.bounds()
    margin = 60.0

    nd = Vec2(direction.x, direction.y)

    near_left   = head.x < x0 + margin
    near_right  = head.x > x1 - margin
    near_top    = head.y < y0 + margin
    near_bottom = head.y > y1 - margin

    if near_left and not near_right:
        nd.x = abs(nd.x) or 1.0
    elif near_right and not near_left:
        nd.x = -abs(nd.x) or -1.0

    if near_top and not near_bottom:
        nd.y = abs(nd.y) or 1.0
    elif near_bottom and not near_top:
        nd.y = -abs(nd.y) or -1.0

    is_near_wall = near_left or near_right or near_top or near_bottom
    if not is_near_wall and random.random() < 0.05:
        angle = random.uniform(-0.4, 0.4)
        c, s  = math.cos(angle), math.sin(angle)
        nd    = Vec2(nd.x * c - nd.y * s, nd.x * s + nd.y * c)

    mag = math.sqrt(nd.x ** 2 + nd.y ** 2)
    if mag > 0.0:
        nd = Vec2(nd.x / mag, nd.y / mag)

    # Prevent requesting a reversal that the engine guard would silently drop.
    # Project nd onto the forward hemisphere; for a pure 180° case the
    # projection collapses to zero, so we fall back to a 90° turn.
    dot = nd.x * direction.x + nd.y * direction.y
    if dot < 0:
        nd = Vec2(nd.x - dot * direction.x, nd.y - dot * direction.y)
        rmag = math.sqrt(nd.x ** 2 + nd.y ** 2)
        nd = Vec2(nd.x / rmag, nd.y / rmag) if rmag > 0.01 else Vec2(-direction.y, direction.x)

    boost = snake.boost_charge > 0.5 and random.random() < 0.3
    return {"direction": nd, "boost": boost}


# ── Single session ────────────────────────────────────────────────────────────

def run_single_session(config: Dict[str, Any]) -> Dict[str, Any]:
    session   = GameSession(config)
    direction = Vec2(1.0, 0.0)

    while not session.is_over():
        inp       = _ai_input(session, direction)
        direction = inp["direction"]
        session.tick(SIM_DT, inp)

    return {
        "score":         session.snake.score,
        "survival_time": session.session_time,
        "death_cause":   session.death_cause or "none",
        "outcome":       session.outcome,
        "snake_length":  session.snake.length(),
        "absorptions":   session.snake.ability_count(),
        "xp":            session.snake.xp,
    }


# ── Simulation batch ─────────────────────────────────────────────────────────

def run_simulation(n: int = 1000, ir_path: str = None) -> None:
    if ir_path is None:
        ir_path = os.path.join(_studio_core, "ir", "example_snake_game.json")
    ir_path = os.path.abspath(ir_path)

    with open(ir_path, "r", encoding="utf-8") as fh:
        config = json.load(fh)

    game_name = config["meta"]["name"]
    game_ver  = config["meta"]["version"]

    print(f"\n{'═'*62}")
    print(f"  S0 HEADLESS SIMULATION  ·  {n} sessions")
    print(f"  {game_name}  v{game_ver}")
    print(f"{'═'*62}")

    results: List[Dict[str, Any]] = []
    t0 = time.perf_counter()

    for i in range(n):
        results.append(run_single_session(config))
        if (i + 1) % 100 == 0:
            elapsed = time.perf_counter() - t0
            rate    = (i + 1) / elapsed
            print(f"  [{i+1:4d}/{n}]  {elapsed:5.1f}s elapsed  ({rate:.0f} sessions/s)")

    total_time = time.perf_counter() - t0

    # ── Aggregates ────────────────────────────────────────────────────────────

    scores  = [r["score"]         for r in results]
    times   = [r["survival_time"] for r in results]
    lengths = [r["snake_length"]  for r in results]
    absorbs = [r["absorptions"]   for r in results]

    death_dist:   Dict[str, int] = defaultdict(int)
    outcome_dist: Dict[str, int] = defaultdict(int)
    for r in results:
        death_dist[r["death_cause"]] += 1
        outcome_dist[r["outcome"]]   += 1

    def avg(lst):   return sum(lst) / len(lst) if lst else 0.0
    def med(lst):   s = sorted(lst); return s[len(s) // 2] if s else 0
    def pct(v):     return f"{100 * v / n:5.1f}%"

    # ── Survival ──────────────────────────────────────────────────────────────

    print(f"\n{'─'*62}")
    print("  SURVIVAL")
    print(f"{'─'*62}")
    print(f"  Avg time       : {avg(times):6.1f}s   (median {med(times):.1f}s)")
    print(f"  Min / Max      : {min(times):.1f}s / {max(times):.1f}s")
    print(f"  < 30s deaths   : {sum(1 for t in times if t < 30):4d}  {pct(sum(1 for t in times if t < 30))}")
    print(f"  30–90s zone    : {sum(1 for t in times if 30 <= t < 90):4d}  {pct(sum(1 for t in times if 30 <= t < 90))}")
    print(f"  > 90s survived : {sum(1 for t in times if t >= 90):4d}  {pct(sum(1 for t in times if t >= 90))}")
    print(f"  Timeout 180s   : {outcome_dist.get('timeout', 0):4d}  {pct(outcome_dist.get('timeout', 0))}")

    # ── Score distribution ────────────────────────────────────────────────────

    print(f"\n{'─'*62}")
    print("  SCORE DISTRIBUTION")
    print(f"{'─'*62}")
    print(f"  Avg / Median   : {avg(scores):.0f} / {med(scores)}")
    print(f"  Min / Max      : {min(scores)} / {max(scores)}")
    buckets = [(0, 500), (500, 1500), (1500, 3000), (3000, 6000), (6000, 99999)]
    for lo, hi in buckets:
        cnt = sum(1 for s in scores if lo <= s < hi)
        bar = "█" * (cnt * 28 // max(n, 1))
        label = f"{lo}–{hi}" if hi < 99999 else f"{lo}+"
        print(f"  {label:<10}  {bar:<28}  {cnt:4d}  {pct(cnt)}")

    # ── Death causes ──────────────────────────────────────────────────────────

    print(f"\n{'─'*62}")
    print("  DEATH CAUSES")
    print(f"{'─'*62}")
    for cause, cnt in sorted(death_dist.items(), key=lambda x: -x[1]):
        bar = "█" * (cnt * 28 // max(n, 1))
        print(f"  {cause:<22}  {bar:<28}  {cnt:4d}  {pct(cnt)}")

    # ── Difficulty curve (death time histogram) ────────────────────────────────

    print(f"\n{'─'*62}")
    print("  DIFFICULTY CURVE  (death time buckets)")
    print(f"{'─'*62}")
    edges  = [0, 30, 60, 90, 120, 150, 180]
    labels = ["0–30s", "30–60s", "60–90s", "90–120s", "120–150s", "150–180s"]
    for i, lbl in enumerate(labels):
        lo, hi = edges[i], edges[i + 1]
        cnt    = sum(1 for t in times if lo <= t < hi)
        bar    = "█" * (cnt * 28 // max(n, 1))
        print(f"  {lbl:<12}  {bar:<28}  {cnt:4d}  {pct(cnt)}")

    # ── Snake growth ──────────────────────────────────────────────────────────

    print(f"\n{'─'*62}")
    print("  SNAKE GROWTH & ABSORPTION")
    print(f"{'─'*62}")
    print(f"  Avg length     : {avg(lengths):5.1f}   (max {max(lengths)})")
    print(f"  Avg absorptions: {avg(absorbs):5.2f}")
    print(f"  Full slots (3) : {sum(1 for a in absorbs if a >= 3):4d}  {pct(sum(1 for a in absorbs if a >= 3))}")

    # ── Design validation ─────────────────────────────────────────────────────

    print(f"\n{'─'*62}")
    print("  DESIGN VALIDATION FLAGS")
    print(f"{'─'*62}")

    avg_t        = avg(times)
    timeout_rate = outcome_dist.get("timeout", 0) / n
    wall_rate    = death_dist.get("wall", 0) / n
    self_rate    = death_dist.get("self_collision", 0) / n

    def flag(ok: bool, ok_msg: str, warn_msg: str) -> str:
        return f"  {'✓' if ok else '⚠'} {'OK   ' if ok else 'WARN '} {ok_msg if ok else warn_msg}"

    print(flag(20 <= avg_t <= 110,
               f"Avg survival {avg_t:.1f}s  (target 20–110s)",
               f"Avg survival {avg_t:.1f}s  — difficulty may need tuning"))

    print(flag(timeout_rate < 0.30,
               f"Timeout rate {pct(timeout_rate)}  (< 30%)",
               f"Timeout rate {pct(timeout_rate)}  — game may be too easy"))

    print(flag(wall_rate < 0.50,
               f"Wall death rate {pct(wall_rate)}  (< 50%)",
               f"Wall death rate {pct(wall_rate)}  — arena or speed may be too punishing"))

    print(flag(avg(absorbs) > 0.2,
               f"Avg absorptions {avg(absorbs):.2f}  (mechanic engaged)",
               f"Avg absorptions {avg(absorbs):.2f}  — absorption mechanic rarely triggered"))

    print(f"\n{'─'*62}")
    print(f"  Simulation: {total_time:.2f}s total  ({n / total_time:.0f} sessions/s)")
    print(f"{'═'*62}\n")


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
    run_simulation(n=n)
