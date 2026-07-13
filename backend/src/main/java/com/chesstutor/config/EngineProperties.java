package com.chesstutor.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "chessko.engine")
public class EngineProperties {

    /** Absolute path to the Stockfish executable. */
    private String binaryPath;

    /** Number of Stockfish processes kept warm in the pool. */
    private int poolSize = 4;

    /** Hash table size (MB) given to each engine instance. */
    private int hashMb = 64;

    /** How long each analysis is allowed to search, in milliseconds. */
    private long moveTimeMs = 800;

    /**
     * Search time per position when analysing a whole game. Far shorter than {@link #moveTimeMs}:
     * a game review evaluates dozens of positions, and the graph only needs the shape of the
     * advantage, not a best move worth playing.
     */
    private long gameMoveTimeMs = 200;

    /** How long a request waits for a free engine before failing. */
    private long borrowTimeoutMs = 2000;

    /** Slack added on top of moveTimeMs before a request is considered timed out. */
    private long extraTimeoutMs = 1500;

    public String getBinaryPath() {
        return binaryPath;
    }

    public void setBinaryPath(String binaryPath) {
        this.binaryPath = binaryPath;
    }

    public int getPoolSize() {
        return poolSize;
    }

    public void setPoolSize(int poolSize) {
        this.poolSize = poolSize;
    }

    public int getHashMb() {
        return hashMb;
    }

    public void setHashMb(int hashMb) {
        this.hashMb = hashMb;
    }

    public long getMoveTimeMs() {
        return moveTimeMs;
    }

    public void setMoveTimeMs(long moveTimeMs) {
        this.moveTimeMs = moveTimeMs;
    }

    public long getGameMoveTimeMs() {
        return gameMoveTimeMs;
    }

    public void setGameMoveTimeMs(long gameMoveTimeMs) {
        this.gameMoveTimeMs = gameMoveTimeMs;
    }

    public long getBorrowTimeoutMs() {
        return borrowTimeoutMs;
    }

    public void setBorrowTimeoutMs(long borrowTimeoutMs) {
        this.borrowTimeoutMs = borrowTimeoutMs;
    }

    public long getExtraTimeoutMs() {
        return extraTimeoutMs;
    }

    public void setExtraTimeoutMs(long extraTimeoutMs) {
        this.extraTimeoutMs = extraTimeoutMs;
    }
}
