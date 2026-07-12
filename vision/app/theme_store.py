"""Filesystem-backed persistence for enrolled per-theme piece templates.

A "theme" corresponds to one site/skin combination (e.g. "chesscom-green",
"lichess-brown"). Enrollment happens once per theme; scanning reuses the saved templates.
No database is needed for this — it's a small, rarely-written set of reference images.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

from app.starting_position import PIECE_LABELS

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class ThemeNotFoundError(ValueError):
    pass


class ThemeStore:
    def __init__(self, data_dir: Path | str = DEFAULT_DATA_DIR):
        self.data_dir = Path(data_dir)

    def _theme_dir(self, theme_id: str) -> Path:
        return self.data_dir / theme_id

    def _meta_path(self, theme_id: str) -> Path:
        return self._theme_dir(theme_id) / "meta.json"

    def exists(self, theme_id: str) -> bool:
        return self._meta_path(theme_id).exists()

    def list_themes(self) -> list[str]:
        if not self.data_dir.exists():
            return []
        return sorted(p.name for p in self.data_dir.iterdir() if self._meta_path(p.name).exists())

    def save(
        self,
        theme_id: str,
        templates: dict[str, np.ndarray],
        light_square_bgr: tuple[int, int, int],
        dark_square_bgr: tuple[int, int, int],
    ) -> None:
        theme_dir = self._theme_dir(theme_id)
        theme_dir.mkdir(parents=True, exist_ok=True)
        for label, template in templates.items():
            cv2.imwrite(str(theme_dir / f"{label}.png"), template)
        meta = {
            "light_square_bgr": list(light_square_bgr),
            "dark_square_bgr": list(dark_square_bgr),
        }
        self._meta_path(theme_id).write_text(json.dumps(meta))

    def load(
        self, theme_id: str
    ) -> tuple[dict[str, np.ndarray], tuple[int, int, int], tuple[int, int, int]]:
        if not self.exists(theme_id):
            raise ThemeNotFoundError(f"등록되지 않은 테마입니다: {theme_id}")

        meta = json.loads(self._meta_path(theme_id).read_text())
        theme_dir = self._theme_dir(theme_id)
        templates: dict[str, np.ndarray] = {}
        for label in PIECE_LABELS:
            for parity in (0, 1):
                key = f"{label}{parity}"
                path = theme_dir / f"{key}.png"
                if path.exists():
                    templates[key] = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)

        return (
            templates,
            tuple(meta["light_square_bgr"]),
            tuple(meta["dark_square_bgr"]),
        )
