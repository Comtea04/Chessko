"""The canonical standard starting position, used to bootstrap a theme's piece templates
from a single enrollment screenshot.

Grid convention: row 0 is rank 8 (top of the board as rendered by chess.com/lichess with
White at the bottom), row 7 is rank 1; column 0 is file a, column 7 is file h. This matches
the order FEN piece-placement fields are written in (rank 8 down to rank 1, each rank from
file a to file h) and is the default "White at the bottom" board orientation most screenshots
will use.
"""

EMPTY = "empty"

PIECE_LABELS = [
    "wP", "wN", "wB", "wR", "wQ", "wK",
    "bP", "bN", "bB", "bR", "bQ", "bK",
]

ALL_LABELS = PIECE_LABELS + [EMPTY]

_BACK_RANK = ["R", "N", "B", "Q", "K", "B", "N", "R"]

STARTING_GRID = [
    [f"b{piece}" for piece in _BACK_RANK],
    ["bP"] * 8,
    [EMPTY] * 8,
    [EMPTY] * 8,
    [EMPTY] * 8,
    [EMPTY] * 8,
    ["wP"] * 8,
    [f"w{piece}" for piece in _BACK_RANK],
]

FILES = "abcdefgh"


def square_name(row: int, col: int) -> str:
    """Algebraic name (e.g. "e1") for a grid coordinate under the orientation above."""
    rank = 8 - row
    return f"{FILES[col]}{rank}"
