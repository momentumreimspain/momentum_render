import type { MultiImageSequenceMode } from "../types";

export function buildScenePrompt(
  movementLine: string,
  speedLine: string,
  duration: string,
  userPrompt: string,
  mode: MultiImageSequenceMode,
  sceneIndex: number,
  totalScenes: number
): string {
  const base = `${movementLine} ${speedLine}, ${duration} duration${userPrompt ? `. ${userPrompt}` : ''}. Professional cinematography, smooth motion, high quality rendering.`;

  if (totalScenes <= 1) return base;

  if (mode === "continuous") {
    return `${base} This is shot ${sceneIndex + 1} of ${totalScenes} in ONE continuous cinematic sequence. Keep lighting, color grade, lens character, and subject treatment coherent across the sequence so edited cuts feel visually unified and part of the same film.`;
  }

  return `${base} This is a DISTINCT scene (${sceneIndex + 1} of ${totalScenes}), independent from the others. It will be joined with normal TV-style cuts and short black intervals—finish with a clean frame suitable for a hard transition to a different scene.`;
}
