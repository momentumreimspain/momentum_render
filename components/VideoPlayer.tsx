import React, { useRef, useEffect, useState } from "react";

interface VideoPlayerProps {
  src: string;
  musicUrl?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, musicUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [videoVolume, setVideoVolume] = useState(0.7);
  const [isPaused, setIsPaused] = useState(true);

  // When the video source changes, ensure we reset the paused state for the overlay
  useEffect(() => {
    setIsPaused(true);
  }, [src]);

  // Evita que la barra de progreso nativa quede al final al cargar (src/blob nuevo sin reinicio de currentTime / duración).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const snapToStart = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = 0;
      }
    };

    video.addEventListener("loadedmetadata", snapToStart);
    return () => {
      video.removeEventListener("loadedmetadata", snapToStart);
    };
  }, [src]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (!video) return;

    if (video.paused) {
      // Use promises to handle play requests
      const videoPlayPromise = video.play();
      if (videoPlayPromise !== undefined) {
        videoPlayPromise.catch((e) => console.error("Video play failed:", e));
      }

      if (audio && musicUrl) {
        audio.currentTime = video.currentTime;
        const audioPlayPromise = audio.play();
        if (audioPlayPromise !== undefined) {
          audioPlayPromise.catch((e) => console.error("Audio play failed:", e));
        }
      }
    } else {
      video.pause();
    }
    // The event listeners will handle the state change
  };

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPaused(false);
      if (audio && musicUrl && audio.paused) {
        audio.currentTime = video.currentTime;
        audio.play().catch((e) => console.error("Audio sync play failed:", e));
      }
    };

    const handlePause = () => {
      setIsPaused(true);
      if (audio && !audio.paused) {
        audio.pause();
      }
    };

    const handleSeek = () => {
      if (audio && musicUrl) {
        audio.currentTime = video.currentTime;
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeking", handleSeek);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeking", handleSeek);
      if (audio) {
        audio.pause(); // Stop music when component unmounts or video changes
      }
    };
  }, [src, musicUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = videoVolume;
    }
  }, [videoVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = musicVolume;
    }
  }, [musicVolume]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 relative">
        {isPaused && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg z-10 cursor-pointer"
            onClick={handlePlayPause}
            role="button"
            aria-label="Play/Pause video"
          >
            <div className="text-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-20 w-20 text-white opacity-80 mx-auto"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-white font-semibold mt-2 text-xl">
                Haz Clic para Reproducir
              </p>
            </div>
          </div>
        )}
        <video
          key={src}
          ref={videoRef}
          src={src}
          controls
          loop
          preload="auto"
          className="w-full h-full object-contain rounded-lg shadow-lg bg-black"
        >
          Tu navegador no soporta la etiqueta de video.
        </video>
      </div>

      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg space-y-3">
        {/* Ambient Sound Volume Control */}
        <div className="flex items-center space-x-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-400 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-gray-400 flex-shrink-0 w-24">
            Ambiente:
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={videoVolume}
            onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            aria-label="Volumen del sonido ambiente"
          />
        </div>
        {/* Music Volume Control */}
        {musicUrl && (
          <>
            <audio ref={audioRef} src={musicUrl} loop />
            <div className="flex items-center space-x-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-400 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.5 16.5A1.5 1.5 0 114 15a1.5 1.5 0 011.5 1.5zM15.5 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM5 4.466V13.5h8V6.612L7.22 4.466a2 2 0 00-2.22 0z" />
              </svg>
              <span className="text-xs text-gray-400 flex-shrink-0 w-24">
                Música:
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                aria-label="Volumen de la música"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
