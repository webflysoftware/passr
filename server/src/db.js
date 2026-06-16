import { MongoClient } from "mongodb";
import { config } from "./config.js";

let client;
let db;

export async function connectDb() {
  if (db) return db;

  client = new MongoClient(config.mongodbUri);
  await client.connect();
  db = client.db();

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("subscribers").createIndex({ email: 1 }, { unique: true }),
    db.collection("comments").createIndex({ articleSlug: 1, createdAt: 1 }),
    db.collection("comments").createIndex({ parentId: 1 }),
    db.collection("refresh_tokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("refresh_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("password_reset_tokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("password_reset_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("email_verification_tokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("email_verification_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("media_assets").createIndex({ path: 1 }, { unique: true }),
  ]);

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not connected. Call connectDb() first.");
  }
  return db;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}
