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
  // The grades are stored per ply, so a line edited since they were baked would show its old
  // evaluations against its new moves. Falling back is the honest answer until `gen:openings` reruns.
  if (generated && generated.length === line.moves.length) {
    // A grade the author pinned on the move wins over the engine's, here and not only when the file
    // is regenerated — otherwise marking a move in the authoring tool changes nothing until someone
    // runs Stockfish over the whole data set again. The evaluations themselves still come from the
    // engine; only the verdict on the move is the author's.
    return generated.map((annotation, ply) => {
      const pinned = authoredQuality(line.moves[ply]);
      if (!pinned || pinned === annotation.quality) return annotation;
      // A move the author vouches for shouldn't still carry the engine's "you should have played X".
      const keepBetter = pinned === 'inaccuracy' || pinned === 'mistake' || pinned === 'blunder';
      return { ...annotation, quality: pinned, betterSan: keepBetter ? annotation.betterSan : undefined };
    });
  }

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
