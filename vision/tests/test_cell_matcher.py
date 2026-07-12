from app.board_detector import extract_cells
from app.cell_matcher import EMPTY, UNKNOWN, background_for, classify_cell, silhouette_mask
from app.starting_position import STARTING_GRID
from tests.synthetic_board import render_board_image


def _enroll_from_starting_position():
    """Mirrors `app.pipeline.enroll_theme`'s per-parity template capture, without going
    through the HTTP layer, so classify_cell can be exercised directly."""
    image = render_board_image(STARTING_GRID)
    cells = extract_cells(image)

    # ranks 3-6 (rows 2-5) are empty in the starting position for every file/parity
    light_bgr = cells[2][0].reshape(-1, 3).mean(axis=0)
    dark_bgr = cells[2][1].reshape(-1, 3).mean(axis=0)

    templates = {}
    for row in range(8):
        for col in range(8):
            label = STARTING_GRID[row][col]
            if label != EMPTY:
                background = background_for(row, col, light_bgr, dark_bgr)
                parity = (row + col) % 2
                templates[f"{label}{parity}"] = silhouette_mask(cells[row][col], background)
    return templates, light_bgr, dark_bgr


def test_classifies_every_starting_position_square_correctly():
    templates, light_bgr, dark_bgr = _enroll_from_starting_position()
    image = render_board_image(STARTING_GRID)
    cells = extract_cells(image)

    for row in range(8):
        for col in range(8):
            background = background_for(row, col, light_bgr, dark_bgr)
            result = classify_cell(cells[row][col], background, templates)
            assert result.label == STARTING_GRID[row][col], f"row={row} col={col}"


def test_classifies_a_different_position_after_moves():
    templates, light_bgr, dark_bgr = _enroll_from_starting_position()

    # 1. e4 e5 2. Nf3 — same piece set, different squares.
    after_moves = [row[:] for row in STARTING_GRID]
    after_moves[6][4] = EMPTY  # e2 empty
    after_moves[4][4] = "wP"  # e4
    after_moves[1][4] = EMPTY  # e7 empty
    after_moves[3][4] = "bP"  # e5
    after_moves[7][6] = EMPTY  # g1 empty
    after_moves[5][5] = "wN"  # f3

    image = render_board_image(after_moves)
    cells = extract_cells(image)

    for row in range(8):
        for col in range(8):
            background = background_for(row, col, light_bgr, dark_bgr)
            result = classify_cell(cells[row][col], background, templates)
            assert result.label == after_moves[row][col], f"row={row} col={col}"


def test_unknown_label_when_no_template_is_close_enough():
    _, light_bgr, dark_bgr = _enroll_from_starting_position()

    image = render_board_image(STARTING_GRID)
    cells = extract_cells(image)
    queen_cell = cells[7][3]

    # With no enrolled templates at all, an occupied cell can't match anything.
    result = classify_cell(queen_cell, background_for(7, 3, light_bgr, dark_bgr), {})

    assert result.label == UNKNOWN
