package com.chesstutor.domain;

import java.util.List;

/**
 * One candidate line from Stockfish's MultiPV output.
 *
 * @param rank                the MultiPV rank (1 = best line)
 * @param move                the recommended move in UCI notation (e.g. "e2e4")
 * @param scoreCp             evaluation in centipawns from the side to move's perspective, null if mateIn is set
 * @param mateIn              moves to forced mate, null unless the line ends in mate
 * @param principalVariation  the full predicted move sequence in UCI notation
 */
public record MoveEvaluation(
        int rank,
        String move,
        Integer scoreCp,
        Integer mateIn,
        List<String> principalVariation
) {
}
