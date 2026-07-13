export type RootTabParamList = {
  OpeningTab: undefined;
  PracticeTab: undefined;
  MyPageTab: undefined;
};

export type OpeningStackParamList = {
  OpeningList: undefined;
  OpeningDetail: { openingId: string };
  Analysis: { initialFen?: string } | undefined;
};

export type MyPageStackParamList = {
  MyPage: undefined;
  Settings: undefined;
  GameReview: {
    pgn: string;
    opponent: string;
    /** The linked player's colour, so the board can be shown from their side. */
    playerColor: 'white' | 'black';
  };
};

export type PracticeStackParamList = {
  PracticeHome: undefined;
  CoordinateTrainer: undefined;
  PuzzleTrainer: undefined;
  OpeningRecall: undefined;
};
