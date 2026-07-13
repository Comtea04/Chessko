package com.chesstutor.controller.dto;

import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.GameStatus;
import java.util.ArrayList;
import java.util.List;

public record GameAnalysisResponse(List<PositionEvaluation> evaluations) {

    /**
     * One point on the advantage graph.
     *
     * @param ply     index of the position within the request
     * @param status  IN_PROGRESS, CHECKMATE or STALEMATE
     * @param scoreCp centipawns <b>from the side to move's perspective</b> (the client flips it to
     *                white's perspective using the FEN), null when the line is a forced mate
     * @param mateIn  moves to forced mate, null otherwise
     * @param analyzed false when the engine could not evaluate this position; the graph skips it
     */
    public record PositionEvaluation(
            int ply,
            String fen,
            GameStatus status,
            Integer scoreCp,
            Integer mateIn,
            boolean analyzed
    ) {
    }

    public static GameAnalysisResponse from(List<String> fens, List<AnalysisResult> results) {
        List<PositionEvaluation> evaluations = new ArrayList<>(fens.size());
        for (int ply = 0; ply < fens.size(); ply++) {
            AnalysisResult result = results.get(ply);
            if (result == null) {
                evaluations.add(new PositionEvaluation(ply, fens.get(ply), null, null, null, false));
                continue;
            }
            Integer scoreCp = null;
            Integer mateIn = null;
            if (!result.lines().isEmpty()) {
                scoreCp = result.lines().get(0).scoreCp();
                mateIn = result.lines().get(0).mateIn();
            }
            evaluations.add(new PositionEvaluation(ply, fens.get(ply), result.status(), scoreCp, mateIn, true));
        }
        return new GameAnalysisResponse(evaluations);
    }
}
