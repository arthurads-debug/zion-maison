import "server-only";
import { prepareImage } from "./image-processing";
import { validateVideo } from "./video-processing";
import { serviceDatabase, checkDb } from "./supabase";
import { detectMedia } from "./media-validation";
import { HttpError } from "./auth";
type Transform = {
  rotate?: number;
  crop?: { left: number; top: number; width: number; height: number };
};
export async function finalizeMedia(
  path: string,
  mime: string,
  actor: string,
  alt: string,
  transform: Transform = {},
) {
  if (!path.startsWith(`${actor}/`) || path.includes(".."))
    throw new HttpError(403, "Arquivo não pertence a esta conta.");
  const db = serviceDatabase();
  const { data: blob, error } = await db.storage
    .from("originals")
    .download(path);
  checkDb(error);
  if (!blob) throw new Error("Arquivo não encontrado.");
  if (blob.size > 104857600) throw new HttpError(413, "Arquivo muito grande.");
  const bytes = Buffer.from(await blob.arrayBuffer());
  const kind = detectMedia(bytes, mime);
  let output: Buffer = bytes;
  let width: number | undefined, height: number | undefined;
  const id = crypto.randomUUID();
  const derivatives: { width: number; buffer: Buffer }[] = [];
  let publicPath = `${id}.${mime === "video/webm" ? "webm" : "mp4"}`;
  if (kind === "image") {
    if (bytes.length > 20971520)
      throw new HttpError(413, "Imagem maior que 20 MB.");
    const result = await prepareImage(bytes, transform);
    output = result.output;
    width = result.width;
    height = result.height;
    derivatives.push(...result.derivatives);
    publicPath = `${id}.webp`;
  } else {
    const video = await validateVideo(bytes, mime);
    width = video.width;
    height = video.height;
  }
  const { error: uploadError } = await db.storage
    .from("published")
    .upload(publicPath, output, {
      contentType: kind === "image" ? "image/webp" : mime,
      cacheControl: "31536000",
      upsert: false,
    });
  checkDb(uploadError);
  const uploaded = [publicPath];
  for (const derivative of derivatives) {
    const derivativePath = `${id}-${derivative.width}.webp`;
    const { error } = await db.storage
      .from("published")
      .upload(derivativePath, derivative.buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) {
      await db.storage.from("published").remove(uploaded);
      checkDb(error);
    }
    uploaded.push(derivativePath);
  }
  const url = db.storage.from("published").getPublicUrl(publicPath)
    .data.publicUrl;
  const { data, error: insertError } = await db
    .from("media_assets")
    .insert({
      id,
      kind,
      original_path: path,
      public_path: publicPath,
      url,
      alt,
      mime,
      bytes: bytes.length,
      width,
      height,
      published: true,
      created_by: actor,
    })
    .select("*")
    .single();
  if (insertError) {
    await db.storage.from("published").remove(uploaded);
    checkDb(insertError);
  }
  return data;
}
