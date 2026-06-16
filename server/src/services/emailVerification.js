import crypto from "crypto";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getDb } from "../db.js";
import { hashToken } from "./tokens.js";
import { buildRegistrationWelcomeEmail, sendEmail } from "./email.js";

function createVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createEmailVerificationToken(userId) {
  const db = getDb();
  const rawToken = createVerificationToken();
  const expiresAt = new Date(Date.now() + config.emailVerificationMinutes * 60 * 1000);

  await db.collection("email_verification_tokens").deleteMany({ userId: String(userId) });
  await db.collection("email_verification_tokens").insertOne({
    userId: String(userId),
    tokenHash: hashToken(rawToken),
    expiresAt,
    createdAt: new Date(),
  });

  return rawToken;
}

export async function sendRegistrationWelcomeEmail(user) {
  const needsVerification = !user.isEmailVerified;
  let verifyUrl;

  if (needsVerification) {
    const rawToken = await createEmailVerificationToken(String(user._id));
    verifyUrl = `${config.siteUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
  }

  const { subject, text, html, tag } = buildRegistrationWelcomeEmail({
    name: user.passrProfile?.displayName || user.name,
    siteUrl: config.siteUrl,
    verifyUrl,
    needsVerification,
  });

  const result = await sendEmail({
    to: user.email,
    subject,
    text,
    html,
    tag,
  });

  if (!result.delivered) {
    throw new Error("Mail provider not configured");
  }

  return result;
}

export async function sendVerificationEmailForUser(userId) {
  const db = getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (user.isEmailVerified) {
    console.info("[verify-email]", JSON.stringify({ event: "already_verified", email: user.email, emailSent: false }));
    return { email: user.email, message: "Email already verified" };
  }

  console.info("[verify-email]", JSON.stringify({ event: "resend_requested", email: user.email, emailSent: true }));
  await sendRegistrationWelcomeEmail(user);
  return { email: user.email, message: "Verification email sent" };
}

export async function verifyEmailWithToken(token) {
  const db = getDb();
  const tokenHash = hashToken(token);
  const verifyDoc = await db.collection("email_verification_tokens").findOne({ tokenHash });

  if (!verifyDoc || verifyDoc.expiresAt < new Date()) {
    const error = new Error("This verification link is invalid or has expired.");
    error.status = 400;
    throw error;
  }

  const userId = new ObjectId(verifyDoc.userId);
  const result = await db.collection("users").updateOne(
    { _id: userId },
    { $set: { isEmailVerified: true, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  await db.collection("email_verification_tokens").deleteMany({ userId: verifyDoc.userId });

  return { message: "Email verified. You can sign in now." };
}
