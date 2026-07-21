# 온디바이스 엔진 (`src/engine/`)

적응형 오프닝 트레이너("저장된 라인은 아니지만 이것도 가능하다" / "이건 실수다 — 이점 차이")를 위해 **기기에서 직접 도는 Stockfish**입니다. 서버가 아니라 온디바이스라 **오프라인·무료·지연 없음**이고, 리체스/체스닷컴이 오프라인 분석하는 방식과 같습니다.

## 구성

| 파일 | 역할 | 상태 |
| --- | --- | --- |
| `uci.ts` | UCI 출력 파서 (`info … score cp/mate`, `bestmove`) — 순수 함수 | ✅ 실제 Stockfish로 검증됨 |
| `evaluation.ts` | 두 포지션의 이점 차이(centipawn loss) 계산 + 이탈 분류(`best`/`alternative`/`inaccuracy`/`mistake`/`blunder`) | ✅ 검증됨 |
| `types.ts` | `Engine` 인터페이스, `EngineEvaluation` | ✅ |
| `UciEngine.ts` | transport-agnostic UCI 드라이버(큐 직렬화, ready, evaluate) | ✅ 실제 Stockfish 연동 검증됨 |
| `stockfishBridge.ts` | WebView 안에서 WASM 엔진 ↔ RN 브리지 HTML | ⚠️ 온디바이스 실행 미검증 |
| `EngineProvider.tsx` | 숨은 WebView로 엔진을 띄우고 `useEngine()`으로 제공 | ⚠️ 온디바이스 실행 미검증 |

| `deviation.ts` | `assessDeviation()` — 이탈 수를 평가해 verdict/손실/최선수 반환 | ✅ 실제 Stockfish 검증됨 (런던 2.Bf4=alternative, 2.g4=mistake) |
| `mockEngine.ts` | WASM 없이 트레이너 로직을 개발/테스트하기 위한 목 엔진 | ✅ |

파싱·평가·드라이버·이탈판정(핵심 로직)은 호스트에서 실제 Stockfish에 물려 검증했습니다. **WebView 전송 계층은 기기에서 한 번 돌려봐야** 확정됩니다(빌드마다 엔진 노출 방식이 조금씩 달라서).

## 트레이너 배선 상태

`OpeningDetailScreen`이 `useEngine()`로 엔진을 받아, 정석을 벗어난 수를 만나면:
- **엔진 없음(오프라인/미설정)** → 기존 동작(빨간 테두리 + 되돌리기). 즉 **아래 온디바이스 셋업을 마치기 전까지 앱 동작은 이전과 동일** — 안전.
- **엔진 있음 + 둘 만한 수** → "저장된 라인은 아니지만 둘 만한 수입니다 … 계속 두시겠어요?" → [계속 두기]면 `ExploreMode`(자유 대국, 엔진이 응수)로 진입.
- **엔진 있음 + 실수** → "부정확 — 최선은 X · N점 손해" 표시 후 되돌리기.

활성화하려면 아래 셋업 후 앱을 `EngineProvider`로 감싸면 됩니다. `useEngine()`는 provider가 없어도 `engine: null`을 돌려주므로 지금 상태로도 앱은 정상 동작합니다.

## 남은 셋업 (온디바이스 활성화)

### 1) Stockfish WASM 빌드 넣기

[stockfish.js](https://github.com/nmrugg/stockfish.js/) 등에서 **단일 파일(single-file) WASM 빌드**를 받으세요(별도 `.wasm`이 base64로 내장돼 자원 해석이 필요 없음, 라이트 빌드면 충분).

Metro는 `.js`를 코드로 취급하므로 **에셋 확장자로 저장**합니다:

```
assets/engine/stockfish.jsdata     ← 받은 single-file 빌드를 이 이름으로 저장
```

`metro.config.js`에 확장자 등록:

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('jsdata');
module.exports = config;
```

### 2) 에셋을 문자열로 읽는 `loadEngineSource` 구현

```bash
npx expo install expo-asset expo-file-system
```

```ts
// 예: src/engine/loadStockfish.ts
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export async function loadStockfishSource(): Promise<string> {
  const asset = Asset.fromModule(require('../../assets/engine/stockfish.jsdata'));
  await asset.downloadAsync();
  return FileSystem.readAsStringAsync(asset.localUri!);
}
```

### 3) 앱을 `EngineProvider`로 감싸기

```tsx
// App.tsx
import { EngineProvider } from './src/engine/EngineProvider';
import { loadStockfishSource } from './src/engine/loadStockfish';

<EngineProvider loadEngineSource={loadStockfishSource}>
  {/* 기존 트리 */}
</EngineProvider>
```

### 4) 사용

```ts
const { engine, ready } = useEngine();
if (ready && engine) {
  const evalAfter = await engine.evaluate(fen, { depth: 14 });   // 얕은 깊이로 충분
  const loss = centipawnLoss(evalBefore, evalAfter, mover);
  const verdict = classifyLoss(loss);   // isPlayable(verdict) 면 "계속할까요?" 프롬프트
}
```

`useEngine()`는 로딩 전/오프라인/불가 시 `engine: null`을 줍니다 — 호출부는 항상 null을 처리해 **오프라인에서도 앱이 죽지 않게** 합니다.

## 검증 방법 (기기에서)

Expo Go로 앱을 띄우고, 임시 화면에서 `useEngine()` → `engine.evaluate(START_FEN)` 결과를 로그로 확인하세요. `bridge-error …` 메시지가 오면 `stockfishBridge.ts`의 `makeEngine()`가 빌드의 엔진 노출 방식(`STOCKFISH()` / `Stockfish()` / Worker)과 맞는지 조정하면 됩니다.
