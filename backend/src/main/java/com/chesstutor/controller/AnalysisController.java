package com.chesstutor.controller;

import com.chesstutor.controller.dto.AnalysisRequest;
import com.chesstutor.controller.dto.AnalysisResponse;
import com.chesstutor.controller.dto.AnalysisWithCommentaryResponse;
import com.chesstutor.controller.dto.GameAnalysisRequest;
import com.chesstutor.controller.dto.GameAnalysisResponse;
import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.BoardState;
import com.chesstutor.domain.Commentary;
import com.chesstutor.service.RagService;
import com.chesstutor.service.StockfishService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analysis")
public class AnalysisController {

    private final StockfishService stockfishService;
    private final RagService ragService;

    public AnalysisController(StockfishService stockfishService, RagService ragService) {
        this.stockfishService = stockfishService;
        this.ragService = ragService;
    }

    @PostMapping
    public AnalysisResponse analyze(@Valid @RequestBody AnalysisRequest request) {
        BoardState board = BoardState.fromFen(request.fen());
        AnalysisResult result = stockfishService.analyze(board.fen(), request.multiPvOrDefault());
        return AnalysisResponse.from(board.fen(), result);
    }

    @PostMapping("/commentary")
    public AnalysisWithCommentaryResponse analyzeWithCommentary(@Valid @RequestBody AnalysisRequest request) {
        BoardState board = BoardState.fromFen(request.fen());
        AnalysisResult result = stockfishService.analyze(board.fen(), request.multiPvOrDefault());
        Commentary commentary = ragService.explain(board, result);
        return AnalysisWithCommentaryResponse.from(board.fen(), result, commentary);
    }

    /** Evaluates a whole game so the client can draw an advantage graph over its moves. */
    @PostMapping("/game")
    public GameAnalysisResponse analyzeGame(@Valid @RequestBody GameAnalysisRequest request) {
        // Validate every FEN before the engine sees any of them: one bad position fails the request
        // rather than leaving a hole in the middle of the graph.
        List<String> fens = request.fens().stream()
                .map(fen -> BoardState.fromFen(fen).fen())
                .toList();
        return GameAnalysisResponse.from(fens, stockfishService.analyzeGame(fens));
    }
}
