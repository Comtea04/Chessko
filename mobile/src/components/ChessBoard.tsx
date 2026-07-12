import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Chess, PieceSymbol, Square } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const PIECE_GLYPHS: Record<'w' | 'b', Record<PieceSymbol, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

function squareAt(row: number, col: number): Square {
  return `${FILES[col]}${8 - row}` as Square;
}

interface ChessBoardProps {
  board: ReturnType<Chess['board']>;
  selectedSquare: Square | null;
  legalTargets: Square[];
  lastMove?: { from: Square; to: Square } | null;
  onSquarePress: (square: Square) => void;
}

export function ChessBoard({ board, selectedSquare, legalTargets, lastMove, onSquarePress }: ChessBoardProps) {
  return (
    <View style={styles.board}>
      {board.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((piece, colIndex) => {
            const square = squareAt(rowIndex, colIndex);
            const isDark = (rowIndex + colIndex) % 2 === 1;
            const isSelected = square === selectedSquare;
            const isLegalTarget = legalTargets.includes(square);
            const isLastMove = square === lastMove?.from || square === lastMove?.to;

            return (
              <Pressable
                key={square}
                onPress={() => onSquarePress(square)}
                style={[
                  styles.square,
                  isDark ? styles.darkSquare : styles.lightSquare,
                  isLastMove && styles.lastMoveSquare,
                  isSelected && styles.selectedSquare,
                ]}
              >
                {piece && <Text style={styles.piece}>{PIECE_GLYPHS[piece.color][piece.type]}</Text>}
                {isLegalTarget && <View style={piece ? styles.captureDot : styles.moveDot} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const SQUARE_SIZE = 40;

const styles = StyleSheet.create({
  board: {
    width: SQUARE_SIZE * 8,
    height: SQUARE_SIZE * 8,
    borderWidth: 2,
    borderColor: '#4a3728',
  },
  row: {
    flexDirection: 'row',
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
  piece: {
    fontSize: SQUARE_SIZE * 0.7,
    lineHeight: SQUARE_SIZE * 0.85,
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
