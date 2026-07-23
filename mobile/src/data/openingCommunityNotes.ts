import communityData from './openingCommunityNotes.json';
import { linesThrough } from './openingNotes';
import { lineKey, type Opening, type OpeningLine } from './openings';

/**
 * Explanations users wrote for a move, beside our own in `openingNotes.json`. Same file-per-concern
 * shape as the notes: keyed by `opening:line` → ply, edited with the authoring tool (`npm run author`).
 *
 * There is no server and no login, so the file *is* the moderation queue: a suggestion sent from the
 * app arrives as text, gets pasted in, and stays invisible until `promoted` is ticked. Only promoted
 * entries are ever shown — which is why the app can ship the file as-is.
 *
 * The rows in the JSON today are samples, so the panel has something to show; delete them once real
 * suggestions come in.
 */
export interface CommunityNote {
  id: string;
  author: string;
  text: string;
  likes: number;
  promoted: boolean;
}

/** How many of them the panel shows. The rest stay in the file, ranked below the fold. */
export const TOP_NOTES = 3;

const DATA = communityData as Record<string, Record<string, Partial<CommunityNote>[]>>;

function notesAt(opening: Opening, lineId: string, ply: number): CommunityNote[] {
  const raw = DATA[lineKey(opening.id, lineId)]?.[String(ply)] ?? [];
  return raw
    .filter((note): note is Partial<CommunityNote> & { id: string; text: string } => !!note?.id && !!note.text)
    .map((note) => ({
      id: note.id,
      author: note.author?.trim() || '익명',
      text: note.text,
      likes: note.likes ?? 0,
      promoted: note.promoted === true,
    }));
}

/**
 * Every promoted explanation for the move at `ply`, best-liked first. Collected from the line's own
 * entries *and* from every other line reaching the same position — a comment on the trunk is about
 * the position, so it reads the same whichever line you arrived through. Ids are what dedupe those.
 */
export function communityNotesFor(opening: Opening, line: OpeningLine, ply: number): CommunityNote[] {
  const collected = new Map<string, CommunityNote>();
  for (const candidate of [line, ...linesThrough(opening, line, ply)]) {
    for (const note of notesAt(opening, candidate.id, ply)) {
      if (note.promoted && !collected.has(note.id)) collected.set(note.id, note);
    }
  }
  // Ties broken by id so the order can't shuffle between renders.
  return [...collected.values()].sort((a, b) => b.likes - a.likes || a.id.localeCompare(b.id));
}
