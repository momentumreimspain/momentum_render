import type { Duration, VeoResponse, VideoResolution } from "../types";

export type VideoBlobResult = { blob: Blob } | { error: string };

const TIMEOUT_HINT =
  "El servidor cortó la espera (timeout). Generar vídeo con Veo suele tardar varios minutos: en Vercel el plan Hobby limita mucho el tiempo de las funciones; hace falta un plan con ejecución larga (p. ej. Pro) y maxDuration alto, o usar npm run dev en local.";

export async function generateVideoBlobFromImage(
  base64Image: string,
  mimeType: string,
  prompt: string,
  resolution: VideoResolution,
  duration: Duration
): Promise<VideoBlobResult> {
  const payload = { base64Image, mimeType, prompt, resolution, duration };

  try {
    const response = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      if (contentType.includes("application/json")) {
        const data: unknown = await response.json();
        const err =
          data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Video generation failed.";
        return { error: err };
      }
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        return { error: TIMEOUT_HINT };
      }
      return { error: `Error del servidor (${response.status}).` };
    }

    if (contentType.includes("application/json")) {
      const data: unknown = await response.json();
      const err =
        data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : "Video generation failed.";
      return { error: err };
    }

    const videoBlob = await response.blob();
    return { blob: videoBlob };
  } catch (error: unknown) {
    console.error("Error generating video:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
      return {
        error:
          "No se pudo contactar con el servidor de generación. Comprueba que GEMINI_API_KEY esté definida (Vercel o .env.local) y que estés usando npm run dev en este proyecto.",
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
