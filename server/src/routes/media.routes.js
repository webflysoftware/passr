import { Router } from "express";
import { getMediaAsset, parseDataUrl } from "../services/media.js";

const router = Router();

router.get("/images/*filename", async (req, res, next) => {
  try {
    const path = Array.isArray(req.params.filename)
      ? req.params.filename.join("/")
      : req.params.filename;
    if (!path || path.includes("..")) {
      res.status(400).json({ error: "Invalid image path" });
      return;
    }

    const asset = await getMediaAsset(path);
    if (!asset?.dataUrl) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const { mimeType, buffer } = parseDataUrl(asset.dataUrl);
    res.set("Content-Type", mimeType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    if (asset.credit) {
      res.set("X-Image-Credit", asset.credit);
    }
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
