import { useState, useCallback, useRef, useEffect } from 'react';
import { DASHPlayer, createDASHPlayer } from '../utils/dash';
import { DASHConfig, DASHManifest, DASHMetrics, DASHRepresentation, DASHEvent } from '../types/player';

export interface UseDASHReturn {
  isInitialized: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  manifest: DASHManifest | null;
  currentRepresentation: DASHRepresentation | null;
  availableRepresentations: DASHRepresentation[];
  metrics: DASHMetrics;
  error: string | null;
  initialize: (videoElement: HTMLVideoElement) => Promise<void>;
  play: () => void;
  pause: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  switchQuality: (representationId: string) => boolean;
  getMetrics: () => DASHMetrics;
  destroy: () => void;
}

export const useDASH = (config: DASHConfig): UseDASHReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [manifest, setManifest] = useState<DASHManifest | null>(null);
  const [currentRepresentation, setCurrentRepresentation] = useState<DASHRepresentation | null>(null);
  const [availableRepresentations, setAvailableRepresentations] = useState<DASHRepresentation[]>([]);
  const [metrics, setMetrics] = useState<DASHMetrics>({
    currentRepresentation: null,
    bitrateSwitches: 0,
    bufferLevel: 0,
    bufferHealth: 0,
    droppedFrames: 0,
    totalFrames: 0,
    downloadTime: 0,
    throughput: 0,
    latency: 0,
    rebufferingEvents: 0,
    rebufferingTime: 0
  });
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<DASHPlayer | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const initialize = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      setError(null);
      setIsBuffering(true);

      // Create new DASH player
      const player = createDASHPlayer(config);
      playerRef.current = player;

      // Set up event listeners
      player.on('manifestLoaded', (data: { manifest: DASHManifest }) => {
        setManifest(data.manifest);
        setAvailableRepresentations(player.getAvailableRepresentations());
        setCurrentRepresentation(player.getCurrentRepresentation());
      });

      player.on('representationChanged', (data: { representation: DASHRepresentation }) => {
        setCurrentRepresentation(data.representation);
        setAvailableRepresentations(player.getAvailableRepresentations());
      });

      player.on('bufferLevelChanged', () => {
        setMetrics(player.getMetrics());
      });

      player.on('error', (data: { error: any }) => {
        setError(`DASH Error: ${data.error.message || 'Unknown error'}`);
        setIsBuffering(false);
      });

      // Initialize the player
      await player.initialize(videoElement);
      videoElementRef.current = videoElement;

      // Set up video element event listeners
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime);
      const handleDurationChange = () => setDuration(videoElement.duration);
      const handleVolumeChange = () => setVolume(videoElement.volume);
      const handleRateChange = () => setPlaybackRate(videoElement.playbackRate);
      const handleWaiting = () => setIsBuffering(true);
      const handleCanPlay = () => setIsBuffering(false);
      const handleError = () => {
        setError('Video playback error occurred');
        setIsPlaying(false);
        setIsBuffering(false);
      };

      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('pause', handlePause);
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      videoElement.addEventListener('durationchange', handleDurationChange);
      videoElement.addEventListener('volumechange', handleVolumeChange);
      videoElement.addEventListener('ratechange', handleRateChange);
      videoElement.addEventListener('waiting', handleWaiting);
      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('error', handleError);

      setIsInitialized(true);
      setIsBuffering(false);
      setDuration(videoElement.duration || 0);
      setVolume(videoElement.volume);
      setPlaybackRate(videoElement.playbackRate);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize DASH player';
      setError(errorMessage);
      setIsInitialized(false);
      setIsBuffering(false);
      console.error('DASH initialization error:', err);
    }
  }, [config]);

  const play = useCallback(() => {
    if (playerRef.current && videoElementRef.current) {
      playerRef.current.play();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current && videoElementRef.current) {
      playerRef.current.pause();
    }
  }, []);

  const handleSetCurrentTime = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.setCurrentTime(time);
    }
  }, []);

  const handleSetVolume = useCallback((vol: number) => {
    if (playerRef.current) {
      playerRef.current.setVolume(vol);
    }
  }, []);

  const handleSetPlaybackRate = useCallback((rate: number) => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
    }
  }, []);

  const switchQuality = useCallback((representationId: string): boolean => {
    if (playerRef.current) {
      return playerRef.current.switchQuality(representationId);
    }
    return false;
  }, []);

  const getMetrics = useCallback((): DASHMetrics => {
    if (playerRef.current) {
      return playerRef.current.getMetrics();
    }
    return metrics;
  }, [metrics]);

  const destroy = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    if (videoElementRef.current) {
      // Remove event listeners
      const videoElement = videoElementRef.current;
      videoElement.removeEventListener('play', () => {});
      videoElement.removeEventListener('pause', () => {});
      videoElement.removeEventListener('timeupdate', () => {});
      videoElement.removeEventListener('durationchange', () => {});
      videoElement.removeEventListener('volumechange', () => {});
      videoElement.removeEventListener('ratechange', () => {});
      videoElement.removeEventListener('waiting', () => {});
      videoElement.removeEventListener('canplay', () => {});
      videoElement.removeEventListener('error', () => {});
      videoElementRef.current = null;
    }
    setIsInitialized(false);
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setVolume(1);
    setPlaybackRate(1);
    setManifest(null);
    setCurrentRepresentation(null);
    setAvailableRepresentations([]);
    setError(null);
  }, []);

  // Update metrics periodically
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      if (playerRef.current) {
        setMetrics(playerRef.current.getMetrics());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    isInitialized,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    playbackRate,
    manifest,
    currentRepresentation,
    availableRepresentations,
    metrics,
    error,
    initialize,
    play,
    pause,
    setCurrentTime: handleSetCurrentTime,
    setVolume: handleSetVolume,
    setPlaybackRate: handleSetPlaybackRate,
    switchQuality,
    getMetrics,
    destroy
  };
};
