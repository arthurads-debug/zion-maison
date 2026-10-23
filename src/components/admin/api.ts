"use client";
import { useEffect, useState, useCallback } from "react";
export async function adminRequest(
  resource: string,
  body?: unknown,
  method = "POST",
) {
  const response = await fetch(`/api/admin/${resource}`, {
    method: body === undefined ? "GET" : method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}
export function useResource<T>(resource: string, params = "") {
  const [rows, setRows] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const key = `${resource}:${params}:${version}`;
  const loading = loadedKey !== key;
  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/admin/${resource}${params ? `?${params}` : ""}`, {
      signal: c.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setRows(Array.isArray(d.data) ? d.data : []);
        setCount(d.count || 0);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoadedKey(key);
      });
    return () => c.abort();
  }, [resource, params, key]);
  return {
    rows,
    count,
    loading,
    error,
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}
export function errorMessage(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Não foi possível salvar. Tente novamente.";
}
