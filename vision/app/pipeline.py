"""Ties board_detector, cell_matcher, theme_store and fen_builder together into the two
operations the API exposes: enrolling a theme and scanning a position.
"""

from __future__ import annotations

import cv2
import numpy as np

from app.board_detector import extract_cells
from app.cell_matcher import background_for, classify_cell, silhouette_mask
from app.fen_builder import build_fen
from app.starting_position import EMPTY, STARTING_GRID, square_name
from app.theme_store import ThemeStore

LOW_CONFIDENCE_THRESHOLD = 0.6


def decode_image(data: bytes) -> np.ndarray:
    array = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("이미지를 읽을 수 없습니다. 올바른 이미지 파일인지 확인해 주세요.")
    return image


def enroll_theme(store: ThemeStore, theme_id: str, image_bytes: bytes) -> dict:
    image = decode_image(image_bytes)
    cells = extract_cells(image)

    # Ranks 3-6 (rows 2-5) are empty for every file in the standard starting position, so
    # any such cell gives us this theme's real light/dark background color.
    light_bgr = tuple(cells[2][0].reshape(-1, 3).mean(axis=0).tolist())
    dark_bgr = tuple(cells[2][1].reshape(-1, 3).mean(axis=0).tolist())

    # Keyed by label + square parity (not just label): anti-aliasing blends a piece's edge
    # pixels with whatever background is behind it, so a light-square and a dark-square
    # instance of the same piece don't produce quite the same mask. The starting position
    # puts most piece types on both parities (e.g. both a light- and dark-squared bishop),
    # so capturing one template per parity noticeably improves match confidence later.
    # (Queens and kings only ever occupy one parity each, so they get a single template.)
    templates: dict[str, np.ndarray] = {}
    for row in range(8):
        for col in range(8):
            label = STARTING_GRID[row][col]
            if label == EMPTY:
                continue
            background = background_for(row, col, light_bgr, dark_bgr)
            parity = (row + col) % 2
            templates[f"{label}{parity}"] = silhouette_mask(cells[row][col], background)

    store.save(theme_id, templates, light_bgr, dark_bgr)
    return {"theme_id": theme_id, "squares_enrolled": len(templates)}


def scan_position(store: ThemeStore, theme_id: str, image_bytes: bytes, active_color: str) -> dict:
    templates, light_bgr, dark_bgr = store.load(theme_id)  # raises ThemeNotFoundError
    image = decode_image(image_bytes)
    cells = extract_cells(image)

    grid: list[list[str]] = []
    low_confidence_squares: list[str] = []
    for row in range(8):
        row_labels = []
        for col in range(8):
            background = background_for(row, col, light_bgr, dark_bgr)
            result = classify_cell(cells[row][col], background, templates)
            row_labels.append(result.label)
            if result.label != EMPTY and result.confidence < LOW_CONFIDENCE_THRESHOLD:
                low_confidence_squares.append(square_name(row, col))
        grid.append(row_labels)

    fen = build_fen(grid, active_color)  # raises UnrecognizedSquareError on any "unknown" cell
    return {
        "fen": fen,
        "active_color": active_color,
        "low_confidence_squares": low_confidence_squares,
    }


__all__ = ["decode_image", "enroll_theme", "scan_position"]
