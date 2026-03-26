import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  startGenerateVideoOperation,
  type GeminiVideoParams,
} from "../lib/geminiGenerateVideo";

function isValidBody(body: unknown): body is GeminiVideoParams {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  const durationOk = b.duration === "4s" || b.duration === "6s" || b.duration === "8s";
  return (
    typeof b.base64Image === "string" &&
    typeof b.mimeType === "string" &&
    typeof b.prompt === "string" &&
    (b.resolution === "720p" || b.resolution === "1080p") &&
    durationOk
  );
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
      return res.status(400).json({
        error: "Invalid body: base64Image, mimeType, prompt, resolution, duration (4s|6s|8s) required.",
      });
    }

    const result = await startGenerateVideoOperation(apiKey, req.body);

    if (!result.ok) {
      const status =
        result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
      return res.status(status).json({ error: result.error });
    }

    return res.status(200).json({ operation: result.operation });
  } catch (e) {
    console.error("[api/video/start]", e);
    return res.status(500).json({ error: "Error interno al iniciar la generación." });
  }
}
