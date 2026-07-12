package com.chesstutor.exception;

/** No theme has been enrolled yet under the requested theme id (see the Vision microservice). */
public class VisionThemeNotFoundException extends RuntimeException {

    public VisionThemeNotFoundException(String message) {
        super(message);
    }
}
