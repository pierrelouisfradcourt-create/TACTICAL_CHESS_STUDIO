# -*- coding: utf-8 -*-
"""
Verification script for chesscolor module.
Tests core functionality of parse_square and square_color functions.
"""

import sys
from chesscolor import parse_square, square_color


def main() -> int:
    """
    Run verification tests for chesscolor module.

    Returns:
        0 if all tests pass, 1 otherwise
    """
    try:
        # Test square_color with standard chess coloring
        assert square_color("a1") == "sombre", f"a1: expected 'sombre', got '{square_color('a1')}'"
        assert square_color("h1") == "claire", f"h1: expected 'claire', got '{square_color('h1')}'"
        assert square_color("e4") == "claire", f"e4: expected 'claire', got '{square_color('e4')}'"
        assert square_color("a8") == "claire", f"a8: expected 'claire', got '{square_color('a8')}'"
        assert square_color("h8") == "sombre", f"h8: expected 'sombre', got '{square_color('h8')}'"

        # Test that parse_square raises ValueError for invalid input
        try:
            parse_square("z9")
            print("FAIL: parse_square('z9') should raise ValueError")
            return 1
        except ValueError:
            pass  # Expected

        # Test that parse_square returns correct indices
        col, row = parse_square("e4")
        assert col == 4, f"e4 col: expected 4, got {col}"
        assert row == 4, f"e4 row: expected 4, got {row}"

        col, row = parse_square("a1")
        assert col == 0, f"a1 col: expected 0, got {col}"
        assert row == 1, f"a1 row: expected 1, got {row}"

        col, row = parse_square("h8")
        assert col == 7, f"h8 col: expected 7, got {col}"
        assert row == 8, f"h8 row: expected 8, got {row}"

        print("OK")
        return 0

    except AssertionError as e:
        print(f"FAIL: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
