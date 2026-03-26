import type { Duration, SerializedVideoOperation, VeoResponse, VideoResolution } from "../types";

export type VideoBlobResult = { blob: Blob } | { error: string };

const POLL_MS = 10000;

async function readJsonError(response: Response): Promise<string> {
  const ct = response.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const data: unknown = await response.json();
    if (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string") {
      return (data as { error: string }).error;
    }
  }
  return `Error del servidor (${response.status}).`;
}

function interpretDoneOperation(op: SerializedVideoOperation): { error: string } | { videoUri: string } {
  if (op.error && Object.keys(op.error).length > 0) {
    const msg =
      typeof op.error === "object" && op.error !== null && "message" in op.error
        ? String((op.error as { message: unknown }).message)
        : JSON.stringify(op.error);
    return { error: msg || "La operación de vídeo falló." };
  }

  const downloadLink = op.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    const errorMessage =
      op.response?.error?.message ||
      "Video generation completed, but no video URL was returned.";

    const safetyIssue = op.response?.generatedVideos?.[0]?.finishReason;

    if (safetyIssue && safetyIssue !== "SUCCESS") {
      return {
        error: `Video generation blocked: ${safetyIssue}. Try a different prompt or image.`,
      };
    }

    return { error: errorMessage };
  }

  return { videoUri: downloadLink };
}

export async function generateVideoBlobFromImage(
  base64Image: string,
  mimeType: string,
  prompt: string,
  resolution: VideoResolution,
  duration: Duration
): Promise<VideoBlobResult> {
  const payload = { base64Image, mimeType, prompt, resolution, duration };

  try {
    const startRes = await fetch("/api/video/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!startRes.ok) {
      return { error: await readJsonError(startRes) };
    }

    const startData: unknown = await startRes.json();
    if (
      !startData ||
      typeof startData !== "object" ||
      !("operation" in startData) ||
      typeof (startData as { operation: unknown }).operation !== "object" ||
      (startData as { operation: unknown }).operation === null
    ) {
      return { error: "Respuesta inválida del servidor (start)." };
    }

    let operation = (startData as { operation: SerializedVideoOperation }).operation;

    while (!operation.done) {
      await new Promise((r) => setTimeout(r, POLL_MS));

      const statusRes = await fetch("/api/video/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation }),
      });

      if (!statusRes.ok) {
        return { error: await readJsonError(statusRes) };
      }

      const statusData: unknown = await statusRes.json();
      if (
        !statusData ||
        typeof statusData !== "object" ||
        !("operation" in statusData) ||
        typeof (statusData as { operation: unknown }).operation !== "object" ||
        (statusData as { operation: unknown }).operation === null
      ) {
        return { error: "Respuesta inválida del servidor (status)." };
      }

      operation = (statusData as { operation: SerializedVideoOperation }).operation;
    }

    const interpreted = interpretDoneOperation(operation);
    if ("error" in interpreted) {
      return { error: interpreted.error };
    }

    const dlRes = await fetch("/api/video/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUri: interpreted.videoUri }),
    });

    const dlCt = dlRes.headers.get("content-type") || "";
    if (!dlRes.ok) {
      if (dlCt.includes("application/json")) {
        return { error: await readJsonError(dlRes) };
      }
      return { error: `Error al descargar el vídeo (${dlRes.status}).` };
    }

    if (dlCt.includes("application/json")) {
      return { error: await readJsonError(dlRes) };
    }

    const videoBlob = await dlRes.blob();
    return { blob: videoBlob };
  } catch (error: unknown) {
    console.error("Error generating video:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      return {
        error:
          "No se pudo contactar con el servidor. Comprueba GEMINI_API_KEY en Vercel y que el despliegue incluya /api/video/*.",
      };
    }
    return { error: message || "An unknown error occurred while generating the video." };
  }
}

export const generateVideoFromImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
  resolution: VideoResolution,
  duration: Duration
): Promise<VeoResponse> => {
  const result = await generateVideoBlobFromImage(base64Image, mimeType, prompt, resolution, duration);
  if ("error" in result) {
    return { error: result.error };
  }
  const videoUrl = URL.createObjectURL(result.blob);
  return { videoUrl };
};
