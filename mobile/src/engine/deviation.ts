import { centipawnLoss, classifyLoss, isPlayable, type DeviationVerdict } from './evaluation';
import type { Engine } from './types';
import { sideToMove } from './uci';

export interface DeviationAssessment {
  verdict: DeviationVerdict;
  /** True for `best`/`alternative` — the "not saved, but you can play it" case. */
  playable: boolean;
  /** Centipawns the move cost its mover versus the engine's best. */
  cpLoss: number;
  /** The engine's preferred move in the position before the user moved (UCI), for "최선은 …". */
  bestMove: string | null;
  /** Evaluation after the user's move, white's perspective. */
  evalWhite: number | null;
  mateWhite: number | null;
}

/**
 * Judge a move that left the saved line: evaluate the position before and after it and score the
 * loss. `fenBefore` is the position the user was to move in; `fenAfter` is after their move. Shallow
 * depth is plenty to tell a sound sideline from a real mistake.
 */
export async function assessDeviation(
  engine: Engine,
  fenBefore: string,
  fenAfter: string,
  depth = 14
): Promise<DeviationAssessment> {
  const mover = sideToMove(fenBefore);
  const before = await engine.evaluate(fenBefore, { depth });
  const after = await engine.evaluate(fenAfter, { depth });
  const cpLoss = centipawnLoss(before, after, mover);
  const verdict = classifyLoss(cpLoss);
  return {
    verdict,
    playable: isPlayable(verdict),
    cpLoss,
    bestMove: before.bestMove,
    evalWhite: after.cp,
    mateWhite: after.mate,
  };
}
