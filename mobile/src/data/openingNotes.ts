import notesData from './openingNotes.json';
import { lineKey, plainSan, type Opening, type OpeningLine } from './openings';

/**
 * The per-move teaching text and its sources. Split out of `openings.ts` into a plain JSON file so
 * it can be edited move-by-move with the authoring tool (`npm run author`) instead of by hand in the
 * data source. The prose is ours; `refs` link out to what it's grounded in (Lichess explorer, an
 * article, a study) rather than copying anyone else's text — see deploy/../README for the why.
 */
export type ReferenceKind = 'explorer' | 'study' | 'article' | 'book' | 'video';

export interface Reference {
  label: string;
  url: string;
  kind: ReferenceKind;
}

/** Colours an arrow can be drawn in — named, not hex, so the board decides how each one looks. */
export type ArrowColor = 'green' | 'red' | 'blue' | 'yellow';

/** An arrow the author drew on this move, in the authoring tool's board. */
export interface NoteArrow {
  from: string;
  to: string;
  color: ArrowColor;
}

export interface MoveNote {
  text: string;
  refs: Reference[];
  /** Drawn over the board while this move is the one showing, and gone as soon as the line moves on. */
  arrows: NoteArrow[];
}

const DATA = notesData as Record<string, Record<string, Partial<MoveNote>>>;

function noteAt(opening: Opening, lineId: string, ply: number): MoveNote | undefined {
  const note = DATA[lineKey(opening.id, lineId)]?.[String(ply)];
  if (!note) return undefined;
  const arrows = note.arrows ?? [];
  // Arrows alone are commentary too — a move can be explained by pointing at the board.
  if (!note.text && arrows.length === 0) return undefined;
  return { text: note.text ?? '', refs: note.refs ?? [], arrows };
}

/**
 * The opening's other lines that reach the *same position* at `ply` — identical moves up to and
 * including it. Anything written about a move belongs to the position, not to whichever line happens
 * to store it, so this is what lets the shared trunk be written once. Used for our own notes and for
 * the community's alike.
 */
export function linesThrough(opening: Opening, line: OpeningLine, ply: number): OpeningLine[] {
  const path = line.moves.map(plainSan).slice(0, ply + 1);
  return opening.lines.filter((other) => {
    if (other.id === line.id) return false;
    const moves = other.moves.map(plainSan);
    if (moves.length <= ply) return false;
    return path.every((move, i) => moves[i] === move);
  });
}

/**
 * The note shown while the move at `ply` sits on the board. The line's own note wins; otherwise it's
 * inherited from any sibling line that reaches the *same position* (identical moves up to `ply`). So a
 * note on the shared trunk — e.g. everything up to Bc4 in the Italian — is written once and seen by
 * every line passing through it; the lines only need their own notes once they diverge.
 */
export function noteFor(opening: Opening, line: OpeningLine, ply: number): MoveNote | undefined {
  const own = noteAt(opening, line.id, ply);
  if (own) return own;

  for (const other of linesThrough(opening, line, ply)) {
    const inherited = noteAt(opening, other.id, ply);
    if (inherited) return inherited;
  }
  return undefined;
}
