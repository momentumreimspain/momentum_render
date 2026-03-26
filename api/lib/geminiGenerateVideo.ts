import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";
import type { Duration, SerializedVideoOperation } from "../../types";

export type GeminiVideoParams = {
  base64Image: string;
  mimeType: string;
  prompt: string;
  resolution: "720p" | "1080p";
  /** Debe coincidir con el selector de la UI; la API usa durationSeconds. */
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

export function serializeVideoOperation(op: unknown): SerializedVideoOperation {
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

export async function startGenerateVideoOperation(
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

export async function refreshGenerateVideoOperation(
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

export async function downloadVideoFromUri(
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

/** Una sola invocación (útil en dev si se prefiere no usar el flujo partido). */
export async function generateVideoBuffer(
  apiKey: string,
  params: GeminiVideoParams
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string; httpStatus?: number }> {
  const started = await startGenerateVideoOperation(apiKey, params);
  if (!started.ok) return started;

  let op = started.operation;

  while (!op.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const refreshed = await refreshGenerateVideoOperation(apiKey, op);
    if (!refreshed.ok) return refreshed;
    op = refreshed.operation;
  }

  const finalOperation = op as SerializedVideoOperation & {
    response?: {
      generatedVideos?: Array<{ video?: { uri?: string }; finishReason?: string }>;
      error?: { message?: string };
    };
    error?: { message?: string };
  };

  const downloadLink = finalOperation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    const errorMessage =
      finalOperation.response?.error?.message ||
      (finalOperation.error as { message?: string } | undefined)?.message ||
      "Video generation completed, but no video URL was returned.";

    const safetyIssue = finalOperation.response?.generatedVideos?.[0]?.finishReason;

    if (safetyIssue && safetyIssue !== "SUCCESS") {
      return {
        ok: false,
        error: `Video generation blocked: ${safetyIssue}. Try a different prompt or image.`,
      };
    }

    return { ok: false, error: errorMessage };
  }

  return downloadVideoFromUri(apiKey, downloadLink);
}
