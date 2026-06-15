import { verifyAccessToken } from "../services/tokens.js";
import { getUserById } from "../services/auth.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ code: 401, message: "Please authenticate" });
    }

    const payload = verifyAccessToken(token);
    const user = await getUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ code: 401, message: "Please authenticate" });
    }

    req.user = user;
    return next();
  } catch (_) {
    return res.status(401).json({ code: 401, message: "Please authenticate" });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user?.isPassrSuperAdmin) {
    return res.status(403).json({ code: 403, message: "Forbidden" });
  }
  return next();
}
