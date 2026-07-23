export type RootTabParamList = {
  OpeningTab: undefined;
  PracticeTab: undefined;
  MyPageTab: undefined;
};

export type OpeningStackParamList = {
  OpeningList: undefined;
  OpeningSearch: undefined;
  /** `side` is which chair the opening was opened from — it seeds the board's perspective, so a
   *  both-sides opening entered from the 흑 row starts as black. Omitted, the opening's own side wins. */
  OpeningDetail: { openingId: string; side?: 'w' | 'b' };
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
