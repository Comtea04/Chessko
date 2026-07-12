"""Synthetic board-screenshot rendering shared by tests.

Real chess.com/lichess piece sprites are copyrighted, so tests can't bundle them. Instead
each piece type gets its own simple, distinct polygon glyph; a "theme" here is just this
fixed shape set drawn in two colors. This is enough to exercise the full
detect -> extract -> enroll -> match -> FEN pipeline end-to-end without needing real
artwork or a trained model.
"""

from __future__ import annotations

import cv2
import numpy as np

LIGHT_SQUARE = (210, 238, 238)  # BGR
DARK_SQUARE = (86, 150, 118)  # BGR
# Pure white/black (rather than off-white/off-black) so a piece has enough contrast against
# the light square color specifically -- a too-similar fill color would make a piece's
# interior blend into the background under the pipeline's color-distance foreground test.
WHITE_PIECE = (255, 255, 255)
BLACK_PIECE = (0, 0, 0)
OUTLINE = (120, 120, 120)


def _draw_pawn(img, cx, cy, r, color):
    radius = int(r * 0.6)
    cv2.circle(img, (cx, cy), radius, color, -1, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), radius, OUTLINE, 1, cv2.LINE_AA)


def _draw_knight(img, cx, cy, r, color):
    pts = np.array([[cx, cy - r], [cx + r, cy + r], [cx - r, cy + r]], np.int32)
    cv2.fillPoly(img, [pts], color, cv2.LINE_AA)
    cv2.polylines(img, [pts], True, OUTLINE, 1, cv2.LINE_AA)


def _draw_bishop(img, cx, cy, r, color):
    pts = np.array([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], np.int32)
    cv2.fillPoly(img, [pts], color, cv2.LINE_AA)
    cv2.polylines(img, [pts], True, OUTLINE, 1, cv2.LINE_AA)


def _draw_rook(img, cx, cy, r, color):
    cv2.rectangle(img, (cx - r, cy - r), (cx + r, cy + r), color, -1, cv2.LINE_AA)
    cv2.rectangle(img, (cx - r, cy - r), (cx + r, cy + r), OUTLINE, 1, cv2.LINE_AA)


def _draw_queen(img, cx, cy, r, color):
    cv2.circle(img, (cx, cy), r, color, -1, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), r, OUTLINE, 1, cv2.LINE_AA)


def _draw_king(img, cx, cy, r, color):
    n = 5
    pts = np.array([
        [cx + int(r * np.cos(2 * np.pi * i / n - np.pi / 2)),
         cy + int(r * np.sin(2 * np.pi * i / n - np.pi / 2))]
        for i in range(n)
    ], np.int32)
    cv2.fillPoly(img, [pts], color, cv2.LINE_AA)
    cv2.polylines(img, [pts], True, OUTLINE, 1, cv2.LINE_AA)


_SHAPES = {
    "P": _draw_pawn,
    "N": _draw_knight,
    "B": _draw_bishop,
    "R": _draw_rook,
    "Q": _draw_queen,
    "K": _draw_king,
}


def render_board_image(
    grid: list[list[str]],
    cell_px: int = 60,
    margin: int = 0,
    margin_color: tuple[int, int, int] = (30, 30, 30),
) -> np.ndarray:
    """Renders an 8x8 label grid (see `app.starting_position` for the convention/labels)
    as a synthetic BGR screenshot, optionally padded with a differently-colored margin to
    exercise board_detector's cropping logic."""
    board_px = cell_px * 8
    canvas_px = board_px + 2 * margin
    image = np.full((canvas_px, canvas_px, 3), margin_color, dtype=np.uint8)

    for row in range(8):
        for col in range(8):
            top = margin + row * cell_px
            left = margin + col * cell_px
            square_color = LIGHT_SQUARE if (row + col) % 2 == 0 else DARK_SQUARE
            cv2.rectangle(image, (left, top), (left + cell_px, top + cell_px), square_color, -1)

            label = grid[row][col]
            if label == "empty":
                continue
            color_code, piece_type = label[0], label[1]
            color = WHITE_PIECE if color_code == "w" else BLACK_PIECE
            cx, cy = left + cell_px // 2, top + cell_px // 2
            _SHAPES[piece_type](image, cx, cy, cell_px // 3, color)

    return image


def encode_png(image: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return buffer.tobytes()
