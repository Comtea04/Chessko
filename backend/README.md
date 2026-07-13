# Chessko Backend

Spring Boot 기반 분석 API 서버입니다. 세 가지 일을 합니다.

1. **엔진 분석** — Stockfish 프로세스를 풀로 관리하며 FEN을 평가합니다.
2. **RAG 해설** — 엔진 평가에 오프닝 원칙 텍스트를 결합해 LLM으로 한국어 해설을 생성합니다.
3. **Vision 프록시** — 스크린샷을 `vision/` 마이크로서비스에 전달하고 에러를 정규화합니다. 모바일 앱이 Vision 서비스를 직접 호출하지 않게 하는 게 목적입니다.

* 기술 스택: Java 21, Spring Boot 3.3, Gradle (Kotlin DSL)
* 기본 포트: `8080`

---

## 실행

```bash
cd backend
./run.sh            # .env를 읽어 export한 뒤 ./gradlew bootRun
./gradlew test      # 테스트
```

`run.sh`는 `.env`가 있으면 `set -a`로 통째로 export한 뒤 `bootRun`을 호출하는 얇은 래퍼입니다.

### 환경변수

`.env`는 `.gitignore`에 포함되어 커밋되지 않습니다. 모든 값은 `application.yml`에서 `${VAR:기본값}` 형태로 읽습니다.

| 변수 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `STOCKFISH_PATH` | **예** | `/usr/local/bin/stockfish` | Stockfish 실행 파일 경로. 잘못되면 **앱이 시작되지 않습니다** |
| `STOCKFISH_POOL_SIZE` | 아니오 | `4` | 동시에 띄울 엔진 프로세스 수 |
| `OPENAI_API_KEY` | 아니오 | (빈 값) | 없으면 `/commentary`만 503, 나머지는 정상 |
| `OPENAI_CHAT_MODEL` | 아니오 | `gpt-4o-mini` | 해설 생성 모델 |
| `OPENAI_EMBEDDING_MODEL` | 아니오 | `text-embedding-3-small` | 검색용 임베딩 모델 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | 아니오 | (빈 값) | pgvector 검색용. 없으면 `/commentary`만 503 |
| `VISION_SERVICE_URL` | 아니오 | `http://localhost:8000` | Vision 마이크로서비스 주소 |
| `CHESSKO_CORS_ALLOWED_ORIGINS` | 아니오 | Expo 개발 서버 주소들 | 쉼표 구분 |
| `CHESSKO_RAG_SEED_ON_STARTUP` | 아니오 | `false` | `true`일 때만 오프닝 원칙 시드 데이터를 Supabase에 적재 |

---

## API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `POST` | `/api/v1/analysis` | FEN → 평가값 + 최선의 수 1~3순위 |
| `POST` | `/api/v1/analysis/commentary` | 위 결과 + RAG 한국어 해설 |
| `POST` | `/api/v1/vision/themes/{themeId}/enroll` | 시작 위치 스크린샷으로 기물 테마 등록 (multipart) |
| `POST` | `/api/v1/vision/scan` | 스크린샷 → FEN (multipart) |

```bash
curl -X POST localhost:8080/api/v1/analysis \
  -H 'Content-Type: application/json' \
  -d '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","multiPv":3}'
```

에러는 전부 `GlobalExceptionHandler`를 거쳐 `ErrorResponse`(사용자용 한국어 메시지)로 내려갑니다.

| 예외 | 상태 | 상황 |
| --- | --- | --- |
| `InvalidFenException` | 400 | FEN 형식 오류 (프롬프트 인젝션 1차 방어선) |
| `InvalidVisionImageException` | 400 | 스크린샷에서 보드를 찾지 못함 |
| `VisionThemeNotFoundException` | 404 | 등록되지 않은 테마로 스캔 시도 |
| `EngineTimeoutException` | 503 | 엔진 연산 지연 |
| `CommentaryUnavailableException` | 503 | LLM/벡터 검색 실패 또는 키 미설정 |

---

## 디렉터리 구조

```text
src/main/java/com/chesstutor/
├── controller/
│   ├── AnalysisController.java        # /api/v1/analysis, /commentary
│   ├── VisionController.java          # /api/v1/vision/*
│   └── dto/                           # 요청·응답 DTO (도메인 객체를 그대로 노출하지 않음)
├── service/
│   ├── StockfishService.java          # 엔진 프로세스 풀 관리 + 분석 오케스트레이션
│   ├── StockfishEngine.java           # 프로세스 1개의 UCI 통신 (stdin/stdout)
│   ├── StockfishOutputParser.java     # UCI 출력 → MoveEvaluation (순수 함수, 단위 테스트 대상)
│   ├── RagService.java                # 검색 + 프롬프트 + 생성 오케스트레이션
│   ├── RagPromptBuilder.java          # 프롬프트 조립 (순수 함수, 단위 테스트 대상)
│   ├── OpenAiClient.java              # 임베딩 + 챗 완성 호출
│   ├── VectorStoreClient.java         # Supabase pgvector RPC 검색
│   ├── OpeningPrincipleSeeder.java    # 시드 데이터 적재 (opt-in)
│   └── VisionClient.java              # vision/ 마이크로서비스 호출 + 에러 매핑
├── domain/
│   ├── BoardState.java                # FEN 검증 및 파싱 — 신뢰 경계
│   ├── AnalysisResult.java, MoveEvaluation.java, GameStatus.java
│   ├── Commentary.java, OpeningPrinciple.java
├── exception/                         # 예외 + GlobalExceptionHandler + ErrorResponse
└── config/                            # @ConfigurationProperties + CORS 설정
```

**설계 의도:** 파싱·프롬프트 조립처럼 부수효과 없는 로직(`StockfishOutputParser`, `RagPromptBuilder`)을 I/O를 담당하는 서비스에서 분리했습니다. 덕분에 엔진이나 OpenAI를 띄우지 않고도 그 부분을 단위 테스트로 검증할 수 있습니다.

```text
src/main/resources/
├── application.yml
└── db/                                # Supabase 스키마, RPC 함수, 시드 데이터 (설정법은 db/README.md)
```

---

## 테스트

```bash
./gradlew test
```

* 단위 테스트 — `StockfishOutputParserTest`, `RagPromptBuilderTest`, `RagServiceTest`, `BoardStateTest`. 외부 프로세스나 네트워크 없이 동작합니다.
* 컨트롤러 테스트 — `AnalysisControllerTest`, `VisionControllerTest`. 서비스는 목으로 대체합니다.
* 통합 테스트 — `StockfishServiceIntegrationTest`. **실제 Stockfish 실행 파일이 필요**하므로 `STOCKFISH_PATH`가 유효해야 통과합니다.
