# -*- coding: utf-8 -*-
"""
Chess square color utility module.
Provides functions to parse chess square notation and determine square colors.
"""

import sys
from typing import Tuple


def parse_square(s: str) -> Tuple[int, int]:
    """
    Parse a chess square notation (e.g., 'e4') into column and row indices.

    Args:
        s: Square notation as string (e.g., 'e4', 'a1', 'h8')

    Returns:
        Tuple of (col_index, row) where:
        - col_index is 0-7 (a=0, b=1, ..., h=7)
        - row is 1-8

    Raises:
        ValueError: If the square notation is invalid
    """
    if len(s) != 2:
        raise ValueError(f"Invalid square: {s}")

    col_char = s[0].lower()
    row_char = s[1]

    if col_char < 'a' or col_char > 'h':
        raise ValueError(f"Invalid column: {col_char}")
    if row_char < '1' or row_char > '8':
        raise ValueError(f"Invalid row: {row_char}")

    col_index = ord(col_char) - ord('a')  # 0-7
    row = int(row_char)  # 1-8

    return (col_index, row)


def square_color(s: str) -> str:
    """
    Determine the color of a chess square.

    Args:
        s: Square notation (e.g., 'e4')

    Returns:
        "sombre" (dark/black square) or "claire" (light/white square)

    Raises:
        ValueError: If the square notation is invalid
    """
    col_index, row = parse_square(s)

    # Standard chess coloring: sum of indices
    # Odd sum → sombre (dark/black), even sum → claire (light/white)
    if (col_index + row) % 2 == 1:
        return "sombre"
    else:
        return "claire"


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("Usage: chesscolor.py <square>\n")
        sys.exit(1)

    try:
        square = sys.argv[1]
        color = square_color(square)
        print(color)
        sys.exit(0)
    except ValueError as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)
