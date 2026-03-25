import type { MultiImageSequenceMode } from "../types";

const CROSSFADE_SEC = 0.85;
const DIP_OUT_SEC = 0.22;
const DIP_HOLD_SEC = 0.12;
const DIP_IN_SEC = 0.22;

function pickRecorderMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return "video/webm";
}

function loadVideoFromBlob(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.src = URL.createObjectURL(blob);
    v.onloadeddata = () => resolve(v);
    v.onerror = () => {
      URL.revokeObjectURL(v.src);
      reject(new Error("No se pudo cargar un clip para unir."));
    };
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  v: HTMLVideoElement,
  w: number,
  h: number
) {
  const vw = v.videoWidth;
  const vh = v.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function seekVideo(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      v.removeEventListener("seeked", onSeeked);
      resolve();
    };
    const onSeeked = () => finish();
    v.addEventListener("seeked", onSeeked);
    v.currentTime = Math.min(Math.max(0, t), Math.max(0, v.duration - 0.05));
    setTimeout(finish, 600);
  });
}

async function playSegment(
  ctx: CanvasRenderingContext2D,
  v: HTMLVideoElement,
  w: number,
  h: number,
  startTime: number,
  endTime: number
): Promise<void> {
  await seekVideo(v, startTime);
  await v.play().catch(() => undefined);

  while (true) {
    if (v.currentTime >= endTime - 0.04 || v.ended) {
      v.pause();
      break;
    }
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    drawCover(ctx, v, w, h);
    await waitFrame();
  }
}

async function runCrossfade(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  from: HTMLVideoElement,
  to: HTMLVideoElement,
  durationSec: number
): Promise<void> {
  await from.play().catch(() => undefined);
  to.currentTime = 0;
  await seekVideo(to, 0);
  await to.play().catch(() => undefined);
  const start = performance.now();

  while (true) {
    const t = Math.min(1, (performance.now() - start) / 1000 / durationSec);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1 - t;
    drawCover(ctx, from, w, h);
    ctx.globalAlpha = t;
    drawCover(ctx, to, w, h);
    ctx.globalAlpha = 1;
    if (t >= 1) break;
    await waitFrame();
  }
  from.pause();
  to.pause();
}

/** Fundido a negro entre escenas (último frame congelado → negro → entrada siguiente). */
async function runDip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  from: HTMLVideoElement,
  to: HTMLVideoElement
): Promise<void> {
  from.pause();

  const t0 = performance.now();
  while ((performance.now() - t0) / 1000 < DIP_OUT_SEC) {
    const elapsed = (performance.now() - t0) / 1000;
    const a = 1 - elapsed / DIP_OUT_SEC;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, a);
    drawCover(ctx, from, w, h);
    ctx.globalAlpha = 1;
    await waitFrame();
  }

  const tHoldEnd = performance.now() + DIP_HOLD_SEC * 1000;
  while (performance.now() < tHoldEnd) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    await waitFrame();
  }

  to.currentTime = 0;
  await seekVideo(to, 0);
  await to.play().catch(() => undefined);

  const tInStart = performance.now();
  while ((performance.now() - tInStart) / 1000 < DIP_IN_SEC) {
    const p = ((performance.now() - tInStart) / 1000) / DIP_IN_SEC;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = Math.min(1, p);
    drawCover(ctx, to, w, h);
    ctx.globalAlpha = 1;
    await waitFrame();
  }
  from.pause();
  to.pause();
  to.currentTime = 0;
}

/**
 * Une varios MP4 en un solo WebM vía canvas + MediaRecorder.
 * continuous: solapamiento tipo crossfade. separate: fundido a negro estilo corte entre planos.
 */
export async function stitchVideoBlobs(
  blobs: Blob[],
  style: MultiImageSequenceMode
): Promise<Blob> {
  if (blobs.length === 0) {
    throw new Error("No hay clips para unir.");
  }
  if (blobs.length === 1) {
    return blobs[0];
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Tu navegador no permite unir videos (MediaRecorder).");
  }

  const videos = await Promise.all(blobs.map(loadVideoFromBlob));
  const w = Math.max(...videos.map((v) => v.videoWidth || 1280), 320);
  const h = Math.max(...videos.map((v) => v.videoHeight || 720), 240);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    videos.forEach((v) => URL.revokeObjectURL(v.src));
    throw new Error("Canvas no disponible.");
  }

  const mimeType = pickRecorderMimeType();
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const cleanup = () => {
    videos.forEach((v) => {
      URL.revokeObjectURL(v.src);
      v.remove();
    });
  };

  await new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("Error al grabar el video unido."));

    (async () => {
      try {
        recorder.start(200);

        let i = 0;
        let startOffset = 0;

        while (i < videos.length) {
          const v = videos[i];
          const hasNext = i < videos.length - 1;
          const endTime =
            hasNext && style === "continuous"
              ? Math.max(startOffset + 0.08, v.duration - CROSSFADE_SEC)
              : v.duration;

          await playSegment(ctx, v, w, h, startOffset, endTime);

          if (!hasNext) break;

          const next = videos[i + 1];
          if (style === "continuous") {
            await runCrossfade(ctx, w, h, v, next, CROSSFADE_SEC);
            i += 1;
            startOffset = CROSSFADE_SEC;
          } else {
            await runDip(ctx, w, h, v, next);
            i += 1;
            startOffset = 0;
          }
        }

        await waitFrame();
        recorder.stop();
      } catch (e) {
        reject(e);
      }
    })();
  });

  cleanup();

  const outType = mimeType.split(";")[0] || "video/webm";
  return new Blob(chunks, { type: outType });
}
