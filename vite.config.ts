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
            if (pathname !== "/api/gemini-video" || req.method !== "POST") {
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
              const { handleGeminiVideoRequest } = await import("./api/gemini-video");
              const out = await handleGeminiVideoRequest(apiKey, body);

              if (!out.ok) {
                res.statusCode = out.status;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: out.error }));
                return;
              }

              if (out.kind === "json") {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(out.data));
                return;
              }

              res.statusCode = 200;
              res.setHeader("Content-Type", "video/mp4");
              res.setHeader("Cache-Control", "no-store");
              res.end(out.buffer);
            } catch (e) {
              console.error("[dev api/gemini-video]", e);
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
