import { Router } from "express";
import { saveContactMessage, subscribeEmail } from "../services/passr.js";
import { contactSchema, subscribeSchema, validateBody } from "../middleware/validate.js";

const router = Router();

router.post("/subscribe", validateBody(subscribeSchema), async (req, res, next) => {
  try {
    console.info("[subscribe]", JSON.stringify({ event: "request", email: req.body.email }));
    const result = await subscribeEmail(req.body.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/contact", validateBody(contactSchema), async (req, res, next) => {
  try {
    const result = await saveContactMessage(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
