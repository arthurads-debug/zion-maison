import "server-only";
import mediaInfoFactory from "mediainfo.js";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
export async function validateVideo(bytes: Buffer, mime: string) {
  const require = createRequire(import.meta.url);
  const wasm = resolve(
    dirname(require.resolve("mediainfo.js")),
    "..",
    "MediaInfoModule.wasm",
  );
  const parser = await mediaInfoFactory({
    format: "object",
    full: true,
    locateFile: () => wasm,
  });
  try {
    const result = await parser.analyzeData(bytes.length, (size, offset) =>
      bytes.subarray(offset, offset + size),
    );
    const general = result.media?.track.find((t) => t["@type"] === "General");
    const video = result.media?.track.find((t) => t["@type"] === "Video");
    const width = Number(video?.Width),
      height = Number(video?.Height),
      duration = Number(video?.Duration || general?.Duration);
    const format = general?.Format;
    const expected =
      mime === "video/mp4"
        ? format === "MPEG-4"
        : mime === "video/webm" && (format === "WebM" || format === "Matroska");
    if (
      !expected ||
      !video ||
      !width ||
      !height ||
      width > 3840 ||
      height > 3840 ||
      width * height > 8294400 ||
      !duration ||
      duration > 300 ||
      /yes/i.test(String(general?.extra?.IsTruncated || ""))
    )
      throw new Error(
        "Vídeo inválido, truncado ou fora dos limites de publicação.",
      );
    const codec = String(video.Format || "");
    if (!["AVC", "VP8", "VP9", "AV1"].includes(codec))
      throw new Error("Use MP4 H.264 ou WebM com codec compatível.");
    return { width, height, duration, codec };
  } finally {
    parser.close();
  }
}
