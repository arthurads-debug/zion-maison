import "server-only";
import sharp from "sharp";
export type ImageTransform = {
  rotate?: number;
  crop?: { left: number; top: number; width: number; height: number };
};
export async function prepareImage(
  bytes: Buffer,
  transform: ImageTransform = {},
) {
  const source = sharp(bytes, { limitInputPixels: 40000000 });
  const metadata = await source.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    (metadata.pages && metadata.pages > 1)
  )
    throw new Error("Imagem não suportada.");
  const oriented = await source
    .autoOrient()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let pipeline = sharp(oriented.data, {
    raw: {
      width: oriented.info.width,
      height: oriented.info.height,
      channels: oriented.info.channels,
    },
  });
  if (transform.crop) {
    const cropped = await pipeline
      .extract(transform.crop)
      .raw()
      .toBuffer({ resolveWithObject: true });
    pipeline = sharp(cropped.data, {
      raw: {
        width: cropped.info.width,
        height: cropped.info.height,
        channels: cropped.info.channels,
      },
    });
  }
  if (transform.rotate) pipeline = pipeline.rotate(transform.rotate);
  const main = await pipeline
    .clone()
    .resize({
      width: 2000,
      height: 2600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  const derivatives = await Promise.all(
    [360, 720, 1200, 2000].map(async (width) => ({
      width,
      buffer: await pipeline
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
    })),
  );
  return {
    output: main.data,
    width: main.info.width,
    height: main.info.height,
    derivatives,
  };
}
