import { GoogleGenAI } from "@google/genai";

export type GeminiVideoParams = {
  base64Image: string;
  mimeType: string;
  prompt: string;
  resolution: "720p" | "1080p";
};

async function pollOperation(operation: unknown, ai: GoogleGenAI): Promise<unknown> {
  let currentOperation = operation as { done?: boolean };
  while (!currentOperation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    try {
      currentOperation = (await ai.operations.getVideosOperation({
        operation: currentOperation,
      })) as { done?: boolean };
    } catch (e) {
      console.error("Polling failed", e);
      throw new Error("Failed to get video generation status.");
    }
  }
  return currentOperation;
}

export async function generateVideoBuffer(
  apiKey: string,
  params: GeminiVideoParams
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string; httpStatus?: number }> {
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
      },
    });

    const finalOperation = (await pollOperation(operation, ai)) as {
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
        finalOperation.error?.message ||
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
    console.error("Error generating video:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("API key not valid")) {
      return { ok: false, error: "The API key is not valid.", httpStatus: 401 };
    }
    if (message.includes("Requested entity was not found.")) {
      return { ok: false, error: "API key not found or invalid.", httpStatus: 401 };
    }
    return { ok: false, error: message || "An unknown error occurred while generating the video." };
  }
}
