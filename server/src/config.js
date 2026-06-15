import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const superAdminEmails = (process.env.PASSR_SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const superAdminDomains = (process.env.PASSR_SUPER_ADMIN_DOMAINS || "passr.net,webfly.io")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

export const config = {
  env: process.env.NODE_ENV || "development",
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 3010),
  mongodbUri: required("MONGODB_URI", process.env.MONGODB_URI),
  jwtSecret: required("JWT_SECRET", process.env.JWT_SECRET),
  autoVerifyEmail: process.env.AUTO_VERIFY_EMAIL !== "false",
  superAdminEmails,
  superAdminDomains,
  accessTokenMinutes: Number(process.env.ACCESS_TOKEN_MINUTES || 30),
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  maxAvatarInputBytes: 512 * 1024,
  maxAvatarStoredBytes: 24 * 1024,
  avatarMaxDimension: Number(process.env.AVATAR_MAX_DIMENSION || 128),
  avatarWebpQuality: Number(process.env.AVATAR_WEBP_QUALITY || 55),
};

export function isSuperAdminEmail(email) {
  return superAdminEmails.includes(String(email || "").trim().toLowerCase());
}

export function isSuperAdminDomain(email) {
  const domain = String(email || "").split("@")[1]?.trim().toLowerCase() || "";
  return superAdminDomains.includes(domain);
}

export function isPassrSuperAdminUser(user) {
  return isSuperAdminEmail(user?.email) || isSuperAdminDomain(user?.email) || Boolean(user?.isPassrSuperAdmin);
}
