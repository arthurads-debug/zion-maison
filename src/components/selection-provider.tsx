"use client";
import { useSyncExternalStore } from "react";
import type { SelectionLine } from "@/lib/domain";
type Store = { lines: SelectionLine[]; favorites: string[]; name: string };
const empty: Store = { lines: [], favorites: [], name: "" };
let current = empty;
let loaded = false;
const listeners = new Set<() => void>();
function notify() {
  for (const listener of listeners) listener();
}
function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem("zion-selection-v1") || "null");
    if (raw)
      current = {
        lines: Array.isArray(raw.lines)
          ? raw.lines
              .filter(
                (l: SelectionLine) =>
                  typeof l.variant_id === "string" &&
                  Number.isInteger(l.quantity) &&
                  l.quantity > 0 &&
                  l.quantity <= 99,
              )
              .slice(0, 100)
          : [],
        favorites: Array.isArray(raw.favorites)
          ? raw.favorites
              .filter((v: unknown) => typeof v === "string")
              .slice(0, 100)
          : [],
        name: typeof raw.name === "string" ? raw.name.slice(0, 120) : "",
      };
  } catch {
    current = empty;
  }
  notify();
}
function update(patch: Partial<Store>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem("zion-selection-v1", JSON.stringify(current));
  } catch {
    /* Private browsing/quota: selection still works for this visit. */
  }
  notify();
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
};
export function useSelection() {
  const data = useSyncExternalStore(
    subscribe,
    () => current,
    () => empty,
  );
  return {
    ...data,
    add(variant_id: string, quantity: number) {
      if (current.lines.length === 0)
        window.dispatchEvent(
          new CustomEvent("zion-event", {
            detail: { type: "cart_started", data: {} },
          }),
        );
      const previous = current.lines.find((l) => l.variant_id === variant_id);
      update({
        lines: [
          ...current.lines.filter((l) => l.variant_id !== variant_id),
          {
            variant_id,
            quantity: Math.min(99, (previous?.quantity ?? 0) + quantity),
          },
        ],
      });
    },
    quantity(variant_id: string, quantity: number) {
      update({
        lines: current.lines.map((l) =>
          l.variant_id === variant_id
            ? { ...l, quantity: Math.max(1, Math.min(99, quantity || 1)) }
            : l,
        ),
      });
    },
    remove(variant_id: string) {
      window.dispatchEvent(
        new CustomEvent("zion-event", {
          detail: { type: "remove_from_cart", variant_id, data: {} },
        }),
      );
      update({
        lines: current.lines.filter((l) => l.variant_id !== variant_id),
      });
    },
    toggleFavorite(id: string) {
      window.dispatchEvent(
        new CustomEvent("zion-event", {
          detail: {
            type: current.favorites.includes(id)
              ? "remove_from_wishlist"
              : "add_to_wishlist",
            product_id: id,
            data: {},
          },
        }),
      );
      update({
        favorites: current.favorites.includes(id)
          ? current.favorites.filter((v) => v !== id)
          : [...current.favorites, id].slice(0, 100),
      });
    },
    remember(name: string) {
      update({ name });
    },
    clear() {
      update({ lines: [] });
    },
  };
}
