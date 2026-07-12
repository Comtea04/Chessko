package com.chesstutor.exception;

/**
 * Thrown when the RAG explanation pipeline (vector search or LLM call) fails. Kept distinct from
 * {@link EngineTimeoutException} so the client can tell "the move analysis worked, but the
 * written explanation didn't" apart from an engine-level failure.
 */
public class CommentaryUnavailableException extends RuntimeException {

    public CommentaryUnavailableException(String message) {
        super(message);
    }

    public CommentaryUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
