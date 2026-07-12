package com.chesstutor.domain;

import java.util.List;

public record AnalysisResult(GameStatus status, List<MoveEvaluation> lines) {

    public static AnalysisResult inProgress(List<MoveEvaluation> lines) {
        return new AnalysisResult(GameStatus.IN_PROGRESS, lines);
    }

    public static AnalysisResult terminal(GameStatus status) {
        return new AnalysisResult(status, List.of());
    }
}
