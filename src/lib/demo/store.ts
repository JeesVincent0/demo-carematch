import seed from '@/data/demo.json';
import type { DemoData } from './types';
export const DEMO_STORAGE_KEY = 'carematch-demo-v1';
export const DEMO_SESSION_KEY = 'carematch-demo-session-v1';
export const DEMO_EVENT = 'carematch:change';
const dateFields = new Set([
  'createdAt',
  'updatedAt',
  'submittedAt',
  'uploadedAt',
  'reviewedAt',
  'requestedDate',
  'expiresAt',
]);
function decode(value: string): DemoData {
  return JSON.parse(value, (key, value) =>
    dateFields.has(key) && typeof value === 'string' ? new Date(value) : value,
  ) as DemoData;
}
let memory: DemoData | undefined;
export function initialDemoData(): DemoData {
  return decode(JSON.stringify(seed));
}
export function getDemoData(): DemoData {
  if (typeof window === 'undefined')
    return memory ? decode(JSON.stringify(memory)) : initialDemoData();
  const stored = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = decode(stored);
      if (parsed.version === 1 && Array.isArray(parsed.users) && Array.isArray(parsed.workers))
        return parsed;
    } catch {
      /* Recover malformed demo storage from the bundled seed. */
    }
  }
  return initialDemoData();
}
export function updateDemoData<T>(mutate: (draft: DemoData) => T): T {
  const draft = getDemoData();
  const result = mutate(draft);
  if (typeof window === 'undefined') {
    memory = draft;
    return result;
  }
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    throw new Error(
      'Browser storage is full or unavailable. Remove sample uploads or reset the demo, then try again.',
    );
  }
  window.dispatchEvent(new Event(DEMO_EVENT));
  return result;
}
export function resetDemoData() {
  if (typeof window === 'undefined') {
    memory = initialDemoData();
    return;
  }
  window.localStorage.removeItem(DEMO_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  window.dispatchEvent(new Event(DEMO_EVENT));
}
export function subscribeDemo(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === DEMO_STORAGE_KEY || e.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(DEMO_EVENT, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(DEMO_EVENT, listener);
  };
}
