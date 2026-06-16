import sharp from "sharp";
import { getDb } from "../db.js";

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/;

const HERO_MAX_BYTES = 120 * 1024;
const HERO_WIDTH = 1200;
const HERO_HEIGHT = 640;
const HERO_QUALITY = 78;

export function parseDataUrl(dataUrl) {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) {
    const error = new Error("Invalid image data URL");
    error.status = 400;
    throw error;
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

export async function compressHeroDataUrl(dataUrl) {
  const { buffer: inputBuffer } = parseDataUrl(dataUrl);

  let quality = HERO_QUALITY;
  let width = HERO_WIDTH;
  let height = HERO_HEIGHT;

  for (;;) {
    const output = await sharp(inputBuffer)
      .rotate()
      .resize(width, height, { fit: "cover", position: "centre", withoutEnlargement: true })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer();

    if (output.length <= HERO_MAX_BYTES) {
      return {
        mimeType: "image/webp",
        dataUrl: `data:image/webp;base64,${output.toString("base64")}`,
      };
    }

    if (quality > 35) {
      quality -= 8;
      continue;
    }

    if (width > 800) {
      width = Math.max(800, Math.round(width * 0.85));
      height = Math.max(427, Math.round(height * 0.85));
      quality = HERO_QUALITY;
      continue;
    }

    const error = new Error("Could not compress hero image enough");
    error.status = 400;
    throw error;
  }
}

export async function getMediaAsset(path) {
  const db = getDb();
  return db.collection("media_assets").findOne({ path });
}

export async function upsertMediaAsset({ path, kind, dataUrl, credit = "" }) {
  const db = getDb();
  const { mimeType } = parseDataUrl(dataUrl);
  const now = new Date();

  await db.collection("media_assets").updateOne(
    { path },
    {
      $set: {
        path,
        kind,
        mimeType,
        dataUrl,
        credit,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  return db.collection("media_assets").findOne({ path });
}
