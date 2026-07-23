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
  /** English name, shown small on cards and matched in search. */
  nameEn?: string;
  eco: string;
  category: OpeningCategory;
  /**
   * Which side the opening is curated for. `both` is for openings worth learning from either chair —
   * the Queen's Gambit is the same moves whether you push the c-pawn or decide how to meet it — and
   * puts the opening in both rows of the list, opening from whichever side it was entered.
   */
  sideToLearn: 'w' | 'b' | 'both';
  description: string;
  /** Extra search terms only — alternate spellings and nicknames people actually type
   *  ("지우코 피아노", "QGD"). Not shown anywhere; `name`/`nameEn` cover display. */
  aliases?: string[];
  /** Always non-empty, and the first entry is always the main line. */
  lines: OpeningLine[];
}

export const OPENINGS: Opening[] = [
  {
    id: 'ruy-lopez',
    name: '루이 로페즈 (스페인 게임)',
    nameEn: 'Ruy López (Spanish Game)',
    eco: 'C60',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '3.Bb5로 나이트를 공격하며 중앙을 압박하는 가장 클래식한 1.e4 오프닝.',
    aliases: ['루이로페즈', '스페인 게임', '스패니시', 'ruy lopez', 'spanish'],
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
    nameEn: 'Italian Game',
    eco: 'C50',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '비숍을 c4로 빠르게 전개해 f7을 노리는 초보자에게도 친숙한 오프닝.',
    aliases: ['이탈리안', '주오코 피아노', '주우코 피아노', '지우코 피아노', '조코 피아노', 'giuoco piano', 'italian'],
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
        id: 'evans-gambit',
        name: '에반스 갬빗',
        kind: 'variation',
        branchPly: 6,
        description: '4.b4로 폰을 던져 템포를 벌고 c3-d4로 거대한 중앙을 세우는 공격적인 변형.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O'],
      },
      // The Two Knights is a family, not one line: 3...Nf6 and then 4.Ng5 are each a fork the whole
      // theory hangs off, so both are lines in their own right that stop at the fork. The branches
      // below continue from them, and the trainer offers them there.
      {
        id: 'two-knights',
        name: '투 나이츠 디펜스',
        kind: 'variation',
        branchPly: 5,
        description: '3...Nf6로 방어 대신 e4를 맞받아 노리는 반격형 수비. 여기서 백은 4.Ng5로 f7을 즉시 치거나 4.d3로 조용히 갑니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
      },
      {
        id: 'knight-attack',
        name: '나이트 어택 (4.Ng5)',
        kind: 'variation',
        branchPly: 6,
        description: '나이트와 비숍이 f7을 두 겹으로 노립니다. 흑은 4...d5로 중앙을 열어 반격하고, 5.exd5 이후 흑의 선택에서 모든 갈래가 나뉩니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5'],
      },
      {
        id: 'traxler',
        name: '트랙슬러 카운터어택',
        kind: 'variation',
        branchPly: 7,
        description: '흑이 f7을 지키지 않고 4...Bc5로 맞받는 갬빗. 5.Nxf7은 혼란스러우니, 조용히 5.Bxf7+로 킹을 옮겨놓고 비숍을 빼는 쪽이 안전합니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'Bc5', 'Bxf7+', 'Ke7', 'Bd5', 'Rf8', 'O-O', 'd6', 'c3', 'Qe8', 'd4', 'Bb6'],
      },
      {
        id: 'polerio',
        name: '폴레리오 디펜스 (5...Na5)',
        kind: 'variation',
        branchPly: 9,
        description: '폰을 되찾는 대신 c4 비숍부터 쫓아내는 정석 대응. 흑은 폰 하나를 내주고 빠른 전개와 주도권을 가집니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Be2', 'h6', 'Nf3', 'e4', 'Ne5', 'Bd6'],
      },
      {
        id: 'ulvestad',
        name: '울베스타드 변형 (5...b5)',
        kind: 'variation',
        branchPly: 9,
        description: '폰을 하나 더 던져 c4 비숍의 대각선을 끊는 날카로운 시도. 백은 6.Bf1로 물러났다가 c3로 나이트를 쳐내며 정리합니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'b5', 'Bf1', 'Nd4', 'c3', 'Nxd5', 'cxd4', 'Qxg5', 'Bxb5+', 'Kd8', 'O-O', 'Bb7'],
      },
      {
        id: 'fritz',
        name: '프리츠 변형 (5...Nd4)',
        kind: 'variation',
        branchPly: 9,
        description: '나이트를 중앙에 박아 c2와 f3를 동시에 노리는 변형. 울베스타드와 수순만 바뀌어 같은 국면으로 넘어가는 일이 잦습니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nd4', 'c3', 'b5', 'Bf1', 'Nxd5', 'Ne4', 'Qh4', 'Ng3', 'Bg4', 'f3', 'e4', 'cxd4', 'Bd6'],
      },
      {
        id: 'fried-liver',
        name: '프라이드 리버 어택',
        kind: 'punish',
        branchPly: 9,
        description: '흑이 5...Nxd5로 폰을 되잡는 순간, 나이트를 f7에 희생해 흑 킹을 밖으로 끌어냅니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5?', 'Nxf7!!', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3', 'Nb4', 'Bb3!', 'c6', 'a3!'],
      },
    ],
  },
  {
    id: 'sicilian-najdorf',
    name: '시실리안 나이도르프',
    nameEn: 'Sicilian Defense, Najdorf Variation',
    eco: 'B90',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '흑이 비대칭적으로 c5로 맞서는 가장 인기 있는 시실리안 변형.',
    aliases: ['시실리안', '나이도르프', '나즈도르프', 'sicilian', 'najdorf'],
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
    nameEn: 'French Defense',
    eco: 'C00',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'e6로 단단하게 받고 d5로 중앙에 맞서는 견고한 방어 체계.',
    aliases: ['프렌치', '프랑스', 'french'],
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
    id: 'london-system',
    name: '런던 시스템',
    nameEn: 'London System',
    eco: 'D02',
    category: '플랭크 오프닝',
    sideToLearn: 'w',
    description: '상대의 응수와 무관하게 같은 구조를 세울 수 있는 실전적인 시스템 오프닝.',
    aliases: ['런던', 'london'],
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
    nameEn: 'Scotch Game',
    eco: 'C45',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '3.d4로 즉시 중앙을 여는 공격적인 오픈 게임.',
    aliases: ['스카치', 'scotch'],
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '중앙을 바로 열어 기물 싸움으로 끌고 갑니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3'],
      },
      {
        id: 'bc5',
        name: '4...Bc5 (클래시컬)',
        kind: 'variation',
        branchPly: 7,
        description: '비숍을 c5로 내며 d4 나이트를 노립니다. Be3로 받치고 c3-Bc4로 정리합니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4', 'O-O', 'O-O'],
      },
      {
        id: 'mieses',
        name: '미제스 변형 (5.Nxc6)',
        kind: 'variation',
        branchPly: 8,
        description: '나이트를 교환하고 e5로 밀어 흑 나이트를 쫓는 현대적 주 수순입니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5', 'Qe7', 'Qe2', 'Nd5', 'c4', 'Ba6'],
      },
      {
        id: 'steinitz',
        name: '슈타이니츠 변형 (4...Qh4)',
        kind: 'variation',
        branchPly: 7,
        description: '퀸을 일찍 꺼내 e4와 d4를 동시에 노립니다. Nb5로 c7을 노리며 응수합니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Qh4', 'Nb5', 'Bb4+', 'Bd2', 'Qxe4+', 'Be2', 'Kd8'],
      },
    ],
  },
  {
    id: 'kings-gambit',
    name: '킹스 갬빗',
    nameEn: 'King\'s Gambit',
    eco: 'C30',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '폰을 희생해 중앙과 초반 주도권을 얻는 낭만주의 시대의 공격적 오프닝.',
    aliases: ['킹스갬빗', '킹즈갬빗', 'kings gambit'],
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: 'f4 폰을 던져 중앙과 f파일을 얻습니다.',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5'],
      },
      {
        id: 'kieseritzky',
        name: '키제리츠키 갬빗',
        kind: 'variation',
        branchPly: 6,
        description: '4.h4로 g5를 흔들고 Ne5로 뛰어드는 킹스 갬빗의 고전 주 수순입니다.',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'h4', 'g4', 'Ne5', 'Nf6', 'd4', 'd6', 'Nd3', 'Nxe4', 'Bxf4', 'Qe7', 'Be2', 'Bg7'],
      },
      {
        id: 'declined',
        name: '킹스 갬빗 거절 (2...Bc5)',
        kind: 'variation',
        branchPly: 3,
        description: '폰을 받지 않고 비숍을 내미는 가장 견고한 거절. f2가 묶여 백은 캐슬링을 서두를 수 없습니다.',
        moves: ['e4', 'e5', 'f4', 'Bc5', 'Nf3', 'd6', 'Nc3', 'Nf6', 'Bc4', 'Nc6', 'd3', 'Bg4'],
      },
      {
        id: 'falkbeer',
        name: '팔크베어 카운터갬빗 (2...d5)',
        kind: 'variation',
        branchPly: 3,
        description: '폰으로 폰을 맞받아 중앙을 여는 반격. 백은 폰을 돌려주고 전개 우위를 노립니다.',
        moves: ['e4', 'e5', 'f4', 'd5', 'exd5', 'e4', 'd3', 'Nf6', 'dxe4', 'Nxe4', 'Nf3', 'c6', 'Bd3', 'cxd5', 'Bxe4', 'dxe4', 'Qxd8+', 'Kxd8'],
      },
    ],
  },
  {
    id: 'sicilian-dragon',
    name: '시실리안 드래곤',
    nameEn: 'Sicilian Defense, Dragon Variation',
    eco: 'B70',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'g6로 비숍을 피앙케토해 대각선을 장악하는 날카로운 시실리안 변형.',
    aliases: ['시실리안', '드래곤', '드라곤', 'sicilian', 'dragon'],
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
    nameEn: 'Caro-Kann Defense',
    eco: 'B10',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'c6로 d5를 지지하며 비숍 전개 문제를 해결하는 견실한 방어.',
    aliases: ['카로칸', '카로칸 디펜스', 'caro kann', 'carokann'],
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '비숍을 먼저 내보내고 폰 구조를 단단히 유지합니다.',
        moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
      },
      {
        id: 'advance',
        name: '어드밴스 변형 대응 (3.e5)',
        kind: 'variation',
        branchPly: 4,
        description: '백이 중앙을 막으면 흑은 Bf5로 나쁜 비숍을 먼저 빼내고 c5로 반격합니다.',
        moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'Be3', 'Nd7', 'O-O', 'Ne7'],
      },
      {
        id: 'panov',
        name: '파노프-보트비닉 어택 대응',
        kind: 'variation',
        branchPly: 4,
        description: '백이 c4로 고립폰 구조를 택하면, 흑은 Nf6와 e6로 d5를 단단히 받칩니다.',
        moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3', 'e6', 'Nf3', 'Be7', 'cxd5', 'Nxd5'],
      },
      {
        id: 'exchange',
        name: '교환 변형 대응 (4.Bd3)',
        kind: 'variation',
        branchPly: 4,
        description: '가장 조용한 갈래. 흑은 Nc6와 Bg4로 편하게 전개해 대칭 구조를 유지합니다.',
        moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Bd3', 'Nc6', 'c3', 'Nf6', 'Bf4', 'Bg4', 'Qb3', 'Qd7'],
      },
      {
        id: 'karpov',
        name: '카르포프 변형 (4...Nd7)',
        kind: 'variation',
        branchPly: 7,
        description: 'Bf5 대신 Nd7로 먼저 받쳐 g7 약점을 남기지 않는 견고한 선택입니다.',
        moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Nf3', 'Ngf6', 'Nxf6+', 'Nxf6', 'Bd3', 'Bg4'],
      },
    ],
  },
  {
    id: 'pirc-defense',
    name: '피르츠 디펜스',
    nameEn: 'Pirc Defense',
    eco: 'B07',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '중앙을 내주는 대신 피앙케토로 반격을 노리는 하이퍼모던 방어.',
    aliases: ['피르츠', '피르크', 'pirc'],
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
    nameEn: 'Scandinavian Defense',
    eco: 'B01',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '즉시 중앙에서 폰을 교환하고 퀸을 빠르게 꺼내는 직관적인 방어.',
    aliases: ['스칸디나비안', '스칸디', '센터 카운터', 'scandinavian', 'center counter'],
    lines: [
      {
        id: 'main',
        name: '메인라인',
        kind: 'main',
        branchPly: 0,
        description: '퀸을 a5로 빼 안전하게 자리 잡습니다.',
        moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'],
      },
      {
        id: 'qd6',
        name: '구빈스키-멜츠 (3...Qd6)',
        kind: 'variation',
        branchPly: 5,
        description: '퀸을 d6에 두어 a5보다 안전하게 배치하는 현대적 선택입니다.',
        moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd6', 'd4', 'Nf6', 'Nf3', 'c6', 'Ne5', 'Nbd7'],
      },
      {
        id: 'modern',
        name: '모던 (2...Nf6)',
        kind: 'variation',
        branchPly: 3,
        description: '퀸을 꺼내지 않고 나이트로 폰을 되찾는 갈래. 퀸이 쫓기지 않아 템포를 아낍니다.',
        moves: ['e4', 'd5', 'exd5', 'Nf6', 'd4', 'Nxd5', 'c4', 'Nb6', 'Nf3', 'g6', 'Nc3', 'Bg7'],
      },
    ],
  },
  {
    id: 'kings-indian-defense',
    name: '킹스 인디언 디펜스',
    nameEn: 'King\'s Indian Defense',
    eco: 'E60',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: '중앙을 내주고 피앙케토 비숍과 킹사이드 공격으로 반격하는 역동적 방어.',
    aliases: ['킹스인디언', 'KID', 'kings indian'],
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
    nameEn: 'Nimzo-Indian Defense',
    eco: 'E20',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: 'Bb4로 나이트를 핀하며 상대의 폰 구조를 흔드는 전략적인 방어.',
    aliases: ['님조인디언', '님조', 'nimzo indian', 'nimzo'],
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
    nameEn: 'Grünfeld Defense',
    eco: 'D80',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: '중앙을 내주고 d5로 즉시 반격해 상대 폰 중앙을 공격 목표로 삼는 방어.',
    aliases: ['그륀펠트', '그린펠트', 'grunfeld', 'gruenfeld', 'grunfeld defense'],
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
    nameEn: 'Queen\'s Indian Defense',
    eco: 'E12',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: 'b6로 비숍을 피앙케토해 e4 칸을 통제하는 유연한 방어.',
    aliases: ['퀸스인디언', 'QID', 'queens indian'],
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
    nameEn: 'Catalan Opening',
    eco: 'E00',
    category: '인디언 디펜스',
    sideToLearn: 'w',
    description: 'g3로 비숍을 피앙케토해 퀸스 갬빗과 인디언 구조를 결합한 오프닝.',
    aliases: ['카탈란', '카탈로니안', 'catalan'],
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
    nameEn: 'English Opening',
    eco: 'A10',
    category: '플랭크 오프닝',
    sideToLearn: 'w',
    description: '측면에서 중앙을 통제하며 다양한 구조로 전환할 수 있는 유연한 오프닝.',
    aliases: ['잉글리시', '잉글리쉬', 'english'],
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
  {
    id: 'owens-defense',
    name: '오웬 방어 대응',
    nameEn: 'Owen\'s Defense',
    eco: 'A40',
    category: '폐쇄 게임',
    sideToLearn: 'w',
    description: '흑이 1...b6로 비숍을 길게 놓는 변칙 수비. 백은 e4-Bd3로 중앙을 다 차지하고 시작합니다.',
    aliases: ['오웬', '오언', 'owen', 'owens'],
    lines: [
      {
        id: 'main',
        name: '메인 (3...e6)',
        kind: 'main',
        branchPly: 0,
        description: '흑이 e6로 비숍 길을 열어두는 정통 배치. 백은 Qe2와 e5로 공간을 굳힙니다.',
        moves: ['d4', 'b6', 'e4', 'Bb7', 'Bd3', 'e6', 'Nf3', 'Nf6', 'Qe2', 'd5', 'e5', 'Nfd7', 'O-O', 'c5', 'c3'],
      },
      {
        id: 'nf6',
        name: '3...Nf6 (e4 직접 압박)',
        kind: 'variation',
        branchPly: 5,
        description: 'e4를 바로 노리는 수. Qe2로 받치면 나이트는 아무것도 얻지 못합니다.',
        moves: ['d4', 'b6', 'e4', 'Bb7', 'Bd3', 'Nf6', 'Qe2', 'e6', 'Nf3', 'd5', 'e5', 'Nfd7', 'Ng5', 'Be7', 'Qg4'],
      },
      {
        id: 'g6',
        name: '3...g6 (이중 피안케토)',
        kind: 'variation',
        branchPly: 5,
        description: '양쪽 비숍을 다 눕히는 배치. 중앙을 통째로 내주므로 백은 c4까지 밀어 공간을 넓힙니다.',
        moves: ['d4', 'b6', 'e4', 'Bb7', 'Bd3', 'g6', 'Nf3', 'Bg7', 'O-O', 'd6', 'c4', 'Nd7', 'Nc3', 'e6'],
      },
      {
        id: 'f5-trap',
        name: '3...f5?? 응징 (8수 메이트)',
        kind: 'punish',
        branchPly: 5,
        description: 'g2 비숍을 노린 반격처럼 보이지만, 퀸 체크 한 방에 킹사이드가 열려 여덟 수 만에 메이트가 납니다.',
        moves: ['d4', 'b6', 'e4', 'Bb7', 'Bd3', 'f5??', 'exf5', 'Bxg2', 'Qh5+', 'g6', 'fxg6', 'Nf6', 'gxh7+', 'Nxh5', 'Bg6#'],
      },
    ],
  },
  {
    id: 'englund-gambit',
    name: '엥글룬드 갬빗',
    nameEn: 'Englund Gambit',
    eco: 'A40',
    category: '폐쇄 게임',
    sideToLearn: 'b',
    description: '1.d4에 e5로 폰을 던지는 기습 갬빗. 이론적으로는 백이 좋지만, 준비 없는 상대는 함정에 걸립니다.',
    aliases: ['엥글룬드', 'englund'],
    lines: [
      {
        id: 'main',
        name: '엥글룬드 갬빗 컴플렉스 (6.Nc3 정석)',
        kind: 'main',
        branchPly: 0,
        description: '백이 6.Nc3로 정확히 받으면 흑은 폰 하나를 잃은 채 퀸이 쫓깁니다. 갬빗의 대가를 먼저 알아두세요 — 통하지 않으면 이 국면이 됩니다.',
        moves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Nc3', 'Bb4', 'Rb1', 'Qa3', 'Nd5', 'Ba5', 'Rb5'],
      },
      {
        id: 'qc1-mate',
        name: '6.Bc3?? 응징 (Qc1 메이트)',
        kind: 'punish',
        branchPly: 10,
        description: '나이트 대신 비숍으로 받치면 그 자리에서 집니다. Bb4로 묶고, 백이 Qd2로 이으면 Qc1 메이트입니다.',
        moves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Bc3??', 'Bb4!', 'Qd2??', 'Bxc3', 'Qxc3', 'Qc1#'],
      },
      {
        id: 'hartlaub',
        name: '하틀라우프-찰릭 갬빗 (2...d6)',
        kind: 'variation',
        branchPly: 3,
        description: 'Nc6 대신 d6로 즉시 폰을 되찾으러 갑니다. 비숍이 d6로 나와 킹사이드를 겨눕니다.',
        moves: ['d4', 'e5', 'dxe5', 'd6', 'exd6', 'Bxd6', 'Nf3', 'Nf6', 'Nc3', 'O-O', 'g3', 'Re8'],
      },
      {
        id: 'soller',
        name: '졸러 갬빗 (2...f6)',
        kind: 'variation',
        branchPly: 3,
        description: 'f6로 중앙을 되받아 e파일을 여는 가장 날카로운 갈래. 폰 하나를 더 내줄 수도 있습니다.',
        moves: ['d4', 'e5', 'dxe5', 'f6', 'exf6', 'Nxf6', 'Nf3', 'Bc5', 'e3', 'O-O', 'Be2', 'd5'],
      },
    ],
  },
  {
    id: 'queens-gambit',
    name: '퀸스 갬빗',
    nameEn: 'Queen\'s Gambit',
    eco: 'D06',
    category: '폐쇄 게임',
    // 백·흑 공용: 폰을 내미는 쪽과 받는 쪽이 외워야 할 수순이 같은 라인이라, 한 오프닝을 양쪽에서 봅니다.
    sideToLearn: 'both',
    description: '1.d4 d5 2.c4로 c-폰을 내밀어 중앙 d5를 흔드는 폐쇄 게임의 기둥. 흑이 어떻게 받느냐(거절·수락·슬라브)에 따라 갈라지며, 백으로 들어가면 백 진영에서·흑으로 들어가면 흑 진영에서 같은 라인을 배웁니다.',
    aliases: [
      '퀸스갬빗', '퀸즈갬빗', 'queens gambit', 'QG', '디클라인', '어셉티드',
      '퀸스갬빗거절', 'QGD', 'queens gambit declined', 'D30',
      '퀸스갬빗수락', 'QGA', 'queens gambit accepted', 'D20',
      '슬라브', '슬라브 방어', '슬라브 디펜스', 'slav', 'slav defense', 'D10',
      '타라시', 'tarrasch', '엘리펀트 트랩', 'elephant trap',
    ],
    lines: [
      {
        id: 'declined',
        name: '거절 (2...e6)',
        kind: 'main',
        branchPly: 0,
        description: '흑이 2...e6로 폰을 지키며 거절하는 가장 흔한 선택. 백은 Nc3·Bg5로 압박하며 e3로 견고하게 전개하고, 흑은 d5를 절대 내주지 않고 버틴 뒤 기물을 다 편 다음 c5나 e5로 중앙을 푸는 것이 계획입니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O', 'Nf3', 'h6', 'Bh4', 'b6'],
      },
      {
        id: 'accepted',
        name: '수락 (2...dxc4)',
        kind: 'variation',
        branchPly: 3,
        description: '흑이 c4 폰을 잡아 수락하는 변형. 백은 폰을 서둘러 되찾지 않고 e3·Bxc4로 중앙을 세운 뒤 자연스럽게 회수하고, 흑도 폰을 지키려 들지 말고 전개에 씁니다.',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6', 'dxc5', 'Bxc5'],
      },
      {
        id: 'slav',
        name: '슬라브 (2...c6)',
        kind: 'variation',
        branchPly: 3,
        description: '흑이 2...c6로 폰을 지키며 비숍 길을 막지 않는 슬라브. 백은 Nc3·Nf3로 전개하고 a4로 흑의 ...b5 확장을 견제합니다.',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4'],
      },
      {
        id: 'albin',
        name: '알빈 카운터갬빗 (2...e5)',
        kind: 'variation',
        branchPly: 3,
        description: '흑이 2...e5로 맞받아치는 갬빗. 백은 dxe5로 폰을 받고 g3·Bg2로 d4 폰을 압박하며 무리 없이 우위를 지킵니다.',
        moves: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'Nf3', 'Nc6', 'g3', 'Bg4', 'Bg2', 'Qd7', 'O-O', 'O-O-O'],
      },
      {
        id: 'exchange',
        name: '교환 변형 (6.cxd5)',
        kind: 'variation',
        branchPly: 6,
        description: '거절 라인에서 백이 cxd5로 교환하면 "미노리티 어택"이 옵니다. 백은 b4-b5로 c6 폰을 약하게 만들고, 흑은 킹사이드에서 기물 활동으로 맞섭니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'c6', 'Bd3', 'Nbd7'],
      },
      {
        id: 'tarrasch',
        name: '타라시 디펜스 (3...c5)',
        kind: 'variation',
        branchPly: 5,
        description: '흑이 c5로 즉시 중앙에 맞서는 적극적인 선택. 고립 폰을 감수하고 기물 활동성을 얻습니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c5', 'cxd5', 'exd5', 'Nf3', 'Nc6', 'g3', 'Nf6', 'Bg2', 'Be7'],
      },
      {
        id: 'elephant-trap',
        name: '엘리펀트 트랩',
        kind: 'punish',
        branchPly: 7,
        description: '백이 6.Nxd5로 폰을 공짜로 먹으려 드는 순간, 흑이 기물 하나를 통째로 벌어옵니다. 백이라면 절대 걸리지 말아야 할 함정입니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5', 'Nxd5??', 'Nxd5!', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'],
      },
    ],
  },
];

export const OPENING_CATEGORIES: OpeningCategory[] = ['오픈 게임', '세미 오픈 게임', '폐쇄 게임', '인디언 디펜스', '플랭크 오프닝'];

export function getOpeningById(id: string): Opening | undefined {
  return OPENINGS.find((opening) => opening.id === id);
}

/** The rows of the opening list this opening belongs to — two of them when it's worth both sides. */
export function learnSides(opening: Opening): Array<'w' | 'b'> {
  return opening.sideToLearn === 'both' ? ['w', 'b'] : [opening.sideToLearn];
}

/** The side to open the board from when the opening was picked without a row to pick it from. */
export function defaultSide(opening: Opening): 'w' | 'b' {
  return opening.sideToLearn === 'b' ? 'b' : 'w';
}

export function sideLabel(opening: Opening): string {
  return learnSides(opening)
    .map((side) => (side === 'w' ? '백' : '흑'))
    .join('·');
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
