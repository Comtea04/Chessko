package com.chesstutor.controller;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.GameStatus;
import com.chesstutor.domain.MoveEvaluation;
import com.chesstutor.exception.EngineTimeoutException;
import com.chesstutor.service.StockfishService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(AnalysisController.class)
class AnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StockfishService stockfishService;

    @Test
    void returnsAnalysisForAValidFen() throws Exception {
        when(stockfishService.analyze(anyString(), anyInt())).thenReturn(AnalysisResult.inProgress(List.of(
                new MoveEvaluation(1, "e2e4", 34, null, List.of("e2e4", "e7e5", "g1f3"))
        )));

        mockMvc.perform(post("/api/v1/analysis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.bestMove").value("e2e4"))
                .andExpect(jsonPath("$.lines[0].scoreCp").value(34));
    }

    @Test
    void reportsCheckmateStatusWithNoBestMove() throws Exception {
        when(stockfishService.analyze(anyString(), anyInt())).thenReturn(AnalysisResult.terminal(GameStatus.CHECKMATE));

        mockMvc.perform(post("/api/v1/analysis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fen": "r1bqkbnr/pppp1Qpp/2n5/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CHECKMATE"))
                .andExpect(jsonPath("$.bestMove").doesNotExist())
                .andExpect(jsonPath("$.lines").isEmpty());
    }

    @Test
    void rejectsMalformedFenWithoutCallingTheEngine() throws Exception {
        mockMvc.perform(post("/api/v1/analysis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fen": "this is not a fen"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void rejectsBlankFen() throws Exception {
        mockMvc.perform(post("/api/v1/analysis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fen": ""}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void surfacesEngineTimeoutAsServiceUnavailable() throws Exception {
        when(stockfishService.analyze(anyString(), anyInt()))
                .thenThrow(new EngineTimeoutException("체스 엔진 분석이 시간 내에 끝나지 않았습니다."));

        mockMvc.perform(post("/api/v1/analysis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}
                                """))
                .andExpect(status().isServiceUnavailable());
    }
}
