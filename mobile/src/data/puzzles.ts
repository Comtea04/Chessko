export type PuzzleTheme = 'mate-in-1' | 'mate-in-2';

export interface Puzzle {
  id: string;
  /** Always white to move. */
  fen: string;
  /** Full line in SAN: the solver's moves at even indexes, the forced reply at odd indexes. */
  solution: string[];
  theme: PuzzleTheme;
  /** 1 = easiest, 3 = hardest. */
  difficulty: 1 | 2 | 3;
}

export const PUZZLE_THEME_LABELS: Record<PuzzleTheme, string> = {
  'mate-in-1': '1수 메이트',
  'mate-in-2': '2수 메이트',
};

/**
 * Composed positions, each verified with chess.js: the solver's move is the *only* move that
 * mates, and every mate-in-2 leaves black exactly one legal reply — which is what lets the
 * trainer auto-play the opponent from this fixed SAN line.
 */
export const PUZZLES: Puzzle[] = [
  {
    id: 'mate-in-1-01',
    fen: '6R1/8/3B1K2/7k/6b1/8/8/8 w - - 0 1',
    solution: ['Rh8#'],
    theme: 'mate-in-1',
    difficulty: 1,
  },
  {
    id: 'mate-in-1-02',
    fen: '3K4/1Q6/8/5r2/k1b5/2P5/8/8 w - - 0 1',
    solution: ['Qb4#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-03',
    fen: '3K1k2/8/6Q1/1R6/8/8/1P3p2/8 w - - 0 1',
    solution: ['Rf5#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-04',
    fen: 'b7/P7/8/8/1K6/1Q4B1/8/2k5 w - - 0 1',
    solution: ['Bf4#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-05',
    fen: '8/8/4n3/RK6/R7/8/4Q3/2k5 w - - 0 1',
    solution: ['Ra1#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-06',
    fen: '5r1n/8/1R6/3R4/k5K1/8/2N5/8 w - - 0 1',
    solution: ['Rb4#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-07',
    fen: '5N2/8/8/B7/7k/N7/4Qp1K/8 w - - 0 1',
    solution: ['Bd8#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-08',
    fen: '5K2/8/8/3R2R1/1p2k3/7b/8/5R2 w - - 0 1',
    solution: ['Rge5#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-09',
    fen: '8/8/6N1/6p1/2NK3N/8/5Q2/1k6 w - - 0 1',
    solution: ['Qb2#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-10',
    fen: '8/1p1n4/6R1/8/4P2k/3K4/8/R7 w - - 0 1',
    solution: ['Rh1#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-11',
    fen: '8/8/5R2/6K1/3R3P/1k6/7Q/r7 w - - 0 1',
    solution: ['Rf3#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-12',
    fen: '3K4/6R1/2Q1B3/8/1p6/1N6/7k/8 w - - 0 1',
    solution: ['Qg2#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-13',
    fen: '8/7K/4R3/6R1/8/r2p4/7k/1R6 w - - 0 1',
    solution: ['Rh6#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-14',
    fen: 'r7/8/1q1N4/2Q5/k7/8/5B2/1Q3K2 w - - 0 1',
    solution: ['Qa2#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-15',
    fen: '8/5rPk/1Q6/8/6R1/2K5/5r2/2N5 w - - 0 1',
    solution: ['g8=Q#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-16',
    fen: '1k6/1B6/3Kp3/4N3/5pB1/8/8/1R6 w - - 0 1',
    solution: ['Nc6#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-17',
    fen: '3Q4/4B3/3R4/8/8/p4Kn1/2B4b/5k2 w - - 0 1',
    solution: ['Rd1#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-1-18',
    fen: '1k3n2/1N6/8/3QK3/8/n4Bp1/5B2/8 w - - 0 1',
    solution: ['Qd8#'],
    theme: 'mate-in-1',
    difficulty: 2,
  },
  {
    id: 'mate-in-2-01',
    fen: '4B1k1/8/5K2/7Q/8/8/8/2r5 w - - 0 1',
    solution: ['Qf7+', 'Kh8', 'Qg7#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-02',
    fen: '7k/8/8/R5r1/3K4/8/8/2R5 w - - 0 1',
    solution: ['Rxg5', 'Kh7', 'Rh1#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-03',
    fen: '4k3/8/8/p1Q5/8/5R2/2K5/8 w - - 0 1',
    solution: ['Qd6', 'a4', 'Rf8#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-04',
    fen: '7K/b7/8/8/1R6/6k1/4Q3/6b1 w - - 0 1',
    solution: ['Rg4+', 'Kh3', 'Qg2#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-05',
    fen: '6k1/1n1B4/5P2/8/8/7R/8/6K1 w - - 0 1',
    solution: ['Be6+', 'Kf8', 'Rh8#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-06',
    fen: '4N2k/4N3/1B4P1/1K6/4n3/8/8/8 w - - 0 1',
    solution: ['Bd4+', 'Nf6', 'Bxf6#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-07',
    fen: 'k7/8/6N1/5Qp1/K7/1N6/8/4B3 w - - 0 1',
    solution: ['Qc8+', 'Ka7', 'Bf2#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-08',
    fen: '2k5/8/P7/5n2/7R/3K4/7R/1Q6 w - - 0 1',
    solution: ['Qb7+', 'Kd8', 'Rh8#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-09',
    fen: '7k/1R6/2R5/2R5/4qp2/3p4/8/2K5 w - - 0 1',
    solution: ['Rc8+', 'Qe8', 'Rxe8#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-10',
    fen: '7Q/8/3k2N1/8/5K2/2R5/1p6/1bR5 w - - 0 1',
    solution: ['Qe5+', 'Kd7', 'Qe7#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-11',
    fen: '7k/3n4/5R1b/8/K7/8/8/B1B2R2 w - - 0 1',
    solution: ['Rxh6+', 'Kg8', 'Rh8#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
  {
    id: 'mate-in-2-12',
    fen: '2k4N/8/K2p2R1/8/Q7/8/3Nn3/5b2 w - - 0 1',
    solution: ['Qe8+', 'Kc7', 'Rg7#'],
    theme: 'mate-in-2',
    difficulty: 3,
  },
];

export function getPuzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((puzzle) => puzzle.id === id);
}
