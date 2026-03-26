import React, { useEffect, useRef } from "react";
import { VideoProject } from "../services/firebaseService";

interface VideoModalProps {
  project: VideoProject | null;
  isOpen: boolean;
  onClose: () => void;
}

const movementLabels: Record<string, string> = {
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

export const VideoModal: React.FC<VideoModalProps> = ({ project, isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !project?.videoUrl) return;
    const v = videoRef.current;
    if (!v) return;
    const snap = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) v.currentTime = 0;
    };
    v.addEventListener("loadedmetadata", snap);
    return () => v.removeEventListener("loadedmetadata", snap);
  }, [isOpen, project?.videoUrl]);

  if (!isOpen || !project) return null;

  const sourceImages =
    project.imageUrls && project.imageUrls.length > 0
      ? project.imageUrls
      : project.imageUrl
        ? [project.imageUrl]
        : [];

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = project.videoUrl;
    link.download = `video_${project.id || Date.now()}.mp4`;
    link.click();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal - Two Column Layout */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div
          className="bg-white dark:bg-slate-800 shadow-2xl max-w-6xl w-full h-[70vh] pointer-events-auto animate-scale-in rounded-xl overflow-hidden flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button - Top Right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 dark:bg-white/20 dark:hover:bg-white/30 backdrop-blur-sm rounded-full transition-all duration-200"
            title="Cerrar (Esc)"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Left Column - Info (35%) */}
          <div className="w-[35%] bg-white dark:bg-slate-800 p-6 overflow-y-auto border-r border-gray-200 dark:border-slate-700">
            {/* User Info */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-2">
                {project.userPhoto && (
                  <img
                    src={project.userPhoto}
                    alt={project.userName}
                    className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-slate-700"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{project.userName || 'Usuario'}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {project.createdAt?.toDate().toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors shadow-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Descargar Video</span>
              </button>
            </div>

            {/* Imágenes de origen (secuencia o una sola) */}
            {sourceImages.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {sourceImages.length > 1 ? "Imágenes originales" : "Imagen original"}
                </h4>
                <div
                  className={`grid gap-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-2 ${
                    sourceImages.length > 1 ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {sourceImages.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="rounded-md overflow-hidden border border-gray-100 dark:border-slate-600"
                    >
                      <img
                        src={url}
                        alt={sourceImages.length > 1 ? `Imagen ${idx + 1}` : "Imagen original"}
                        className="w-full h-auto object-cover max-h-48"
                      />
                      {sourceImages.length > 1 && (
                        <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 py-1 bg-gray-50 dark:bg-slate-700/80">
                          Escena {idx + 1}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {project.description && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Descripción</h4>
                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                  {project.description}
                </p>
              </div>
            )}

            {/* Prompt */}
            {project.prompt && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Prompt</h4>
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{project.prompt}</p>
                </div>
              </div>
            )}

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Configuration */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Configuración Técnica</h4>

              <div className="space-y-2">
                {project.cameraMovement && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Movimiento</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {movementLabels[project.cameraMovement] || project.cameraMovement}
                    </span>
                  </div>
                )}

                {project.movementSpeed && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Velocidad</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{project.movementSpeed}</span>
                  </div>
                )}

                {project.duration && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Duración</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{project.duration}</span>
                  </div>
                )}

                {project.intensity && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Intensidad</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{project.intensity}/10</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Resolución</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{project.resolution}</span>
                </div>

                {project.musicTrack && project.musicTrack !== 'Ninguna' && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-slate-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Música</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate ml-2" title={project.musicTrack}>
                      {project.musicTrack}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Video (65%) */}
          <div className="w-[65%] bg-black flex items-center justify-center p-0 relative">
            <div className="w-full h-full">
              <video
                key={project.videoUrl}
                ref={videoRef}
                src={project.videoUrl}
                controls
                loop
                autoPlay
                preload="auto"
                className="w-full h-full object-cover"
              >
                Tu navegador no soporta la etiqueta de video.
              </video>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};
