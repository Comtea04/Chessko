"""Locates the chessboard within an app screenshot and splits it into 64 cell images.

Unlike a photo of a physical board, a screenshot from chess.com/lichess/etc. has no
perspective distortion: the board is an axis-aligned square, usually either the dominant
element of the image or the entire image itself (when the user crops tightly). Board
detection is therefore just "find the largest square-ish region" with a whole-image
fallback, rather than a full perspective-correction pipeline.
"""

from __future__ import annotations

import cv2
import numpy as np

BOARD_SIZE = 8
DEFAULT_CELL_PX = 48
# Board-edge detection is approximate (contour bounding boxes are off by a few px), and that
# error compounds across 8 cells. Insetting each cell before resizing keeps that drift (and
# any bleed from a neighboring cell of the opposite square color) out of the sampled area,
# while still comfortably containing a centered piece glyph.
CELL_INSET_RATIO = 0.10


class BoardNotFoundError(ValueError):
    pass


def _largest_square_contour(image: np.ndarray) -> tuple[int, int, int] | None:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 40, 120)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    image_area = image.shape[0] * image.shape[1]
    best: tuple[int, int, int] | None = None
    best_area = 0
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if area < image_area * 0.2 or area <= best_area:
            continue
        aspect = w / h if h else 0
        if not (0.9 <= aspect <= 1.1):
            continue
        best_area = area
        best = (x, y, min(w, h))
    return best


def detect_board(image: np.ndarray) -> tuple[int, int, int]:
    """Returns (x, y, size) of the square board region within the screenshot.

    Falls back to the largest centered square of the whole image if no confident
    square contour is found, since a tightly-cropped "just the board" screenshot won't
    have a distinct board-vs-background edge to detect.
    """
    found = _largest_square_contour(image)
    if found is not None:
        return found

    height, width = image.shape[:2]
    size = min(height, width)
    x = (width - size) // 2
    y = (height - size) // 2
    return x, y, size


def extract_cells(image: np.ndarray, cell_px: int = DEFAULT_CELL_PX) -> list[list[np.ndarray]]:
    """Splits the detected board into an 8x8 grid of equally-sized cell images.

    Grid indexing follows `starting_position`'s convention: row 0 is the top of the
    image (rank 8 with White at the bottom), column 0 is the left edge (file a).
    """
    x, y, size = detect_board(image)
    board = image[y:y + size, x:x + size]
    step = size / BOARD_SIZE
    inset = step * CELL_INSET_RATIO

    grid: list[list[np.ndarray]] = []
    for row in range(BOARD_SIZE):
        cells_row = []
        for col in range(BOARD_SIZE):
            top, bottom = int(row * step + inset), int((row + 1) * step - inset)
            left, right = int(col * step + inset), int((col + 1) * step - inset)
            cell = board[top:bottom, left:right]
            cell = cv2.resize(cell, (cell_px, cell_px), interpolation=cv2.INTER_AREA)
            cells_row.append(cell)
        grid.append(cells_row)
    return grid
