import { Router } from "express";
import {
  deleteCommentAdmin,
  getComments,
  postComment,
  updateCommentAdmin,
} from "../services/passr.js";
import { requireAuth, requireSuperAdmin } from "../middleware/auth.js";
import { postCommentSchema, updateCommentSchema, validateBody } from "../middleware/validate.js";

const router = Router();

router.get("/:slug", async (req, res, next) => {
  try {
    const result = await getComments(req.params.slug);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, validateBody(postCommentSchema), async (req, res, next) => {
  try {
    const comment = await postComment({
      articleSlug: req.body.articleSlug,
      body: req.body.body,
      parentId: req.body.parentId,
      user: req.user,
    });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

router.patch("/:commentId", requireAuth, requireSuperAdmin, validateBody(updateCommentSchema), async (req, res, next) => {
  try {
    const comment = await updateCommentAdmin(req.params.commentId, req.body, req.user);
    res.json({ comment });
  } catch (err) {
    next(err);
  }
});

router.delete("/:commentId", requireAuth, requireSuperAdmin, async (req, res, next) => {
  try {
    await deleteCommentAdmin(req.params.commentId, req.user);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
