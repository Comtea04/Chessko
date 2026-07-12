# Chessko Vision Service

Converts a **screenshot of a digital chess app board** (chess.com, lichess, etc.) into a
FEN string. This deliberately does not attempt to recognize a photo of a physical board:
a screenshot has no perspective distortion, no lighting variation, and a fixed, learnable
piece style per site/theme — which makes classical OpenCV (no trained model, no cloud API
cost) accurate enough to be genuinely useful. Users who want to input a physical position
are expected to set it up on their preferred app and screenshot that instead.

## How it works

1. **Enroll a theme once**: upload a screenshot of the *standard starting position* for a
   given site/skin. Since every square's piece is known in that position, the service
   crops out all 12 piece images automatically (as background-color-invariant silhouette
   masks) and remembers them under a `theme_id`, along with the theme's light/dark square
   colors. No manual labeling, no external piece artwork needed.
2. **Scan any other screenshot** in that theme: the board is located and split into 64
   cells, each cell is matched against the enrolled templates (empty vs. occupied by
   foreground-pixel ratio, then piece type by shape match, then piece color by pixel
   brightness), and the result is assembled into a FEN.

## Endpoints

- `POST /themes/{theme_id}/enroll` (multipart `image`) → `{theme_id, squares_enrolled}`
- `POST /scan?theme_id=...&active_color=w|b` (multipart `image`) →
  `{fen, active_color, low_confidence_squares}`
- `GET /themes` → `{themes: [...]}`
- `GET /health`

Errors are returned as `{"message": "..."}` (400 for a bad/unreadable image or unrecognized
squares, 404 for an unknown theme), matching the Java backend's error shape.

## Known limitations

- **Whose turn it is and en-passant rights can't be seen in a static image** — `active_color`
  must be passed by the caller (defaults to `"w"`); en-passant is always reported as `-`.
- **Castling rights are a heuristic**: inferred from whether each king/rook is still on its
  home square. A king or rook that moved away and back reads as if it never moved.
- **Board orientation is assumed White-at-the-bottom** (the common default). A screenshot
  with the board flipped will be read mirrored.
- **Queen/king have only one calibration sample each** (they occupy a single square in the
  starting position), so template match confidence for them is somewhat more sensitive to
  anti-aliasing differences than pawns/knights/bishops/rooks, which get one sample per
  square color. `low_confidence_squares` in the scan response flags any occupied square
  matched below a confidence threshold so a caller can prompt the user to double-check.

## Running locally

```bash
cd vision
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Enrolled theme templates are stored on disk under `vision/data/<theme_id>/` (gitignored).

## Tests

```bash
cd vision
pip install -r requirements-dev.txt
python -m pytest
```

Tests never touch real chess.com/lichess artwork (which is copyrighted) — they render
synthetic boards with simple, distinct polygon glyphs standing in for each piece type, and
verify the full enroll → scan → FEN pipeline against those.
