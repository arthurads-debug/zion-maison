export function detectMedia(buffer: Buffer, mime: string): "image" | "video" {
  const jpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP";
  const mp4 = buffer.subarray(4, 8).toString() === "ftyp";
  const webm = buffer
    .subarray(0, 4)
    .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (
    (jpg && mime === "image/jpeg") ||
    (png && mime === "image/png") ||
    (webp && mime === "image/webp")
  )
    return "image";
  if ((mp4 && mime === "video/mp4") || (webm && mime === "video/webm"))
    return "video";
  throw new Error("Formato de arquivo não permitido ou conteúdo divergente.");
}
