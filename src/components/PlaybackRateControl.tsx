'use client';

import React, { useState } from 'react';

interface PlaybackRateControlProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const PlaybackRateControl: React.FC<PlaybackRateControlProps> = ({
  playbackRate,
  onPlaybackRateChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:text-gray-300 transition-colors px-2 py-1 rounded border border-gray-600 hover:border-gray-400"
      >
        {playbackRate}x
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
        <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-90 border border-gray-600 rounded shadow-lg min-w-20">
          {PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              onClick={() => {
                onPlaybackRateChange(rate);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${
                playbackRate === rate
                  ? 'text-red-400 bg-gray-700'
                  : 'text-white'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
