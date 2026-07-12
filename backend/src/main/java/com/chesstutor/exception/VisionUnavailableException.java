package com.chesstutor.exception;

/** The Vision microservice couldn't be reached or returned an unexpected response. */
public class VisionUnavailableException extends RuntimeException {

    public VisionUnavailableException(String message) {
        super(message);
    }

    public VisionUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
