import type { PieceSymbol } from 'chess.js';

export const PIECE_IMAGES: Partial<Record<'w' | 'b', Partial<Record<PieceSymbol, any>>>> = {
  w: {
    k: require('../../assets/pieces/wK.png'),
    q: require('../../assets/pieces/wQ.png'),
    r: require('../../assets/pieces/wR.png'),
    b: require('../../assets/pieces/wB.png'),
    n: require('../../assets/pieces/wN.png'),
    p: require('../../assets/pieces/wP.png'),
  },
  b: {
    k: require('../../assets/pieces/bK.png'),
    q: require('../../assets/pieces/bQ.png'),
    r: require('../../assets/pieces/bR.png'),
    b: require('../../assets/pieces/bB.png'),
    n: require('../../assets/pieces/bN.png'),
    p: require('../../assets/pieces/bP.png'),
  },
};
