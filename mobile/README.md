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

한 오프닝은 **여러 라인**을 가집니다. 상단 탭에서 라인을 골라 학습하며, 라인은 세 종류입니다.

| 종류 | 뜻 |
| --- | --- |
| 메인 | 먼저 외울 기본 수순. 항상 첫 번째 라인입니다. |
| 변형 | 상대가 정상적으로 다르게 두었을 때 가는 갈래(예: 베를린 방어, 교환 변형). |
| 응징 | 상대가 실제로 자주 두는 **실수**로 시작해, 그걸 어떻게 벌하는지 보여주는 수순(예: 프라이드 리버, 엘리펀트 트랩). |

각 라인은 시작 위치부터의 완결된 수순이고, `branchPly`로 "메인라인에서 몇 수째부터 갈라지는지"를 표시합니다.

수순을 PGN 기보로 나열하지 않습니다. 대신 **내가 배우는 쪽의 다음 수**를 보드 위에 화살표로 그려주고, 사용자는 두 가지 방법으로 진행할 수 있습니다.

* `다음 ▶` 버튼으로 넘기거나,
* 화살표대로 직접 말을 옮기거나.

수순에서 벗어난 수를 두면 그 수가 잠깐 반영된 뒤 **화면 테두리가 빨갛게 페이드인/아웃되며 자동으로 되돌아갑니다.** 상대의 수는 외울 대상이 아니므로 화살표 없이 잠시 뒤 자동으로 둬집니다. 다만 그 수가 해설이 붙어 있거나 실수로 표시된 수라면 — 응징 라인이 존재하는 이유가 바로 그 수이므로 — 읽을 시간을 주기 위해 더 오래 머무릅니다. 흑 오프닝은 보드를 뒤집어 흑 시점으로 보여줍니다.

수마다 배지(`!!` 탁월수 / `!` 좋은 수 / `?!` 부정확 / `?` 실수 / `??` 블런더), 한국어 해설, 스톡피쉬 평가값이 붙고, 보드 옆 이밸류에이션 바가 우위 변화를 보여줍니다. 이 값들은 **앱에서 계산하지 않습니다** — 아래 "수 평가 굽기" 참고.

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
│   ├── openings.ts        큐레이션 오프닝 20개 / 라인 38개 (수순·구조의 손으로 쓰는 원본)
│   ├── openingNotes.json                 수별 설명 텍스트 + 레퍼런스 (편집 대상, 커밋됨 — 아래 "설명·레퍼런스 편집")
│   ├── openingNotes.ts                   위 JSON 조회 헬퍼 + Reference 타입
│   ├── openingAnnotations.generated.ts   스톡피쉬가 매긴 수별 등급·평가값 (자동 생성, 커밋됨)
│   ├── openingAnnotations.ts             위 생성 파일 조회 + 평가값 포맷
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

## 수 평가 굽기 (`npm run gen:openings`)

수 하나하나를 앱에서 스톡피쉬로 판단하면 라인 하나에 수십 번의 엔진 호출이 필요합니다. 그래서 평가는 **개발 PC에서 미리 굽고 결과를 커밋합니다.** 앱은 그 파일을 읽기만 하므로 오프닝 학습 중 네트워크·엔진 호출이 **0회**입니다.

```bash
npm run gen:openings                       # STOCKFISH_PATH 기본값 /usr/games/stockfish
STOCKFISH_PATH=... DEPTH=20 npm run gen:openings
```

`scripts/generate-opening-annotations.mts`가 라인의 모든 포지션을 depth 18로 평가해 `data/openingAnnotations.generated.ts`를 덮어씁니다. `data/openings.ts`의 수순을 고쳤다면 이 명령을 다시 돌리고 **생성 파일까지 함께 커밋**하세요.

등급을 매기는 규칙은 두 층입니다.

* **엔진이 매기는 것** — 직전 포지션 대비 손해 본 센티폰(90 이하 정석 / 160 이하 `?!` / 300 이하 `?` / 그 이상 `??`). 대국 복기보다 기준이 관대한데, 정석 수 사이의 60cp 차이는 취향이거나 탐색 노이즈라 학습자에게 `?!`를 붙일 이유가 못 되기 때문입니다. 이미 승부가 갈린 국면(±400 이상)에서의 등락은 등급에 반영하지 않습니다 — 트랩의 결말마다 빨간 배지가 붙어버립니다.
* **사람이 매기는 것** — `!!`와 `!`는 엔진이 절대 만들지 않습니다. 엔진은 "이 수가 얼마를 잃었나"만 알 뿐 "찾기 어려웠나"는 모르기 때문입니다. 데이터에서 SAN 뒤에 접미사를 붙이면(`'Nxf7!!'`) 그 등급이 엔진 판정을 덮어씁니다.

## 설명·레퍼런스 편집 (`npm run author`)

수별 **설명 텍스트와 출처 링크**는 코드가 아니라 `data/openingNotes.json`에 있고(키: `openingId:lineId` → `{ ply: { text, refs } }`), 앱은 `openingNotes.ts`의 `noteFor(...)`로 읽습니다. 코드에서 ply 인덱스를 손으로 찾지 않도록 **로컬 웹 편집기**를 씁니다.

```bash
npm run author      # http://localhost:4599
```

오프닝/라인을 고르면 보드가 수순을 따라가고, 각 수마다 설명과 레퍼런스(표시명·URL·종류)를 편집해 **저장**하면 `openingNotes.json`에 바로 기록됩니다(파일 순서는 오프닝→라인→ply로 자동 정렬). "Lichess 분석에서 열기"로 현재 포지션을 익스플로러로 바로 확인할 수 있습니다. dev 전용 도구라 앱 번들에는 포함되지 않습니다.

**저작권 주의:** 설명 텍스트는 **직접 쓰거나 CC0 데이터(Lichess 게임 DB/익스플로러)·확립된 이론에 근거해** 작성하세요. 남의 Lichess 스터디·블로그 **문장을 복사하면 저작권 침해**입니다(작성자에게 저작권이 있고 제3자에게 이전되지 않음). 스터디는 `refs`에 **링크**로만 다세요.

## 데이터 검증

`data/openings.ts`와 `data/puzzles.ts`는 손으로 쓴 FEN/SAN이 틀리기 쉬워, chess.js로 실제 재생해 검증한 것만 넣었습니다.

* 오프닝 라인 38개 — 생성 스크립트가 엔진을 켜기 **전에** 전 라인을 chess.js로 재생하므로, 불법 수가 있으면 즉시 실패합니다. 별도 검증 절차가 아니라 `npm run gen:openings`가 곧 검증입니다.
* 퍼즐 30개 — 무작위 포지션을 생성해 **정답이 유일하게 성립하는 것만** 채택했습니다. 1수 메이트는 메이트 수가 정확히 하나, 2수 메이트는 첫 수가 유일하고 흑의 합법 응수가 하나뿐인 포지션입니다. 응수가 강제이기 때문에 트레이너가 고정 SAN 라인으로 상대 수를 자동 재생해도 거짓이 되지 않습니다.

수순의 해설 문구도 엔진 판정과 어긋나지 않게 쓰세요. 예를 들어 3...Nd4(버드 디펜스)는 손실이 8cp뿐이라 "실수"라고 쓸 수 없어, 응징 라인을 3...f6?!로 교체했습니다.
