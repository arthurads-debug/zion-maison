"use client";
import { useSyncExternalStore } from "react";
export type Consent = {
  analytics: boolean;
  marketing: boolean;
  expires?: number;
};
const initial: { ready: boolean; consent: Consent | null } = {
  ready: false,
  consent: null,
};
let snapshot = initial;
const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}
function read() {
  let consent: Consent | null = null;
  try {
    const raw = JSON.parse(localStorage.getItem("zion-consent") || "null");
    if (
      raw &&
      typeof raw.analytics === "boolean" &&
      typeof raw.marketing === "boolean" &&
      typeof raw.expires === "number" &&
      raw.expires > Date.now()
    )
      consent = raw;
  } catch {}
  snapshot = { ready: true, consent };
  emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!snapshot.ready) read();
  const changed = (event: StorageEvent) => {
    if (event.key === "zion-consent" || event.key === null) read();
  };
  window.addEventListener("storage", changed);
  window.addEventListener("focus", read);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", changed);
    window.removeEventListener("focus", read);
  };
}
export const currentConsent = () =>
  snapshot.consent || { analytics: false, marketing: false };
export function useConsent() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => initial,
  );
  return {
    ...state,
    save(value: Consent) {
      const consent = { ...value, expires: Date.now() + 15552000000 };
      try {
        localStorage.setItem("zion-consent", JSON.stringify(consent));
      } catch {}
      document.cookie = `zion-consent=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      snapshot = { ready: true, consent };
      emit();
    },
  };
}
