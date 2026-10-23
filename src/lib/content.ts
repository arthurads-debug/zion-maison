export function text(
  body: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = body[key];
  return typeof value === "string" ? value : fallback;
}
export function safeLink(value: string, fallback = "/catalogo") {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\"))
    return value;
  try {
    const u = new URL(value);
    if (u.protocol === "https:" || u.protocol === "http:") return u.href;
  } catch {}
  return fallback;
}
export function imageUrl(value: string) {
  if (!value) return "";
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
