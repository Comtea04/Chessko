import { OPENING_ANNOTATIONS, type MoveAnnotation } from './openingAnnotations.generated';
import { authoredQuality, lineKey, type MoveQuality, type Opening, type OpeningLine } from './openings';

export type { MoveAnnotation };

/** Mirrors the bar's own clamp: past this the evaluation only says "decided". */
const MATE_CP = 800;

/**
 * Stockfish's verdict on every move of a line, baked in by `scripts/generate-opening-annotations.mts`.
 * A line the generator has not seen yet still gets its authored grades, just without evaluations.
 */
export function annotationsFor(opening: Opening, line: OpeningLine): MoveAnnotation[] {
  const generated = OPENING_ANNOTATIONS[lineKey(opening.id, line.id)];
  if (generated) return generated;

  return line.moves.map((move) => ({
    quality: authoredQuality(move) ?? 'good',
    scoreCp: null,
    mateIn: null,
  }));
}

/** Centipawns from white's perspective, with a forced mate collapsed onto the end of the scale. */
export function evalCp(annotation: MoveAnnotation | undefined): number | null {
  if (!annotation) return null;
  if (annotation.mateIn !== null) return annotation.mateIn >= 0 ? MATE_CP : -MATE_CP;
  return annotation.scoreCp;
}

export function formatEval(annotation: MoveAnnotation | undefined): string | null {
  if (!annotation) return null;
  if (annotation.mateIn !== null) return `M${Math.abs(annotation.mateIn)}`;
  if (annotation.scoreCp === null) return null;

  const pawns = annotation.scoreCp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

/** `good` is the unremarkable case — every book move is good, so it gets no badge. */
export function isNotable(quality: MoveQuality): boolean {
  return quality !== 'good';
}
