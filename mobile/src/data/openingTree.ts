import { plainSan, type Opening, type OpeningLine } from './openings';

/**
 * The lines of an opening share their opening moves, so together they form a tree: at each position
 * the side to move may have several known replies, each continuing into a different named line. These
 * helpers read that tree off the flat `lines[]` (no separate data structure) so the trainer can be
 * driven by the moves actually played — recognise which line a move enters, and offer the branches —
 * instead of making the user pick a line from a list.
 *
 * All comparisons are on plain SAN (grading suffixes like `?!` stripped), matching what chess.js emits.
 */

function plainMoves(line: OpeningLine): string[] {
  return line.moves.map(plainSan);
}

function isPrefix(prefix: string[], full: string[]): boolean {
  return prefix.length <= full.length && prefix.every((move, i) => full[i] === move);
}

/** Lines whose moves begin with `path`. */
export function linesMatchingPath(opening: Opening, path: string[]): OpeningLine[] {
  return opening.lines.filter((line) => isPrefix(path, plainMoves(line)));
}

/** The line whose name best describes the current path: the deepest branch committed to, else the main line. */
export function currentLine(opening: Opening, path: string[]): OpeningLine | null {
  const matching = linesMatchingPath(opening, path);
  if (matching.length === 0) return null;
  const committed = matching.filter((line) => line.branchPly < path.length);
  if (committed.length > 0) {
    return committed.reduce((best, line) => (line.branchPly > best.branchPly ? line : best));
  }
  return matching.find((line) => line.kind === 'main') ?? matching[0];
}

/** The known next moves from `path`, each with the lines that play it — i.e. the branches offered here. */
export function knownContinuations(opening: Opening, path: string[]): Array<{ san: string; lines: OpeningLine[] }> {
  const byMove = new Map<string, OpeningLine[]>();
  for (const line of opening.lines) {
    const moves = plainMoves(line);
    if (isPrefix(path, moves) && moves.length > path.length) {
      const next = moves[path.length];
      const bucket = byMove.get(next);
      if (bucket) bucket.push(line);
      else byMove.set(next, [line]);
    }
  }
  return [...byMove.entries()].map(([san, lines]) => ({ san, lines }));
}

/**
 * If playing `nextPlain` from `path` stays on a known line, return that line (so the trainer can switch
 * to it and show its name). Prefers the line that branches exactly here, then the most specific one.
 */
export function lineForContinuation(opening: Opening, path: string[], nextPlain: string): OpeningLine | null {
  const continued = [...path, nextPlain];
  const candidates = opening.lines.filter((line) => isPrefix(continued, plainMoves(line)));
  if (candidates.length === 0) return null;
  // A move that starts a variation here names that variation; a move still on the shared trunk names
  // the least-specific (main) line it belongs to, not the deepest one that happens to pass through.
  const branchingHere = candidates.filter((line) => line.branchPly === path.length);
  if (branchingHere.length > 0) {
    return branchingHere.reduce((best, line) => (line.branchPly > best.branchPly ? line : best));
  }
  return candidates.reduce((best, line) => (line.branchPly < best.branchPly ? line : best));
}
