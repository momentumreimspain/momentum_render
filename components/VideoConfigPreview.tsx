import React from "react";
import { CameraMovement, MovementSpeed, Duration, VideoResolution, MultiImageSequenceMode } from "../types";

interface VideoConfigPreviewProps {
  movement: CameraMovement;
  speed: MovementSpeed;
  duration: Duration;
  intensity: number;
  resolution: VideoResolution;
  musicTrack: string;
  prompt: string;
  multiImageCount?: number;
  sequenceMode?: MultiImageSequenceMode;
}

const movementLabels: Record<CameraMovement, string> = {
  'static': 'Estático',
  'pan-left': 'Paneo Izquierda',
  'pan-right': 'Paneo Derecha',
  'tilt-up': 'Inclinación Arriba',
  'tilt-down': 'Inclinación Abajo',
  'zoom-in': 'Zoom In',
  'zoom-out': 'Zoom Out',
  'dolly-in': 'Dolly In',
  'dolly-out': 'Dolly Out',
  'orbit': 'Órbita',
  'crane': 'Grúa'
};

const speedLabels: Record<MovementSpeed, string> = {
  'slow': 'Lento',
  'medium': 'Medio',
  'fast': 'Rápido'
};

export const VideoConfigPreview: React.FC<VideoConfigPreviewProps> = ({
  movement,
  speed,
  duration,
  intensity,
  resolution,
  musicTrack,
  prompt,
  multiImageCount = 1,
  sequenceMode = "continuous",
}) => {
  return (
    <div className="rounded-lg border bg-card shadow-sm p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Configuración del Video</span>
      </h3>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {multiImageCount > 1 && (
          <div className="space-y-1 col-span-2 pb-2 mb-1 border-b border-border">
            <p className="text-muted-foreground font-medium">Secuencia</p>
            <p className="text-foreground font-semibold">
              {multiImageCount} imágenes ·{" "}
              {sequenceMode === "continuous"
                ? "Continuidad visual (crossfade)"
                : "Escenas independientes (corte + negro)"}
            </p>
          </div>
        )}
        {/* Camera Movement */}
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Movimiento</p>
          <p className="text-foreground font-semibold">{movementLabels[movement]}</p>
        </div>

        {/* Speed */}
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Velocidad</p>
          <p className="text-foreground font-semibold">{speedLabels[speed]}</p>
        </div>

        {/* Duration */}
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Duración</p>
          <p className="text-foreground font-semibold">{duration}</p>
        </div>

        {/* Intensity */}
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Intensidad</p>
          <div className="flex items-center space-x-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${intensity * 10}%` }}
              />
            </div>
            <span className="text-foreground font-semibold w-6">{intensity}</span>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Calidad</p>
          <p className="text-foreground font-semibold">{resolution}</p>
        </div>

        {/* Music */}
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Música</p>
          <p className="text-foreground font-semibold truncate">{musicTrack}</p>
        </div>
      </div>

      {/* Prompt Preview */}
      {prompt && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-muted-foreground font-medium text-xs mb-1">Descripción</p>
          <p className="text-foreground text-xs leading-relaxed line-clamp-2">{prompt}</p>
        </div>
      )}
    </div>
  );
};
