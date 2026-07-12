package com.chesstutor.controller.dto;

import com.chesstutor.service.VisionClient;

public record VisionEnrollResponse(String themeId, int squaresEnrolled) {
    public static VisionEnrollResponse from(VisionClient.EnrollResult result) {
        return new VisionEnrollResponse(result.themeId(), result.squaresEnrolled());
    }
}
