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

const LOAD_CLIP_TIMEOUT_MS = 25_000;

/**
 * Los MP4 de Veo a menudo disparan `loadeddata` antes de que `duration` sea finita.
 * Si unimos en ese momento, `seek`/`currentTime` fallan y el canvas queda congelado en un frame
 * (parece “una sola foto estática”) o el bucle de unión se comporta mal.
 */
function loadVideoFromBlob(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const url = URL.createObjectURL(blob);
    v.src = url;

    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const detach = () => {
      v.removeEventListener("loadedmetadata", tryResolve);
      v.removeEventListener("durationchange", tryResolve);
      v.removeEventListener("loadeddata", tryResolve);
      v.removeEventListener("canplaythrough", tryResolve);
      v.removeEventListener("error", onError);
    };

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      detach();
      v.remove();
      URL.revokeObjectURL(url);
      reject(new Error(msg));
    };

    const tryResolve = () => {
      if (settled) return;
      if (
        Number.isFinite(v.duration) &&
        v.duration > 0.05 &&
        v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        v.videoWidth > 0 &&
        v.videoHeight > 0
      ) {
        settled = true;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        detach();
        resolve(v);
      }
    };

    const onError = () => fail("No se pudo cargar un clip para unir.");

    timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      detach();
      v.remove();
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Timeout al leer metadatos de un clip (duración). Prueba otro navegador o menos escenas."
        )
      );
    }, LOAD_CLIP_TIMEOUT_MS);

    v.addEventListener("loadedmetadata", tryResolve);
    v.addEventListener("durationchange", tryResolve);
    v.addEventListener("loadeddata", tryResolve);
    v.addEventListener("canplaythrough", tryResolve);
    v.addEventListener("error", onError);
    v.load();
    tryResolve();
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
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 0) {
      resolve();
      return;
    }
    const target = Math.min(Math.max(0, t), Math.max(0, dur - 0.05));
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      v.removeEventListener("seeked", onSeeked);
      resolve();
    };
    const onSeeked = () => finish();
    v.addEventListener("seeked", onSeeked);
    v.currentTime = target;
    setTimeout(finish, 800);
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
  const dur = v.duration;
  const safeEnd = Number.isFinite(endTime)
    ? endTime
    : Number.isFinite(dur)
      ? dur
      : NaN;
  if (!Number.isFinite(safeEnd) || safeEnd <= startTime + 0.02) {
    v.pause();
    return;
  }

  await seekVideo(v, startTime);
  await v.play().catch(() => undefined);

  while (true) {
    if (v.currentTime >= safeEnd - 0.04 || v.ended) {
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
        // Dar tiempo a que captureStream registre el track antes del primer frame.
        await new Promise((r) => setTimeout(r, 120));

        let i = 0;
        let startOffset = 0;

        while (i < videos.length) {
          const v = videos[i];
          const hasNext = i < videos.length - 1;
          const d = v.duration;
          if (!Number.isFinite(d) || d <= 0) {
            throw new Error("Clip sin duración válida; no se puede unir la secuencia.");
          }
          const endTime =
            hasNext && style === "continuous"
              ? Math.max(startOffset + 0.08, d - CROSSFADE_SEC)
              : d;

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
  const out = new Blob(chunks, { type: outType });
  if (out.size < 2_000) {
    throw new Error("La unión produjo un archivo casi vacío; prueba otro navegador (Chrome recomendado).");
  }
  return out;
}
