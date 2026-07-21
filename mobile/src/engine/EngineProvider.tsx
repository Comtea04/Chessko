import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { UciEngine } from './UciEngine';
import { buildBridgeHtml } from './stockfishBridge';
import type { Engine } from './types';

interface EngineContextValue {
  /** The engine once it's loaded and ready, else null (still loading, or unavailable). */
  engine: Engine | null;
  ready: boolean;
  error: string | null;
}

const EngineContext = createContext<EngineContextValue>({ engine: null, ready: false, error: null });

/**
 * Hosts the on-device Stockfish (WASM in a hidden WebView) and exposes it to the tree. The engine is
 * only used by online-optional features like the adaptive opening trainer; screens that don't need it
 * simply never call `useEngine`, and offline study is unaffected.
 *
 * `loadEngineSource` returns the Stockfish build's JS as a string (see src/engine/README.md). It's a
 * prop rather than a hardcoded import so the multi-MB asset and its `expo-asset`/`expo-file-system`
 * plumbing live in the app, not in this module.
 */
export function EngineProvider({
  loadEngineSource,
  children,
}: {
  loadEngineSource: () => Promise<string>;
  children: ReactNode;
}) {
  const webViewRef = useRef<WebView>(null);
  const engineRef = useRef<UciEngine | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadEngineSource()
      .then((source) => {
        if (!cancelled) setHtml(buildBridgeHtml(source));
      })
      .catch((err) => {
        if (!cancelled) setError(String(err?.message ?? err));
      });
    return () => {
      cancelled = true;
      engineRef.current?.dispose();
    };
  }, [loadEngineSource]);

  const handleMessage = useCallback((line: string) => {
    if (line === 'bridge-ready') {
      const send = (command: string) => {
        webViewRef.current?.injectJavaScript(`window.uciSend(${JSON.stringify(command)}); true;`);
      };
      const created = new UciEngine(send);
      engineRef.current = created;
      created.ready().then(() => setReady(true));
      setEngine(created);
      return;
    }
    if (line.startsWith('bridge-error')) {
      setError(line);
      return;
    }
    engineRef.current?.receive(line);
  }, []);

  const value = useMemo<EngineContextValue>(() => ({ engine, ready, error }), [engine, ready, error]);

  return (
    <EngineContext.Provider value={value}>
      {html && (
        <View style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }} pointerEvents="none">
          <WebView
            ref={webViewRef}
            source={{ html }}
            originWhitelist={['*']}
            javaScriptEnabled
            onMessage={(event) => handleMessage(event.nativeEvent.data)}
          />
        </View>
      )}
      {children}
    </EngineContext.Provider>
  );
}

/** The on-device engine, or null when it isn't ready/available (offline-safe: callers must handle null). */
export function useEngine(): EngineContextValue {
  return useContext(EngineContext);
}
