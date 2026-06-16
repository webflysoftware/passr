import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { config, isSuperAdminEmail, isSuperAdminDomain } from "../config.js";
import { getDb } from "../db.js";
import { issueTokens, revokeRefreshToken, serializeUser, verifyRefreshToken } from "./tokens.js";
import { compressAvatarDataUrl } from "./avatars.js";
import { sendRegistrationWelcomeEmail, sendVerificationEmailForUser } from "./emailVerification.js";

const SALT_ROUNDS = 12;

function defaultPassrProfile(name) {
  return {
    displayName: name,
    bio: "",
    avatarUrl: null,
  };
}

export async function registerUser({ name, email, password }) {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.collection("users").findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error("Email already taken");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date();
  const userDoc = {
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "user",
    isEmailVerified: config.autoVerifyEmail || isSuperAdminEmail(normalizedEmail) || isSuperAdminDomain(normalizedEmail),
    isPassrSuperAdmin: isSuperAdminEmail(normalizedEmail) || isSuperAdminDomain(normalizedEmail),
    quoteSubmitted: false,
    contactFormSubmitted: false,
    passrProfile: defaultPassrProfile(name.trim()),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("users").insertOne(userDoc);
  const user = { ...userDoc, _id: result.insertedId };

  try {
    await sendRegistrationWelcomeEmail(user);
  } catch (mailErr) {
    console.error("[register]", JSON.stringify({ event: "welcome_email_failed", email: user.email, error: mailErr.message }));
  }

  const tokens = await issueTokens(String(user._id));

  return { user: serializeUser(user), tokens };
}

export async function loginUser({ email, password }) {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.collection("users").findOne({ email: normalizedEmail });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error("Incorrect email or password");
    error.status = 401;
    throw error;
  }

  if (!user.isEmailVerified && !config.autoVerifyEmail && !isSuperAdminEmail(normalizedEmail) && !isSuperAdminDomain(normalizedEmail)) {
    const error = new Error("Please verify your email before signing in.");
    error.status = 403;
    throw error;
  }

  if (!user.isEmailVerified && (isSuperAdminEmail(normalizedEmail) || isSuperAdminDomain(normalizedEmail))) {
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { isEmailVerified: true, updatedAt: new Date() } }
    );
    user.isEmailVerified = true;
  }

  const tokens = await issueTokens(String(user._id));
  return { user: serializeUser(user), tokens };
}

export async function logoutUser(refreshToken) {
  await revokeRefreshToken(refreshToken);
}

export async function refreshAuthSession(refreshToken) {
  let payload;
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch (err) {
    err.status = 401;
    throw err;
  }

  await revokeRefreshToken(refreshToken);

  const user = await getUserById(payload.sub);
  if (!user) {
    const error = new Error("User not found");
    error.status = 401;
    throw error;
  }

  const tokens = await issueTokens(String(user.id));
  return { user, tokens };
}

export async function getUserById(userId) {
  const db = getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  return user ? serializeUser(user) : null;
}

export async function updatePassrProfile(userId, payload) {
  const db = getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const passrProfile = {
    displayName: payload.displayName?.trim() || user.passrProfile?.displayName || user.name,
    bio: payload.bio?.trim() || "",
    avatarUrl: user.passrProfile?.avatarUrl || null,
  };

  if (payload.removeAvatar) {
    passrProfile.avatarUrl = null;
  } else if (payload.avatarDataUrl) {
    passrProfile.avatarUrl = await compressAvatarDataUrl(payload.avatarDataUrl);
  }

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        passrProfile,
        updatedAt: new Date(),
      },
    }
  );

  const updated = await db.collection("users").findOne({ _id: user._id });
  return serializeUser(updated);
}

export async function getPublicProfile(userId) {
  const db = getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!user) {
    const error = new Error("Profile not found");
    error.status = 404;
    throw error;
  }

  return {
    id: String(user._id),
    displayName: user.passrProfile?.displayName || user.name,
    bio: user.passrProfile?.bio || "",
    avatarUrl: user.passrProfile?.avatarUrl || null,
    memberSince: user.createdAt?.toISOString?.() || user.createdAt,
  };
}

export async function adminCreateUser({ name, email, password, displayName }, actor) {
  if (!actor.isPassrSuperAdmin) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.collection("users").findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error("Email already taken");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = new Date();
  const profileName = displayName?.trim() || name.trim();
  const userDoc = {
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "user",
    isEmailVerified: true,
    isPassrSuperAdmin: isSuperAdminEmail(normalizedEmail) || isSuperAdminDomain(normalizedEmail),
    quoteSubmitted: false,
    contactFormSubmitted: false,
    passrProfile: {
      displayName: profileName,
      bio: "",
      avatarUrl: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("users").insertOne(userDoc);
  const user = { ...userDoc, _id: result.insertedId };
  return serializeUser(user);
}

export async function adminSearchUsers(query, limit, actor) {
  if (!actor.isPassrSuperAdmin) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }

  const db = getDb();
  const trimmed = query.trim();
  const filter = trimmed
    ? {
        $or: [
          { email: { $regex: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          { name: { $regex: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
          { "passrProfile.displayName": { $regex: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
        ],
      }
    : {};

  const users = await db
    .collection("users")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(limit || 8, 25))
    .toArray();

  return users.map((user) => ({
    id: String(user._id),
    email: user.email,
    displayName: user.passrProfile?.displayName || user.name,
  }));
}

export async function sendVerificationEmail(userId) {
  return sendVerificationEmailForUser(userId);
}
