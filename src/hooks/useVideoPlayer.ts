'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import { PlayerState, PlayerStates, VideoMetadata, VideoQuality, StreamingConfig, AnalyticsEvent } from '@/types/player';

export const useVideoPlayer = (config: StreamingConfig) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  // const dashRef = useRef<unknown>(null); // Reserved for future DASH implementation
  const analyticsRef = useRef<AnalyticsEvent[]>([]);
  
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentState: PlayerStates.IDLE,
    metadata: {
      title: '',
      duration: 0,
      currentTime: 0,
      buffered: {} as TimeRanges,
      volume: 1,
      playbackRate: 1,
      quality: {} as VideoQuality,
      isLive: false,
      isPlaying: false,
      isPaused: false,
      isMuted: false,
      isLoading: false,
      hasError: false,
    },
    availableQualities: [],
    currentQuality: null,
    adaptiveBitrate: config.enableAdaptiveBitrate,
  });

  const updateState = useCallback((updates: Partial<PlayerState>) => {
    setPlayerState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateMetadata = useCallback((updates: Partial<VideoMetadata>) => {
    setPlayerState(prev => ({
      ...prev,
      metadata: { ...prev.metadata, ...updates }
    }));
  }, []);

  const logAnalytics = useCallback((eventType: string, additionalData?: Partial<AnalyticsEvent>) => {
    if (!config.analyticsEnabled) return;

    const event: AnalyticsEvent = {
      eventType,
      timestamp: Date.now(),
      videoId: additionalData?.videoId || 'unknown',
      currentTime: additionalData?.currentTime || 0,
      quality: additionalData?.quality || {} as VideoQuality,
      bufferHealth: additionalData?.bufferHealth || 0,
      playbackRate: additionalData?.playbackRate || 1,
      userAgent: navigator.userAgent,
      sessionId: `session_${Date.now()}`,
      ...additionalData
    };

    analyticsRef.current.push(event);
    console.log('Analytics Event:', event);
  }, [config.analyticsEnabled]);

  const loadVideo = useCallback(async (url: string, isHLS: boolean = true) => {
    if (!videoRef.current) return;
    
    // Prevent multiple simultaneous loads
    if (playerState.currentState === PlayerStates.LOADING) {
      console.log('Video already loading, skipping...');
      return;
    }

    console.log('Loading video:', url, 'isHLS:', isHLS);
    updateState({ currentState: PlayerStates.LOADING });
    updateMetadata({ isLoading: true, hasError: false });

    try {
      if (isHLS && Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        hlsRef.current = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 5,
        });

        hlsRef.current.loadSource(url);
        hlsRef.current.attachMedia(videoRef.current);

        hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed successfully');
          const levels = hlsRef.current?.levels || [];
          const qualities: VideoQuality[] = levels.map((level, index) => ({
            level: index,
            width: level.width,
            height: level.height,
            bitrate: level.bitrate,
            codecs: level.codecs || '',
            label: `${level.height}p`
          }));

          updateState({
            availableQualities: qualities,
            currentQuality: qualities[qualities.length - 1] || null,
            currentState: PlayerStates.READY
          });
          updateMetadata({ isLoading: false });
          logAnalytics('video_loaded');
        });

        hlsRef.current.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          const quality = playerState.availableQualities[data.level];
          updateState({ currentQuality: quality });
          logAnalytics('quality_changed', { quality });
        });

        hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          updateState({ currentState: PlayerStates.ERROR });
          updateMetadata({ hasError: true, errorMessage: data.details });
          logAnalytics('error', { eventType: 'hls_error' });
        });

      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support
        videoRef.current.src = url;
        updateState({ currentState: PlayerStates.READY });
        updateMetadata({ isLoading: false });
        logAnalytics('video_loaded');
      } else if (!isHLS) {
        // Direct MP4 video loading
        videoRef.current.src = url;
        updateState({ currentState: PlayerStates.READY });
        updateMetadata({ isLoading: false });
        logAnalytics('video_loaded');
      } else {
        throw new Error('HLS not supported');
      }
    } catch (error) {
      console.error('Error loading video:', error);
      updateState({ currentState: PlayerStates.ERROR });
      updateMetadata({ 
        hasError: true, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false 
      });
      logAnalytics('error', { eventType: 'load_error' });
    }
  }, [updateState, updateMetadata, logAnalytics]);

  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play();
      updateState({ currentState: PlayerStates.PLAYING });
      updateMetadata({ isPlaying: true, isPaused: false });
      logAnalytics('play');
    }
  }, [updateState, updateMetadata, logAnalytics]);

  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      updateState({ currentState: PlayerStates.PAUSED });
      updateMetadata({ isPlaying: false, isPaused: true });
      logAnalytics('pause');
    }
  }, [updateState, updateMetadata, logAnalytics]);

  const setQuality = useCallback((quality: VideoQuality) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = quality.level;
      updateState({ currentQuality: quality });
      logAnalytics('quality_changed', { quality });
    }
  }, [updateState, logAnalytics]);

  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
      updateMetadata({ volume });
      logAnalytics('volume_changed', { volume });
    }
  }, [updateMetadata, logAnalytics]);

  const setPlaybackRate = useCallback((rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      updateMetadata({ playbackRate: rate });
      logAnalytics('playback_rate_changed', { playbackRate: rate });
    }
  }, [updateMetadata, logAnalytics]);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      updateMetadata({ currentTime: time });
      logAnalytics('seek', { currentTime: time });
    }
  }, [updateMetadata, logAnalytics]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      updateMetadata({ isMuted: videoRef.current.muted });
      logAnalytics('mute_toggled', { isMuted: videoRef.current.muted });
    }
  }, [updateMetadata, logAnalytics]);

  // Event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      updateMetadata({ currentTime: video.currentTime });
    };

    const handleDurationChange = () => {
      updateMetadata({ duration: video.duration });
    };

    const handleVolumeChange = () => {
      updateMetadata({ volume: video.volume, isMuted: video.muted });
    };

    const handlePlay = () => {
      updateState({ currentState: PlayerStates.PLAYING });
      updateMetadata({ isPlaying: true, isPaused: false });
    };

    const handlePause = () => {
      updateState({ currentState: PlayerStates.PAUSED });
      updateMetadata({ isPlaying: false, isPaused: true });
    };

    const handleWaiting = () => {
      updateState({ currentState: PlayerStates.BUFFERING });
      updateMetadata({ isLoading: true });
    };

    const handleCanPlay = () => {
      updateState({ currentState: PlayerStates.READY });
      updateMetadata({ isLoading: false });
    };

    const handleEnded = () => {
      updateState({ currentState: PlayerStates.ENDED });
      updateMetadata({ isPlaying: false, isPaused: true });
      logAnalytics('video_ended');
    };

    const handleError = () => {
      updateState({ currentState: PlayerStates.ERROR });
      updateMetadata({ hasError: true, errorMessage: 'Video playback error' });
      logAnalytics('error', { eventType: 'playback_error' });
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [updateState, updateMetadata, logAnalytics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      // Note: dashRef cleanup would be handled here if DASH was implemented
    };
  }, []);

  return {
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
    analytics: analyticsRef.current,
  };
};
