import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import type { Chess, PieceSymbol, Square } from 'chess.js';
import { PIECE_IMAGES } from './PieceImages';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECE_GLYPHS: Record<'w' | 'b', Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

/** Board rows render rank 8 → 1 by default, and rank 1 → 8 when flipped to black's view. */
function squareAt(row: number, col: number, flipped: boolean): Square {
  return flipped ? (`${FILES[7 - col]}${row + 1}` as Square) : (`${FILES[col]}${8 - row}` as Square);
}

function centerOf(square: Square, flipped: boolean): { x: number; y: number } {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  const col = flipped ? 7 - file : file;
  const row = flipped ? rank - 1 : 8 - rank;
  return { x: col * SQUARE_SIZE + SQUARE_SIZE / 2, y: row * SQUARE_SIZE + SQUARE_SIZE / 2 };
}

export type SquareOverlayKind = 'correct' | 'wrong' | 'hint';

interface ChessBoardProps {
  board: ReturnType<Chess['board']>;
  selectedSquare: Square | null;
  legalTargets: Square[];
  lastMove?: { from: Square; to: Square } | null;
  onSquarePress: (square: Square) => void;
  /** Feedback highlight for trainers (coordinate practice, puzzles) — independent of legal-move state. */
  squareOverlay?: Partial<Record<Square, SquareOverlayKind>>;
  /** Draws the move to play next, used by the guided opening walkthrough. */
  arrow?: { from: Square; to: Square } | null;
  /** Renders from black's side. */
  flipped?: boolean;
}

export function ChessBoard({
  board,
  selectedSquare,
  legalTargets,
  lastMove,
  onSquarePress,
  squareOverlay,
  arrow,
  flipped = false,
}: ChessBoardProps) {
  const rows = flipped ? [...board].reverse().map((row) => [...row].reverse()) : board;

  return (
    <View style={styles.board}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((piece, colIndex) => {
            const square = squareAt(rowIndex, colIndex, flipped);
            // Square colour follows the board, not the viewpoint: flipping both axes preserves parity.
            const isDark = (rowIndex + colIndex) % 2 === 1;
            const isSelected = square === selectedSquare;
            const isLegalTarget = legalTargets.includes(square);
            const isLastMove = square === lastMove?.from || square === lastMove?.to;
            const imageSource = piece ? PIECE_IMAGES[piece.color]?.[piece.type] : null;
            const overlay = squareOverlay?.[square];

            return (
              <Pressable
                key={square}
                onPress={() => onSquarePress(square)}
                style={[
                  styles.square,
                  isDark ? styles.darkSquare : styles.lightSquare,
                  isLastMove && styles.lastMoveSquare,
                  isSelected && styles.selectedSquare,
                  overlay === 'correct' && styles.correctSquare,
                  overlay === 'wrong' && styles.wrongSquare,
                  overlay === 'hint' && styles.hintSquare,
                ]}
              >
                {piece && (
                  imageSource ? (
                    <Image source={imageSource} style={styles.pieceImage} resizeMode="contain" />
                  ) : (
                    <Text style={styles.piece}>{PIECE_GLYPHS[piece.color][piece.type]}</Text>
                  )
                )}
                {isLegalTarget && <View style={piece ? styles.captureDot : styles.moveDot} />}
              </Pressable>
            );
          })}
        </View>
      ))}

      {arrow && <MoveArrow from={arrow.from} to={arrow.to} flipped={flipped} />}
    </View>
  );
}

const ARROW_COLOR = 'rgba(38, 132, 90, 0.85)';

/** Overlay only — it must never swallow taps meant for the squares underneath. */
function MoveArrow({ from, to, flipped }: { from: Square; to: Square; flipped: boolean }) {
  const start = centerOf(from, flipped);
  const end = centerOf(to, flipped);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  const ux = dx / length;
  const uy = dy / length;
  const head = SQUARE_SIZE * 0.42;

  // Stop the shaft short of the target square's centre so the arrowhead lands on it.
  const tipX = end.x - ux * SQUARE_SIZE * 0.12;
  const tipY = end.y - uy * SQUARE_SIZE * 0.12;
  const baseX = tipX - ux * head;
  const baseY = tipY - uy * head;
  const halfWidth = head * 0.42;

  const points = [
    `${tipX},${tipY}`,
    `${baseX - uy * halfWidth},${baseY + ux * halfWidth}`,
    `${baseX + uy * halfWidth},${baseY - ux * halfWidth}`,
  ].join(' ');

  return (
    <Svg style={styles.arrowLayer} pointerEvents="none" width={BOARD_SIZE} height={BOARD_SIZE}>
      <Line
        x1={start.x + ux * SQUARE_SIZE * 0.25}
        y1={start.y + uy * SQUARE_SIZE * 0.25}
        x2={baseX}
        y2={baseY}
        stroke={ARROW_COLOR}
        strokeWidth={SQUARE_SIZE * 0.16}
        strokeLinecap="round"
      />
      <Polygon points={points} fill={ARROW_COLOR} />
    </Svg>
  );
}

const SQUARE_SIZE = 40;
const BOARD_SIZE = SQUARE_SIZE * 8;

const styles = StyleSheet.create({
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 2,
    borderColor: '#4a3728',
  },
  row: {
    flexDirection: 'row',
  },
  arrowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightSquare: {
    backgroundColor: '#f0d9b5',
  },
  darkSquare: {
    backgroundColor: '#b58863',
  },
  selectedSquare: {
    backgroundColor: '#7fa650',
  },
  lastMoveSquare: {
    backgroundColor: '#cdd26a',
  },
  correctSquare: {
    backgroundColor: '#5cb85c',
  },
  wrongSquare: {
    backgroundColor: '#d9534f',
  },
  hintSquare: {
    backgroundColor: '#f0ad4e',
  },
  piece: {
    fontSize: SQUARE_SIZE * 0.7,
    lineHeight: SQUARE_SIZE * 0.85,
  },
  pieceImage: {
    width: SQUARE_SIZE * 0.8,
    height: SQUARE_SIZE * 0.8,
  },
  moveDot: {
    position: 'absolute',
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    borderRadius: SQUARE_SIZE * 0.15,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  captureDot: {
    position: 'absolute',
    width: SQUARE_SIZE - 6,
    height: SQUARE_SIZE - 6,
    borderRadius: (SQUARE_SIZE - 6) / 2,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.25)',
  },
});
