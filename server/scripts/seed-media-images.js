#!/usr/bin/env node
/**
 * Fetch stock images locally, compress to base64, and store in MongoDB.
 * Run from your machine (not prod) so external CDNs are fetched once here.
 *
 * Usage (from server/):
 *   MONGODB_URI=mongodb://127.0.0.1:27017/passr node scripts/seed-media-images.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { closeDb, connectDb, getDb } from "../src/db.js";
import { compressAvatarDataUrl } from "../src/services/avatars.js";
import { compressHeroDataUrl, upsertMediaAsset } from "../src/services/media.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const HERO_IMAGES = [
  {
    path: "microsoft-patch.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1400&q=80&auto=format",
    credit: "Photo by Dan Nelson on Unsplash",
  },
  {
    path: "wwdc-apple.jpg",
    sourceUrl: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1400",
    credit: "Photo by Mati on Pexels",
  },
  {
    path: "ai-infrastructure.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1400&q=80&auto=format",
    credit: "Photo by AltumCode on Unsplash",
  },
  {
    path: "robotaxi.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80&auto=format",
    credit: "Photo by JESHOOTS.com on Unsplash",
  },
  {
    path: "trivia-rat-philosophy.webp",
    sourceUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1400&q=80&auto=format",
    credit: "Photo by Elevate on Unsplash",
  },
  {
    path: "spacex-ipo.jpg",
    sourceUrl: "https://images.pexels.com/photos/2159/flight-sky-earth-space.jpg?auto=compress&cs=tinysrgb&w=1400",
    credit: "Photo by Pixabay on Pexels",
  },
  {
    path: "bezos-prometheus.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&q=80&auto=format",
    credit: "Photo by ThisIsEngineering on Unsplash",
  },
  {
    path: "visa-ai-payments.jpg",
    sourceUrl: "https://images.pexels.com/photos/4968384/pexels-photo-4968384.jpeg?auto=compress&cs=tinysrgb&w=1400",
    credit: "Photo by Tima Miroshnichenko on Pexels",
  },
  {
    path: "meta-ai-overcorrection.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80&auto=format",
    credit: "Photo by LinkedIn Sales Solutions on Unsplash",
  },
  {
    path: "observability-as-product.jpg",
    sourceUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80&auto=format",
    credit: "Photo by Luke Chesser on Unsplash",
  },
];

const AVATAR_IMAGES = [
  {
    path: "authors/kevin-tan.webp",
    sourceUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=face",
    credit: "Photo on Unsplash",
  },
];

const USER_AVATAR_FIXES = [
  {
    email: "gary@webfly.io",
    sourceUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=face",
  },
  {
    email: "danny@webfly.io",
    sourceUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=256&h=256&fit=crop&crop=face",
  },
  {
    email: "sandy@webfly.io",
    sourceUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&h=256&fit=crop&crop=face",
  },
  {
    email: "josh@webfly.io",
    sourceUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face",
  },
];

async function fetchImageDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image fetch failed (${response.status}) for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mime = contentType.split(";")[0].trim();
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function seedHeroImages() {
  let count = 0;
  for (const item of HERO_IMAGES) {
    const raw = await fetchImageDataUrl(item.sourceUrl);
    const compressed = await compressHeroDataUrl(raw);
    await upsertMediaAsset({
      path: item.path,
      kind: "hero",
      dataUrl: compressed.dataUrl,
      credit: item.credit,
    });
    console.log(`Stored hero  ${item.path}`);
    count += 1;
  }
  return count;
}

async function seedAvatarImages() {
  let count = 0;
  for (const item of AVATAR_IMAGES) {
    const raw = await fetchImageDataUrl(item.sourceUrl);
    const dataUrl = await compressAvatarDataUrl(raw);
    await upsertMediaAsset({
      path: item.path,
      kind: "avatar",
      dataUrl,
      credit: item.credit,
    });
    console.log(`Stored avatar ${item.path}`);
    count += 1;
  }
  return count;
}

async function fixUserAvatars() {
  const users = getDb().collection("users");
  let count = 0;

  for (const item of USER_AVATAR_FIXES) {
    const email = item.email.trim().toLowerCase();
    const user = await users.findOne({ email });
    if (!user) {
      console.warn(`  ! User not found: ${email}`);
      continue;
    }
    if (user.passrProfile?.avatarUrl) {
      console.log(`Skipped user ${email} (already has avatar)`);
      continue;
    }

    const raw = await fetchImageDataUrl(item.sourceUrl);
    const avatarUrl = await compressAvatarDataUrl(raw);
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          "passrProfile.avatarUrl": avatarUrl,
          updatedAt: new Date(),
        },
      }
    );
    console.log(`Updated user ${email}`);
    count += 1;
  }

  return count;
}

async function main() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await connectDb();

  const heroCount = await seedHeroImages();
  const avatarCount = await seedAvatarImages();
  const userCount = await fixUserAvatars();

  await closeDb();

  console.log(`\nDone. ${heroCount} hero images, ${avatarCount} author avatars, ${userCount} user avatars updated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
