import express, { Router, Request, Response } from "express";
import { scanWebsite } from "../services/puppeteerService";

const router: Router = express.Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  try {
    const result = await scanWebsite(url);
    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
