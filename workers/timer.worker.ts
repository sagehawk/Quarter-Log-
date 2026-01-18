/// <reference lib="webworker" />

// Explicitly type self as a DedicatedWorkerGlobalScope (standard Worker)
declare const self: DedicatedWorkerGlobalScope;

let intervalId: number | null = null;

self.addEventListener('message', (e: MessageEvent) => {
  const { command } = e.data;

  if (command === 'start') {
    if (intervalId) clearInterval(intervalId);
    // Use self.setInterval explicitly
    intervalId = self.setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, 1000) as unknown as number;
  } else if (command === 'stop') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
});

export {};