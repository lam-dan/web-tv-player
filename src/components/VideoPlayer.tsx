'use client';

import React, { useEffect, memo } from 'react';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
// import { useDASH } from '@/hooks/useDASH';
import { StreamingConfig, DASHConfig } from '@/types/player';
import { PlayerControls } from './PlayerControls';
import { QualitySelector } from './QualitySelector';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { PlaybackRateControl } from './PlaybackRateControl';

interface VideoPlayerProps {
  src: string;
  isHLS?: boolean;
  isDASH?: boolean;
  config?: Partial<StreamingConfig>;
  dashConfig?: Partial<DASHConfig>;
  className?: string;
}

const defaultConfig: StreamingConfig = {
  enableAdaptiveBitrate: true,
  maxBitrate: 5000000,
  minBitrate: 500000,
  bufferSize: 30,
  qualityLevels: [],
  abTestEnabled: false,
  analyticsEnabled: true,
};

const defaultDASHConfig: DASHConfig = {
  manifestUrl: '',
  autoStart: true,
  autoPlay: false,
  streaming: {
    delay: {
      liveDelay: 0,
      liveDelayFragmentCount: 0
    },
    abr: {
      autoSwitchBitrate: true,
      initialBitrate: 1000000,
      maxBitrate: 5000000,
      minBitrate: 500000
    }
  },
  debug: {
    logLevel: 0
  }
};

export const VideoPlayer: React.FC<VideoPlayerProps> = memo(({
  src,
  isHLS = true,
  isDASH = false,
  config = {},
  dashConfig = {},
  className = '',
}) => {
  const playerConfig = { ...defaultConfig, ...config };
  const dashPlayerConfig = { ...defaultDASHConfig, ...dashConfig, manifestUrl: src };
  
  // Use appropriate hook based on streaming protocol
  const hlsPlayer = useVideoPlayer(playerConfig);
  // const dashPlayer = useDASH(dashPlayerConfig);
  
  const {
    videoRef,
    playerState,
    loadVideo,
    play,
    pause,
    setQuality,
    setVolume,
    setPlaybackRate,
    seekTo,
    toggleMute,
  } = hlsPlayer;

  useEffect(() => {
    if (src) {
      loadVideo(src, isHLS);
    }
  }, [src, isHLS, loadVideo]);

  const handleVideoClick = () => {
    if (playerState.currentState === 'playing') {
      pause();
    } else if (playerState.currentState === 'paused' || playerState.currentState === 'ready') {
      play();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case ' ':
        event.preventDefault();
        if (playerState.currentState === 'playing') {
          pause();
        } else {
          play();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        seekTo(Math.max(0, playerState.metadata.currentTime - 10));
        break;
      case 'ArrowRight':
        event.preventDefault();
        seekTo(Math.min(playerState.metadata.duration, playerState.metadata.currentTime + 10));
        break;
      case 'm':
        event.preventDefault();
        toggleMute();
        break;
      case 'f':
        event.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          videoRef.current?.requestFullscreen();
        }
        break;
    }
  };

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden group focus:outline-none ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        onClick={handleVideoClick}
        playsInline
        preload="metadata"
      />
      
      {playerState.metadata.hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-lg mb-2">Playback Error</div>
            <div className="text-sm text-gray-300">{playerState.metadata.errorMessage}</div>
            <button
              onClick={() => loadVideo(src, isHLS)}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {playerState.metadata.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div>Loading...</div>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <ProgressBar
          currentTime={playerState.metadata.currentTime}
          duration={playerState.metadata.duration}
          buffered={playerState.metadata.buffered}
          onSeek={seekTo}
        />
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-4">
            <PlayerControls
              isPlaying={playerState.metadata.isPlaying}
              isLoading={playerState.metadata.isLoading}
              onPlay={play}
              onPause={pause}
            />
            
            <VolumeControl
              volume={playerState.metadata.volume}
              isMuted={playerState.metadata.isMuted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
            />
            
            <div className="text-white text-sm">
              {formatTime(playerState.metadata.currentTime)} / {formatTime(playerState.metadata.duration)}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <PlaybackRateControl
              playbackRate={playerState.metadata.playbackRate}
              onPlaybackRateChange={setPlaybackRate}
            />
            
            <QualitySelector
              qualities={playerState.availableQualities}
              currentQuality={playerState.currentQuality}
              onQualityChange={setQuality}
            />
            
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  videoRef.current?.requestFullscreen();
                }
              }}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

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

VideoPlayer.displayName = 'VideoPlayer';
