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
  /** Ply index → the one line of Korean shown while that move sits on the board. */
  notes?: Record<number, string>;
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
        notes: {
          4: '나이트를 핀처럼 압박합니다. 지금 당장 Bxc6로 잡는 수는 없지만, e5를 지키는 나이트를 계속 노립니다.',
          6: '아직 잡지 않고 물러납니다. a4-b3 대각선에 남아 f7과 중앙을 계속 겨눕니다.',
          10: 'e4 폰을 지키면서 e파일을 미리 잡아둡니다. 이 수가 있어야 나중에 d4를 안심하고 둘 수 있습니다.',
          14: '루이 로페즈의 핵심 구조. c3로 d4를 준비하고, 비숍이 밀려나면 c2로 후퇴할 길도 열어둡니다.',
        },
      },
      {
        id: 'berlin',
        name: '베를린 방어',
        kind: 'variation',
        branchPly: 5,
        description: '흑이 a6 대신 3...Nf6로 e4를 바로 노리는 현대적인 선택. 퀸이 교환되며 엔드게임으로 향합니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6', 'Bxc6', 'dxc6', 'dxe5', 'Nf5', 'Qxd8+', 'Kxd8'],
        notes: {
          5: '흑이 a6를 생략하고 e4 폰을 직접 노립니다.',
          7: '폰을 내주는 대신 d4로 중앙을 여는 것이 정석입니다. 폰은 곧 되찾습니다.',
          14: '퀸을 교환해 흑의 캐슬링을 영구히 빼앗습니다. 대신 흑은 비숍 두 개를 가집니다 — 유명한 "베를린 엔드게임".',
        },
      },
      {
        id: 'exchange',
        name: '교환 변형',
        kind: 'variation',
        branchPly: 6,
        description: '4.Bxc6로 바로 잡아 흑의 폰 구조를 망가뜨리고 엔드게임을 노리는 실전적인 선택.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6', 'O-O', 'f6', 'd4', 'exd4', 'Nxd4'],
        notes: {
          6: '흑의 킹사이드 폰 구조를 더블 폰으로 만듭니다. 대신 흑은 비숍 두 개를 얻습니다.',
          9: '기물 교환이 진행될수록 백의 건강한 폰 구조가 유리해집니다. 엔드게임을 목표로 두세요.',
        },
      },
      {
        id: 'weak-f6',
        name: '3...f6?! 응징',
        kind: 'punish',
        branchPly: 5,
        description: 'e5를 폰으로 지키려는 초보의 본능적인 수. 즉시 d4로 중앙을 열어젖히면 흑 킹사이드가 무너집니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f6?!', 'd4!', 'exd4', 'Nxd4', 'Bb4+', 'c3', 'Nxd4', 'Qxd4', 'Ba5', 'Bc4'],
        notes: {
          5: 'e5를 지키긴 하지만 킹 앞을 열고 g8 나이트의 자리를 빼앗습니다. 전개는 한 수도 진행되지 않았습니다.',
          6: '벌을 주는 방법은 폰을 세는 게 아니라 판을 여는 것입니다. 흑이 전개가 늦은 지금이 중앙을 열 최적의 순간입니다.',
          12: '퀸이 중앙을 지배하고 흑 킹은 아직 판 한가운데 서 있습니다. 백이 확실히 유리합니다.',
        },
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
        notes: {
          4: '가장 약한 칸인 f7을 겨냥하며 전개합니다.',
          6: 'd4를 준비하는 수. 서두르지 않고 중앙을 준비합니다.',
          8: '"조용한 이탈리안". d4로 즉시 여는 대신 d3로 받쳐 장기전 구조를 만듭니다.',
        },
      },
      {
        id: 'two-knights',
        name: '투 나이츠 디펜스',
        kind: 'variation',
        branchPly: 5,
        description: '흑이 3...Nf6로 e4를 노리면, 4.Ng5로 f7을 즉시 공격하는 날카로운 국면이 됩니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Be2', 'h6', 'Nf3', 'e4', 'Ne5', 'Bd6'],
        notes: {
          6: 'f7을 두 겹으로 노립니다. 초보 상대는 여기서 무너지지만, 준비된 흑은 d5로 반격합니다.',
          9: '정확한 대응. 흑은 폰을 되찾는 대신 c4 비숍을 쫓아냅니다.',
          13: '흑이 폰 하나를 내주고 빠른 전개와 주도권을 가진 국면. 백은 침착하게 기물을 빼내면 폰 하나가 남습니다.',
        },
      },
      {
        id: 'evans-gambit',
        name: '에반스 갬빗',
        kind: 'variation',
        branchPly: 6,
        description: '4.b4로 폰을 던져 템포를 벌고 c3-d4로 거대한 중앙을 세우는 공격적인 변형.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4', 'exd4', 'O-O'],
        notes: {
          6: '폰을 공짜로 줍니다. 목적은 비숍을 유인해 c3-d4로 템포를 벌며 중앙을 세우는 것입니다.',
          10: '이것이 폰의 대가입니다. 백은 중앙을 완전히 장악하고 빠른 전개로 공격을 시작합니다.',
        },
      },
      {
        id: 'fried-liver',
        name: '프라이드 리버 어택',
        kind: 'punish',
        branchPly: 9,
        description: '흑이 5...Nxd5로 폰을 되잡는 순간, 나이트를 f7에 희생해 흑 킹을 밖으로 끌어냅니다.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5?', 'Nxf7!!', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3', 'Ncb4', 'Bb3!', 'c6', 'a3!'],
        notes: {
          9: '가장 흔한 실수. 폰을 되잡는 자연스러운 수처럼 보이지만, d5 나이트가 f7을 지키던 방어를 스스로 풀어버립니다. 정답은 5...Na5입니다.',
          10: '나이트를 희생해 킹을 끌어냅니다. 흑 킹은 캐슬링을 영영 잃고 판 한가운데를 걸어 나옵니다.',
          13: 'd5 나이트를 지키려면 킹이 여기까지 나올 수밖에 없습니다. 백은 기물 하나가 부족하지만, 흑 킹이 노출된 대가로 폰을 회수하며 계속 우위를 유지합니다.',
          16: '기물을 더 던지지 말고 침착하게. d5 나이트를 한 번 더 압박하면 흑은 결국 그 나이트를 지키다 무너집니다.',
        },
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
        notes: {
          9: '나이도르프의 상징. 겉보기엔 조용하지만 b5 칸을 뺏어 백 기물의 침투를 원천 봉쇄하고, ...b5 반격을 예약합니다.',
          11: '이제 중앙을 차지합니다. d5 칸이 약해지지만 흑은 ...Be6와 ...Nbd7으로 그 칸을 계속 다툽니다.',
          14: '백은 f3-g4-g5로 킹사이드를 밀고 옵니다. 흑은 퀸사이드에서 ...b5로 맞불을 놓는 것이 계획입니다.',
        },
      },
      {
        id: 'classical-bg5',
        name: '6.Bg5 고전 변형',
        kind: 'variation',
        branchPly: 10,
        description: '백이 f6 나이트를 핀하며 가장 날카롭게 나오는 라인. 흑은 e6와 Be7로 침착하게 받습니다.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6', 'f4', 'Be7', 'Qf3', 'Qc7', 'O-O-O', 'Nbd7'],
        notes: {
          10: '가장 공격적인 대응. f6 나이트가 핀당해 e5를 밀 수 없게 됩니다.',
          11: '핀을 풀 준비. e5 대신 e6로 작게 받고 d5 칸을 단단히 지킵니다.',
          16: '백은 퀸사이드로 캐슬링하고 서로 반대편 킹을 향해 폰을 밀어붙이는 경주가 시작됩니다.',
        },
      },
      {
        id: 'classical-be2',
        name: '6.Be2 클래시컬',
        kind: 'variation',
        branchPly: 10,
        description: '백이 조용히 전개하면 흑도 e5로 중앙을 잡고 편안한 국면을 얻습니다.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5', 'Nb3', 'Be7', 'O-O', 'O-O', 'Be3', 'Be6'],
        notes: {
          11: '백이 공격을 서두르지 않으면 흑은 주저 없이 중앙을 차지합니다.',
        },
      },
      {
        id: 'early-queen',
        name: '4.Qxd4?! 조기 퀸 전개 응징',
        kind: 'punish',
        branchPly: 6,
        description: '백이 나이트 대신 퀸으로 되잡는 흔한 실수. Nc6로 퀸을 쫓으며 템포를 벌고 앞서 전개합니다.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Qxd4?!', 'Nc6!', 'Bb5', 'Bd7', 'Bxc6', 'Bxc6', 'Nc3', 'Nf6', 'O-O', 'e6'],
        notes: {
          6: '퀸이 너무 일찍 나왔습니다. 퀸은 잡히지 않지만, 흑의 전개 수 하나하나가 퀸을 공격하게 됩니다.',
          7: '전개하면서 동시에 퀸을 공격합니다 — 공짜 템포. 백은 퀸을 옮기느라 전개가 한 수 뒤처집니다.',
          11: '흑은 비숍 두 개 중 하나를 내줬지만 c6 비숍이 e4를 정면으로 겨눕니다. 전개가 앞선 편안한 국면입니다.',
        },
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
        notes: {
          1: '프랑스의 출발점. 다음 수 d5로 중앙에 맞서기 위한 준비입니다. 대가는 c8 비숍이 갇힌다는 것.',
          7: '핀을 무시하지 말고 Be7로 풀어줍니다. 백이 비숍을 교환하면 흑은 퀸으로 편하게 되잡습니다.',
          15: '프랑스의 핵심 계획. 백 폰 사슬(d4-e5)의 뿌리인 d4를 때립니다. 이 반격 없이는 흑이 그냥 좁게 눌립니다.',
        },
      },
      {
        id: 'winawer',
        name: '윈아버 (3...Bb4)',
        kind: 'variation',
        branchPly: 5,
        description: '나이트를 핀해 백의 폰 구조를 망가뜨리는 대신 비숍을 내주는 날카로운 변형.',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+', 'bxc3', 'Ne7', 'Qg4', 'O-O'],
        notes: {
          5: 'e4를 지키는 c3 나이트를 핀합니다. 백은 e5로 밀 수밖에 없습니다.',
          9: '비숍을 내주는 대신 백에게 영구적인 더블 폰(c3)을 남깁니다. 흑은 그 약점을 엔드게임까지 물고 갑니다.',
          12: '백은 g7을 노리며 즉시 반격합니다. 이 국면은 양쪽 다 정확한 수가 필요한 첨예한 싸움입니다.',
        },
      },
      {
        id: 'advance',
        name: '어드밴스 변형 대응 (3.e5)',
        kind: 'variation',
        branchPly: 4,
        description: '백이 중앙을 닫으면 흑은 c5와 Qb6로 d4를 집요하게 공격합니다.',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Be2', 'Nh6'],
        notes: {
          5: '닫힌 중앙에서는 폰 사슬의 뿌리를 쳐야 합니다. d4가 그 뿌리입니다.',
          9: 'd4와 b2를 동시에 겨눕니다. 백은 d4를 지키느라 기물이 묶입니다.',
          11: 'f5를 거쳐 d4를 한 번 더 공격하러 가는 길. 가장자리 나이트처럼 보이지만 목적이 분명합니다.',
        },
      },
      {
        id: 'premature-dxc5',
        name: '4.dxc5?! 중앙 포기 응징',
        kind: 'punish',
        branchPly: 6,
        description: '백이 c5 폰을 덥석 잡는 흔한 실수. 비숍이 공짜로 좋은 자리에 전개되고 백의 중앙은 무너집니다.',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'dxc5?!', 'Bxc5!', 'Nf3', 'Nc6', 'Bd3', 'f6!', 'Qe2', 'fxe5', 'Nxe5', 'Nxe5', 'Qxe5', 'Nf6'],
        notes: {
          6: '폰 하나를 잡으려고 d4를 포기했습니다. 프랑스에서 백의 최대 자산인 폰 사슬을 스스로 푼 셈입니다.',
          7: '문제 비숍이 저절로 해결됐습니다. 되잡으면서 가장 좋은 대각선에 서고, 전개도 한 수 앞섭니다.',
          11: '버팀목을 잃은 e5 폰을 즉시 칩니다. 이 폰만 사라지면 흑은 좁을 이유가 하나도 없습니다.',
          17: '중앙은 정리됐고 흑은 편안하게 전개를 마쳤습니다. 백이 폰 하나로 얻은 것은 아무것도 없습니다.',
        },
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
        notes: {
          3: '폰을 잡지 않고 d5를 폰으로 받칩니다. 대가는 c8 비숍이 잠시 갇힌다는 것.',
          11: '비숍에게 결정을 강요합니다. 물러나면 흑은 b6-Bb7으로 갇힌 비숍을 풀 시간을 법니다.',
          13: '문제 비숍을 긴 대각선으로 내보내는 정석 계획입니다.',
        },
      },
      {
        id: 'exchange',
        name: '교환 변형 대응',
        kind: 'variation',
        branchPly: 6,
        description: '백이 cxd5로 교환하면 "미노리티 어택"이 옵니다. 흑은 킹사이드에서 기물 활동으로 맞섭니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5', 'Bg5', 'Be7', 'e3', 'c6', 'Bd3', 'Nbd7'],
        notes: {
          6: '중앙이 대칭으로 굳습니다. 백의 계획은 b4-b5로 흑의 c6 폰을 약하게 만드는 "소수 폰 공격"입니다.',
          11: '백의 b5 진격에 대비해 미리 c6를 단단히 합니다.',
        },
      },
      {
        id: 'tarrasch',
        name: '타라시 디펜스',
        kind: 'variation',
        branchPly: 5,
        description: 'c5로 즉시 중앙에 맞서는 적극적인 선택. 고립 폰을 감수하고 기물 활동성을 얻습니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c5', 'cxd5', 'exd5', 'Nf3', 'Nc6', 'g3', 'Nf6', 'Bg2', 'Be7'],
        notes: {
          5: 'QGD의 답답함이 싫다면 이 수. 즉시 중앙을 반격합니다.',
          7: '흑은 d5에 고립 폰을 갖게 됩니다. 약점이지만 그 대가로 모든 기물이 활발하게 놓입니다.',
        },
      },
      {
        id: 'elephant-trap',
        name: '엘리펀트 트랩',
        kind: 'punish',
        branchPly: 10,
        description: '백이 6.Nxd5로 폰을 공짜로 먹으려 드는 순간, 기물 하나를 통째로 벌어옵니다.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5', 'Nxd5??', 'Nxd5!', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'],
        notes: {
          7: '함정의 미끼. d5 폰이 핀당해 공짜처럼 보이지만, 사실은 백을 유인하는 수입니다.',
          10: '백이 미끼를 물었습니다. "핀당한 나이트는 못 움직인다"고 믿은 순간 함정에 걸립니다.',
          11: '퀸이 잡히는 걸 알면서도 잡습니다. 다음 수에 체크로 퀸을 되찾기 때문입니다.',
          13: '이 체크가 함정의 심장입니다. 백은 반드시 퀸으로 막아야 하고, 흑은 그 퀸을 교환한 뒤 d5 나이트가 살아남습니다.',
          17: '정산: 흑은 기물 하나를 통째로 벌었습니다. 캐슬링은 못 하지만 국면은 완전히 흑의 것입니다.',
        },
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
        notes: {
          4: '핵심 수. e3를 두기 *전에* 비숍을 밖으로 내보냅니다. 순서가 바뀌면 비숍이 폰 뒤에 갇힙니다.',
          11: '흑이 비숍을 교환하자고 제안합니다.',
          12: '교환에 응하지 않고 물러납니다. 이 비숍은 런던의 생명선이라 웬만하면 지켜야 합니다.',
        },
      },
      {
        id: 'vs-kings-indian',
        name: '킹스 인디언 셋업 대응',
        kind: 'variation',
        branchPly: 1,
        description: '흑이 피앙케토로 나오면 h3를 끼워 비숍의 후퇴로를 미리 확보합니다.',
        moves: ['d4', 'Nf6', 'Nf3', 'g6', 'Bf4', 'Bg7', 'e3', 'O-O', 'h3', 'd6', 'Be2', 'Nbd7', 'O-O', 'Re8', 'c4'],
        notes: {
          8: '작지만 중요한 수. ...Nh5로 비숍을 쫓아내려는 계획을 미리 막습니다.',
          14: '흑이 e5를 준비하면 백도 c4로 중앙을 넓혀 맞섭니다.',
        },
      },
      {
        id: 'early-qb6',
        name: '조기 ...Qb6 대응',
        kind: 'variation',
        branchPly: 7,
        description: 'b2를 노리는 가장 성가신 수. Qc1으로 조용히 받치면 위협이 통째로 사라집니다.',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Qb6', 'Qc1!', 'Nc6', 'c3', 'Bf5', 'Be2', 'e6', 'O-O'],
        notes: {
          7: 'b2와 d4를 동시에 노립니다. 초보 백이 가장 당황하는 수입니다.',
          8: '못생겼지만 가장 확실한 해법. b2를 지키면서 f4 비숍도 그대로 지킵니다. 흑 퀸은 b6에서 할 일이 없어집니다.',
          14: '백의 셋업은 끝났고 흑 퀸만 어색하게 서 있습니다. 이제 c4나 Nbd2-b3로 그 퀸을 몰아냅니다.',
        },
      },
      {
        id: 'poisoned-b2',
        name: 'b2 독 폰 응징',
        kind: 'punish',
        branchPly: 9,
        description: '상대가 b2 폰을 덥석 물면, 퀸을 쫓아다니며 전개를 통째로 앞서갑니다.',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3!', 'Qxb2??', 'Nb5!', 'Na6', 'a3!', 'Bf5', 'dxc5'],
        notes: {
          8: 'b2를 일부러 내줍니다. 폰 하나를 미끼로 흑 퀸을 백진 한가운데로 끌어들이는 것이 목적입니다.',
          9: '탐욕의 대가. 이 한 수로 국면은 백의 완승이 됩니다.',
          10: 'Nc7+로 킹과 룩을 동시에 노립니다. 흑은 Na6라는 못생긴 수로 막을 수밖에 없습니다.',
          12: '조용하지만 치명적입니다. Ra2로 퀸을 잡으러 가겠다는 뜻이라, 흑은 퀸을 구하느라 국면 전체를 내줍니다.',
        },
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
