import type { Engine, EngineEvaluation } from './types';
import { parseBestMove, parseInfo, sideToMove, toWhitePov } from './uci';

const EMPTY: EngineEvaluation = { cp: null, mate: null, bestMove: null, depth: 0 };

/**
 * Drives a UCI engine over a plain string channel: you give it a `send` for outgoing commands and
 * feed it incoming lines via `receive`. It knows nothing about *how* the engine runs, so the same
 * driver works against the WASM-in-WebView adapter on device and against a real Stockfish process in
 * tests. Evaluations are serialised — one `go` at a time — since a single engine can't analyse two
 * positions at once.
 */
export class UciEngine implements Engine {
  private latest: EngineEvaluation = EMPTY;
  private current: { stm: 'w' | 'b'; resolve: (evaluation: EngineEvaluation) => void } | null = null;
  private queue: Array<() => void> = [];
  private isReady = false;
  private readyWaiters: Array<() => void> = [];
  private readonly send: (command: string) => void;

  constructor(send: (command: string) => void) {
    // A plain field, not a `private send` parameter property — Metro/Babel strip-only TS can't
    // compile parameter properties, so they're avoided throughout the app.
    this.send = send;
    this.send('uci');
    this.send('isready');
  }

  /** Feed one line of the engine's output. */
  receive(line: string): void {
    if (!this.isReady && (line.includes('readyok') || line.includes('uciok'))) {
      this.isReady = true;
      this.readyWaiters.splice(0).forEach((wake) => wake());
    }

    if (!this.current) return;

    const info = parseInfo(line);
    if (info && info.depth !== null) {
      this.latest = {
        depth: info.depth,
        cp: info.cp === null ? null : toWhitePov(info.cp, this.current.stm),
        mate: info.mate === null ? null : toWhitePov(info.mate, this.current.stm),
        bestMove: info.pv[0] ?? this.latest.bestMove,
      };
    }

    if (line.startsWith('bestmove')) {
      const bestMove = parseBestMove(line);
      const result: EngineEvaluation = { ...this.latest, bestMove: bestMove ?? this.latest.bestMove };
      const { resolve } = this.current;
      this.current = null;
      resolve(result);
      this.pump();
    }
  }

  ready(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    return new Promise((resolve) => this.readyWaiters.push(resolve));
  }

  evaluate(fen: string, opts?: { depth?: number }): Promise<EngineEvaluation> {
    const depth = opts?.depth ?? 14;
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.latest = EMPTY;
        this.current = { stm: sideToMove(fen), resolve };
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      });
      this.pump();
    });
  }

  /** Start the next queued evaluation if the engine is idle. */
  private pump(): void {
    if (this.current) return;
    const next = this.queue.shift();
    if (next) next();
  }

  dispose(): void {
    this.send('quit');
    this.queue = [];
    this.current = null;
    this.readyWaiters = [];
  }
}
