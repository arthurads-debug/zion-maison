import { it, expect } from "vitest";
import { validateVideo } from "@/server/video-processing";
it("rejects container signatures without a real video stream", async () => {
  await expect(
    validateVideo(Buffer.from("0000ftypTHIS IS NOT A VIDEO"), "video/mp4"),
  ).rejects.toThrow();
  await expect(
    validateVideo(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), "video/webm"),
  ).rejects.toThrow();
});

import { readFileSync } from "node:fs";
it("accepts an actual decoded WebM stream and returns measured dimensions", async () => {
  const result = await validateVideo(
    readFileSync("tests/fixtures/sample.webm"),
    "video/webm",
  );
  expect(result.width).toBe(64);
  expect(result.height).toBe(96);
  expect(result.duration).toBeGreaterThan(0);
  expect(result.codec).toBe("VP9");
  await expect(
    validateVideo(readFileSync("tests/fixtures/sample.webm"), "video/mp4"),
  ).rejects.toThrow();
});
