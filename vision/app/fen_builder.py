"""Converts an 8x8 classified label grid into a FEN string.

Only piece placement can actually be read off a static screenshot. Whose turn it is and
en-passant availability leave no visual trace, so callers must supply `active_color` and
the rest default conservatively (no en-passant square, 0 halfmove clock, move 1). Castling
rights are inferred heuristically from whether each king and its corresponding rook are
still on their home squares -- a reasonable guess, not a guarantee (a king/rook that moved
away and back would be misread as still having rights).
"""

from __future__ import annotations

from app.cell_matcher import UNKNOWN
from app.starting_position import EMPTY

VALID_ACTIVE_COLORS = ("w", "b")


class UnrecognizedSquareError(ValueError):
    pass


def _rank_to_fen(rank_labels: list[str]) -> str:
    fen_rank: list[str] = []
    empty_run = 0
    for label in rank_labels:
        if label == EMPTY:
            empty_run += 1
            continue
        if empty_run:
            fen_rank.append(str(empty_run))
            empty_run = 0
        color, piece = label[0], label[1]
        fen_rank.append(piece if color == "w" else piece.lower())
    if empty_run:
        fen_rank.append(str(empty_run))
    return "".join(fen_rank)


def _castling_rights(grid: list[list[str]]) -> str:
    def occupied(row: int, col: int, label: str) -> bool:
        return grid[row][col] == label

    rights = ""
    if occupied(7, 4, "wK"):
        if occupied(7, 7, "wR"):
            rights += "K"
        if occupied(7, 0, "wR"):
            rights += "Q"
    if occupied(0, 4, "bK"):
        if occupied(0, 7, "bR"):
            rights += "k"
        if occupied(0, 0, "bR"):
            rights += "q"
    return rights or "-"


def build_fen(grid: list[list[str]], active_color: str = "w") -> str:
    if active_color not in VALID_ACTIVE_COLORS:
        raise ValueError("active_color는 'w' 또는 'b'여야 합니다.")
    for row in grid:
        if UNKNOWN in row:
            raise UnrecognizedSquareError(
                "일부 칸의 기물을 인식하지 못했습니다. 테마를 다시 등록하거나 다른 사진으로 시도해 주세요."
            )

    placement = "/".join(_rank_to_fen(row) for row in grid)
    castling = _castling_rights(grid)
    return f"{placement} {active_color} {castling} - 0 1"
