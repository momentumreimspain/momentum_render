export type MultiImageSequenceMode = 'continuous' | 'separate';

export type VideoResolution = '720p' | '1080p';
export type CameraMovement = 'static' | 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'zoom-in' | 'zoom-out' | 'dolly-in' | 'dolly-out' | 'orbit' | 'crane';
export type MovementSpeed = 'slow' | 'medium' | 'fast';
export type Duration = '4s' | '6s' | '8s';

export interface VeoResponse {
  videoUrl?: string;
  error?: string;
}

export interface MusicTrack {
    name: string;
    url: string;
}

export interface CameraConfig {
  movement: CameraMovement;
  speed: MovementSpeed;
  duration: Duration;
  intensity: number; // 1-10
}
