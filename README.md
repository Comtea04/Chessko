# Chessko

체스 오프닝을 공부하고, 연습하고, 모르는 포지션은 엔진과 LLM으로 해설받는 모바일 앱입니다.

기존 체스 앱이 "이 수가 최선"이라고만 알려주고 끝나는 반면, Chessko는 **왜 그 수가 최선인지**를 자연어로 설명합니다. Stockfish의 수치 평가에 오프닝 원칙 텍스트(Vector DB)를 결합한 RAG 해설이 핵심이고, 그 위에 오프닝 학습·연습 기능을 얹은 구조입니다.

---

## 저장소 구성

세 개의 독립적인 구성요소로 나뉘며, 각 폴더에 자체 README가 있습니다.

| 폴더 | 역할 | 기술 스택 | 문서 |
| --- | --- | --- | --- |
| [`mobile/`](mobile/) | 사용자가 실제로 쓰는 앱. 오프닝 학습, 연습(좌표/퍼즐/퀴즈), 마이페이지, 포지션 분석 | Expo SDK 57, React Native, TypeScript, chess.js | [mobile/README.md](mobile/README.md) |
| [`backend/`](backend/) | 분석 API 서버. Stockfish 프로세스 풀 관리, RAG 해설 생성, Vision 서비스 프록시 | Java 21, Spring Boot 3.3 | [backend/README.md](backend/README.md) |
| [`vision/`](vision/) | 체스 앱 스크린샷 → FEN 변환 마이크로서비스 | Python 3.10+, FastAPI, OpenCV | [vision/README.md](vision/README.md) |

호출 방향은 한 방향입니다:

```text
mobile  ──HTTP──>  backend  ──HTTP──>  vision
                      │
                      ├── Stockfish (로컬 프로세스, UCI)
                      ├── OpenAI API (임베딩 + 챗)
                      └── Supabase pgvector (오프닝 원칙 검색)
```

모바일 앱은 `vision`을 직접 호출하지 않고 항상 `backend`를 거칩니다. 앱에 API 키를 두지 않기 위해서입니다.

---

## 앱 개념

Lotus Chess 스타일의 하단 3탭 구조입니다. 학습 데이터(저장한 오프닝, 퍼즐 진행도, 연습 기록)는 전부 **기기 로컬(AsyncStorage)**에 저장되며, 별도의 회원가입/로그인은 없습니다.

* **오프닝 탭** — 백/흑 오프닝을 가로 스크롤 캐러셀에서 고르고, 보드 위 화살표를 따라 수순을 한 수씩 익힙니다. 오프닝 하나는 여러 라인(메인라인 / 변형 / **상대의 대표적인 실수를 응징하는 수순**)으로 나뉘고, 수마다 배지(`!!` 탁월수 · `?` 실수 · `??` 블런더 …)와 한국어 해설, 스톡피쉬 평가값이 붙습니다. 상대의 수는 자동으로 둬지고, 수순을 벗어난 수를 두면 화면 테두리가 빨갛게 번쩍이며 자동으로 되돌아갑니다. 아무 포지션에서나 "이 포지션 분석하기"로 엔진 분석 화면에 진입할 수 있습니다.
* **연습 탭** — 좌표 연습(리체스 스타일), 메이트 퍼즐 30개, 저장한 오프닝의 다음 수를 맞히는 리콜 퀴즈.
* **마이페이지 탭** — chess.com 닉네임 연동(공개 API, 인증 불필요)으로 최근 대국을 확인하고, 대국을 누르면 수순을 되짚으며 스톡피쉬 이밸류에이션 바로 우위 변화를 봅니다. 로컬 학습 통계도 여기 모입니다. 설정(애니메이션 on/off)은 헤더 우측 톱니바퀴로 들어갑니다.

---

## 핵심 기능

| 구분 | 기능 | 설명 | 구현 위치 |
| --- | --- | --- | --- |
| Engine | 포지션 평가 | FEN을 받아 평가값(centipawn)과 최선의 수 1~3순위를 계산. 체크메이트/스테일메이트를 별도 상태로 응답 | `backend` (Stockfish, UCI) |
| Engine | 대국 일괄 평가 | 대국의 모든 포지션을 한 요청으로 평가해 이밸류에이션 바/그래프에 쓰이게 함 | `backend` (엔진 풀 병렬 팬아웃) |
| Review | 대국 복기 | chess.com 최근 대국의 PGN을 재생하며 수순을 되짚고, 우위 변화를 세로 바로 표시 | `mobile` + `backend` |
| RAG/LLM | 지능형 해설 | 엔진 수치 + Vector DB의 오프닝 원칙을 종합해 초보자용 3~4줄 한국어 해설 생성 | `backend` (OpenAI + Supabase pgvector) |
| Vision | 스크린샷 스캐너 | chess.com/lichess 등 앱 **스크린샷**을 8x8로 분해해 FEN으로 변환 | `vision` (OpenCV) |
| Study | 오프닝 학습 | 큐레이션한 오프닝 20개 · 라인 38개(메인/변형/실수 응징)를 화살표 가이드로 한 수씩 학습, 북마크 | `mobile` |
| Study | 수별 평가·해설 | 라인의 모든 수에 등급 배지·평가값·해설을 표시. 스톡피쉬로 **미리 구워** 커밋하므로 학습 중 엔진 호출은 0회 | `mobile` (빌드 타임 스크립트) |
| Practice | 연습 모드 | 좌표 연습 / 메이트 퍼즐 30개 / 오프닝 리콜 퀴즈 | `mobile` |
| Monetize | 구독 및 결제 | 인앱 결제 영수증 검증 및 호출 권한 제어 (미구현, Phase 5) | — |

**비즈니스 모델(계획):** Free-tier는 일일 분석 횟수 제한 + 광고(AdMob), Premium-tier는 월 구독으로 무제한 분석·광고 제거.

---

## 로컬 실행

세 구성요소는 `vision` → `backend` → `mobile` 순서로 띄우는 것을 권장합니다. 각자 다른 터미널에서 실행하세요. 폴더별 상세 설정은 각 README를 참고하세요.

### 사전 준비

* **Java 21** (백엔드) — `JAVA_HOME`을 21로 맞추세요.
* **Stockfish 실행 파일** — 백엔드가 시작 시 필수로 요구합니다. 없으면 앱이 아예 뜨지 않습니다.
* **Python 3.10+** (Vision).
* **Node.js + npm** (모바일, Expo SDK 57).
* (선택) **OpenAI API 키**, **Supabase 프로젝트** — RAG 해설용. 없어도 나머지 기능은 정상 동작합니다.

### 1) Vision (`vision/`)

```bash
cd vision
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

첫 사용 전 테마 등록이 필요합니다 — [vision/README.md](vision/README.md) 참고.

### 2) 백엔드 (`backend/`)

```bash
cd backend
./run.sh          # .env를 읽어 export한 뒤 ./gradlew bootRun
```

`backend/.env`에 최소 `STOCKFISH_PATH`가 필요합니다. 자세한 환경변수는 [backend/README.md](backend/README.md) 참고.

### 3) 모바일 (`mobile/`)

```bash
cd mobile
npm install
npm run web       # 기기/에뮬레이터는 `npm start` 후 Expo Go로 QR 스캔
```

`mobile/.env`의 `EXPO_PUBLIC_API_BASE_URL`이 백엔드를 가리켜야 합니다. 실기기에서는 `localhost`가 기기 자신을 의미하므로 PC의 LAN IP를 넣으세요 — [mobile/README.md](mobile/README.md) 참고.

### 테스트

```bash
cd backend && ./gradlew test          # JUnit (Java 21 필요)
cd vision  && python -m pytest        # requirements-dev.txt 설치 후
cd mobile  && npm run typecheck       # 앱 + scripts 타입 체크
```

---

## 주요 고려사항 및 리스크

* **Stockfish 프로세스 관리** — 요청이 몰리면 엔진 프로세스가 무한히 생성돼 서버가 죽을 수 있습니다. `StockfishService`가 고정 크기 풀로 인스턴스를 관리하고, 대여 타임아웃을 둬 통제합니다.
* **프롬프트 인젝션** — FEN 입력란에 임의 텍스트를 넣어 LLM을 조작하지 못하도록 `BoardState`가 FEN을 엄격히 검증한 뒤에만 엔진·LLM에 전달합니다.
* **예외 처리** — 이미지 인식 실패, 엔진 타임아웃, 외부 LLM 장애 등은 각각 별도 예외로 구분해 사용자에게 명확한 한국어 메시지로 내려줍니다(`GlobalExceptionHandler`).

---

## 개발 진행 현황

* **Phase 1 완료 — 엔진 코어 (`backend/`)** — Spring Boot + Stockfish 프로세스 풀 기반 `/api/v1/analysis`. FEN 검증, 체크메이트/스테일메이트 감지, 엔진 타임아웃 처리.
* **Phase 2 완료 — 모바일 앱 (`mobile/`)** — Expo 기반 FEN 입력, 체스판 렌더링, 기보 뷰어, 백엔드 분석 연동.
* **Phase 3 완료 — RAG 해설 (`backend/`)** — `/api/v1/analysis/commentary`. Stockfish 평가 + Supabase pgvector 검색 + OpenAI 챗으로 한국어 해설 생성. 체크메이트/스테일메이트는 LLM 호출 없이 고정 문구로 응답.
* **Phase 4 완료 — Vision 스캐너 (`vision/`, `backend/`, `mobile/`)** — 실제 체스판 사진이 아니라 **앱 스크린샷**을 입력으로 받도록 스코프를 조정했습니다. 스크린샷은 원근 왜곡·조명 변화가 없고 기물 스타일이 고정돼 있어, 학습 모델이나 클라우드 API 없이 순수 OpenCV만으로 충분히 정확합니다.
* **Phase 5 완료 — Lotus 스타일 앱 개편 (`mobile/`, `backend/`)** — 단일 FEN 분석기 화면을 하단 3탭 구조(오프닝 / 연습 / 마이페이지)로 재구성했습니다.
  * 오프닝: 백/흑 캐러셀, 화살표 가이드(상대 수는 자동 재생), 북마크. 오프닝 20개는 chess.js로 합법성을 검증했습니다.
* **Phase 6 완료 — 오프닝 다중 라인 + 수별 평가 (`mobile/`)** — 오프닝 하나가 라인 여러 개(메인/변형/실수 응징)를 갖도록 데이터 모델을 바꾸고, 수마다 등급 배지·해설·평가값을 붙였습니다. 평가는 `npm run gen:openings`가 로컬 스톡피쉬(depth 18)로 미리 구워 커밋하므로 앱 런타임에는 엔진 호출이 없습니다. `!!`/`!`는 엔진이 만들지 않고 데이터 작성자가 SAN 접미사로 지정합니다.
  * 연습: 좌표 연습, 메이트 퍼즐 30개(정답 유일성을 chess.js 전수 탐색으로 보장), 저장한 오프닝 리콜 퀴즈.
  * 마이페이지: chess.com 공개 API 연동, 최근 대국 목록, 대국 복기(PGN 재생 + 이밸류에이션 바), 학습 기록, 설정.
  * 백엔드: 대국 전체를 한 번에 평가하는 `/api/v1/analysis/game` 추가(엔진 풀에 병렬 팬아웃, 포지션당 200ms).
  * 화면 전환 모핑과 기물 이동 애니메이션은 설정에서 끌 수 있습니다.
* **다음 단계** — Freemium/결제(인앱 구독, 호출 횟수 제어).

### 알려진 한계

* 다중 라인(변형·실수 응징)과 수별 해설은 대표 오프닝 6개(루이 로페즈, 이탈리안, 나이도르프, 프랑스, QGD, 런던)에만 채워져 있습니다. 나머지 14개는 아직 메인라인 한 줄뿐이고, 같은 형식으로 추가하면 됩니다.
* 백 오프닝 7개 / 흑 오프닝 13개로 데이터가 불균형합니다.
* 캐슬링 시 킹만 미끄러지고 룩은 순간이동합니다.
* 화면 전환은 크로스페이드 근사이며, 진짜 shared element 모핑이 아닙니다(Expo 57의 New Architecture에서 Reanimated 공유 요소 전환이 지원되지 않습니다).
