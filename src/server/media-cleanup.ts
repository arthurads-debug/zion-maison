import "server-only";
import { serviceDatabase, checkDb } from "./supabase";
export function mediaRemovalPaths(path: string, kind: string) {
  if (!/^[a-f0-9-]{36}\.(webp|mp4|webm)$/.test(path))
    throw new Error("Invalid media path.");
  return kind === "image"
    ? [
        path,
        ...[360, 720, 1200, 2000].map((w) =>
          path.replace(/\.webp$/, `-${w}.webp`),
        ),
      ]
    : [path];
}
export async function removeStoredMedia(data: Record<string, unknown>) {
  const original = String(data.original_path || ""),
    published = String(data.public_path || "");
  if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(original))
    throw new Error("Invalid original path.");
  const db = serviceDatabase();
  if (published) {
    const { error } = await db.storage
      .from("published")
      .remove(mediaRemovalPaths(published, String(data.kind)));
    checkDb(error);
  }
  const { count, error: queryError } = await db
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("original_path", original);
  checkDb(queryError);
  if (!count) {
    const { error } = await db.storage.from("originals").remove([original]);
    checkDb(error);
  }
}
