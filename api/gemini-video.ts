/**
 * Un solo archivo de función en Vercel: evita ERR_MODULE_NOT_FOUND con ESM
 * (imports relativos sin .js entre archivos api/*).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";
import type { Duration, SerializedVideoOperation } from "../types";

export type GeminiVideoParams = {
  base64Image: string;
  mimeType: string;
  prompt: string;
  resolution: "720p" | "1080p";
  duration: Duration;
};

function durationToSeconds(d: Duration): number {
  switch (d) {
    case "4s":
      return 4;
    case "6s":
      return 6;
    case "8s":
      return 8;
    default:
      return 6;
  }
}

function serializeVideoOperation(op: unknown): SerializedVideoOperation {
  const o = op as GenerateVideosOperation;
  return {
    name: o.name,
    done: o.done,
    metadata: o.metadata,
    error: o.error,
    response: o.response as SerializedVideoOperation["response"],
  };
}

function asOperationForSdk(payload: SerializedVideoOperation): GenerateVideosOperation {
  return payload as unknown as GenerateVideosOperation;
}

async function startGenerateVideoOperation(
  apiKey: string,
  params: GeminiVideoParams
): Promise<
  { ok: true; operation: SerializedVideoOperation } | { ok: false; error: string; httpStatus?: number }
> {
  const ai = new GoogleGenAI({ apiKey });

  try {
    const operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt: params.prompt || "Animate this scene with a person moving naturally.",
      image: {
        imageBytes: params.base64Image,
        mimeType: params.mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: params.resolution,
        aspectRatio: "16:9",
        durationSeconds: durationToSeconds(params.duration),
      },
    });

    return { ok: true, operation: serializeVideoOperation(operation) };
  } catch (error: unknown) {
    console.error("Error starting video generation:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("API key not valid")) {
      return { ok: false, error: "The API key is not valid.", httpStatus: 401 };
    }
    if (message.includes("Requested entity was not found.")) {
      return { ok: false, error: "API key not found or invalid.", httpStatus: 401 };
    }
    return { ok: false, error: message || "Failed to start video generation." };
  }
}

async function refreshGenerateVideoOperation(
  apiKey: string,
  payload: SerializedVideoOperation
): Promise<
  { ok: true; operation: SerializedVideoOperation } | { ok: false; error: string; httpStatus?: number }
> {
  const ai = new GoogleGenAI({ apiKey });

  try {
    const updated = await ai.operations.getVideosOperation({
      operation: asOperationForSdk(payload),
    });
    return { ok: true, operation: serializeVideoOperation(updated) };
  } catch (error: unknown) {
    console.error("Polling failed", error);
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message || "Failed to get video generation status." };
  }
}

async function downloadVideoFromUri(
  apiKey: string,
  downloadLink: string
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string; httpStatus?: number }> {
  try {
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to download video:", errorText);
      return {
        ok: false,
        error: `Failed to download the generated video. Status: ${response.status}`,
        httpStatus: response.status,
      };
    }
    const arrayBuffer = await response.arrayBuffer();
    return { ok: true, buffer: Buffer.from(arrayBuffer) };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message || "Download failed." };
  }
}

function isGeminiVideoParams(body: Record<string, unknown>): body is GeminiVideoParams {
  const durationOk = body.duration === "4s" || body.duration === "6s" || body.duration === "8s";
  return (
    typeof body.base64Image === "string" &&
    typeof body.mimeType === "string" &&
    typeof body.prompt === "string" &&
    (body.resolution === "720p" || body.resolution === "1080p") &&
    durationOk
  );
}

export type GeminiVideoHttpResult =
  | { ok: false; status: number; error: string }
  | { ok: true; kind: "json"; data: Record<string, unknown> }
  | { ok: true; kind: "video"; buffer: Buffer };

/**
 * Núcleo reutilizable por Vercel y por el middleware de Vite en desarrollo.
 */
export async function handleGeminiVideoRequest(apiKey: string, body: unknown): Promise<GeminiVideoHttpResult> {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }

  const b = body as Record<string, unknown>;
  const step = b.step;

  if (step === "start") {
    const payload = b as Record<string, unknown>;
    if (!isGeminiVideoParams(payload)) {
      return {
        ok: false,
        status: 400,
        error: "Invalid body for start: base64Image, mimeType, prompt, resolution, duration (4s|6s|8s) required.",
      };
    }
    const params: GeminiVideoParams = {
      base64Image: payload.base64Image,
      mimeType: payload.mimeType,
      prompt: payload.prompt,
      resolution: payload.resolution,
      duration: payload.duration,
    };
    const result = await startGenerateVideoOperation(apiKey, params);
    if (!result.ok) {
      const status =
        result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
      return { ok: false, status, error: result.error };
    }
    return { ok: true, kind: "json", data: { operation: result.operation } };
  }

  if (step === "status") {
    if (
      b.operation === null ||
      typeof b.operation !== "object" ||
      Array.isArray(b.operation)
    ) {
      return { ok: false, status: 400, error: "Invalid body for status: { operation } required." };
    }
    const result = await refreshGenerateVideoOperation(apiKey, b.operation as SerializedVideoOperation);
    if (!result.ok) {
      const status =
        result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
      return { ok: false, status, error: result.error };
    }
    return { ok: true, kind: "json", data: { operation: result.operation } };
  }

  if (step === "download") {
    if (typeof b.videoUri !== "string" || !b.videoUri) {
      return { ok: false, status: 400, error: "Invalid body for download: { videoUri } required." };
    }
    const result = await downloadVideoFromUri(apiKey, b.videoUri);
    if (!result.ok) {
      const status =
        result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 600 ? result.httpStatus : 500;
      return { ok: false, status, error: result.error };
    }
    return { ok: true, kind: "video", buffer: result.buffer };
  }

  return { ok: false, status: 400, error: 'body.step must be "start", "status", or "download".' };
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

    const out = await handleGeminiVideoRequest(apiKey, req.body);

    if (!out.ok) {
      return res.status(out.status).json({ error: out.error });
    }

    if (out.kind === "json") {
      return res.status(200).json(out.data);
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(out.buffer);
  } catch (e) {
    console.error("[api/gemini-video]", e);
    return res.status(500).json({ error: "Error interno en gemini-video." });
  }
}
