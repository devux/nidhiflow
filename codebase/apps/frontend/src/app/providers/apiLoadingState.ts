import { useSyncExternalStore } from "react";

type Listener = () => void;

let loadingCount = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function beginApiRequest(): () => void {
  loadingCount += 1;
  emit();

  let finished = false;

  return () => {
    if (finished) {
      return;
    }

    finished = true;
    loadingCount = Math.max(0, loadingCount - 1);
    emit();
  };
}

export async function trackApiRequest<T>(request: () => Promise<T>): Promise<T> {
  const endRequest = beginApiRequest();

  try {
    return await request();
  } finally {
    endRequest();
  }
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return loadingCount;
}

export function useApiLoadingCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
