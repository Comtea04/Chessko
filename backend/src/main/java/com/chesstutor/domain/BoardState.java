package com.chesstutor.domain;

import com.chesstutor.exception.InvalidFenException;
import java.util.regex.Pattern;

/**
 * Parsed representation of a FEN string. Validation happens here so that no unvalidated user
 * input ever reaches the Stockfish process or, later, an LLM prompt.
 */
public record BoardState(
        String fen,
        char activeColor,
        String castlingRights,
        String enPassantSquare,
        int halfmoveClock,
        int fullmoveNumber
) {

    private static final Pattern FEN_PATTERN = Pattern.compile(
            "^(?:[pnbrqkPNBRQK1-8]+/){7}[pnbrqkPNBRQK1-8]+ [wb] (?:-|[KQkq]{1,4}) (?:-|[a-h][36]) \\d+ \\d+$"
    );

    public static BoardState fromFen(String rawFen) {
        if (rawFen == null) {
            throw new InvalidFenException("FEN 값이 비어 있습니다.");
        }
        String fen = rawFen.trim();
        if (!FEN_PATTERN.matcher(fen).matches()) {
            throw new InvalidFenException("유효하지 않은 FEN 형식입니다: " + fen);
        }
        String[] fields = fen.split(" ");
        return new BoardState(
                fen,
                fields[1].charAt(0),
                fields[2],
                fields[3],
                Integer.parseInt(fields[4]),
                Integer.parseInt(fields[5])
        );
    }
}
