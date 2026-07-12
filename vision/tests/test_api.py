import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app
from app.starting_position import EMPTY, STARTING_GRID
from app.theme_store import ThemeStore
from tests.synthetic_board import encode_png, render_board_image


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main_module, "store", ThemeStore(tmp_path))
    return TestClient(app)


def _upload(client, path, image_bytes):
    files = {"image": ("board.png", image_bytes, "image/png")}
    return client.post(path, files=files)


def test_health_check(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_enroll_then_scan_round_trip(client):
    starting_image = encode_png(render_board_image(STARTING_GRID))
    enroll_response = _upload(client, "/themes/test-theme/enroll", starting_image)

    assert enroll_response.status_code == 200
    # 8 piece labels (P/N/B/R x 2 colors) get 2 templates each (one per square parity);
    # Q and K only ever occupy one parity each in the starting position -> 1 template each.
    assert enroll_response.json() == {"theme_id": "test-theme", "squares_enrolled": 20}

    after_moves = [row[:] for row in STARTING_GRID]
    after_moves[6][4] = EMPTY  # e2 empty
    after_moves[4][4] = "wP"  # e4

    game_image = encode_png(render_board_image(after_moves))
    scan_response = _upload(client, "/scan?theme_id=test-theme&active_color=b", game_image)

    assert scan_response.status_code == 200
    body = scan_response.json()
    assert body["fen"] == "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    assert body["active_color"] == "b"
    assert body["low_confidence_squares"] == []


def test_scan_with_unknown_theme_returns_404(client):
    image = encode_png(render_board_image(STARTING_GRID))

    response = _upload(client, "/scan?theme_id=missing-theme", image)

    assert response.status_code == 404
    assert "message" in response.json()


def test_scan_rejects_a_non_image_upload(client):
    starting_image = encode_png(render_board_image(STARTING_GRID))
    _upload(client, "/themes/test-theme/enroll", starting_image)

    response = client.post(
        "/scan?theme_id=test-theme",
        files={"image": ("not-an-image.txt", b"hello world", "text/plain")},
    )

    assert response.status_code == 400
    assert "message" in response.json()


def test_list_themes(client):
    starting_image = encode_png(render_board_image(STARTING_GRID))
    _upload(client, "/themes/theme-a/enroll", starting_image)
    _upload(client, "/themes/theme-b/enroll", starting_image)

    response = client.get("/themes")

    assert response.status_code == 200
    assert sorted(response.json()["themes"]) == ["theme-a", "theme-b"]
