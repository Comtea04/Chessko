import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import type { Chess, PieceSymbol, Square } from 'chess.js';
import { PIECE_GLYPHS, PIECE_IMAGES } from './PieceImages';
import { CapturedPieces } from './CapturedPieces';
import { useSettings } from '../storage/useSettings';
import type { ArrowColor } from '../data/openingNotes';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Short enough to keep the board responsive, long enough to read as motion rather than a cut. */
const PIECE_SLIDE_MS = 160;

type BoardPiece = NonNullable<ReturnType<Chess['board']>[number][number]>;

/** Board rows render rank 8 → 1 by default, and rank 1 → 8 when flipped to black's view. */
function squareAt(row: number, col: number, flipped: boolean): Square {
  return flipped ? (`${FILES[7 - col]}${row + 1}` as Square) : (`${FILES[col]}${8 - row}` as Square);
}

function originOf(square: Square, flipped: boolean): { left: number; top: number } {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  const col = flipped ? 7 - file : file;
  const row = flipped ? rank - 1 : 8 - rank;
  return { left: col * SQUARE_SIZE, top: row * SQUARE_SIZE };
}

function centerOf(square: Square, flipped: boolean): { x: number; y: number } {
  const { left, top } = originOf(square, flipped);
  return { x: left + SQUARE_SIZE / 2, y: top + SQUARE_SIZE / 2 };
}

/** `board` is always in chess.js order (rank 8 first), regardless of how it is displayed. */
function pieceAt(board: ReturnType<Chess['board']>, square: Square): BoardPiece | null {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  return board[8 - rank]?.[file] ?? null;
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
  /** Arrows an author drew on the move being shown — several, each in its own colour. */
  arrows?: Array<{ from: string; to: string; color: ArrowColor }>;
  /** Renders from black's side. */
  flipped?: boolean;
  /** Set false where the captured-piece tally under the board would only be noise. */
  showCaptures?: boolean;
}

export function ChessBoard({
  board,
  selectedSquare,
  legalTargets,
  lastMove,
  onSquarePress,
  squareOverlay,
  arrow,
  arrows,
  flipped = false,
  showCaptures = true,
}: ChessBoardProps) {
  const rows = flipped ? [...board].reverse().map((row) => [...row].reverse()) : board;
  const slide = usePieceSlide(board, lastMove ?? null);

  return (
    <View style={styles.container}>
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
                  {/* The travelling piece is drawn by the overlay instead, so it does not appear twice. */}
                  {piece && square !== slide?.move.to && (
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

        {slide && <SlidingPiece piece={slide.piece} move={slide.move} progress={slide.progress} flipped={flipped} />}
        {arrows?.map((drawn, index) => (
          <MoveArrow
            key={`${drawn.from}${drawn.to}${drawn.color}${index}`}
            from={drawn.from as Square}
            to={drawn.to as Square}
            flipped={flipped}
            color={ARROW_COLORS[drawn.color] ?? ARROW_COLORS.green}
          />
        ))}
        {arrow && <MoveArrow from={arrow.from} to={arrow.to} flipped={flipped} />}
      </View>
      {showCaptures && <CapturedPieces board={board} flipped={flipped} />}
    </View>
  );
}

interface Slide {
  piece: BoardPiece;
  move: { from: Square; to: Square };
  progress: Animated.Value;
}

/**
 * Detects a piece that just moved and animates it across the board instead of teleporting.
 *
 * A move is only animated when the piece was on `from` in the previous render and is on `to` now.
 * That check is what keeps stepping *backwards* through a line from replaying the move forwards:
 * on a rewind the origin square is already empty, so nothing animates.
 */
function usePieceSlide(board: ReturnType<Chess['board']>, lastMove: { from: Square; to: Square } | null): Slide | null {
  const { animations } = useSettings();
  const [slide, setSlide] = useState<Slide | null>(null);

  const previousBoard = useRef<ReturnType<Chess['board']> | null>(null);
  const previousMove = useRef<{ from: Square; to: Square } | null>(null);
  // Moves can arrive faster than one animation finishes (auto-played replies); without this token
  // the outgoing animation's completion callback would clear the slide that replaced it.
  const slideToken = useRef(0);

  useEffect(() => {
    const priorBoard = previousBoard.current;
    const priorMove = previousMove.current;
    previousBoard.current = board;
    previousMove.current = lastMove;

    if (!animations || !lastMove || !priorBoard) return;
    if (priorMove && priorMove.from === lastMove.from && priorMove.to === lastMove.to) return;

    const arrived = pieceAt(board, lastMove.to);
    const departed = pieceAt(priorBoard, lastMove.from);
    if (!arrived || !departed || departed.color !== arrived.color) return;

    const progress = new Animated.Value(0);
    const token = ++slideToken.current;
    setSlide({ piece: arrived, move: lastMove, progress });
    Animated.timing(progress, {
      toValue: 1,
      duration: PIECE_SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && slideToken.current === token) setSlide(null);
    });
  }, [animations, board, lastMove]);

  return slide;
}

function SlidingPiece({ piece, move, progress, flipped }: Slide & { flipped: boolean }) {
  const from = originOf(move.from, flipped);
  const to = originOf(move.to, flipped);
  const imageSource = PIECE_IMAGES[piece.color]?.[piece.type];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.slidingPiece,
        {
          left: from.left,
          top: from.top,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, to.left - from.left] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, to.top - from.top] }) },
          ],
        },
      ]}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.pieceImage} resizeMode="contain" />
      ) : (
        <Text style={styles.piece}>{PIECE_GLYPHS[piece.color][piece.type]}</Text>
      )}
    </Animated.View>
  );
}

const ARROW_COLOR = 'rgba(38, 132, 90, 0.85)';

/** Must match the palette the authoring tool draws with, so an arrow keeps the colour it was given. */
const ARROW_COLORS: Record<ArrowColor, string> = {
  green: ARROW_COLOR,
  red: 'rgba(200, 55, 50, 0.85)',
  blue: 'rgba(48, 88, 200, 0.85)',
  yellow: 'rgba(214, 158, 20, 0.9)',
};

/** Overlay only — it must never swallow taps meant for the squares underneath. */
function MoveArrow({
  from,
  to,
  flipped,
  color = ARROW_COLOR,
}: {
  from: Square;
  to: Square;
  flipped: boolean;
  color?: string;
}) {
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
        stroke={color}
        strokeWidth={SQUARE_SIZE * 0.16}
        strokeLinecap="round"
      />
      <Polygon points={points} fill={color} />
    </Svg>
  );
}

const SQUARE_SIZE = 40;
const BOARD_SIZE = SQUARE_SIZE * 8;

const styles = StyleSheet.create({
  // Sized by the board, so the capture strip under it spans exactly the board's width.
  container: {
    alignSelf: 'flex-start',
  },
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
  slidingPiece: {
    position: 'absolute',
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
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
