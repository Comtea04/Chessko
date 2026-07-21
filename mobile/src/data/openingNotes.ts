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

export interface MoveNote {
  text: string;
  refs: Reference[];
}

const DATA = notesData as Record<string, Record<string, MoveNote>>;

function noteAt(opening: Opening, lineId: string, ply: number): MoveNote | undefined {
  const note = DATA[lineKey(opening.id, lineId)]?.[String(ply)];
  return note?.text ? { text: note.text, refs: note.refs ?? [] } : undefined;
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

  const path = line.moves.map(plainSan).slice(0, ply + 1);
  for (const other of opening.lines) {
    if (other.id === line.id) continue;
    const moves = other.moves.map(plainSan);
    if (moves.length <= ply) continue;
    if (!path.every((move, i) => moves[i] === move)) continue;
    const inherited = noteAt(opening, other.id, ply);
    if (inherited) return inherited;
  }
  return undefined;
}
