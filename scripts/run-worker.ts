const base = process.env.NEXT_PUBLIC_SITE_URL;
const token = process.env.CRON_SECRET;
if (!base || !token)
  throw new Error("Configure NEXT_PUBLIC_SITE_URL e CRON_SECRET.");
const response = await fetch(new URL("/api/jobs", base), {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  signal: AbortSignal.timeout(250000),
});
if (!response.ok) throw new Error(`Worker respondeu HTTP ${response.status}.`);
console.log(await response.json());
export {};
