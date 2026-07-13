# Chessko Mobile

Expo(React Native) 앱입니다. 오프닝 학습·연습·마이페이지 3탭 구조이며, 엔진 분석은 `backend/`를 호출합니다.

* 기술 스택: Expo SDK 57, React Native 0.86, TypeScript, chess.js, React Navigation 7
* 저장소: **기기 로컬 AsyncStorage만 사용**합니다. 회원가입/로그인/서버 저장 없음.

> **주의:** Expo는 버전마다 설정이 크게 바뀝니다. 패키지를 추가할 때는 반드시 `npx expo install`을 쓰고, [SDK 57 문서](https://docs.expo.dev/versions/v57.0.0/)를 확인하세요 (`AGENTS.md`).

---

## 실행

```bash
npm install
npm run web        # 브라우저에서 바로 확인
npm start          # Expo Go(QR 스캔)로 실기기 확인
npx tsc --noEmit   # 타입 체크 — 이 프로젝트의 기본 검증 수단
```

### 백엔드 주소 설정

```bash
# mobile/.env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

실기기나 에뮬레이터에서는 `localhost`가 **기기 자신**을 가리키므로 백엔드에 닿지 않습니다. PC의 LAN IP(예: `http://192.168.0.10:8080`)로 바꾸세요. 개인 IP를 커밋하지 않으려면 `.env.local`에 두면 됩니다.

백엔드가 떠 있지 않아도 앱은 실행됩니다. 분석 화면과 스크린샷 스캔만 에러를 표시하고, 오프닝·연습 기능은 전부 오프라인으로 동작합니다.

---

## 화면 구성

```text
RootTabNavigator (하단 3탭)
├── 오프닝  OpeningStackNavigator
│   ├── OpeningListScreen      백/흑 두 섹션의 가로 스크롤 캐러셀
│   ├── OpeningDetailScreen    보드 위 화살표로 수순을 한 수씩 안내 + 북마크
│   └── AnalysisScreen         FEN 입력 · 스크린샷 스캔 · 엔진 분석 (백엔드 필요)
├── 연습    PracticeStackNavigator
│   ├── PracticeHomeScreen
│   ├── CoordinateTrainerScreen  빈 보드에 좌표 찍기 (리체스 스타일)
│   ├── PuzzleTrainerScreen      메이트 퍼즐 30개
│   └── OpeningRecallScreen      저장한 오프닝의 다음 수를 4지선다로 맞히기
└── 마이페이지  MyPageStackNavigator
    ├── MyPageScreen           chess.com 연동 · 최근 대국 · 학습 기록
    ├── GameReviewScreen       대국 복기: 수순 재생 + 이밸류에이션 바 (백엔드 필요)
    └── SettingsScreen         설정 (헤더 우측 톱니바퀴로 진입)
```

### 오프닝 상세 화면의 동작

수순을 PGN 기보로 나열하지 않습니다. 대신 **내가 배우는 쪽의 다음 수**를 보드 위에 화살표로 그려주고, 사용자는 두 가지 방법으로 진행할 수 있습니다.

* `다음 ▶` 버튼으로 넘기거나,
* 화살표대로 직접 말을 옮기거나.

수순에서 벗어난 수를 두면 그 수가 잠깐 반영된 뒤 **화면 테두리가 빨갛게 페이드인/아웃되며 자동으로 되돌아갑니다.** 상대의 수는 외울 대상이 아니므로 화살표 없이 잠시 뒤 자동으로 둬집니다. 흑 오프닝은 보드를 뒤집어 흑 시점으로 보여줍니다.

### 애니메이션

화면 전환은 감속만 하는 이징으로 크로스페이드되고(스택·탭 모두 `fade`), 기물은 순간이동하지 않고 160ms 동안 미끄러집니다. 둘 다 마이페이지 → 설정의 "애니메이션" 스위치(`useSettings`)로 함께 끌 수 있습니다 — 레이아웃을 디버깅할 때 움직임이 방해가 되기 때문입니다.

---

## 디렉터리 구조

```text
App.tsx                    GestureHandlerRootView + SafeAreaProvider + NavigationContainer 껍데기
src/
├── theme.ts               색상·spacing·radius·shadow 토큰. 하드코딩 대신 여기서 가져다 쓸 것
├── navigation/            탭/스택 네비게이터와 파라미터 타입(types.ts)
├── screens/               탭별 화면 (opening/ practice/ mypage/)
├── components/
│   ├── ChessBoard.tsx     보드 렌더링. 하이라이트·화살표·기물 이동 애니메이션·보드 뒤집기를 담당
│   ├── EvalBar.tsx        체스닷컴식 세로 이밸류에이션 바 (대국 복기)
│   ├── MoveList.tsx       기보 뷰어 (분석·복기 화면에서 사용)
│   ├── ScreenTransition.tsx  화면 진입 모핑 전환 + withScreenTransition HOC
│   ├── Card.tsx, ScreenHeader.tsx
│   ├── FenInput.tsx, AnalysisPanel.tsx, VisionImportPanel.tsx, PromotionPicker.tsx
│   └── PieceImages.tsx    기물 이미지 매핑
├── hooks/
│   └── useChessGame.ts    rootFen + SAN 배열 + viewIndex 구조. 기보를 되감아 보는 용도
├── data/
│   ├── openings.ts        큐레이션 오프닝 20개 (SAN 수순은 chess.js로 합법성 검증 완료)
│   └── puzzles.ts         메이트 퍼즐 30개 (정답 유일성을 chess.js 전수 탐색으로 검증)
├── storage/
│   ├── asyncStorage.ts    AsyncStorage JSON 래퍼
│   ├── usePersistentState.ts   키 단위 공유 스토어 (아래 설명)
│   └── useSavedOpenings.ts, usePuzzleProgress.ts, useTrainerStats.ts,
│       useChesscomAccount.ts, useSettings.ts
└── api/
    ├── analysisApi.ts     POST /api/v1/analysis, /api/v1/analysis/game
    ├── chesscomApi.ts     chess.com 공개 API (프로필 검증 + 최근 대국)
    └── visionApi.ts       POST /api/v1/vision/*
```

### 알아둘 설계 두 가지

**`usePersistentState`는 키 단위로 값을 공유합니다.** 훅 인스턴스마다 별도 state를 두면, 상세 화면에서 오프닝을 저장해도 스택 뒤에 살아 있는 목록 화면은 스토리지를 다시 읽지 않아 갱신되지 않습니다. 그래서 `useSyncExternalStore` 기반의 모듈 단위 스토어로 구현했고, 같은 키를 쓰는 모든 화면이 같은 값을 봅니다. 또한 스토리지 쓰기는 setState 업데이터 **밖에서** 일어납니다 — React는 언마운트된 컴포넌트의 업데이터를 실행하지 않으므로, 화면을 벗어나며 저장하는 값(예: 좌표 연습 세션 기록)이 유실될 수 있기 때문입니다.

**모든 화면이 `useChessGame`을 쓰지는 않습니다.** 이 훅은 "루트 FEN + SAN 배열 + 뷰 인덱스" 구조라 기보를 앞뒤로 되감는 데 적합합니다(분석 화면, 대국 복기). 반면 퍼즐과 오프닝 상세는 되감기가 아니라 한 수씩 검증하며 전진하는 흐름이라, 화면에서 chess.js 인스턴스를 직접 다루는 편이 단순합니다.

---

## 데이터 검증

`data/openings.ts`와 `data/puzzles.ts`는 손으로 쓴 FEN/SAN이 틀리기 쉬워, chess.js로 실제 재생해 검증한 것만 넣었습니다.

* 오프닝 20개 — 시작 위치에서 전 수순을 재생해 합법성 확인.
* 퍼즐 30개 — 무작위 포지션을 생성해 **정답이 유일하게 성립하는 것만** 채택했습니다. 1수 메이트는 메이트 수가 정확히 하나, 2수 메이트는 첫 수가 유일하고 흑의 합법 응수가 하나뿐인 포지션입니다. 응수가 강제이기 때문에 트레이너가 고정 SAN 라인으로 상대 수를 자동 재생해도 거짓이 되지 않습니다.

데이터를 추가할 때는 같은 방식으로 chess.js에 통과시킨 뒤 커밋하세요.
