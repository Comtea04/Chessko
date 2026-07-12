package com.chesstutor.service;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * One live Stockfish process speaking UCI over stdin/stdout. Not thread-safe: callers must only
 * use an instance from a single thread at a time, which {@link StockfishService}'s pool enforces.
 */
final class StockfishEngine implements AutoCloseable {

    private final Process process;
    private final BufferedWriter writer;
    private final BufferedReader reader;

    private StockfishEngine(Process process) {
        this.process = process;
        this.writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
        this.reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));
    }

    static StockfishEngine start(String binaryPath, int hashMb) throws IOException {
        Process process = new ProcessBuilder(binaryPath)
                .redirectErrorStream(true)
                .start();
        StockfishEngine engine = new StockfishEngine(process);
        try {
            engine.handshake(hashMb);
        } catch (IOException e) {
            engine.close();
            throw e;
        }
        return engine;
    }

    private void handshake(int hashMb) throws IOException {
        send("uci");
        waitFor("uciok");
        send("setoption name Hash value " + hashMb);
        send("isready");
        waitFor("readyok");
    }

    void send(String command) throws IOException {
        writer.write(command);
        writer.newLine();
        writer.flush();
    }

    private void waitFor(String token) throws IOException {
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.contains(token)) {
                return;
            }
        }
        throw new IOException("Stockfish 프로세스가 '" + token + "' 응답 전에 종료되었습니다.");
    }

    /** Reads UCI "info" lines until (and including) the terminating "bestmove" line. */
    List<String> collectUntilBestmove() throws IOException {
        List<String> lines = new ArrayList<>();
        String line;
        while ((line = reader.readLine()) != null) {
            if (line.startsWith("bestmove")) {
                lines.add(line);
                return lines;
            }
            if (line.startsWith("info depth")) {
                // Includes both progress lines with a "pv" and the terminal
                // "info depth 0 score mate|cp 0" line emitted when there are no legal moves.
                lines.add(line);
            }
        }
        throw new IOException("Stockfish 프로세스가 bestmove 응답 전에 종료되었습니다.");
    }

    boolean isAlive() {
        return process.isAlive();
    }

    @Override
    public void close() {
        try {
            if (process.isAlive()) {
                send("quit");
            }
        } catch (IOException ignored) {
            // process is going away regardless
        } finally {
            process.destroy();
        }
    }
}
