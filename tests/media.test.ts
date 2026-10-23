import sharp from "sharp";
import { it, expect } from "vitest";
import { prepareImage } from "@/server/image-processing";
it("rotates and crops actual image bytes, strips metadata and generates responsive variants", async () => {
  const original = await sharp({
    create: { width: 120, height: 200, channels: 3, background: "#a78360" },
  })
    .jpeg()
    .toBuffer();
  const result = await prepareImage(original, {
    crop: { left: 0, top: 20, width: 100, height: 160 },
    rotate: 90,
  });
  expect(result.width).toBe(160);
  expect(result.height).toBe(100);
  expect(result.derivatives.map((d) => d.width)).toEqual([
    360, 720, 1200, 2000,
  ]);
  const metadata = await sharp(result.output).metadata();
  expect(metadata.format).toBe("webp");
  expect(metadata.exif).toBeUndefined();
  await expect(
    prepareImage(original, {
      crop: { left: 500, top: 0, width: 10, height: 10 },
    }),
  ).rejects.toThrow();
});

import { mediaRemovalPaths } from "@/server/media-cleanup";
it("deletes every immutable published derivative and rejects arbitrary paths", () => {
  const id = "33333333-3333-4333-8333-333333333333";
  expect(mediaRemovalPaths(`${id}.webp`, "image")).toEqual([
    `${id}.webp`,
    ...[360, 720, 1200, 2000].map((w) => `${id}-${w}.webp`),
  ]);
  expect(() => mediaRemovalPaths("../secret.webp", "image")).toThrow();
});
