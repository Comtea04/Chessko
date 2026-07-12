package com.chesstutor.controller.dto;

import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.Commentary;
import com.chesstutor.domain.GameStatus;
import com.chesstutor.domain.MoveEvaluation;
import com.chesstutor.domain.OpeningPrinciple;
import java.util.List;

public record AnalysisWithCommentaryResponse(
        String fen,
        GameStatus status,
        String bestMove,
        List<MoveEvaluation> lines,
        String commentary,
        List<String> references
) {
    public static AnalysisWithCommentaryResponse from(String fen, AnalysisResult result, Commentary commentary) {
        String bestMove = result.lines().isEmpty() ? null : result.lines().get(0).move();
        List<String> references = commentary.references().stream().map(OpeningPrinciple::content).toList();
        return new AnalysisWithCommentaryResponse(
                fen, result.status(), bestMove, result.lines(), commentary.text(), references);
    }
}
