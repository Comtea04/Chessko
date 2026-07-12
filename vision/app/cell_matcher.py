"""Per-cell classification: is a square empty, and if not, which piece is on it.

Matching is done on background-invariant silhouette masks rather than raw pixel colors:
a cell's foreground mask is "pixels far enough from this square's own background color"
(that color is sampled once at enrollment time from the same theme, so it self-calibrates
to whatever site/skin was enrolled). Piece *type* (P/N/B/R/Q/K) comes from matching that
mask's shape against the enrolled templates; piece *color* (white/black) is decided
separately from the mean brightness of the masked pixels. Splitting shape from color this
way makes matching robust to a piece sitting on a light vs. a dark square, which a naive
whole-cell raw-pixel comparison is not (the mostly-background pixels around a small piece
glyph would otherwise dominate the comparison).
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from app.starting_position import EMPTY

UNKNOWN = "unknown"

FOREGROUND_TOLERANCE = 40.0
# A genuinely empty cell still shows a few percent of "foreground" pixels from resize/anti-
# aliasing noise at its edges; a real piece glyph covers a large fraction of the cell. There's
# a wide gap between the two, so this threshold has generous headroom on both sides.
EMPTY_FOREGROUND_RATIO = 0.10
MIN_MATCH_CONFIDENCE = 0.4
WHITE_BRIGHTNESS_THRESHOLD = 128.0


@dataclass(frozen=True)
class MatchResult:
    label: str
    confidence: float


def background_for(row: int, col: int, light_bgr, dark_bgr):
    """Which of the theme's two square colors this coordinate should show when empty."""
    return light_bgr if (row + col) % 2 == 0 else dark_bgr


def silhouette_mask(cell: np.ndarray, background_bgr, tolerance: float = FOREGROUND_TOLERANCE) -> np.ndarray:
    diff = np.linalg.norm(cell.astype(np.float32) - np.array(background_bgr, dtype=np.float32), axis=2)
    return ((diff > tolerance).astype(np.uint8)) * 255


def foreground_ratio(mask: np.ndarray) -> float:
    return float((mask > 0).mean())


def piece_color(cell: np.ndarray, mask: np.ndarray) -> str:
    """'w' or 'b' from the mean brightness of the masked (foreground/piece) pixels."""
    foreground_pixels = cell[mask > 0]
    mean_brightness = float(foreground_pixels.mean()) if foreground_pixels.size else 255.0
    return "w" if mean_brightness >= WHITE_BRIGHTNESS_THRESHOLD else "b"


def classify_cell(
    cell: np.ndarray,
    background_bgr,
    template_masks: dict[str, np.ndarray],
) -> MatchResult:
    mask = silhouette_mask(cell, background_bgr)
    if foreground_ratio(mask) < EMPTY_FOREGROUND_RATIO:
        return MatchResult(EMPTY, 1.0)

    best_label: str | None = None
    best_score = -1.0
    for label, template_mask in template_masks.items():
        resized = cv2.resize(template_mask, (mask.shape[1], mask.shape[0]))
        score = float(cv2.matchTemplate(mask, resized, cv2.TM_CCOEFF_NORMED).max())
        if score > best_score:
            best_label, best_score = label, score

    if best_label is None or best_score < MIN_MATCH_CONFIDENCE:
        return MatchResult(UNKNOWN, max(best_score, 0.0))

    color = piece_color(cell, mask)
    piece_type = best_label[1]
    return MatchResult(f"{color}{piece_type}", best_score)
