import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  sendVerificationEmail,
  updatePassrProfile,
  getPublicProfile,
  adminCreateUser,
  adminSearchUsers,
} from "../services/auth.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import {
  adminCreateUserSchema,
  loginSchema,
  logoutSchema,
  registerSchema,
  updateProfileSchema,
  validateBody,
} from "../middleware/validate.js";

const router = Router();

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", validateBody(logoutSchema), async (req, res, next) => {
  try {
    await logoutUser(req.body.refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json(req.user);
});

router.post("/send-verification-email", requireAuth, async (req, res, next) => {
  try {
    await sendVerificationEmail(req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch("/profile", requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await updatePassrProfile(req.user.id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get("/profile/:userId", async (req, res, next) => {
  try {
    const profile = await getPublicProfile(req.params.userId);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.post("/admin/users", requireAuth, requireSuperAdmin, validateBody(adminCreateUserSchema), async (req, res, next) => {
  try {
    const user = await adminCreateUser(req.body, req.user);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.get("/admin/users", requireAuth, requireSuperAdmin, async (req, res, next) => {
  try {
    const users = await adminSearchUsers(req.query.search || "", Number(req.query.limit || 10), req.user);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

export default router;
