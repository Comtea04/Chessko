package com.chesstutor.service;

import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.BoardState;
import com.chesstutor.domain.Commentary;
import com.chesstutor.domain.GameStatus;
import com.chesstutor.domain.OpeningPrinciple;
import com.chesstutor.exception.CommentaryUnavailableException;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Turns a Stockfish {@link AnalysisResult} into a beginner-friendly written explanation by
 * combining the engine's numbers with opening theory retrieved from the Supabase pgvector store
 * (the RAG part of the spec's "지능형 해설" feature).
 */
@Service
public class RagService {

    private static final String CHECKMATE_MESSAGE =
            "체크메이트로 게임이 종료되었습니다. 상대방의 킹이 더 이상 체크를 피할 수 있는 수가 없는 상태예요.";
    private static final String STALEMATE_MESSAGE =
            "스테일메이트로 무승부가 되었습니다. 차례인 쪽의 킹은 체크 상태가 아니지만 둘 수 있는 합법적인 수가 없어요.";

    private final OpenAiClient openAiClient;
    private final VectorStoreClient vectorStoreClient;

    public RagService(OpenAiClient openAiClient, VectorStoreClient vectorStoreClient) {
        this.openAiClient = openAiClient;
        this.vectorStoreClient = vectorStoreClient;
    }

    public Commentary explain(BoardState board, AnalysisResult result) {
        if (result.status() == GameStatus.CHECKMATE) {
            return Commentary.withoutReferences(CHECKMATE_MESSAGE);
        }
        if (result.status() == GameStatus.STALEMATE) {
            return Commentary.withoutReferences(STALEMATE_MESSAGE);
        }
        return explainInProgress(board, result);
    }

    private Commentary explainInProgress(BoardState board, AnalysisResult result) {
        try {
            String searchQuery = RagPromptBuilder.buildSearchQuery(board, result);
            float[] queryEmbedding = openAiClient.embed(searchQuery);
            List<OpeningPrinciple> principles = vectorStoreClient.search(queryEmbedding);
            String userPrompt = RagPromptBuilder.buildUserPrompt(board, result, principles);
            String text = openAiClient.chat(RagPromptBuilder.systemPrompt(), userPrompt);
            return Commentary.of(text, principles);
        } catch (CommentaryUnavailableException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new CommentaryUnavailableException("해설을 생성하는 중 문제가 발생했습니다.", e);
        }
    }
}
