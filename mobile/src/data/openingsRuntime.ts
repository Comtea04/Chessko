import branchesData from './openingBranches.json';
import { OPENINGS as CURATED, type Opening, type OpeningLine } from './openings';

/**
 * The openings the app actually navigates: the curated set from `openings.ts` plus any extra branches
 * authored with the tool (`npm run author` → "갈래 추가"), stored in `openingBranches.json` keyed by
 * opening id. Branches are appended to an opening's lines, so the tree helpers pick them up with no
 * further change — a user playing into an added reply finds it exactly like a curated variation.
 *
 * Kept separate from `openings.ts` so the Node tooling (gen script, author server) can import the raw
 * curated data without pulling a JSON module through type-stripping.
 */
const BRANCHES = branchesData as Record<string, OpeningLine[]>;

export const OPENINGS: Opening[] = CURATED.map((opening) => {
  const extra = BRANCHES[opening.id];
  return extra && extra.length > 0 ? { ...opening, lines: [...opening.lines, ...extra] } : opening;
});

const BY_ID = new Map(OPENINGS.map((opening) => [opening.id, opening]));

export function getOpeningById(id: string): Opening | undefined {
  return BY_ID.get(id);
}

export function getLine(opening: Opening, lineId: string): OpeningLine {
  return opening.lines.find((line) => line.id === lineId) ?? opening.lines[0];
}
