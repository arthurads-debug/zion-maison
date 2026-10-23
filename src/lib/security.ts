import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
export function safePushcutEndpoint(input: string) {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "api.pushcut.io" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/[^/]+\/notifications\/[^/]+$/.test(url.pathname) ||
    /%2f|%5c|%2e/i.test(url.pathname)
  )
    throw new Error("Use um endpoint oficial HTTPS do Pushcut.");
  return url;
}
export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((v) => {
            let s = String(v ?? "");
            if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
            return '"' + s.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
function secretKey(key: string) {
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error("Chave de criptografia do servidor não configurada.");
  return Buffer.from(key, "hex");
}
export function encryptSecret(value: string, key: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(key), nonce);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function decryptSecret(value: string, key: string) {
  const [iv, tag, data] = value
    .split(".")
    .map((s) => Buffer.from(s, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", secretKey(key), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
export function verifyWebhook(
  body: string,
  signature: string | null,
  key: string,
) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", key).update(body).digest();
  return timingSafeEqual(Buffer.from(signature.slice(7), "hex"), expected);
}
export function retryDelay(attempt: number) {
  return Math.min(3600000, Math.pow(2, Math.min(attempt, 12)) * 15000);
}
export function safeWebUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
