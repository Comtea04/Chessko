package com.chesstutor.controller.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record AnalysisRequest(
        @NotBlank(message = "FEN 값은 필수입니다.") String fen,
        @Min(value = 1, message = "multiPv는 1 이상이어야 합니다.")
        @Max(value = 5, message = "multiPv는 5 이하여야 합니다.")
        Integer multiPv
) {
    private static final int DEFAULT_MULTI_PV = 3;

    public int multiPvOrDefault() {
        return multiPv == null ? DEFAULT_MULTI_PV : multiPv;
    }
}
