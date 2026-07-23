import branchesData from './openingBranches.json';
import authoredData from './openingsAuthored.json';
import editsData from './openingEdits.json';
import { lineKey, OPENINGS as CURATED, type Opening, type OpeningLine } from './openings';

/**
 * The openings the app actually navigates: the curated set from `openings.ts`, plus everything added
 * with the authoring tool (`npm run author`) — whole openings in `openingsAuthored.json` and extra
 * branches in `openingBranches.json`, keyed by opening id. Branches are appended to an opening's
 * lines, so the tree helpers pick them up with no further change: a user playing into an added reply
 * finds it exactly like a curated variation.
 *
 * `openingEdits.json` then renames and hides. Renaming a curated opening in place would mean the tool
 * rewriting the hand-written `openings.ts`, so instead the edits sit beside it and are applied here;
 * deleting something curated is the same thing, recorded as `hidden`. Undoing either is a matter of
 * dropping the entry from that file.
 *
 * Kept separate from `openings.ts` so the Node tooling (gen script, author server) can import the raw
 * curated data without pulling a JSON module through type-stripping.
 */
const BRANCHES = branchesData as Record<string, OpeningLine[]>;
const AUTHORED = authoredData as Opening[];

interface Override {
  name?: string;
  hidden?: boolean;
  /** A line re-entered in the authoring tool: its moves replace the curated ones, grades and all. */
  moves?: string[];
  kind?: OpeningLine['kind'];
  branchPly?: number;
}
const EDITS = editsData as { openings: Record<string, Override>; lines: Record<string, Override> };

export const OPENINGS: Opening[] = [...CURATED, ...AUTHORED]
  .filter((opening) => !EDITS.openings[opening.id]?.hidden)
  .map((opening) => {
    const branches = (BRANCHES[opening.id] ?? []).map((line) => ({ ...line, authored: true }));
    // Tag branches so the line list can leave them out; they're found by playing into them, not picking.
    const lines = [...opening.lines, ...branches]
      .filter((line) => !EDITS.lines[lineKey(opening.id, line.id)]?.hidden)
      .map((line) => {
        const override = EDITS.lines[lineKey(opening.id, line.id)];
        if (!override) return line;
        return {
          ...line,
          name: override.name ?? line.name,
          moves: override.moves ?? line.moves,
          kind: override.kind ?? line.kind,
          branchPly: override.branchPly ?? line.branchPly,
        };
      });
    return { ...opening, name: EDITS.openings[opening.id]?.name ?? opening.name, lines };
  });

const BY_ID = new Map(OPENINGS.map((opening) => [opening.id, opening]));

export function getOpeningById(id: string): Opening | undefined {
  return BY_ID.get(id);
}

export function getLine(opening: Opening, lineId: string): OpeningLine {
  return opening.lines.find((line) => line.id === lineId) ?? opening.lines[0];
}
