export type OpeningCategory = '오픈 게임' | '세미 오픈 게임' | '폐쇄 게임' | '인디언 디펜스' | '플랭크 오프닝';

export interface Opening {
  id: string;
  name: string;
  eco: string;
  category: OpeningCategory;
  sideToLearn: 'w' | 'b';
  description: string;
  /** Main line in SAN, validated against chess.js from the start position. */
  moves: string[];
}

export const OPENINGS: Opening[] = [
  {
    id: 'ruy-lopez',
    name: '루이 로페즈 (스페인 게임)',
    eco: 'C60',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '3.Bb5로 나이트를 공격하며 중앙을 압박하는 가장 클래식한 1.e4 오프닝.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'],
  },
  {
    id: 'italian-game',
    name: '이탈리안 게임',
    eco: 'C50',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '비숍을 c4로 빠르게 전개해 f7을 노리는 초보자에게도 친숙한 오프닝.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'],
  },
  {
    id: 'scotch-game',
    name: '스카치 게임',
    eco: 'C45',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '3.d4로 즉시 중앙을 여는 공격적인 오픈 게임.',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3'],
  },
  {
    id: 'kings-gambit',
    name: '킹스 갬빗',
    eco: 'C30',
    category: '오픈 게임',
    sideToLearn: 'w',
    description: '폰을 희생해 중앙과 초반 주도권을 얻는 낭만주의 시대의 공격적 오프닝.',
    moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5'],
  },
  {
    id: 'sicilian-najdorf',
    name: '시실리안 나이도르프',
    eco: 'B90',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '흑이 비대칭적으로 c5로 맞서는 가장 인기 있는 시실리안 변형.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
  },
  {
    id: 'sicilian-dragon',
    name: '시실리안 드래곤',
    eco: 'B70',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'g6로 비숍을 피앙케토해 대각선을 장악하는 날카로운 시실리안 변형.',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
  },
  {
    id: 'french-defense',
    name: '프랑스 디펜스',
    eco: 'C00',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'e6로 단단하게 받고 d5로 중앙에 맞서는 견고한 방어 체계.',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7'],
  },
  {
    id: 'caro-kann',
    name: '카로칸 디펜스',
    eco: 'B10',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: 'c6로 d5를 지지하며 비숍 전개 문제를 해결하는 견실한 방어.',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
  },
  {
    id: 'pirc-defense',
    name: '피르츠 디펜스',
    eco: 'B07',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '중앙을 내주는 대신 피앙케토로 반격을 노리는 하이퍼모던 방어.',
    moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Nf3', 'Bg7'],
  },
  {
    id: 'scandinavian-defense',
    name: '스칸디나비안 디펜스',
    eco: 'B01',
    category: '세미 오픈 게임',
    sideToLearn: 'b',
    description: '즉시 중앙에서 폰을 교환하고 퀸을 빠르게 꺼내는 직관적인 방어.',
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'],
  },
  {
    id: 'queens-gambit-declined',
    name: '퀸스 갬빗 거절',
    eco: 'D30',
    category: '폐쇄 게임',
    sideToLearn: 'b',
    description: '갬빗 폰을 받지 않고 e6로 중앙 구조를 단단히 지키는 클래식 방어.',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'],
  },
  {
    id: 'queens-gambit-accepted',
    name: '퀸스 갬빗 수락',
    eco: 'D20',
    category: '폐쇄 게임',
    sideToLearn: 'b',
    description: 'c4 폰을 잡고 나중에 되찾으며 빠른 전개를 노리는 변형.',
    moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6'],
  },
  {
    id: 'slav-defense',
    name: '슬라브 디펜스',
    eco: 'D10',
    category: '폐쇄 게임',
    sideToLearn: 'b',
    description: 'c6로 d5를 지지해 비숍 전개 문제 없이 중앙을 지키는 견고한 체계.',
    moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'],
  },
  {
    id: 'kings-indian-defense',
    name: '킹스 인디언 디펜스',
    eco: 'E60',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: '중앙을 내주고 피앙케토 비숍과 킹사이드 공격으로 반격하는 역동적 방어.',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O'],
  },
  {
    id: 'nimzo-indian-defense',
    name: '님조 인디언 디펜스',
    eco: 'E20',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: 'Bb4로 나이트를 핀하며 상대의 폰 구조를 흔드는 전략적인 방어.',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
  },
  {
    id: 'grunfeld-defense',
    name: '그린펠트 디펜스',
    eco: 'D80',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: '중앙을 내주고 d5로 즉시 반격해 상대 폰 중앙을 공격 목표로 삼는 방어.',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
  },
  {
    id: 'queens-indian-defense',
    name: '퀸스 인디언 디펜스',
    eco: 'E12',
    category: '인디언 디펜스',
    sideToLearn: 'b',
    description: 'b6로 비숍을 피앙케토해 e4 칸을 통제하는 유연한 방어.',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'],
  },
  {
    id: 'catalan-opening',
    name: '카탈란 오프닝',
    eco: 'E00',
    category: '인디언 디펜스',
    sideToLearn: 'w',
    description: 'g3로 비숍을 피앙케토해 퀸스 갬빗과 인디언 구조를 결합한 오프닝.',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7'],
  },
  {
    id: 'london-system',
    name: '런던 시스템',
    eco: 'D02',
    category: '플랭크 오프닝',
    sideToLearn: 'w',
    description: '상대의 응수와 무관하게 같은 구조를 세울 수 있는 실전적인 시스템 오프닝.',
    moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'e6', 'e3', 'c5'],
  },
  {
    id: 'english-opening',
    name: '잉글리시 오프닝',
    eco: 'A10',
    category: '플랭크 오프닝',
    sideToLearn: 'w',
    description: '측면에서 중앙을 통제하며 다양한 구조로 전환할 수 있는 유연한 오프닝.',
    moves: ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'],
  },
];

export function getOpeningById(id: string): Opening | undefined {
  return OPENINGS.find((opening) => opening.id === id);
}

export const OPENING_CATEGORIES: OpeningCategory[] = ['오픈 게임', '세미 오픈 게임', '폐쇄 게임', '인디언 디펜스', '플랭크 오프닝'];
