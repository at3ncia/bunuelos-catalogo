import { useEffect, useState, useCallback } from "react";
import { loadStateFromSupabase, DEFAULT_STATE, type AppState } from "./storage";

// Cache compartida entre los componentes que usen el hook (una sola carga por visita)
let memoryState: AppState | null = null;
let loadPromise: Promise<AppState> | null = null;
const listeners = new Set<(s: AppState) => void>();

function notify(s: AppState) {
  memoryState = s;
  listeners.forEach((l) => l(s));
}

function ensureLoaded(forzar = false): Promise<AppState> {
  if (memoryState && !forzar) return Promise.resolve(memoryState);
  if (!loadPromise || forzar) {
    loadPromise = loadStateFromSupabase().then((s) => {
      notify(s);
      return s;
    });
  }
  return loadPromise;
}

export function useAppState() {
  const [state, setState] = useState<AppState>(memoryState ?? DEFAULT_STATE);
  const [loading, setLoading] = useState(!memoryState);

  useEffect(() => {
    if (memoryState) {
      setState(memoryState);
      setLoading(false);
    }
    ensureLoaded().then((s) => {
      setState(s);
      setLoading(false);
    });
    const listener = (s: AppState) => setState(s);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const recargar = useCallback(() => {
    setLoading(true);
    return ensureLoaded(true).finally(() => setLoading(false));
  }, []);

  return { state, loading, recargar };
}
