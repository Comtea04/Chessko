package com.chesstutor.controller.dto;

import com.chesstutor.service.VisionClient;
import java.util.List;

public record VisionScanResponse(String fen, String activeColor, List<String> lowConfidenceSquares) {
    public static VisionScanResponse from(VisionClient.ScanResult result) {
        return new VisionScanResponse(result.fen(), result.activeColor(), result.lowConfidenceSquares());
    }
}
