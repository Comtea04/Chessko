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

실기기나 에뮬레이터에서는 `localhost`가 **기기 자신**을 가리키므로 백엔드에 닿지 않습니다. PC의 LAN IP(예: `http://192.168.0.10:8080`)로 바꾸세요. `.env`는 PC마다 값이 달라서 커밋하지 않습니다(`.env.example` 참고). 설정하지 않으면 `http://localhost:8080`으로 동작합니다.

백엔드가 떠 있지 않아도 앱은 실행됩니다. 분석 화면과 스크린샷 스캔만 에러를 표시하고, 오프닝·연습 기능은 전부 오프라인으로 동작합니다.

---

## 출시 빌드 (EAS)

```bash
npm i -g eas-cli && eas login
eas init                                  # 최초 1회, EAS 프로젝트 생성
eas build --platform android --profile preview      # APK — 직접 설치해서 확인
eas build --platform android --profile production   # AAB — 플레이 콘솔 업로드용
```

| 프로필 | 산출물 | 용도 |
| --- | --- | --- |
| `development` | APK (dev client) | 네이티브 모듈 디버깅 |
| `preview` | APK | 기기에 바로 설치해 확인 |
| `production` | AAB | 플레이 콘솔 업로드 |

`versionCode`는 EAS가 원격으로 관리하며 프로덕션 빌드마다 자동 증가합니다(`appVersionSource: "remote"`). 사용자에게 보이는 버전은 `app.json`의 `version`입니다.

**`EXPO_PUBLIC_API_BASE_URL`은 빌드 시점에 번들에 박힙니다.** 로컬 `.env`는 클라우드 빌드에 올라가지 않으므로, 백엔드를 붙이려면 EAS에 환경 변수를 등록하거나 `eas.json`의 해당 프로필 `env`에 넣어야 합니다.

```bash
eas env:create --name EXPO_PUBLIC_API_BASE_URL --value https://api.yourdomain.com
```

설정하지 않으면 `http://localhost:8080`으로 떨어져 **분석·복기·스캔만 실패**하고, 오프닝 학습·퍼즐·연습은 정상 동작합니다. 백엔드 없이 먼저 테스트를 돌릴 거라면 그대로 둬도 됩니다.

### 권한

`expo-image-picker`는 기본적으로 `RECORD_AUDIO`와 `CAMERA`를 추가합니다(동영상 촬영을 지원하기 때문). 이 앱은 **저장된 스크린샷만 고르므로** 둘 다 `false`로 꺼두었습니다 — 체스 앱이 마이크 권한을 요구하면 사용자도 의아하고, 플레이 데이터 보안 양식에도 신고해야 합니다.

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

한 오프닝은 **여러 라인**을 가집니다. 보드 위 라인 이름을 누르면 트리 형태의 선택창이 열리고(투 나이츠 디펜스 › 나이트 어택 › 폴레리오 디펜스), 라인은 세 종류입니다.

| 종류 | 뜻 |
| --- | --- |
| 메인 | 먼저 외울 기본 수순. 항상 첫 번째 라인입니다. |
| 변형 | 상대가 정상적으로 다르게 두었을 때 가는 갈래(예: 베를린 방어, 교환 변형). |
| 응징 | 상대가 실제로 자주 두는 **실수**로 시작해, 그걸 어떻게 벌하는지 보여주는 수순(예: 프라이드 리버, 엘리펀트 트랩). |

각 라인은 시작 위치부터의 완결된 수순이고, `branchPly`로 어느 수부터 갈라지는지 표시합니다. 트리 구조는 별도 데이터가 아니라 `openingTree.ts`가 수순의 공통 접두사와 `branchPly`로 계산합니다 — 그래서 라인을 추가하면 저절로 제자리에 붙습니다.

공부 중에 **다른 라인의 수를 두면 그 라인으로 자동 전환**됩니다. 라인이 갈림목에서 끝나는 경우(투 나이츠 디펜스처럼 변형들이 갈라지는 지점까지만 있는 라인)에는 "수순 완료" 대신 이어지는 갈래를 골라 계속 갑니다.

수순을 PGN 기보로 나열하지 않습니다. 대신 **내가 배우는 쪽의 다음 수**를 보드 위에 화살표로 그려주고, 사용자는 두 가지 방법으로 진행할 수 있습니다.

* `다음 ▶` 버튼으로 넘기거나,
* 화살표대로 직접 말을 옮기거나.

수순에서 벗어난 수를 두면 그 수가 잠깐 반영된 뒤 **화면 테두리가 빨갛게 페이드인/아웃되며 자동으로 되돌아갑니다.** 상대의 수는 외울 대상이 아니므로 화살표 없이 잠시 뒤 자동으로 둬집니다. 다만 **직전 수에 읽을 것이 남아 있으면 멈춰서** 사용자가 넘기게 합니다 — 해설이 붙어 있거나(응징 라인이 존재하는 이유가 바로 그 수입니다), 엔진이 더 나은 수를 제시하는 경우입니다. 판단 기준은 `hasCommentary()` 하나이며, 보드 아래 카드를 띄우는 조건과 같습니다. 띄워놓고 1초 만에 덮어버릴 거라면 애초에 띄우지 않는 편이 낫기 때문입니다.

보드는 공부하는 색의 시점으로 시작하고, **`백 ⇅` / `흑 ⇅` 버튼으로 뒤집으면 같은 라인을 반대 색으로** 공부합니다. 백으로 익힌 수순이 흑 차례에서 그대로 연습 대상이 되고, 원래 두던 쪽이 자동 재생으로 바뀝니다. 라인마다 별도 데이터가 필요 없어 모든 오프닝에 적용됩니다.

수마다 배지(`!!` 탁월수 / `!` 좋은 수 / `?!` 부정확 / `?` 실수 / `??` 블런더), 한국어 해설, 스톡피쉬 평가값이 붙고, 보드 옆 이밸류에이션 바가 우위 변화를 보여줍니다. 이 값들은 **앱에서 계산하지 않습니다** — [scripts/README.md](scripts/README.md)의 "수 평가 굽기" 참고.

### 애니메이션

화면 전환에는 **네비게이터 애니메이션이 없습니다**(스택·탭 모두 `animation: 'none'`). 대신 `ScreenTransition`이 새 화면을 1.02배에서 원래 크기로 260ms 안착시키는 것만 담당합니다.

크로스페이드였다가 바꿨습니다. 불투명한 두 화면을 디졸브하면 중간 지점에서 **두 화면이 반씩 동시에 보이고**, 카드 그림자가 겹쳐 이전 화면의 잔상처럼 읽힙니다. 어느 화면이든 헤더·보드는 같은 자리에 있으니, 그 아래 내용만 갈아끼우는 편이 "한 화면이 바뀐다"는 인상에 오히려 가깝습니다.

기물은 순간이동하지 않고 160ms 동안 미끄러집니다. 안착 스케일과 기물 이동 둘 다 마이페이지 → 설정의 "애니메이션" 스위치(`useSettings`)로 함께 끌 수 있습니다 — 레이아웃을 디버깅할 때 움직임이 방해가 되기 때문입니다.

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
│   ├── MoveList.tsx       기보 표 + MoveNavRow(이전/다음). 복기 화면은 버튼만 스크롤 밖에 고정
│   ├── ScreenTransition.tsx  화면 진입 모핑 전환 + withScreenTransition HOC
│   ├── Card.tsx, ScreenHeader.tsx
│   ├── FenInput.tsx, AnalysisPanel.tsx, VisionImportPanel.tsx, PromotionPicker.tsx
│   └── PieceImages.tsx    기물 이미지 매핑
├── hooks/
│   └── useChessGame.ts    rootFen + SAN 배열 + viewIndex 구조. 기보를 되감아 보는 용도
├── data/
│   ├── openings.ts        큐레이션 오프닝 22개 / 라인 63개 (수순·구조의 손으로 쓰는 원본)
│   ├── openingsAuthored.json             편집기로 추가한 오프닝 (커밋됨)
│   ├── openingBranches.json              편집기로 추가한 갈래 (커밋됨)
│   ├── openingEdits.json                 편집기로 한 이름 변경·삭제 (커밋됨)
│   ├── openingsRuntime.ts                위 넷을 합친, 앱이 실제로 읽는 오프닝 목록
│   ├── openingTree.ts                    라인들을 트리로 읽는 헬퍼 (선택 트리·자동 라인 전환)
│   ├── openingNotes.json                 수별 설명 텍스트 + 레퍼런스 (편집 대상, 커밋됨)
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

## 오프닝 데이터 만들기

수순·설명·등급은 코드에서 손으로 채우지 않고 두 도구로 만듭니다. 사용법과 데이터 파일 구성은 **[scripts/README.md](scripts/README.md)** 에 있습니다.

```bash
npm run author        # 로컬 웹 편집기 — 설명·레퍼런스, 오프닝/갈래 추가·수정
npm run gen:openings  # 스톡피쉬로 수별 등급·평가값 굽기 (결과는 커밋)
```

앱이 읽는 오프닝 목록은 `openingsRuntime.ts`가 네 소스를 합친 것입니다 — 손으로 쓰는 `openings.ts`, 편집기가 쓰는 `openingsAuthored.json` · `openingBranches.json`, 그리고 이름 변경·삭제를 담는 `openingEdits.json`. 큐레이션 원본을 도구가 고쳐 쓰지 않기 위한 구조입니다.

## 데이터 검증

`data/openings.ts`와 `data/puzzles.ts`는 손으로 쓴 FEN/SAN이 틀리기 쉬워, chess.js로 실제 재생해 검증한 것만 넣었습니다.

* 오프닝 라인 63개 — 생성 스크립트가 엔진을 켜기 **전에** 전 라인을 chess.js로 재생하므로, 불법 수가 있으면 즉시 실패합니다. 별도 검증 절차가 아니라 `npm run gen:openings`가 곧 검증입니다.
* 퍼즐 30개 — 무작위 포지션을 생성해 **정답이 유일하게 성립하는 것만** 채택했습니다. 1수 메이트는 메이트 수가 정확히 하나, 2수 메이트는 첫 수가 유일하고 흑의 합법 응수가 하나뿐인 포지션입니다. 응수가 강제이기 때문에 트레이너가 고정 SAN 라인으로 상대 수를 자동 재생해도 거짓이 되지 않습니다.

수순의 해설 문구도 엔진 판정과 어긋나지 않게 쓰세요. 예를 들어 3...Nd4(버드 디펜스)는 손실이 8cp뿐이라 "실수"라고 쓸 수 없어, 응징 라인을 3...f6?!로 교체했습니다.
