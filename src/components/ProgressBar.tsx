'use client';

import React, { useState, useRef, useCallback } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: TimeRanges;
  onSeek: (time: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  buffered,
  onSeek,
}) => {
  const [, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const getBufferedRanges = useCallback(() => {
    const ranges = [];
    for (let i = 0; i < buffered.length; i++) {
      const start = (buffered.start(i) / duration) * 100;
      const end = (buffered.end(i) / duration) * 100;
      ranges.push({ start, end });
    }
    return ranges;
  }, [buffered, duration]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * duration;
    setHoverTime(time);
  }, [duration]);

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * duration;
    onSeek(time);
  }, [duration, onSeek]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    handleClick(e);
  }, [handleClick]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-1 bg-gray-600 rounded-full cursor-pointer group">
      <div
        ref={progressRef}
        className="absolute inset-0 h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
      
      {/* Buffered ranges */}
      {getBufferedRanges().map((range, index) => (
        <div
          key={index}
          className="absolute h-full bg-gray-400 rounded-full"
          style={{
            left: `${range.start}%`,
            width: `${range.end - range.start}%`,
          }}
        />
      ))}
      
      {/* Progress */}
      <div
        className="absolute h-full bg-red-600 rounded-full transition-all duration-100"
        style={{ width: `${progress}%` }}
      />
      
      {/* Hover tooltip */}
      {hoverTime !== null && (
        <div className="absolute bottom-4 transform -translate-x-1/2 pointer-events-none">
          <div className="bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
            {formatTime(hoverTime)}
          </div>
        </div>
      )}
      
      {/* Progress handle */}
      <div
        className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ left: `${progress}%`, marginLeft: '-8px' }}
      />
    </div>
  );
};
