'use client';

import { useCallback, useRef } from 'react';
import { AnalyticsEvent, VideoQuality } from '@/types/player';

interface AnalyticsConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushInterval: number;
}

const defaultConfig: AnalyticsConfig = {
  enabled: true,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
};

export const useAnalytics = (config: AnalyticsConfig = defaultConfig) => {
  const eventsRef = useRef<AnalyticsEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushEvents = useCallback(() => {
    if (eventsRef.current.length === 0) return;

    const eventsToSend = [...eventsRef.current];
    eventsRef.current = [];

    // Clear timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }

    // In a real implementation, this would send to analytics service
    console.log('Sending analytics events:', eventsToSend);
    
    // Store locally for demo purposes
    try {
      const stored = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      stored.push(...eventsToSend);
      localStorage.setItem('analytics_events', JSON.stringify(stored));
    } catch (error) {
      console.warn('Error storing analytics events:', error);
    }
  }, []);

  const trackEvent = useCallback((
    eventType: string,
    videoId: string,
    additionalData?: Partial<AnalyticsEvent>
  ) => {
    if (!config.enabled) return;

    const event: AnalyticsEvent = {
      eventType,
      timestamp: Date.now(),
      videoId,
      currentTime: 0,
      quality: {} as VideoQuality,
      bufferHealth: 0,
      playbackRate: 1,
      userAgent: navigator.userAgent,
      sessionId: `session_${Date.now()}`,
      ...additionalData,
    };

    eventsRef.current.push(event);

    // Auto-flush if batch size reached
    if (eventsRef.current.length >= config.batchSize) {
      flushEvents();
    } else if (!flushTimeoutRef.current) {
      // Set up auto-flush timer
      flushTimeoutRef.current = setTimeout(() => {
        flushEvents();
      }, config.flushInterval);
    }
  }, [config, flushEvents]);

  const trackPlaybackEvent = useCallback((
    eventType: 'play' | 'pause' | 'seek' | 'quality_change' | 'volume_change' | 'error',
    videoId: string,
    currentTime: number,
    quality?: VideoQuality,
    additionalData?: Record<string, unknown>
  ) => {
    trackEvent(eventType, videoId, {
      currentTime,
      quality,
      ...additionalData,
    });
  }, [trackEvent]);

  const trackQualityMetrics = useCallback((
    videoId: string,
    quality: VideoQuality,
    bufferHealth: number,
    currentTime: number,
    playbackRate: number
  ) => {
    trackEvent('quality_metrics', videoId, {
      currentTime,
      quality,
      bufferHealth,
      playbackRate,
    });
  }, [trackEvent]);

  const trackError = useCallback((
    videoId: string,
    errorType: string,
    errorMessage: string,
    currentTime: number
  ) => {
    trackEvent('error', videoId, {
      currentTime,
      eventType: errorType,
      errorMessage,
    });
  }, [trackEvent]);

  const getEvents = useCallback(() => {
    return eventsRef.current;
  }, []);

  const clearEvents = useCallback(() => {
    eventsRef.current = [];
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    flushEvents();
  }, [flushEvents]);

  return {
    trackEvent,
    trackPlaybackEvent,
    trackQualityMetrics,
    trackError,
    flushEvents,
    getEvents,
    clearEvents,
    cleanup,
  };
};
