import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config, isPassrSuperAdminUser, isSuperAdminDomain } from "../config.js";
import { getDb } from "../db.js";

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(userId) {
  const expiresIn = `${config.accessTokenMinutes}m`;
  const token = jwt.sign({ sub: userId, type: "access" }, config.jwtSecret, { expiresIn });
  const decoded = jwt.decode(token);
  return {
    token,
    expires: new Date(decoded.exp * 1000).toISOString(),
  };
}

export function signRefreshToken(userId) {
  const expiresIn = `${config.refreshTokenDays}d`;
  const token = jwt.sign({ sub: userId, type: "refresh" }, config.jwtSecret, { expiresIn });
  const decoded = jwt.decode(token);
  return {
    token,
    expires: new Date(decoded.exp * 1000).toISOString(),
  };
}

export async function issueTokens(userId) {
  const access = signAccessToken(userId);
  const refresh = signRefreshToken(userId);

  await getDb().collection("refresh_tokens").insertOne({
    userId,
    tokenHash: hashToken(refresh.token),
    expiresAt: new Date(refresh.expires),
    createdAt: new Date(),
  });

  return { access, refresh };
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  await getDb().collection("refresh_tokens").deleteOne({ tokenHash: hashToken(refreshToken) });
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }
  return payload;
}

export async function verifyRefreshToken(refreshToken) {
  const payload = jwt.verify(refreshToken, config.jwtSecret);
  if (payload.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  const stored = await getDb().collection("refresh_tokens").findOne({
    tokenHash: hashToken(refreshToken),
    userId: payload.sub,
  });

  if (!stored) {
    throw new Error("Refresh token revoked");
  }

  return payload;
}

export function serializeUser(user) {
  return {
    type: "auth",
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role || "user",
    isEmailVerified: Boolean(user.isEmailVerified),
    isPassrSuperAdmin: isPassrSuperAdminUser(user),
    quoteSubmitted: Boolean(user.quoteSubmitted),
    contactFormSubmitted: Boolean(user.contactFormSubmitted),
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    passrProfile: {
      displayName: user.passrProfile?.displayName || user.name,
      bio: user.passrProfile?.bio || "",
      avatarUrl: user.passrProfile?.avatarUrl || null,
    },
  };
}
