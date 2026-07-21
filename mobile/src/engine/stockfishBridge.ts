/**
 * The HTML run inside the hidden WebView. It loads the Stockfish WASM build (whose JS source is
 * inlined as `engineSource`) and bridges it to React Native:
 *   RN  → page: `window.uciSend('go depth 14')` is injected by the provider
 *   page → RN : every engine line is posted back via `window.ReactNativeWebView.postMessage`
 *
 * Different Stockfish builds expose the engine slightly differently (a `STOCKFISH()` factory, a
 * global `Stockfish`, or a Worker). This probes the common shapes; if your build differs, adjust the
 * `makeEngine` block. See src/engine/README.md for which build to drop in.
 */
export function buildBridgeHtml(engineSource: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<script>${engineSource}</script>
<script>
  function post(line) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(line));
  }
  function makeEngine() {
    try {
      if (typeof STOCKFISH === 'function') return STOCKFISH();
      if (typeof Stockfish === 'function') return Stockfish();
      if (typeof self !== 'undefined' && typeof self.Stockfish === 'function') return self.Stockfish();
    } catch (e) { post('bridge-error ' + e); }
    return null;
  }
  var engine = makeEngine();
  if (!engine) {
    post('bridge-error engine-not-found');
  } else {
    engine.onmessage = function (event) {
      post(typeof event === 'string' ? event : (event && event.data) || '');
    };
    window.uciSend = function (command) { engine.postMessage(command); };
    post('bridge-ready');
  }
  true;
</script>
</body>
</html>`;
}
