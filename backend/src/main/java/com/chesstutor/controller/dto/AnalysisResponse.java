package com.chesstutor.controller.dto;

import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.GameStatus;
import com.chesstutor.domain.MoveEvaluation;
import java.util.List;

public record AnalysisResponse(
        String fen,
        GameStatus status,
        String bestMove,
        List<MoveEvaluation> lines
) {
    public static AnalysisResponse from(String fen, AnalysisResult result) {
        String bestMove = result.lines().isEmpty() ? null : result.lines().get(0).move();
        return new AnalysisResponse(fen, result.status(), bestMove, result.lines());
    }
}
