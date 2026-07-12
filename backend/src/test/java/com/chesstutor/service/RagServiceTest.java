package com.chesstutor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.BoardState;
import com.chesstutor.domain.Commentary;
import com.chesstutor.domain.GameStatus;
import com.chesstutor.domain.MoveEvaluation;
import com.chesstutor.domain.OpeningPrinciple;
import com.chesstutor.exception.CommentaryUnavailableException;
import java.util.List;
import org.junit.jupiter.api.Test;

class RagServiceTest {

    private final OpenAiClient openAiClient = mock(OpenAiClient.class);
    private final VectorStoreClient vectorStoreClient = mock(VectorStoreClient.class);
    private final RagService ragService = new RagService(openAiClient, vectorStoreClient);

    private final BoardState board =
            BoardState.fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

    @Test
    void explainsAnInProgressPositionUsingRetrievedPrinciples() {
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e2e4", 34, null, List.of("e2e4"))
        ));
        float[] embedding = {0.1f, 0.2f};
        List<OpeningPrinciple> principles = List.of(new OpeningPrinciple("중앙을 장악하세요.", 0.9));
        when(openAiClient.embed(anyString())).thenReturn(embedding);
        when(vectorStoreClient.search(embedding)).thenReturn(principles);
        when(openAiClient.chat(anyString(), anyString())).thenReturn("e4는 중앙을 장악하는 좋은 수예요.");

        Commentary commentary = ragService.explain(board, result);

        assertThat(commentary.text()).isEqualTo("e4는 중앙을 장악하는 좋은 수예요.");
        assertThat(commentary.references()).isEqualTo(principles);
    }

    @Test
    void shortCircuitsCheckmateWithoutCallingAnyClient() {
        Commentary commentary = ragService.explain(board, AnalysisResult.terminal(GameStatus.CHECKMATE));

        assertThat(commentary.text()).contains("체크메이트");
        assertThat(commentary.references()).isEmpty();
        verify(openAiClient, never()).embed(anyString());
        verify(vectorStoreClient, never()).search(any());
    }

    @Test
    void shortCircuitsStalemateWithoutCallingAnyClient() {
        Commentary commentary = ragService.explain(board, AnalysisResult.terminal(GameStatus.STALEMATE));

        assertThat(commentary.text()).contains("스테일메이트");
        verify(openAiClient, never()).embed(anyString());
    }

    @Test
    void wrapsUnexpectedFailuresAsCommentaryUnavailable() {
        AnalysisResult result = AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e2e4", 34, null, List.of("e2e4"))
        ));
        when(openAiClient.embed(anyString())).thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> ragService.explain(board, result))
                .isInstanceOf(CommentaryUnavailableException.class);
    }
}
