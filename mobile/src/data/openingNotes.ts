import notesData from './openingNotes.json';
import { lineKey } from './openings';

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

/** The note shown while the move at `ply` sits on the board, or undefined if there's nothing to say. */
export function noteFor(openingId: string, lineId: string, ply: number): MoveNote | undefined {
  const note = DATA[lineKey(openingId, lineId)]?.[String(ply)];
  if (!note || !note.text) return undefined;
  return { text: note.text, refs: note.refs ?? [] };
}
