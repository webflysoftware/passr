import Joi from "joi";

export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map((detail) => detail.message).join(", ");
      return res.status(400).json({ code: 400, message });
    }

    req.body = value;
    return next();
  };
}

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

export const logoutSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(32).max(128).required(),
  password: Joi.string().min(8).max(128).required(),
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().min(32).max(128).required(),
});

export const subscribeSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

export const contactSchema = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  email: Joi.string().trim().email().required(),
  message: Joi.string().trim().min(1).max(5000).required(),
});

export const postCommentSchema = Joi.object({
  articleSlug: Joi.string().trim().min(1).max(120).required(),
  body: Joi.string().trim().min(1).max(2000).required(),
  parentId: Joi.string().trim().optional(),
});

export const updateCommentSchema = Joi.object({
  body: Joi.string().trim().min(1).max(2000).required(),
  userId: Joi.string().trim().allow(null).optional(),
  authorName: Joi.string().trim().max(80).optional(),
  authorEmail: Joi.string().trim().email().optional(),
});

export const adminCreateUserSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
  displayName: Joi.string().trim().max(80).optional(),
});

export const updateProfileSchema = Joi.object({
  displayName: Joi.string().trim().min(1).max(80).required(),
  bio: Joi.string().trim().max(280).allow("").optional(),
  avatarDataUrl: Joi.string().max(700000).optional(),
  removeAvatar: Joi.boolean().optional(),
});
