import type { EngineEvaluation } from './types';

/** A mate is worth more than any centipawn count; big enough to dominate loss math, then clamped. */
const MATE_SCORE = 100000;

/** Collapse an evaluation to a single white-perspective number so two positions can be compared. */
export function evalToScore(evaluation: EngineEvaluation): number {
  if (evaluation.mate !== null) return evaluation.mate >= 0 ? MATE_SCORE : -MATE_SCORE;
  return evaluation.cp ?? 0;
}

/**
 * How much the move that led from `before` to `after` cost its mover, in centipawns.
 *
 * Both evaluations are white's perspective. `before` is the position the mover was about to move in;
 * `after` is the position they left. A good move keeps the mover's own score roughly intact, so the
 * loss is near zero; a blunder hands value to the opponent.
 */
export function centipawnLoss(
  before: EngineEvaluation,
  after: EngineEvaluation,
  mover: 'w' | 'b'
): number {
  const sign = mover === 'w' ? 1 : -1;
  const loss = sign * (evalToScore(before) - evalToScore(after));
  return Math.max(0, Math.min(loss, MATE_SCORE));
}

export type DeviationVerdict = 'best' | 'alternative' | 'inaccuracy' | 'mistake' | 'blunder';

export interface DeviationThresholds {
  /** ≤ this centipawn loss is a sound alternative worth letting the user explore. */
  alternative: number;
  inaccuracy: number;
  mistake: number;
}

/**
 * Deliberately more forgiving than a game review: in the opening a 60cp swing between book moves is
 * taste, not a mistake, and the whole point here is to let a curious user try a different-but-sound
 * line rather than scold them for leaving the script.
 */
export const DEFAULT_THRESHOLDS: DeviationThresholds = { alternative: 90, inaccuracy: 160, mistake: 300 };

export function classifyLoss(cpLoss: number, thresholds: DeviationThresholds = DEFAULT_THRESHOLDS): DeviationVerdict {
  const loss = Math.max(0, cpLoss);
  if (loss <= 30) return 'best';
  if (loss <= thresholds.alternative) return 'alternative';
  if (loss <= thresholds.inaccuracy) return 'inaccuracy';
  if (loss <= thresholds.mistake) return 'mistake';
  return 'blunder';
}

/** `best` and `alternative` are both fine to continue with — the "not saved, but you can" case. */
export function isPlayable(verdict: DeviationVerdict): boolean {
  return verdict === 'best' || verdict === 'alternative';
}
