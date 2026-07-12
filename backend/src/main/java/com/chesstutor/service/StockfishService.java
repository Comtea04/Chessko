package com.chesstutor.service;

import com.chesstutor.config.EngineProperties;
import com.chesstutor.domain.AnalysisResult;
import com.chesstutor.domain.GameStatus;
import com.chesstutor.exception.EngineTimeoutException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Runs FEN analysis through a fixed pool of warm Stockfish processes.
 *
 * <p>The pool exists to address the exact risk called out in the spec: uncontrolled Stockfish
 * process creation under load leading to memory exhaustion. The pool size is fixed at startup
 * ({@link EngineProperties#getPoolSize()}) and never grows; requests that arrive when every
 * engine is busy wait up to {@code borrowTimeoutMs} and then fail fast with a friendly error
 * instead of spawning another process.
 */
@Service
public class StockfishService {

    private static final Logger log = LoggerFactory.getLogger(StockfishService.class);

    private final EngineProperties properties;
    private final BlockingQueue<StockfishEngine> pool;
    private final ExecutorService analysisExecutor;

    public StockfishService(EngineProperties properties) {
        this.properties = properties;
        this.pool = new LinkedBlockingQueue<>(properties.getPoolSize());
        this.analysisExecutor = Executors.newFixedThreadPool(properties.getPoolSize(), runnable -> {
            Thread thread = new Thread(runnable, "stockfish-analysis");
            thread.setDaemon(true);
            return thread;
        });
    }

    @PostConstruct
    void initializePool() {
        for (int i = 0; i < properties.getPoolSize(); i++) {
            pool.add(startEngine());
        }
        log.info("Stockfish pool ready with {} engine(s) at {}", properties.getPoolSize(), properties.getBinaryPath());
    }

    @PreDestroy
    void shutdownPool() {
        analysisExecutor.shutdownNow();
        pool.forEach(StockfishEngine::close);
    }

    public AnalysisResult analyze(String fen, int multiPv) {
        StockfishEngine engine = borrowEngine();
        boolean healthy = false;
        try {
            AnalysisResult result = runWithTimeout(engine, fen, multiPv);
            healthy = true;
            return result;
        } finally {
            returnEngine(engine, healthy);
        }
    }

    private AnalysisResult runWithTimeout(StockfishEngine engine, String fen, int multiPv) {
        Callable<AnalysisResult> task = () -> runAnalysis(engine, fen, multiPv);
        Future<AnalysisResult> future = analysisExecutor.submit(task);
        long budgetMs = properties.getMoveTimeMs() + properties.getExtraTimeoutMs();
        try {
            return future.get(budgetMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new EngineTimeoutException("체스 엔진 분석이 시간 내에 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.");
        } catch (ExecutionException e) {
            throw new EngineTimeoutException("체스 엔진과 통신 중 오류가 발생했습니다.", e.getCause());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EngineTimeoutException("분석이 중단되었습니다.", e);
        }
    }

    private AnalysisResult runAnalysis(StockfishEngine engine, String fen, int multiPv) throws IOException {
        engine.send("setoption name MultiPV value " + multiPv);
        engine.send("position fen " + fen);
        engine.send("go movetime " + properties.getMoveTimeMs());
        List<String> lines = engine.collectUntilBestmove();

        GameStatus terminalStatus = StockfishOutputParser.detectTerminalStatus(lines);
        if (terminalStatus != null) {
            return AnalysisResult.terminal(terminalStatus);
        }
        return AnalysisResult.inProgress(StockfishOutputParser.parse(lines, multiPv));
    }

    private StockfishEngine borrowEngine() {
        try {
            StockfishEngine engine = pool.poll(properties.getBorrowTimeoutMs(), TimeUnit.MILLISECONDS);
            if (engine == null) {
                throw new EngineTimeoutException("현재 분석 요청이 많아 엔진을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.");
            }
            return engine;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new EngineTimeoutException("분석 대기 중 중단되었습니다.", e);
        }
    }

    /** Returns a healthy engine to the pool; a poisoned/dead one is replaced to keep pool size constant. */
    private void returnEngine(StockfishEngine engine, boolean healthy) {
        if (healthy && engine.isAlive()) {
            pool.offer(engine);
            return;
        }
        log.warn("Replacing unhealthy Stockfish engine instance");
        engine.close();
        pool.offer(startEngine());
    }

    private StockfishEngine startEngine() {
        try {
            return StockfishEngine.start(properties.getBinaryPath(), properties.getHashMb());
        } catch (IOException e) {
            throw new IllegalStateException("Stockfish 프로세스를 시작할 수 없습니다: " + properties.getBinaryPath(), e);
        }
    }
}
