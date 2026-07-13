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
};

export type PracticeStackParamList = {
  PracticeHome: undefined;
  CoordinateTrainer: undefined;
  PuzzleTrainer: undefined;
  OpeningRecall: undefined;
};
