import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

const MAX_FILES_DEFAULT = 6;

interface MultiImageUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  maxFiles?: number;
}

export const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  files,
  onFilesChange,
  isAuthenticated = true,
  onRequireAuth,
  maxFiles = MAX_FILES_DEFAULT,
}) => {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      if (!isAuthenticated && onRequireAuth) {
        onRequireAuth();
        return;
      }
      const room = maxFiles - files.length;
      if (room <= 0) return;
      const next = [...files, ...acceptedFiles.slice(0, room)];
      onFilesChange(next);
    },
    [files, onFilesChange, isAuthenticated, onRequireAuth, maxFiles]
  );

  const removeAt = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const clearAll = () => onFilesChange([]);

  const moveIndex = (index: number, delta: -1 | 1) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= files.length) return;
    const next = [...files];
    const t = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = t;
    onFilesChange(next);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    multiple: true,
    disabled: files.length >= maxFiles,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`w-full min-h-[7rem] border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-3 cursor-pointer transition-all duration-200
        ${
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.01]"
            : files.length >= maxFiles
              ? "border-muted opacity-60 cursor-not-allowed"
              : "border-border hover:border-primary hover:bg-muted/50 bg-muted/30"
        }`}
      >
        <input {...getInputProps()} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-1.5 text-xs text-muted-foreground px-2">
          {files.length >= maxFiles
            ? `Máximo ${maxFiles} imágenes`
            : isDragActive
              ? "Suelta para añadir…"
              : "Arrastra imágenes o haz clic (varias a la vez)"}
        </p>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
          PNG, JPG, WebP · hasta {maxFiles} escenas
        </p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 items-start">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}-${file.size}`}
              className="relative group w-[4.5rem] h-[4.5rem] rounded-md border border-border overflow-hidden bg-muted shrink-0"
            >
              {previews[i] && (
                <img
                  src={previews[i]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              <span className="absolute bottom-0 left-0 right-0 bg-black/65 text-[10px] text-white text-center py-0.5">
                {i + 1}
              </span>
              <div className="absolute top-0.5 left-0.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveIndex(i, -1);
                  }}
                  disabled={i === 0}
                  className="w-5 h-5 rounded bg-black/70 text-white text-[10px] leading-5 disabled:opacity-30"
                  aria-label={`Mover imagen ${i + 1} arriba`}
                  title="Antes en la secuencia"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveIndex(i, 1);
                  }}
                  disabled={i === files.length - 1}
                  className="w-5 h-5 rounded bg-black/70 text-white text-[10px] leading-5 disabled:opacity-30"
                  aria-label={`Mover imagen ${i + 1} abajo`}
                  title="Después en la secuencia"
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white text-xs leading-5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Quitar imagen ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground underline self-center"
          >
            Quitar todas
          </button>
        </div>
      )}
    </div>
  );
};
