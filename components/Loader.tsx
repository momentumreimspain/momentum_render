
import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "Initializing AI model...",
  "Analyzing render architecture...",
  "Choreographing virtual actors...",
  "Adjusting scene lighting...",
  "Rendering high-definition frames...",
  "This can take a few minutes, please wait...",
  "Adding realistic motion blur...",
  "Finalizing video composition...",
  "Almost there, preparing your animated scene...",
];

interface LoaderProps {
  statusLine?: string | null;
}

export const Loader: React.FC<LoaderProps> = ({ statusLine }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 4000); // Change message every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-semibold text-foreground">Generating Your Video</p>
      <p className="mt-2 text-muted-foreground transition-opacity duration-500">
        {loadingMessages[messageIndex]}
      </p>
      {statusLine ? (
        <p className="mt-3 text-sm font-medium text-primary">{statusLine}</p>
      ) : null}
    </div>
  );
};
