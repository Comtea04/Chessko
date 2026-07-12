package com.chesstutor.exception;

/** The uploaded screenshot couldn't be read, or its board couldn't be fully recognized. */
public class InvalidVisionImageException extends RuntimeException {

    public InvalidVisionImageException(String message) {
        super(message);
    }

    public InvalidVisionImageException(String message, Throwable cause) {
        super(message, cause);
    }
}
