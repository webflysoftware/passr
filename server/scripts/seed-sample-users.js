#!/usr/bin/env node
/**
 * Seed discussion personas for super-admin comment assignment.
 * Idempotent — skips existing emails, refreshes profiles for known seed users.
 *
 * Usage (from server/):
 *   node scripts/seed-sample-users.js
 */

import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { compressAvatarDataUrl } from "../src/services/avatars.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SALT_ROUNDS = 12;
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || "PassrReader1!";

const SAMPLE_USERS = [
  {
    name: "Elena Vasquez",
    email: "elena.vasquez@readers.passr.net",
    displayName: "Elena Vasquez",
    bio: "Staff engineer. Distributed systems, auth, and the occasional rant about JWT expiry.",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=face",
  },
  {
    name: "Marcus Chen",
    email: "marcus.chen@readers.passr.net",
    displayName: "Marcus Chen",
    bio: "Principal engineer at a fintech. Postgres plans are a personality trait.",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop&crop=face",
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@readers.passr.net",
    displayName: "Priya Sharma",
    bio: "Engineering manager. Team practices, observability, and pub quiz logistics.",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=face",
  },
  {
    name: "Kevin Tan",
    email: "kevin.tan@readers.passr.net",
    displayName: "Kevin Tan",
    bio: "Software engineer. AI tooling skeptic until the demo actually ships.",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=face",
  },
  {
    name: "James Okonkwo",
    email: "james.okonkwo@readers.passr.net",
    displayName: "James Okonkwo",
    bio: "Senior backend engineer. API versioning and HOA election software, somehow.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face",
  },
  {
    name: "Sarah Mitchell",
    email: "sarah.mitchell@readers.passr.net",
    displayName: "Sarah Mitchell",
    bio: "Platform lead at a Series B startup. Blue-green deploys and strong opinions.",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=256&h=256&fit=crop&crop=face",
  },
  {
    name: "David Park",
    email: "david.park@readers.passr.net",
    displayName: "David Park",
    bio: "SRE who owns on-call rotation and the team trivia spreadsheet.",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=face",
  },
  {
    name: "Nina Rodriguez",
    email: "nina.rodriguez@readers.passr.net",
    displayName: "Nina Rodriguez",
    bio: "Product manager. Runs retros, town halls, and one very competitive Kahoot night.",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=face",
  },
];

async function fetchAvatarDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Avatar fetch failed (${response.status}) for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mime = contentType.split(";")[0].trim();
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function buildPassrProfile(sample) {
  const profile = {
    displayName: sample.displayName,
    bio: sample.bio,
    avatarUrl: null,
  };

  if (!sample.avatarUrl) return profile;

  try {
    const dataUrl = await fetchAvatarDataUrl(sample.avatarUrl);
    profile.avatarUrl = await compressAvatarDataUrl(dataUrl);
  } catch (err) {
    console.warn(`  ! Avatar skipped for ${sample.email}: ${err.message}`);
  }

  return profile;
}

async function main() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  const client = new MongoClient(mongodbUri);
  await client.connect();
  const users = client.db().collection("users");

  let created = 0;
  let updated = 0;

  for (const sample of SAMPLE_USERS) {
    const email = sample.email.trim().toLowerCase();
    const passrProfile = await buildPassrProfile(sample);
    const now = new Date();
    const existing = await users.findOne({ email });

    if (existing) {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: sample.name,
            passrProfile,
            isEmailVerified: true,
            updatedAt: now,
          },
        }
      );
      console.log(`Updated  ${email} (${existing._id})`);
      updated += 1;
      continue;
    }

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
    const doc = {
      name: sample.name,
      email,
      passwordHash,
      role: "user",
      isEmailVerified: true,
      isPassrSuperAdmin: false,
      quoteSubmitted: false,
      contactFormSubmitted: false,
      passrProfile,
      createdAt: now,
      updatedAt: now,
    };

    const result = await users.insertOne(doc);
    console.log(`Created  ${email} (${result.insertedId})`);
    created += 1;
  }

  await client.close();

  console.log(`\nDone. ${created} created, ${updated} updated.`);
  if (created > 0) {
    console.log(`Seed password for new accounts: ${SEED_PASSWORD}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
