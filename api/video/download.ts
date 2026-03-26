import type { VercelRequest, VercelResponse } from "@vercel/node";
import { downloadVideoFromUri } from "../../server/geminiGenerateVideo";

function isValidBody(body: unknown): body is { videoUri: string } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.videoUri === "string" && b.videoUri.length > 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    if (!isValidBody(req.body)) {
      return res.status(400).json({ error: "Invalid body: { videoUri } required." });
    }

    const result = await downloadVideoFromUri(apiKey, req.body.videoUri);

    if (!result.ok) {
      const status =
        result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
      return res.status(status).json({ error: result.error });
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(result.buffer);
  } catch (e) {
    console.error("[api/video/download]", e);
    return res.status(500).json({ error: "Error interno al descargar el vídeo." });
  }
}
