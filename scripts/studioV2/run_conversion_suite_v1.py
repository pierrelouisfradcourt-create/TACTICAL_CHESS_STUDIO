import argparse
import os
import subprocess
import sys
from pathlib import Path


DEFAULT_SUITE = Path("lab/suites/conversion_suite_v1.jsonl")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Conversion Suite V1 via the Rust CLI.")
    parser.add_argument("--limit", type=int, default=0, help="Run only the first N cases (0 = all).")
    parser.add_argument("--engine", default="", help="Override engine agent (env TCS_CONVERSION_SUITE_ENGINE).")
    parser.add_argument("--opponent", default="", help="Override opponent agent (env TCS_CONVERSION_SUITE_OPPONENT).")
    parser.add_argument("--max-steps", type=int, default=0, help="Override max steps (env TCS_CONVERSION_SUITE_MAX_STEPS).")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not DEFAULT_SUITE.exists():
        print(f"Missing suite file: {DEFAULT_SUITE}")
        print("Build it with: python scripts/build_conversion_suite_v1.py")
        return 2

    env = dict(os.environ)

    if args.engine:
        env["TCS_CONVERSION_SUITE_ENGINE"] = args.engine
    if args.opponent:
        env["TCS_CONVERSION_SUITE_OPPONENT"] = args.opponent
    if args.max_steps > 0:
        env["TCS_CONVERSION_SUITE_MAX_STEPS"] = str(args.max_steps)

    cmd = ["cargo", "run", "--quiet", "--", "conversion_suite"]
    if args.limit > 0:
        cmd.append(str(args.limit))

    print("Running:", " ".join(cmd))
    return subprocess.call(cmd, env=env)


if __name__ == "__main__":
    raise SystemExit(main())
