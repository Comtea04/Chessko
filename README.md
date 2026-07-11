지금까지 논의한 아이디어(이미지 인식, 스톡피쉬 엔진, RAG 기반 LLM 해설, 수익화 모델)를 모두 종합하여 실제 개발에 바로 착수할 수 있는 수준의 **프로젝트 명세서(PRD: Product Requirements Document)** 초안을 작성해 드립니다.

객체 지향적인 설계와 시스템 프로세스 제어에 유리한 구조를 채택하여 정리했습니다.

---

## 1. 프로젝트 개요 (Project Overview)

* **프로젝트명:** (가칭) ChessTutor AI
* **목적:** 기계적인 암기를 강요하는 기존 체스 앱의 한계를 벗어나, 사진 촬영이나 FEN 입력을 통해 현재 포지션을 분석하고 '왜 이 수가 최선인지'를 자연어로 설명해 주는 지능형 체스 튜터 앱 개발.
* **비즈니스 모델 (Freemium):**
* **Free-tier:** 일일 분석 횟수 제한(예: 3회), 배너 및 보상형 비디오 광고(AdMob) 노출.
* **Premium-tier:** 월 구독 모델(In-App Purchase). 무제한 분석, 전체 기보 복기 리포트 제공, 광고 제거.



---

## 2. 시스템 아키텍처 및 기술 스택 (Tech Stack)

프론트엔드와 백엔드를 완전히 분리하여 향후 확장성과 유지보수성을 확보합니다.

* **Frontend (Mobile App):** Flutter 또는 React Native (iOS/Android 동시 출시 목적)
* **Backend (API Server):** Java Spring Boot
* 체스의 보드 상태 관리, 분석 요청 컨트롤러(`GameController`), 엔진 통신 및 해설 전략(`Strategy`) 등을 객체 지향 디자인 패턴으로 깔끔하게 분리하여 구현하기에 가장 적합합니다.


* **Chess Engine:** Stockfish (C++ 기반 실행 파일)
* 백엔드 서버 내에서 하위 수준(Low-level) 프로세스로 실행되며, Java의 `ProcessBuilder` 등을 통해 표준 입출력(stdin/stdout)으로 UCI(Universal Chess Interface) 명령을 주고받습니다.


* **Vision (이미지 인식):** Python 기반 마이크로서비스 (OpenCV + 경량 YOLO 모델) 또는 클라우드 Vision API
* **AI & Database:**
* **LLM:** OpenAI API (GPT-4o mini 등 비용 효율적인 모델)
* **DB:** PostgreSQL (유저 데이터 및 결제 상태) + Pinecone/Supabase (오프닝 책 텍스트를 담을 Vector DB)



---

## 3. 핵심 기능 요구사항 (Core Features)

| 구분 | 기능명 | 상세 설명 | 필요 기술 |
| --- | --- | --- | --- |
| **Vision** | 체스판 스캐너 | 카메라로 체스판을 촬영하면 8x8 격자를 추출하고 기물을 분류하여 FEN 문자열로 변환합니다. | OpenCV, Image Classification |
| **Engine** | 포지션 평가 | FEN 값을 기반으로 현재의 유리함(Centipawns)과 최선의 수(Best Moves) 1~3순위를 계산합니다. | Stockfish, UCI Protocol |
| **RAG/LLM** | 지능형 해설 | 스톡피쉬의 수치와 Vector DB에 저장된 체스 오프닝 이론/원칙을 종합하여 초보자 눈높이에 맞는 3~4줄의 텍스트 해설을 생성합니다. | Vector DB, OpenAI API |
| **User** | 기보(PGN) 관리 | 사용자가 입력한 수순을 배열이나 리스트 형태로 추적하며, 이전/다음 수로 이동할 수 있는 뷰어를 제공합니다. | chess.js (프론트엔드 라이브러리) |
| **Monetize** | 구독 및 결제 | 인앱 결제 영수증을 백엔드에서 검증하고, 유저의 API 호출 권한(Token)을 제어합니다. | Google Play / App Store 결제 연동 |

---

## 4. 백엔드 프로젝트 디렉토리 구조 (설계 예시)

Java Spring Boot 기반의 도메인 주도 설계(DDD) 느낌을 살린 디렉토리 구조입니다. 서버의 역할 분담을 명확히 할 수 있습니다.

```text
src/main/java/com/chesstutor/
├── controller/
│   ├── AnalysisController.java  (프론트엔드의 분석 요청 처리 API)
│   └── PaymentController.java   (구독 결제 검증 API)
├── service/
│   ├── VisionService.java       (이미지를 FEN으로 변환하는 로직 호출)
│   ├── StockfishService.java    (C++ 엔진 프로세스 실행 및 UCI 통신 관리)
│   ├── RagService.java          (Vector DB 검색 및 LLM 프롬프트 조립)
│   └── SubscriptionService.java (유저 결제 상태 및 API 호출 횟수 차감)
├── domain/
│   ├── BoardState.java          (현재 FEN, 턴, 캐슬링 권한 등 상태 보관)
│   ├── MoveEvaluation.java      (엔진이 뱉어낸 평가 점수 객체)
│   └── UserProfile.java         (유저 정보 및 티어)
├── exception/
│   └── EngineTimeoutException.java (엔진 연산 지연 시 예외 처리)
└── config/
    └── SecurityConfig.java      (API 인증 및 보안 설정)

```

---

## 5. 주요 고려사항 및 리스크 관리

* **스톡피쉬 프로세스 관리:** 서버에 요청이 몰릴 경우, 스톡피쉬 프로세스가 무한정 생성되어 메모리 누수나 서버 다운이 발생할 수 있습니다. 엔진 인스턴스를 '풀(Pool)' 형태로 관리하거나 스레드 개수를 철저히 통제해야 합니다.
* **프롬프트 인젝션 및 보안:** 악의적인 사용자가 FEN 입력란에 이상한 텍스트를 넣어 LLM을 조작하거나 시스템 프롬프트를 탈취하지 못하도록, 입력값(정규식 검증)과 서버 내부의 API 키 관리를 철저히 해야 합니다.
* **예외 처리 (Exception Handling):** 이미지 인식 실패, 스톡피쉬 계산 시간 초과, 외부 LLM API 서버 장애 등 다양한 변수가 존재하므로, 클라이언트에게 명확한 에러 메시지(예: "체스판을 다시 촬영해 주세요")를 던져주는 예외 처리 로직이 필수적입니다.
