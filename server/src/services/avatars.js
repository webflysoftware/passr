import sharp from "sharp";
import { config } from "../config.js";

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/;

export async function compressAvatarDataUrl(dataUrl) {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    const error = new Error("Invalid avatar image");
    error.status = 400;
    throw error;
  }

  const inputBuffer = Buffer.from(match[2], "base64");
  if (inputBuffer.length > config.maxAvatarInputBytes) {
    const error = new Error("Avatar must be 512KB or smaller");
    error.status = 400;
    throw error;
  }

  let dimension = config.avatarMaxDimension;
  let quality = config.avatarWebpQuality;

  for (;;) {
    const output = await sharp(inputBuffer)
      .rotate()
      .resize(dimension, dimension, { fit: "cover", position: "centre", withoutEnlargement: true })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer();

    if (output.length <= config.maxAvatarStoredBytes) {
      return `data:image/webp;base64,${output.toString("base64")}`;
    }

    if (quality > 25) {
      quality -= 10;
      continue;
    }

    if (dimension > 64) {
      dimension = Math.max(64, Math.round(dimension * 0.75));
      quality = config.avatarWebpQuality;
      continue;
    }

    const error = new Error("Could not compress avatar enough. Try a smaller image.");
    error.status = 400;
    throw error;
  }
}
