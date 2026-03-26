import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SerializedVideoOperation } from "../../types";
import { refreshGenerateVideoOperation } from "../../server/geminiGenerateVideo";

function isValidBody(body: unknown): body is { operation: SerializedVideoOperation } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return b.operation !== null && typeof b.operation === "object";
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
      return res.status(400).json({ error: "Invalid body: { operation } required." });
    }

    const result = await refreshGenerateVideoOperation(apiKey, req.body.operation);

    if (!result.ok) {
      const status =
        result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
      return res.status(status).json({ error: result.error });
    }

    return res.status(200).json({ operation: result.operation });
  } catch (e) {
    console.error("[api/video/status]", e);
    return res.status(500).json({ error: "Error interno al consultar el estado." });
  }
}
