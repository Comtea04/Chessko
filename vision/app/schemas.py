from pydantic import BaseModel


class EnrollResponse(BaseModel):
    theme_id: str
    squares_enrolled: int


class ScanResponse(BaseModel):
    fen: str
    active_color: str
    low_confidence_squares: list[str]


class ThemeListResponse(BaseModel):
    themes: list[str]


class ErrorResponse(BaseModel):
    message: str
