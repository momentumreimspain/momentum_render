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

function isGeminiVideoBody(body: unknown): body is import("./api/lib/geminiGenerateVideo").GeminiVideoParams {
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

const VIDEO_API_PATHS = new Set(["/api/video/start", "/api/video/status", "/api/video/download"]);

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
        name: "gemini-video-dev-api",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const pathname = req.url?.split("?")[0];
            if (!pathname || !VIDEO_API_PATHS.has(pathname)) {
              return next();
            }

            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
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
              const mod = await import("./api/lib/geminiGenerateVideo");

              if (pathname === "/api/video/start") {
                if (!isGeminiVideoBody(body)) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      error:
                        "Invalid body: base64Image, mimeType, prompt, resolution, duration (4s|6s|8s) required.",
                    })
                  );
                  return;
                }
                const result = await mod.startGenerateVideoOperation(apiKey, body);
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
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ operation: result.operation }));
                return;
              }

              if (pathname === "/api/video/status") {
                if (
                  !body ||
                  typeof body !== "object" ||
                  !("operation" in body) ||
                  typeof (body as { operation: unknown }).operation !== "object" ||
                  (body as { operation: unknown }).operation === null
                ) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Invalid body: { operation } required." }));
                  return;
                }
                const result = await mod.refreshGenerateVideoOperation(
                  apiKey,
                  (body as { operation: import("./types").SerializedVideoOperation }).operation
                );
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
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ operation: result.operation }));
                return;
              }

              if (pathname === "/api/video/download") {
                if (
                  !body ||
                  typeof body !== "object" ||
                  typeof (body as { videoUri?: unknown }).videoUri !== "string" ||
                  !(body as { videoUri: string }).videoUri
                ) {
                  res.statusCode = 400;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: "Invalid body: { videoUri } required." }));
                  return;
                }
                const result = await mod.downloadVideoFromUri(apiKey, (body as { videoUri: string }).videoUri);
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
                return;
              }
            } catch (e) {
              console.error("[dev api/video]", e);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Internal server error." }));
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
