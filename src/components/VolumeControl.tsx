'use client';

import React, { useState, useRef, useCallback } from 'react';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  const handleVolumeClick = useCallback((e: React.MouseEvent) => {
    if (!volumeRef.current) return;
    
    const rect = volumeRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onVolumeChange(percentage);
  }, [onVolumeChange]);

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      );
    } else if (volume < 0.5) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9v6" />
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onToggleMute}
        className="text-white hover:text-gray-300 transition-colors"
      >
        {getVolumeIcon()}
      </button>
      
      <div
        className="relative w-20 h-1 bg-gray-600 rounded-full cursor-pointer group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          ref={volumeRef}
          className="absolute inset-0 h-full"
          onClick={handleVolumeClick}
        />
        
        <div
          className="absolute h-full bg-white rounded-full transition-all duration-100"
          style={{ width: `${isMuted ? 0 : volume * 100}%` }}
        />
        
        <div
          className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full transition-all duration-200 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ left: `${isMuted ? 0 : volume * 100}%`, marginLeft: '-6px' }}
        />
      </div>
    </div>
  );
};
