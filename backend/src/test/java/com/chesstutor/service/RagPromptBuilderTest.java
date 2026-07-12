package com.chesstutor.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.BoardState;
import com.chesstutor.domain.MoveEvaluation;
import com.chesstutor.domain.OpeningPrinciple;
import java.util.List;
import org.junit.jupiter.api.Test;

class RagPromptBuilderTest {

    @Test
    void searchQueryDescribesPhaseSideAndTopMove() {
        BoardState board = BoardState.fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e2e4", 34, null, List.of("e2e4"))
        ));

        String query = RagPromptBuilder.buildSearchQuery(board, result);

        assertThat(query).contains("오프닝").contains("백").contains("e2e4");
    }

    @Test
    void searchQueryDetectsLateGamePhaseFromFullmoveNumber() {
        BoardState board = BoardState.fromFen("8/8/8/4k3/8/8/4K3/8 b - - 0 40");
        AnalysisResult result = AnalysisResult.inProgress(List.of());

        String query = RagPromptBuilder.buildSearchQuery(board, result);

        assertThat(query).contains("엔드게임").contains("흑");
    }

    @Test
    void userPromptIncludesFenEvalAndRetrievedPrinciples() {
        BoardState board = BoardState.fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e2e4", 34, null, List.of("e2e4", "e7e5"))
        ));
        List<OpeningPrinciple> principles = List.of(new OpeningPrinciple("중앙을 장악하세요.", 0.9));

        String prompt = RagPromptBuilder.buildUserPrompt(board, result, principles);

        assertThat(prompt)
                .contains(board.fen())
                .contains("e2e4")
                .contains("34cp")
                .contains("중앙을 장악하세요.");
    }

    @Test
    void userPromptNotesWhenNoPrinciplesWereFound() {
        BoardState board = BoardState.fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e2e4", 34, null, List.of())
        ));

        String prompt = RagPromptBuilder.buildUserPrompt(board, result, List.of());

        assertThat(prompt).contains("관련 자료 없음");
    }

    @Test
    void userPromptDescribesForcedMateLines() {
        BoardState board = BoardState.fromFen("r1bqkbnr/pppp1Qpp/2n5/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4");
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "f7g8", null, 1, List.of("f7g8"))
        ));

        String prompt = RagPromptBuilder.buildUserPrompt(board, result, List.of());

        assertThat(prompt).contains("메이트까지 1수");
    }
}
