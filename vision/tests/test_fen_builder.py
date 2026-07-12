import pytest

from app.fen_builder import UnrecognizedSquareError, build_fen
from app.starting_position import EMPTY, STARTING_GRID


def test_builds_the_standard_starting_fen():
    fen = build_fen(STARTING_GRID)

    assert fen == "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


def test_uses_the_supplied_active_color():
    fen = build_fen(STARTING_GRID, active_color="b")

    assert fen.split(" ")[1] == "b"


def test_rejects_an_invalid_active_color():
    with pytest.raises(ValueError):
        build_fen(STARTING_GRID, active_color="x")


def test_raises_when_a_square_is_unrecognized():
    grid = [row[:] for row in STARTING_GRID]
    grid[6][0] = "unknown"

    with pytest.raises(UnrecognizedSquareError):
        build_fen(grid)


def test_drops_castling_rights_once_rook_has_moved():
    grid = [row[:] for row in STARTING_GRID]
    grid[7][7] = EMPTY  # h1 rook gone
    grid[5][7] = "wR"  # moved to h3

    fen = build_fen(grid)

    castling_field = fen.split(" ")[2]
    assert "K" not in castling_field
    assert "Q" in castling_field


def test_no_castling_rights_once_king_has_moved():
    grid = [row[:] for row in STARTING_GRID]
    grid[7][4] = EMPTY  # king gone from e1
    grid[7][5] = "wK"  # castled-ish / moved

    fen = build_fen(grid)

    castling_field = fen.split(" ")[2]
    assert "K" not in castling_field
    assert "Q" not in castling_field
