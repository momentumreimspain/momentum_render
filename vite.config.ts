import path from "path";
import type { IncomingMessage } from "node:http";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function isGeminiVideoBody(body: unknown): body is {
  base64Image: string;
  mimeType: string;
  prompt: string;
  resolution: "720p" | "1080p";
} {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.base64Image === "string" &&
    typeof b.mimeType === "string" &&
    typeof b.prompt === "string" &&
    (b.resolution === "720p" || b.resolution === "1080p")
  );
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    server: {
      port: 3001,
      host: "0.0.0.0",
    },
    plugins: [
      react(),
      {
        name: "gemini-generate-video-dev-api",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const pathname = req.url?.split("?")[0];
            if (pathname !== "/api/generate-video" || req.method !== "POST") {
              return next();
            }

            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "GEMINI_API_KEY no está definida en .env.local (solo servidor)." }));
              return;
            }

            try {
              const body = await readJsonBody(req as IncomingMessage);
              if (!isGeminiVideoBody(body)) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    error: "Invalid body: base64Image, mimeType, prompt, resolution required.",
                  })
                );
                return;
              }

              const { generateVideoBuffer } = await import("./server/geminiGenerateVideo");
              const result = await generateVideoBuffer(apiKey, body);

              if (!result.ok) {
                const status =
                  result.httpStatus && result.httpStatus >= 400 && result.httpStatus < 600
                    ? result.httpStatus
                    : 500;
                res.statusCode = status;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: result.error }));
                return;
              }

              res.statusCode = 200;
              res.setHeader("Content-Type", "video/mp4");
              res.setHeader("Cache-Control", "no-store");
              res.end(result.buffer);
            } catch (e) {
              console.error("[dev api/generate-video]", e);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Internal server error during video generation." }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
