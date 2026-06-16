import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getDb } from "../db.js";
import { hashToken } from "./tokens.js";
import { sendEmail, buildPasswordResetEmail } from "./email.js";

const SALT_ROUNDS = 12;

function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function requestPasswordReset(email) {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.collection("users").findOne({ email: normalizedEmail });

  if (!user) {
    console.info("[password-reset]", JSON.stringify({ event: "no_account", email: normalizedEmail, emailSent: false }));
    return { message: "If that email is registered, we sent a reset link." };
  }

  console.info("[password-reset]", JSON.stringify({ event: "reset_requested", email: normalizedEmail, emailSent: true }));

  const rawToken = createResetToken();
  const expiresAt = new Date(Date.now() + config.passwordResetMinutes * 60 * 1000);

  await db.collection("password_reset_tokens").deleteMany({ userId: String(user._id) });
  await db.collection("password_reset_tokens").insertOne({
    userId: String(user._id),
    tokenHash: hashToken(rawToken),
    expiresAt,
    createdAt: new Date(),
  });

  const resetUrl = `${config.siteUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const { subject, text, html, tag } = buildPasswordResetEmail({ resetUrl });

  try {
    const result = await sendEmail({ to: user.email, subject, text, html, tag });
    if (!result.delivered) {
      throw new Error("Mail provider not configured");
    }
  } catch (err) {
    console.error("[password-reset]", JSON.stringify({ event: "reset_email_failed", email: user.email, error: err.message }));
    const error = new Error("Could not send reset email. Please try again later.");
    error.status = 503;
    throw error;
  }

  return { message: "If that email is registered, we sent a reset link." };
}

export async function resetPasswordWithToken({ token, password }) {
  const db = getDb();
  const tokenHash = hashToken(token);
  const resetDoc = await db.collection("password_reset_tokens").findOne({ tokenHash });

  if (!resetDoc || resetDoc.expiresAt < new Date()) {
    const error = new Error("This reset link is invalid or has expired.");
    error.status = 400;
    throw error;
  }

  const userId = new ObjectId(resetDoc.userId);
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date();

  const result = await db.collection("users").updateOne(
    { _id: userId },
    { $set: { passwordHash, updatedAt: now } }
  );

  if (result.matchedCount === 0) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  await Promise.all([
    db.collection("password_reset_tokens").deleteMany({ userId: resetDoc.userId }),
    db.collection("refresh_tokens").deleteMany({ userId: resetDoc.userId }),
  ]);

  return { message: "Password updated. You can sign in with your new password." };
}
