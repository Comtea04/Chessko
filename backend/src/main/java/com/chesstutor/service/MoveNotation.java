package com.chesstutor.service;

import com.github.bhlangonijr.chesslib.move.MoveList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Converts Stockfish's UCI output into the notation people read. The engine speaks UCI
 * ("e1g1", "g8e7"); a beginner reads SAN ("O-O", "Nge7"). Handing UCI to the LLM made it either
 * ignore the move sequence or mistranslate it, so the conversion happens here, deterministically,
 * before anything reaches the prompt.
 *
 * chesslib does the move generation (disambiguation, castling, captures, check marks); this just
 * wraps it and, if a line ever fails to parse, falls back to the raw UCI rather than dropping the
 * explanation — a slightly uglier prompt beats no commentary.
 */
final class MoveNotation {

    private static final Logger log = LoggerFactory.getLogger(MoveNotation.class);

    private MoveNotation() {
    }

    /** SAN for a single UCI move played from {@code fen} (e.g. "e1g1" → "O-O"). */
    static String toSan(String fen, String uciMove) {
        List<String> san = toSanSequence(fen, List.of(uciMove));
        return san.isEmpty() ? uciMove : san.get(0);
    }

    /** SAN for a whole UCI move sequence (a principal variation) replayed from {@code fen}. */
    static List<String> toSanSequence(String fen, List<String> uciMoves) {
        if (uciMoves.isEmpty()) {
            return List.of();
        }
        try {
            MoveList moves = new MoveList(fen);
            moves.loadFromText(String.join(" ", uciMoves));
            return List.of(moves.toSanArray());
        } catch (Exception e) {
            // MoveConversionException is itself a RuntimeException; a wide net here is deliberate, so a
            // single odd line can never take the whole explanation down with it.
            log.warn("UCI→SAN conversion failed for {} from {}: {}", uciMoves, fen, e.getMessage());
            return uciMoves;
        }
    }
}
