import { OPENINGS } from './openingsRuntime';
import { plainSan, type Opening, type OpeningLine } from './openings';

/**
 * Finding an opening two ways, for people who don't know its name: by typing, or by playing the
 * moves out on a board. Both return whole openings (never bare names) so the UI can offer a button
 * straight into each one.
 */

export interface OpeningMatch {
  opening: Opening;
  /** The line the match came through — for board search, the one the played moves are walking down. */
  line: OpeningLine;
  /** How far into that line the query reached, for showing "you're N moves in". */
  depth: number;
}

/** Normalised for loose comparison: lowercase, and punctuation/spaces stripped so "루이로페즈"
 *  matches "루이 로페즈" and "nimzo-indian" matches "Nimzo Indian". */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[\s.\-()]/g, '');
}

/**
 * Text search over name, ECO code, category, and line names. A hit on any of those surfaces the
 * opening; the deepest reason isn't important, only that the user finds it.
 */
export function searchByText(query: string): OpeningMatch[] {
  const q = normalize(query);
  if (!q) return [];

  const matches: OpeningMatch[] = [];
  for (const opening of OPENINGS) {
    const haystacks = [
      opening.name,
      opening.nameEn ?? '',
      opening.eco,
      opening.category,
      ...(opening.aliases ?? []),
      ...opening.lines.map((l) => l.name),
    ];
    if (haystacks.some((text) => normalize(text).includes(q))) {
      matches.push({ opening, line: opening.lines[0], depth: 0 });
    }
  }
  return matches;
}

/**
 * Board search: given the SAN moves played from the start, find every opening with a line those
 * moves walk down (the played sequence is a prefix of the line). Narrows as more moves are played,
 * and ranks the openings whose move lands deepest first — the closest fit floats up.
 */
export function searchByMoves(playedSan: string[]): OpeningMatch[] {
  if (playedSan.length === 0) return [];

  const byOpening = new Map<string, OpeningMatch>();
  for (const opening of OPENINGS) {
    for (const line of opening.lines) {
      const moves = line.moves.map(plainSan);
      if (isPrefix(playedSan, moves)) {
        // Keep the single best line per opening — the deepest one the moves still fit.
        const existing = byOpening.get(opening.id);
        if (!existing || moves.length > existing.line.moves.length) {
          byOpening.set(opening.id, { opening, line, depth: playedSan.length });
        }
      }
    }
  }
  return [...byOpening.values()];
}

function isPrefix(prefix: string[], full: string[]): boolean {
  return prefix.length <= full.length && prefix.every((move, i) => full[i] === move);
}
