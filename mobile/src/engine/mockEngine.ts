import type { Engine, EngineEvaluation } from './types';

/**
 * A stand-in engine for developing trainer logic without the WASM build wired up. Pass a `table` to
 * return specific evaluations per FEN; otherwise every position reads as a dead-equal +0.20.
 */
export function createMockEngine(table?: (fen: string) => EngineEvaluation): Engine {
  return {
    ready: () => Promise.resolve(),
    evaluate: (fen) => Promise.resolve(table?.(fen) ?? { cp: 20, mate: null, bestMove: null, depth: 1 }),
    dispose: () => {},
  };
}
