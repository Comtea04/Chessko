"""Chessko Vision microservice: screenshot -> FEN.

Deliberately scoped to screenshots of digital chess UIs (chess.com, lichess, ...), not
photos of a physical board -- see vision/README.md for why. `/themes/{id}/enroll` teaches
the service a site/skin's piece appearance from one screenshot of the standard starting
position; `/scan` then reads any other screenshot in that theme into a FEN.
"""

from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse

from app import pipeline
from app.schemas import EnrollResponse, ScanResponse, ThemeListResponse
from app.theme_store import ThemeNotFoundError, ThemeStore

app = FastAPI(title="Chessko Vision Service")
store = ThemeStore()


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/themes", response_model=ThemeListResponse)
def list_themes() -> ThemeListResponse:
    return ThemeListResponse(themes=store.list_themes())


@app.post("/themes/{theme_id}/enroll", response_model=EnrollResponse)
async def enroll(theme_id: str, image: UploadFile = File(...)) -> EnrollResponse:
    data = await image.read()
    try:
        result = pipeline.enroll_theme(store, theme_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return EnrollResponse(**result)


@app.post("/scan", response_model=ScanResponse)
async def scan(
    theme_id: str = Query(...),
    active_color: str = Query("w"),
    image: UploadFile = File(...),
) -> ScanResponse:
    data = await image.read()
    try:
        result = pipeline.scan_position(store, theme_id, data, active_color)
    except ThemeNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return ScanResponse(**result)
