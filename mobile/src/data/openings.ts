export type OpeningCategory = '오픈 게임' | '세미 오픈 게임' | '폐쇄 게임' | '인디언 디펜스' | '플랭크 오프닝';

/**
 * `main` is the line to learn first, `variation` a respectable alternative the opponent may steer
 * into, and `punish` a line that starts with a mistake the opponent actually plays at club level
 * and shows how to take advantage of it.
 */
export type LineKind = 'main' | 'variation' | 'punish';

export type MoveQuality = 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/** Suffixes are matched longest-first, so `??` never parses as `?`. */
const QUALITY_SUFFIXES: [string, MoveQuality][] = [
  ['!!', 'brilliant'],
  ['?!', 'inaccuracy'],
  ['??', 'blunder'],
  ['!', 'best'],
  ['?', 'mistake'],
];

export interface OpeningLine {
  id: string;
  name: string;
  kind: LineKind;
  description: string;
  /** Ply index at which this line leaves the main line; 0 for the main line itself. */
  branchPly: number;
  /**
   * SAN from the start position. A move may carry a `!!`/`!`/`?!`/`?`/`??` suffix, which pins the
   * grade shown for it and overrides the engine's own verdict — Stockfish rates a move by how much
   * evaluation it drops, which cannot recognise a sacrifice as brilliant or a book move as the
   * point of the line.
   */
  moves: string[];
  /** Set on branches merged in from `openingBranches.json` — kept out of the line list so it doesn't
   *  grow unbounded; these surface contextually (as opponent-reply choices), by being played into. */
  authored?: boolean;
}

export interface Opening {
  id: string;
  name: string;
  eco: string;
  category: OpeningCategory;
  sideToLearn: 'w' | 'b';
  description: string;
  /** Always non-empty, and the first entry is always the main line. */
  lines: OpeningLine[];
}

export const OPENINGS: Opening[] = [
  {
    id: 'ruy-lopez',
    name: '루이 로페즈 (스페인 게임)',
    eco: 'C60',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '3.Bb5로 나이트를 공격하며 중앙을 압박하는 가장 클래식한 1.e4 오프닝.',
    lines: [
      {
        id: 'closed',
        name: '클로즈드 메인라인',
        kind: 'main',
        branchPly: 0,
        description: '흑이 a6와 b5로 비숍을 밀어내면 백은 c3와 d4로 중앙을 크게 세웁니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O'],
      },
      {
        id: 'berlin',
        name: '베를린 방어',
        kind: 'variation',
        branchPly: 5,
        description: '흑이 a6 대신 3...Nf6로 e4를 바로 노리는 현대적인 선택. 퀸이 교환되며 엔드게임으로 향합니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8'],
      },
      {
        id: 'exchange',
        name: '교환 변형',
        kind: 'variation',
        branchPly: 6,
        description: '4.Bxc6로 바로 잡아 흑의 폰 구조를 망가뜨리고 엔드게임을 노리는 실전적인 선택.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'f6', 'd4', 'exd4', 'Nxd4'],
      },
      {
        id: 'weak-f6',
        name: '3...f6?! 응징',
        kind: 'punish',
        branchPly: 5,
        description: 'e5를 폰으로 지키려는 초보의 본능적인 수. 즉시 d4로 중앙을 열어젖히면 흑 킹사이드가 무너집니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f6?!', 'd4!', 'exd4', 'Nxd4', 'Bb4+', 'c3', 'Nxd4', 'Qxd4', 'Ba5', 'Bc4'],
      },
    ],
  },
  {
    id: 'italian-game',
    name: '이탈리안 게임',
    eco: 'C50',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '비숍을 c4로 빠르게 전개해 f7을 노리는 초보자에게도 친숙한 오프닝.',
    lines: [
      {
        id: 'giuoco-piano',
        name: '주오코 피아노',
        kind: 'main',
        branchPly: 0,
        description: 'c3와 d3로 중앙을 천천히 쌓아 올리는 조용하고 견고한 메인라인.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'],
      },
      {
        id: 'two-knights',
        name: '투 나이츠 디펜스',
        kind: 'variation',
        branchPly: 5,
        description: '흑이 3...Nf6로 e4를 노리면, 4.Ng5로 f7을 즉시 공격하는 날카로운 국면이 됩니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Be2', 'h6', 'Nf3', 'e4', 'Ne5', 'Bd6'],
      },
      {
        id: 'evans-gambit',
        name: '에반스 갬빗',
        kind: 'variation',
        branchPly: 6,
        description: '4.b4로 폰을 던져 템포를 벌고 c3-d4로 거대한 중앙을 세우는 공격적인 변형.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O'],
      },
      {
        id: 'fried-liver',
        name: '프라이드 리버 어택',
        kind: 'punish',
        branchPly: 9,
        description: '흑이 5...Nxd5로 폰을 되잡는 순간, 나이트를 f7에 희생해 흑 킹을 밖으로 끌어냅니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5?', 'Nxf7!!', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3', 'Ncb4', 'Bb3!', 'c6', 'a3!'],
      },
    ],
  },
  {
    id: 'sicilian-najdorf',
    name: '시실리안 나이도르프',
    eco: 'B90',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '흑이 비대칭적으로 c5로 맞서는 가장 인기 있는 시실리안 변형.',
    lines: [
      {
        id: 'english-attack',
        name: '잉글리시 어택 대응 (6.Be3)',
        kind: 'main',
        branchPly: 0,
        description: '5...a6로 b5 칸을 통제한 뒤 e5로 중앙을 밀고 백의 킹사이드 폭풍에 맞섭니다.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3', 'Be7', 'Qd2', 'O-O'],
      },
      {
        id: 'classical-bg5',
        name: '6.Bg5 고전 변형',
        kind: 'variation',
        branchPly: 10,
        description: '백이 f6 나이트를 핀하며 가장 날카롭게 나오는 라인. 흑은 e6와 Be7로 침착하게 받습니다.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6', 'f4', 'Be7', 'Qf3', 'Qc7', 'O-O-O', 'Nbd7'],
      },
      {
        id: 'classical-be2',
        name: '6.Be2 클래시컬',
        kind: 'variation',
        branchPly: 10,
        description: '백이 조용히 전개하면 흑도 e5로 중앙을 잡고 편안한 국면을 얻습니다.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6'],
      },
      {
        id: 'early-queen',
        name: '4.Qxd4?! 조기 퀸 전개 응징',
        kind: 'punish',
        branchPly: 6,
        description: '백이 나이트 대신 퀸으로 되잡는 흔한 실수. Nc6로 퀸을 쫓으며 템포를 벌고 앞서 전개합니다.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Qxd4?!', 'Nc6!', 'Bb5', 'Bd7', 'Bxc6', 'Bxc6', 'Nc3', 'Nf6', 'O-O', 'e6'],
      },
    ],
  },
  {
    id: 'french-defense',
    name: '프랑스 디펜스',
    eco: 'C00',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'e6로 단단하게 받고 d5로 중앙에 맞서는 견고한 방어 체계.',
    lines: [
      {
        id: 'classical',
        name: '클래시컬 (4.Bg5)',
        kind: 'main',
        branchPly: 0,
        description: '핀을 Be7로 풀고, 백의 e5 폰 사슬 뿌리인 d4를 c5로 공격하는 정통 계획.',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7', 'Bxe7', 'Qxe7', 'f4', 'O-O', 'Nf3', 'c5'],
      },
      {
        id: 'winawer',
        name: '윈아버 (3...Bb4)',
        kind: 'variation',
        branchPly: 5,
        description: '나이트를 핀해 백의 폰 구조를 망가뜨리는 대신 비숍을 내주는 날카로운 변형.',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7', 'Qg4', 'O-O'],
      },
      {
        id: 'advance',
        name: '어드밴스 변형 대응 (3.e5)',
        kind: 'variation',
        branchPly: 4,
        description: '백이 중앙을 닫으면 흑은 c5와 Qb6로 d4를 집요하게 공격합니다.',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Be2', 'Nh6'],
      },
      {
        id: 'premature-dxc5',
        name: '4.dxc5?! 중앙 포기 응징',
        kind: 'punish',
        branchPly: 6,
        description: '백이 c5 폰을 덥석 잡는 흔한 실수. 비숍이 공짜로 좋은 자리에 전개되고 백의 중앙은 무너집니다.',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'dxc5?!', 'Bxc5!', 'Nf3', 'Nc6', 'Bd3', 'f6!', 'Qe2', 'fxe5', 'Nxe5', 'Nxe5', 'Qxe5', 'Nf6'],
      },
    ],
  },
  {
    id: 'queens-gambit-declined',
    name: '퀸스 갬빗 거절',
    eco: 'D30',
    category: '폐쇄 게임',
    sideToLearn: 'b',
    description: '갬빗 폰을 받지 않고 e6로 중앙 구조를 단단히 지키는 클래식 방어.',
    lines: [
      {
        id: 'orthodox',
        name: '오소독스 메인라인',
        kind: 'main',
        branchPly: 0,
        description: 'd5를 절대 내주지 않고 버틴 뒤, 기물을 다 편 다음 c5나 e5로 중앙을 푸는 것이 계획입니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6'],
      },
      {
        id: 'exchange',
        name: '교환 변형 대응',
        kind: 'variation',
        branchPly: 6,
        description: '백이 cxd5로 교환하면 "미노리티 어택"이 옵니다. 흑은 킹사이드에서 기물 활동으로 맞섭니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'c6', 'Bd3', 'Nbd7'],
      },
      {
        id: 'tarrasch',
        name: '타라시 디펜스',
        kind: 'variation',
        branchPly: 5,
        description: 'c5로 즉시 중앙에 맞서는 적극적인 선택. 고립 폰을 감수하고 기물 활동성을 얻습니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c5', 'cxd5', 'exd5', 'Nf3', 'Nc6', 'g3', 'Nf6', 'Bg2', 'Be7'],
      },
      {
        id: 'elephant-trap',
        name: '엘리펀트 트랩',
        kind: 'punish',
        branchPly: 10,
        description: '백이 6.Nxd5로 폰을 공짜로 먹으려 드는 순간, 기물 하나를 통째로 벌어옵니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5', 'Nxd5??', 'Nxd5!', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'],
      },
    ],
  },
  {
    id: 'london-system',
    name: '런던 시스템',
    eco: 'D02',
    category: '플랭크 오프닝',
    sideToLearn: 'w',
    description: '상대의 응수와 무관하게 같은 구조를 세울 수 있는 실전적인 시스템 오프닝.',
    lines: [
      {
        id: 'main-setup',
        name: '기본 셋업',
        kind: 'main',
        branchPly: 0,
        description: 'Bf4-e3-c3-Nbd2-Bd3의 피라미드 구조. 상대가 뭘 두든 거의 같은 순서로 세웁니다.',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'c5', 'c3', 'Nc6', 'Nbd2', 'Bd6', 'Bg3', 'O-O', 'Bd3'],
      },
      {
        id: 'vs-kings-indian',
        name: '킹스 인디언 셋업 대응',
        kind: 'variation',
        branchPly: 1,
        description: '흑이 피앙케토로 나오면 h3를 끼워 비숍의 후퇴로를 미리 확보합니다.',
        moves: ['d4', 'Nf6', 'Nf3', 'g6', 'Bf4', 'Bg7', 'e3', 'O-O', 'h3', 'd6', 'Be2', 'Nbd7', 'O-O', 'Re8', 'c4'],
      },
      {
        id: 'early-qb6',
        name: '조기 ...Qb6 대응',
        kind: 'variation',
        branchPly: 7,
        description: 'b2를 노리는 가장 성가신 수. Qc1으로 조용히 받치면 위협이 통째로 사라집니다.',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Qb6', 'Qc1!', 'Nc6', 'c3', 'Bf5', 'Be2', 'e6', 'O-O'],
      },
      {
        id: 'poisoned-b2',
        name: 'b2 독 폰 응징',
        kind: 'punish',
        branchPly: 9,
        description: '상대가 b2 폰을 덥석 물면, 퀸을 쫓아다니며 전개를 통째로 앞서갑니다.',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3!', 'Qxb2??', 'Nb5!', 'Na6', 'a3!', 'Bf5', 'dxc5'],
      },
    ],
  },
  {
    id: 'scotch-game',
    name: '스카치 게임',
    eco: 'C45',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '3.d4로 즉시 중앙을 여는 공격적인 오픈 게임.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '중앙을 바로 열어 기물 싸움으로 끌고 갑니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3'],
      },
    ],
  },
  {
    id: 'kings-gambit',
    name: '킹스 갬빗',
    eco: 'C30',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '폰을 희생해 중앙과 초반 주도권을 얻는 낭만주의 시대의 공격적 오프닝.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: 'f4 폰을 던져 중앙과 f파일을 얻습니다.',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5'],
      },
    ],
  },
  {
    id: 'sicilian-dragon',
    name: '시실리안 드래곤',
    eco: 'B70',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'g6로 비숍을 피앙케토해 대각선을 장악하는 날카로운 시실리안 변형.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '긴 대각선을 잡고 c파일에서 반격합니다.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
      },
    ],
  },
  {
    id: 'caro-kann',
    name: '카로칸 디펜스',
    eco: 'B10',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'c6로 d5를 지지하며 비숍 전개 문제를 해결하는 견실한 방어.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '비숍을 먼저 내보내고 폰 구조를 단단히 유지합니다.',
        moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
      },
    ],
  },
  {
    id: 'pirc-defense',
    name: '피르츠 디펜스',
    eco: 'B07',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '중앙을 내주는 대신 피앙케토로 반격을 노리는 하이퍼모던 방어.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '중앙을 내주고 나중에 기물로 되칩니다.',
        moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Nf3', 'Bg7'],
      },
    ],
  },
  {
    id: 'scandinavian-defense',
    name: '스칸디나비안 디펜스',
    eco: 'B01',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '즉시 중앙에서 폰을 교환하고 퀸을 빠르게 꺼내는 직관적인 방어.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '퀸을 a5로 빼 안전하게 자리 잡습니다.',
        moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'],
      },
    ],
  },
  {
    id: 'queens-gambit-accepted',
    name: '퀸스 갬빗 수락',
    eco: 'D20',
    category: '폐쇄 게임',
    sideToLearn: 'b',
    description: 'c4 폰을 잡고 나중에 되찾으며 빠른 전개를 노리는 변형.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '폰을 잡되 지키려 하지 말고 전개에 씁니다.',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6'],
      },
    ],
  },
  {
    id: 'slav-defense',
    name: '슬라브 디펜스',
    eco: 'D10',
    category: '폐쇄 게임',
    sideToLearn: 'b',
    description: 'c6로 d5를 지지해 비숍 전개 문제 없이 중앙을 지키는 견고한 체계.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '비숍 길을 막지 않고 중앙을 받칩니다.',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'],
      },
    ],
  },
  {
    id: 'kings-indian-defense',
    name: '킹스 인디언 디펜스',
    eco: 'E60',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: '중앙을 내주고 피앙케토 비숍과 킹사이드 공격으로 반격하는 역동적 방어.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '캐슬링을 마치고 e5나 c5로 중앙을 칩니다.',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O'],
      },
    ],
  },
  {
    id: 'nimzo-indian-defense',
    name: '님조 인디언 디펜스',
    eco: 'E20',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: 'Bb4로 나이트를 핀하며 상대의 폰 구조를 흔드는 전략적인 방어.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '나이트를 핀해 e4를 막습니다.',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
      },
    ],
  },
  {
    id: 'grunfeld-defense',
    name: '그린펠트 디펜스',
    eco: 'D80',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: '중앙을 내주고 d5로 즉시 반격해 상대 폰 중앙을 공격 목표로 삼는 방어.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '백 중앙을 세우게 한 뒤 목표물로 삼습니다.',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
      },
    ],
  },
  {
    id: 'queens-indian-defense',
    name: '퀸스 인디언 디펜스',
    eco: 'E12',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: 'b6로 비숍을 피앙케토해 e4 칸을 통제하는 유연한 방어.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: 'e4 칸을 비숍으로 통제합니다.',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'],
      },
    ],
  },
  {
    id: 'catalan-opening',
    name: '카탈란 오프닝',
    eco: 'E00',
    category: '인디언 디펜스',
    sideToLearn: 'w',
    description: 'g3로 비숍을 피앙케토해 퀸스 갬빗과 인디언 구조를 결합한 오프닝.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '긴 대각선의 비숍이 오프닝 내내 압박합니다.',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7'],
      },
    ],
  },
  {
    id: 'english-opening',
    name: '잉글리시 오프닝',
    eco: 'A10',
    category: '플랭크 오프닝',
    sideToLearn: 'w',
    description: '측면에서 중앙을 통제하며 다양한 구조로 전환할 수 있는 유연한 오프닝.',
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '측면 폰으로 d5를 통제합니다.',
        moves: ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'],
      },
    ],
  },
];

export const OPENING_CATEGORIES: OpeningCategory[] = ['오픈 게임', '세미 오픈 게임', '폐쇄 게임', '인디언 디펜스', '플랭크 오프닝'];

export function getOpeningById(id: string): Opening | undefined {
  return OPENINGS.find((opening) => opening.id === id);
}

export function getLine(opening: Opening, lineId: string): OpeningLine {
  return opening.lines.find((line) => line.id === lineId) ?? opening.lines[0];
}

/** The SAN chess.js understands, with any `!`/`?` annotation suffix removed. */
export function plainSan(move: string): string {
  return move.replace(/[!?]+$/, '');
}

/** The grade the line's author pinned on this move, if any. */
export function authoredQuality(move: string): MoveQuality | undefined {
  const suffix = move.match(/[!?]+$/)?.[0];
  return suffix ? QUALITY_SUFFIXES.find(([token]) => token === suffix)?.[1] : undefined;
}

/** Identifies a line across the whole data set — the key the generated engine data is stored under. */
export function lineKey(openingId: string, lineId: string): string {
  return `${openingId}:${lineId}`;
}
