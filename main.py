#!/usr/bin/env python3
"""
S0 AI Game Studio — entry point

Commands:
  python main.py --play              Launch interactive Snake Survivor
  python main.py --sim               Run 1000 headless simulations
  python main.py --sim 500           Run 500 headless simulations
  python main.py --compile           Validate IR and print description
  python main.py --ir PATH/game.json Use a custom IR file
"""

import argparse
import os
import sys

_root        = os.path.dirname(os.path.abspath(__file__))
_studio_core = os.path.join(_root, "studio_core")
_runtime     = os.path.join(_studio_core, "runtime")

for _p in (_studio_core, _runtime):
    if _p not in sys.path:
        sys.path.insert(0, _p)


def _default_ir() -> str:
    return os.path.join(_studio_core, "ir", "example_snake_game.json")


def cmd_compile(ir_path: str) -> None:
    from compiler.ir_compiler import IRCompiler, IRValidationError
    try:
        compiled = IRCompiler(ir_path).load().compile()
        print(compiled.describe())
    except IRValidationError as e:
        print(f"[IR VALIDATION ERROR] {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"[ERROR] IR file not found: {ir_path}")
        sys.exit(1)


def cmd_play(ir_path: str) -> None:
    try:
        import pygame  # noqa: F401
    except ImportError:
        print("[ERROR] pygame is required for --play mode.")
        print("        Install: pip install pygame")
        sys.exit(1)

    # Validate IR before launching
    from compiler.ir_compiler import IRCompiler, IRValidationError
    try:
        IRCompiler(ir_path).load()
    except (IRValidationError, FileNotFoundError) as e:
        print(f"[ERROR] {e}")
        sys.exit(1)

    from games.snake_survivor_v1 import run_game
    print(f"Launching: Snake Survivor Lite")
    print(f"IR: {ir_path}")
    print("Controls: Arrow keys / WASD · SPACE=boost · R=restart · Q=quit\n")
    run_game()


def cmd_sim(ir_path: str, n: int) -> None:
    from sim.headless_sim import run_simulation
    run_simulation(n=n, ir_path=ir_path)


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="main.py",
        description="S0 AI Game Studio — Snake Survivor Lite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--play",    action="store_true",
                        help="Launch interactive game (requires pygame)")
    parser.add_argument("--sim",     nargs="?", const=1000, type=int, metavar="N",
                        help="Run N headless simulations (default 1000)")
    parser.add_argument("--compile", action="store_true",
                        help="Validate IR and print compiled game description")
    parser.add_argument("--ir",      type=str, default=None,
                        help="Path to Game IR JSON (default: example_snake_game.json)")

    args    = parser.parse_args()
    ir_path = os.path.abspath(args.ir) if args.ir else _default_ir()

    if not any([args.play, args.sim is not None, args.compile]):
        parser.print_help()
        return

    if args.compile:
        cmd_compile(ir_path)
    elif args.play:
        cmd_play(ir_path)
    elif args.sim is not None:
        cmd_sim(ir_path, args.sim)


if __name__ == "__main__":
    main()
