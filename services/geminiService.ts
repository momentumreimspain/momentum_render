import type { VeoResponse, VideoResolution } from "../types";

export type VideoBlobResult = { blob: Blob } | { error: string };

export async function generateVideoBlobFromImage(
  base64Image: string,
  mimeType: string,
  prompt: string,
  resolution: VideoResolution
): Promise<VideoBlobResult> {
  const payload = { base64Image, mimeType, prompt, resolution };

  try {
    const response = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data: unknown = await response.json();
      const err =
        data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : "Video generation failed.";
      return { error: err };
    }

    if (!response.ok) {
      return { error: `Server error: ${response.status}` };
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
  resolution: VideoResolution
): Promise<VeoResponse> => {
  const result = await generateVideoBlobFromImage(base64Image, mimeType, prompt, resolution);
  if ("error" in result) {
    return { error: result.error };
  }
  const videoUrl = URL.createObjectURL(result.blob);
  return { videoUrl };
};
