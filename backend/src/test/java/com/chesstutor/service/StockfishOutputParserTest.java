package com.chesstutor.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.chesstutor.domain.GameStatus;
import com.chesstutor.domain.MoveEvaluation;
import java.util.List;
import org.junit.jupiter.api.Test;

class StockfishOutputParserTest {

    @Test
    void keepsLatestLinePerMultiPvRankAndOrdersByRank() {
        List<String> lines = List.of(
                "info depth 1 seldepth 1 multipv 1 score cp 20 nodes 20 nps 20000 pv e2e4",
                "info depth 1 seldepth 1 multipv 2 score cp 15 nodes 25 nps 25000 pv d2d4",
                "info depth 10 seldepth 12 multipv 1 score cp 34 nodes 50000 nps 900000 pv e2e4 e7e5 g1f3",
                "info depth 10 seldepth 12 multipv 2 score cp 28 nodes 48000 nps 880000 pv d2d4 d7d5",
                "bestmove e2e4 ponder e7e5"
        );

        List<MoveEvaluation> result = StockfishOutputParser.parse(lines, 3);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).rank()).isEqualTo(1);
        assertThat(result.get(0).move()).isEqualTo("e2e4");
        assertThat(result.get(0).scoreCp()).isEqualTo(34);
        assertThat(result.get(0).principalVariation()).containsExactly("e2e4", "e7e5", "g1f3");
        assertThat(result.get(1).rank()).isEqualTo(2);
        assertThat(result.get(1).move()).isEqualTo("d2d4");
    }

    @Test
    void parsesForcedMateLines() {
        List<String> lines = List.of(
                "info depth 5 multipv 1 score mate 3 nodes 500 pv h5f7 e8f7 g5f7",
                "bestmove h5f7"
        );

        List<MoveEvaluation> result = StockfishOutputParser.parse(lines, 1);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).mateIn()).isEqualTo(3);
        assertThat(result.get(0).scoreCp()).isNull();
    }

    @Test
    void respectsMultiPvLimit() {
        List<String> lines = List.of(
                "info depth 5 multipv 1 score cp 10 pv a2a3",
                "info depth 5 multipv 2 score cp 5 pv b2b3",
                "info depth 5 multipv 3 score cp 0 pv c2c3",
                "bestmove a2a3"
        );

        List<MoveEvaluation> result = StockfishOutputParser.parse(lines, 2);

        assertThat(result).hasSize(2);
    }

    @Test
    void detectsCheckmateWhenNoLegalMovesAndMateZero() {
        List<String> lines = List.of(
                "info depth 0 score mate 0",
                "bestmove (none)"
        );

        assertThat(StockfishOutputParser.detectTerminalStatus(lines)).isEqualTo(GameStatus.CHECKMATE);
    }

    @Test
    void detectsStalemateWhenNoLegalMovesAndCpZero() {
        List<String> lines = List.of(
                "info depth 0 score cp 0",
                "bestmove (none)"
        );

        assertThat(StockfishOutputParser.detectTerminalStatus(lines)).isEqualTo(GameStatus.STALEMATE);
    }

    @Test
    void returnsNullTerminalStatusWhenTheGameIsStillOngoing() {
        List<String> lines = List.of(
                "info depth 5 multipv 1 score cp 34 pv e2e4",
                "bestmove e2e4"
        );

        assertThat(StockfishOutputParser.detectTerminalStatus(lines)).isNull();
    }
}
