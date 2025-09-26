import { useState, useEffect, useRef, useCallback } from 'react';
import { AdaptiveStreamingEngine, AdaptiveStreamingConfig, QualityLevel, NetworkMetrics, AdaptiveMetrics } from '../utils/adaptiveStreaming';

export interface UseAdaptiveStreamingOptions {
  videoElement: HTMLVideoElement | null;
  config: AdaptiveStreamingConfig;
  onQualityChange?: (quality: string) => void;
  onRebuffering?: (event: { duration: number; timestamp: number }) => void;
  onNetworkChange?: (metrics: NetworkMetrics) => void;
}

export interface AdaptiveStreamingState {
  isInitialized: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  currentQuality: string;
  availableQualities: QualityLevel[];
  metrics: AdaptiveMetrics;
  networkMetrics: NetworkMetrics;
  bufferHealth: number;
  userExperience: 'excellent' | 'good' | 'fair' | 'poor';
  error: string | null;
}

export const useAdaptiveStreaming = (options: UseAdaptiveStreamingOptions) => {
  const {
    videoElement,
    config,
    onQualityChange,
    onRebuffering,
    onNetworkChange
  } = options;

  const [state, setState] = useState<AdaptiveStreamingState>({
    isInitialized: false,
    isPlaying: false,
    isBuffering: false,
    currentQuality: '',
    availableQualities: config.qualities,
    metrics: {
      currentQuality: '',
      qualitySwitches: 0,
      rebufferingEvents: 0,
      averageLatency: 0,
      bufferHealth: 100,
      networkStability: 100,
      userExperience: 'good'
    },
    networkMetrics: {
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      jitter: 0,
      throughput: 0,
      connectionType: 'wifi'
    },
    bufferHealth: 100,
    userExperience: 'good',
    error: null
  });

  const engineRef = useRef<AdaptiveStreamingEngine | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRebufferingTime = useRef<number>(0);

  /**
   * Initialize the adaptive streaming engine
   */
  const initialize = useCallback(async () => {
    if (!videoElement || engineRef.current) return;

    try {
      setState(prev => ({ ...prev, error: null }));

      const engine = new AdaptiveStreamingEngine(config);
      await engine.initialize(videoElement);
      
      engineRef.current = engine;
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        availableQualities: config.qualities
      }));

      // Start monitoring
      startMonitoring();

    } catch (error) {
      console.error('Failed to initialize adaptive streaming:', error);
      setState(prev => ({
        ...prev,
        isInitialized: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [videoElement, config]);

  /**
   * Start monitoring adaptive streaming metrics
   */
  const startMonitoring = useCallback(() => {
    if (updateIntervalRef.current) return;

    updateIntervalRef.current = setInterval(() => {
      if (!engineRef.current) return;

      try {
        const metrics = engineRef.current.getMetrics();
        const networkMetrics = engineRef.current.getNetworkMetrics();
        
        // Update cooldown
        engineRef.current.updateCooldown();

        setState(prev => {
          const newState = {
            ...prev,
            currentQuality: metrics.currentQuality,
            metrics,
            networkMetrics,
            bufferHealth: metrics.bufferHealth,
            userExperience: metrics.userExperience
          };

          // Check for quality changes
          if (prev.currentQuality !== metrics.currentQuality) {
            onQualityChange?.(metrics.currentQuality);
          }

          // Check for network changes
          if (JSON.stringify(prev.networkMetrics) !== JSON.stringify(networkMetrics)) {
            onNetworkChange?.(networkMetrics);
          }

          return newState;
        });

      } catch (error) {
        console.error('Error updating adaptive streaming metrics:', error);
      }
    }, 1000); // Update every second
  }, [onQualityChange, onNetworkChange]);

  /**
   * Load a video segment
   */
  const loadSegment = useCallback(async (segmentUrl: string) => {
    if (!engineRef.current) {
      throw new Error('Adaptive streaming engine not initialized');
    }

    try {
      await engineRef.current.loadSegment(segmentUrl);
    } catch (error) {
      console.error('Failed to load segment:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load segment'
      }));
    }
  }, []);

  /**
   * Switch to a specific quality level
   */
  const switchQuality = useCallback(async (qualityId: string) => {
    if (!engineRef.current) return;

    const quality = config.qualities.find(q => q.id === qualityId);
    if (!quality) {
      console.warn(`Quality level ${qualityId} not found`);
      return;
    }

    try {
      // This would trigger a quality switch in the engine
      // For now, we'll just update the state
      setState(prev => ({
        ...prev,
        currentQuality: qualityId
      }));

      onQualityChange?.(qualityId);
    } catch (error) {
      console.error('Failed to switch quality:', error);
    }
  }, [config.qualities, onQualityChange]);

  /**
   * Get current buffer information
   */
  const getBufferInfo = useCallback(() => {
    if (!videoElement) return null;

    const video = videoElement;
    const buffered = video.buffered;
    
    if (buffered.length === 0) return null;

    const currentTime = video.currentTime;
    const bufferStart = buffered.start(0);
    const bufferEnd = buffered.end(buffered.length - 1);
    const bufferAhead = bufferEnd - currentTime;

    return {
      currentTime,
      bufferStart,
      bufferEnd,
      bufferAhead,
      bufferLength: bufferEnd - bufferStart,
      bufferHealth: Math.min(100, (bufferAhead / config.targetBufferLength) * 100)
    };
  }, [videoElement, config.targetBufferLength]);

  /**
   * Get detailed metrics
   */
  const getDetailedMetrics = useCallback(() => {
    if (!engineRef.current) return null;

    const metrics = engineRef.current.getMetrics();
    const networkMetrics = engineRef.current.getNetworkMetrics();
    const bufferInfo = getBufferInfo();

    return {
      adaptive: metrics,
      network: networkMetrics,
      buffer: bufferInfo,
      timestamp: Date.now()
    };
  }, [getBufferInfo]);

  /**
   * Handle video play events
   */
  const handlePlay = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true, isBuffering: false }));
  }, []);

  /**
   * Handle video pause events
   */
  const handlePause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  /**
   * Handle video waiting events (buffering)
   */
  const handleWaiting = useCallback(() => {
    const now = performance.now();
    
    setState(prev => ({
      ...prev,
      isBuffering: true,
      isPlaying: false
    }));

    // Track rebuffering event
    if (now - lastRebufferingTime.current > 5000) { // Avoid duplicate events
      lastRebufferingTime.current = now;
      
      onRebuffering?.({
        duration: 0, // Will be updated when buffering ends
        timestamp: now
      });
    }
  }, [onRebuffering]);

  /**
   * Handle video canplay events
   */
  const handleCanPlay = useCallback(() => {
    setState(prev => ({ ...prev, isBuffering: false }));
  }, []);

  /**
   * Handle video error events
   */
  const handleError = useCallback((error: Event) => {
    console.error('Video error:', error);
    setState(prev => ({
      ...prev,
      error: 'Video playback error occurred',
      isPlaying: false,
      isBuffering: false
    }));
  }, []);

  /**
   * Set up video element event listeners
   */
  useEffect(() => {
    if (!videoElement) return;

    const video = videoElement;
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [videoElement, handlePlay, handlePause, handleWaiting, handleCanPlay, handleError]);

  /**
   * Initialize when video element is available
   */
  useEffect(() => {
    if (videoElement && !state.isInitialized) {
      initialize();
    }
  }, [videoElement, state.isInitialized, initialize]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    initialize,
    loadSegment,
    switchQuality,
    getBufferInfo,
    getDetailedMetrics,
    
    // Event handlers
    handlePlay,
    handlePause,
    handleWaiting,
    handleCanPlay,
    handleError
  };
};
