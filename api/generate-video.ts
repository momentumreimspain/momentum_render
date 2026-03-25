import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateVideoBuffer, type GeminiVideoParams } from "../server/geminiGenerateVideo";

function isValidBody(body: unknown): body is GeminiVideoParams {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.base64Image === "string" &&
    typeof b.mimeType === "string" &&
    typeof b.prompt === "string" &&
    (b.resolution === "720p" || b.resolution === "1080p")
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  if (!isValidBody(req.body)) {
    return res.status(400).json({ error: "Invalid body: base64Image, mimeType, prompt, resolution required." });
  }

  const result = await generateVideoBuffer(apiKey, req.body);

  if (!result.ok) {
    const status = result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
    return res.status(status).json({ error: result.error });
  }

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(result.buffer);
}
