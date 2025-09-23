'use client';

import React, { useState } from 'react';
import { VideoQuality } from '@/types/player';

interface QualitySelectorProps {
  qualities: VideoQuality[];
  currentQuality: VideoQuality | null;
  onQualityChange: (quality: VideoQuality) => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  qualities,
  currentQuality,
  onQualityChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (qualities.length === 0) {
    return null;
  }

  const sortedQualities = [...qualities].sort((a, b) => b.bitrate - a.bitrate);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:text-gray-300 transition-colors px-2 py-1 rounded border border-gray-600 hover:border-gray-400"
      >
        {currentQuality ? currentQuality.label : 'Auto'}
        <svg
          className={`w-4 h-4 inline-block ml-1 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-90 border border-gray-600 rounded shadow-lg min-w-32">
          {sortedQualities.map((quality) => (
            <button
              key={quality.level}
              onClick={() => {
                onQualityChange(quality);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                currentQuality?.level === quality.level
                  ? 'text-red-400 bg-gray-700'
                  : 'text-white'
              }`}
            >
              <div className="font-medium">{quality.label}</div>
              <div className="text-xs text-gray-400">
                {Math.round(quality.bitrate / 1000)} kbps
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
