package com.chesstutor.service;

import com.chesstutor.domain.GameStatus;
import com.chesstutor.domain.MoveEvaluation;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Parses Stockfish's UCI "info ... multipv N ... score cp|mate X ... pv ..." lines. */
final class StockfishOutputParser {

    private StockfishOutputParser() {
    }

    /**
     * A position with no legal moves reports "bestmove (none)". Per UCI convention Stockfish
     * scores that as "mate 0" when the side to move is in check (checkmate) or "cp 0" otherwise
     * (stalemate) — those are the only two ways a legal position can have zero legal moves.
     */
    static GameStatus detectTerminalStatus(List<String> engineLines) {
        boolean noLegalMoves = engineLines.stream()
                .anyMatch(line -> line.startsWith("bestmove (none)") || line.startsWith("bestmove none"));
        if (!noLegalMoves) {
            return null;
        }
        boolean isCheckmate = engineLines.stream().anyMatch(line -> line.contains("score mate 0"));
        return isCheckmate ? GameStatus.CHECKMATE : GameStatus.STALEMATE;
    }

    static List<MoveEvaluation> parse(List<String> engineLines, int multiPv) {
        Map<Integer, MoveEvaluation> byRank = new TreeMap<>();
        for (String line : engineLines) {
            if (!line.startsWith("info") || !line.contains(" pv ")) {
                continue;
            }
            MoveEvaluation eval = parseInfoLine(line);
            if (eval != null) {
                // Stockfish reprints each multipv line as search depth increases; the last one wins.
                byRank.put(eval.rank(), eval);
            }
        }
        List<MoveEvaluation> result = new ArrayList<>(byRank.values());
        return result.size() > multiPv ? result.subList(0, multiPv) : result;
    }

    private static MoveEvaluation parseInfoLine(String line) {
        String[] tokens = line.trim().split("\\s+");
        int rank = 1;
        Integer scoreCp = null;
        Integer mateIn = null;
        List<String> pv = List.of();

        for (int i = 0; i < tokens.length; i++) {
            switch (tokens[i]) {
                case "multipv" -> rank = Integer.parseInt(tokens[++i]);
                case "cp" -> scoreCp = Integer.parseInt(tokens[++i]);
                case "mate" -> mateIn = Integer.parseInt(tokens[++i]);
                case "pv" -> {
                    pv = Arrays.asList(tokens).subList(i + 1, tokens.length);
                    i = tokens.length;
                }
                default -> {
                    // ignore fields we don't care about (depth, nodes, nps, hashfull, lowerbound, ...)
                }
            }
        }

        if (pv.isEmpty()) {
            return null;
        }
        return new MoveEvaluation(rank, pv.get(0), scoreCp, mateIn, List.copyOf(pv));
    }
}
