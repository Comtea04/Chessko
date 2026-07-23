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
    void searchQueryDescribesPhaseSideAndTopMoveInSan() {
        BoardState board = BoardState.fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e2e4", 34, null, List.of("e2e4"))
        ));

        String query = RagPromptBuilder.buildSearchQuery(board, result);

        // SAN, not UCI: the top move is "e4", never "e2e4".
        assertThat(query).contains("오프닝").contains("백").contains("e4").doesNotContain("e2e4");
    }

    @Test
    void phaseComesFromMaterialNotMoveNumber() {
        // A bare king-and-pawn ending on move 1. The old move-number rule called this an opening;
        // by material it is plainly an endgame.
        BoardState board = BoardState.fromFen("8/5k2/8/4K1P1/8/8/8/8 w - - 0 1");
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e5f5", 0, null, List.of("e5f5", "f7g7"))
        ));

        String prompt = RagPromptBuilder.buildUserPrompt(board, result, List.of());

        // Check the phase line itself — a bare "오프닝" substring also lives in the fixed
        // "참고할 오프닝 원칙 자료" label, so it can't be used as a negative assertion.
        assertThat(prompt).contains("게임 단계: 엔드게임(종반)");
    }

    @Test
    void userPromptTranslatesMovesAndPvToSan() {
        // The Italian fork position. PV "e1g1 g8e7 c2c3" must read as "O-O Nge7 c3".
        BoardState board = BoardState.fromFen("r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3");
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e1g1", 101, null, List.of("e1g1", "g8e7", "c2c3", "e7g6", "d2d4"))
        ));

        String prompt = RagPromptBuilder.buildUserPrompt(board, result, List.of());

        assertThat(prompt)
                .contains("O-O")            // castling, not e1g1
                .contains("Nge7")           // disambiguated knight, not g8e7
                .contains("예상 진행")       // the PV is presented as the reasoning
                .doesNotContain("e1g1")
                .doesNotContain("g8e7");
    }

    @Test
    void userPromptShowsExactEvalAsPawnsAndOtherCandidates() {
        BoardState board = BoardState.fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e2e4", 34, null, List.of("e2e4", "e7e5")),
                new MoveEvaluation(2, "d2d4", 28, null, List.of("d2d4", "d7d5"))
        ));
        List<OpeningPrinciple> principles = List.of(new OpeningPrinciple("중앙을 장악하세요.", 0.9));

        String prompt = RagPromptBuilder.buildUserPrompt(board, result, principles);

        assertThat(prompt)
                .contains("e4")
                .contains("평가 +0.34")      // exact number, so the model quotes rather than invents
                .contains("다른 후보")        // the second-best line is shown for contrast
                .contains("d4")
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
