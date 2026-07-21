/** One position's verdict from the local engine, normalised to white's perspective. */
export interface EngineEvaluation {
  /** Centipawns, white's perspective. Null when the position is a forced mate (see `mate`). */
  cp: number | null;
  /** Moves to mate, white's perspective (positive = white mates). Null when not a mate. */
  mate: number | null;
  /** The engine's best move in UCI notation, or null. */
  bestMove: string | null;
  /** Search depth actually reached. */
  depth: number;
}

/**
 * A chess engine that runs on the device. The only implementation that talks to real Stockfish is
 * the WASM-in-WebView adapter; `mockEngine` stands in for it in logic that must run without one
 * (tests, and the offline-unavailable path).
 */
export interface Engine {
  /** Resolves once the engine has loaded and is ready to accept positions. */
  ready(): Promise<void>;
  /** Evaluate a FEN to a fixed depth (shallow is enough to separate a sound move from a mistake). */
  evaluate(fen: string, opts?: { depth?: number }): Promise<EngineEvaluation>;
  dispose(): void;
}
