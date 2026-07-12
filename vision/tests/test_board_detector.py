from app.board_detector import BOARD_SIZE, detect_board, extract_cells
from app.starting_position import STARTING_GRID
from tests.synthetic_board import render_board_image


def test_detect_board_finds_tight_crop_with_no_margin():
    image = render_board_image(STARTING_GRID, cell_px=60, margin=0)

    x, y, size = detect_board(image)

    assert (x, y) == (0, 0)
    assert size == 60 * 8


def test_detect_board_crops_out_a_margin():
    image = render_board_image(STARTING_GRID, cell_px=60, margin=40)

    x, y, size = detect_board(image)

    assert abs(x - 40) <= 2
    assert abs(y - 40) <= 2
    assert abs(size - 480) <= 4


def test_extract_cells_returns_an_8x8_grid_of_uniform_cells():
    image = render_board_image(STARTING_GRID, cell_px=60, margin=20)

    grid = extract_cells(image, cell_px=32)

    assert len(grid) == BOARD_SIZE
    assert all(len(row) == BOARD_SIZE for row in grid)
    assert grid[0][0].shape == (32, 32, 3)
