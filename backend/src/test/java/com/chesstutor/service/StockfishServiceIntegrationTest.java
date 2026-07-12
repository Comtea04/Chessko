package com.chesstutor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.chesstutor.config.EngineProperties;
import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.GameStatus;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Exercises the real Stockfish binary. Skips itself when STOCKFISH_PATH isn't set (e.g. on a CI
 * box without the engine installed) rather than failing the whole build.
 */
class StockfishServiceIntegrationTest {

    private static final String STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    private static final String CHECKMATE_FEN = "r1bqkbnr/pppp1Qpp/2n5/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";
    private static final String STALEMATE_FEN = "7k/5K2/6Q1/8/8/8/8/8 b - - 0 1";

    private StockfishService service;

    @BeforeEach
    void setUp() {
        String binaryPath = System.getenv("STOCKFISH_PATH");
        assumeTrue(binaryPath != null && !binaryPath.isBlank(), "STOCKFISH_PATH not set, skipping engine integration test");

        EngineProperties properties = new EngineProperties();
        properties.setBinaryPath(binaryPath);
        properties.setPoolSize(2);
        properties.setHashMb(16);
        properties.setMoveTimeMs(300);
        properties.setBorrowTimeoutMs(2000);
        properties.setExtraTimeoutMs(2000);

        service = new StockfishService(properties);
        service.initializePool();
    }

    @AfterEach
    void tearDown() {
        if (service != null) {
            service.shutdownPool();
        }
    }

    @Test
    void analyzesStartingPositionAndReturnsALegalBestMove() {
        AnalysisResult result = service.analyze(STARTING_FEN, 3);

        assertThat(result.status()).isEqualTo(GameStatus.IN_PROGRESS);
        assertThat(result.lines()).isNotEmpty();
        assertThat(result.lines().get(0).rank()).isEqualTo(1);
        assertThat(result.lines().get(0).move()).matches("[a-h][1-8][a-h][1-8][qrbn]?");
    }

    @Test
    void reportsCheckmateWithNoCandidateLines() {
        AnalysisResult result = service.analyze(CHECKMATE_FEN, 3);

        assertThat(result.status()).isEqualTo(GameStatus.CHECKMATE);
        assertThat(result.lines()).isEmpty();
    }

    @Test
    void reportsStalemateWithNoCandidateLines() {
        AnalysisResult result = service.analyze(STALEMATE_FEN, 3);

        assertThat(result.status()).isEqualTo(GameStatus.STALEMATE);
        assertThat(result.lines()).isEmpty();
    }

    @Test
    void poolServesMoreConcurrentRequestsThanItsSizeBySerializingThem() throws Exception {
        int requestCount = 5; // > poolSize (2), so some requests must wait for an engine to free up
        ExecutorService executor = Executors.newFixedThreadPool(requestCount);
        try {
            List<Callable<AnalysisResult>> tasks = IntStream.range(0, requestCount)
                    .<Callable<AnalysisResult>>mapToObj(i -> () -> service.analyze(STARTING_FEN, 1))
                    .collect(Collectors.toList());

            List<Future<AnalysisResult>> futures = executor.invokeAll(tasks);
            for (Future<AnalysisResult> future : futures) {
                assertThat(future.get().lines()).isNotEmpty();
            }
        } finally {
            executor.shutdownNow();
        }
    }
}
