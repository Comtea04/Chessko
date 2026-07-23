import { Image, StyleSheet, Text, View } from 'react-native';
import type { Chess, PieceSymbol } from 'chess.js';

import { PIECE_GLYPHS, PIECE_IMAGES } from './PieceImages';
import { colors, typography } from '../theme';

/**
 * The pieces each side has taken, faded out under the board, with the material lead beside whoever
 * is ahead. Read off the board itself rather than a move history, so it works the same for a line
 * being stepped through, a puzzle loaded from a FEN, and a game being reviewed.
 */

const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNT: Record<PieceSymbol, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
/** Cheapest first, the way every board UI stacks them. */
const ORDER: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q'];

type Board = ReturnType<Chess['board']>;
type Missing = Record<'w' | 'b', PieceSymbol[]>;

function survey(board: Board): { missing: Missing; lead: number } {
  const counts = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  } satisfies Record<'w' | 'b', Record<PieceSymbol, number>>;

  for (const row of board) {
    for (const piece of row) {
      if (piece) counts[piece.color][piece.type]++;
    }
  }

  const missing: Missing = { w: [], b: [] };
  let lead = 0;
  for (const color of ['w', 'b'] as const) {
    for (const type of ORDER) {
      // A promotion can leave more of a piece than the game started with, so this floors at zero —
      // otherwise a second queen would read as "-1 queen captured".
      const gone = Math.max(0, START_COUNT[type] - counts[color][type]);
      for (let i = 0; i < gone; i++) missing[color].push(type);
      // The lead comes from what is still on the board, which counts a promoted queen as a queen.
      lead += (color === 'w' ? 1 : -1) * VALUES[type] * counts[color][type];
    }
  }
  return { missing, lead };
}

export function CapturedPieces({ board, flipped = false }: { board: Board; flipped?: boolean }) {
  const { missing, lead } = survey(board);
  if (missing.w.length === 0 && missing.b.length === 0 && lead === 0) return null;

  // Each side's own captures sit on its own edge of the board: the player at the bottom of the
  // screen gets the bottom row, so the strip reads the same way round as the board above it.
  const bottom = flipped ? 'b' : 'w';
  const top = flipped ? 'w' : 'b';

  return (
    <View style={styles.container}>
      <CaptureRow captor={top} taken={missing[top === 'w' ? 'b' : 'w']} lead={lead} />
      <CaptureRow captor={bottom} taken={missing[bottom === 'w' ? 'b' : 'w']} lead={lead} />
    </View>
  );
}

/** `taken` are the pieces `captor` has captured — i.e. the opponent's, so they're drawn in that colour. */
function CaptureRow({ captor, taken, lead }: { captor: 'w' | 'b'; taken: PieceSymbol[]; lead: number }) {
  const ahead = captor === 'w' ? lead : -lead;
  if (taken.length === 0 && ahead <= 0) return <View style={styles.rowSpacer} />;

  return (
    <View style={styles.row}>
      {taken.map((type, index) => {
        const color = captor === 'w' ? 'b' : 'w';
        const source = PIECE_IMAGES[color]?.[type];
        return source ? (
          <Image key={`${type}${index}`} source={source} style={styles.piece} resizeMode="contain" />
        ) : (
          <Text key={`${type}${index}`} style={styles.glyph}>
            {PIECE_GLYPHS[color][type]}
          </Text>
        );
      })}
      {ahead > 0 && <Text style={styles.lead}>+{ahead}</Text>}
    </View>
  );
}

const PIECE_SIZE = 16;

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    minHeight: PIECE_SIZE,
  },
  // Holds the strip's height steady as pieces come and go, so the board doesn't shift up and down
  // mid-line whenever one side has captured nothing yet.
  rowSpacer: {
    height: PIECE_SIZE,
  },
  piece: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
    // Faded, because these are a tally of what's gone — never mistakable for pieces in play.
    opacity: 0.5,
    // Overlapped slightly: eight pawns still fit across the board's width.
    marginRight: -3,
  },
  glyph: {
    fontSize: PIECE_SIZE,
    lineHeight: PIECE_SIZE + 2,
    opacity: 0.5,
    marginRight: -3,
  },
  lead: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginLeft: 6,
  },
});
