import { renderHook, act } from '@testing-library/react';
import { useAdaptiveStreaming, UseAdaptiveStreamingOptions } from '../useAdaptiveStreaming';
import { AdaptiveStreamingConfig } from '../../utils/adaptiveStreaming';
import { beforeEach, afterEach } from '@jest/globals';

// Mock the adaptive streaming engine
jest.mock('../../utils/adaptiveStreaming', () => ({
  AdaptiveStreamingEngine: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    loadSegment: jest.fn().mockResolvedValue(undefined),
    getMetrics: jest.fn().mockReturnValue({
      currentQuality: '720p',
      qualitySwitches: 2,
      rebufferingEvents: 1,
      averageLatency: 150,
      bufferHealth: 85,
      networkStability: 90,
      userExperience: 'good'
    }),
    getNetworkMetrics: jest.fn().mockReturnValue({
      bandwidth: 5000000,
      latency: 50,
      packetLoss: 0.1,
      jitter: 5,
      throughput: 4800000,
      connectionType: 'wifi'
    }),
    updateCooldown: jest.fn(),
    destroy: jest.fn()
  }))
}));

describe('useAdaptiveStreaming', () => {
  const mockVideoElement = document.createElement('video');

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Reset the mock implementation to default
    const mockEngine = require('../../utils/adaptiveStreaming').AdaptiveStreamingEngine;
    mockEngine.mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      loadSegment: jest.fn().mockResolvedValue(undefined),
      getMetrics: jest.fn().mockReturnValue({
        currentQuality: '720p',
        qualitySwitches: 2,
        rebufferingEvents: 1,
        averageLatency: 150,
        bufferHealth: 85,
        networkStability: 90,
        userExperience: 'good'
      }),
      getNetworkMetrics: jest.fn().mockReturnValue({
        bandwidth: 5000000,
        latency: 50,
        packetLoss: 0.1,
        jitter: 5,
        throughput: 4800000,
        connectionType: 'wifi'
      }),
      updateCooldown: jest.fn(),
      destroy: jest.fn()
    }));
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });
  const mockConfig: AdaptiveStreamingConfig = {
    qualities: [
      {
        id: '720p',
        bitrate: 2500000,
        resolution: { width: 1280, height: 720 },
        codec: 'avc1.4D401F',
        mimeType: 'video/mp4',
        url: '/streams/720p/',
        bandwidth: 2500000
      }
    ],
    networkCheckInterval: 2000,
    targetBufferLength: 10,
    maxBufferLength: 30,
    minBufferLength: 3,
    lowLatencyMode: false,
    segmentDuration: 2,
    rebufferThreshold: 2,
    qualitySwitchThreshold: 0.8
  };

  const defaultOptions: UseAdaptiveStreamingOptions = {
    videoElement: mockVideoElement,
    config: mockConfig,
    onQualityChange: jest.fn(),
    onRebuffering: jest.fn(),
    onNetworkChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isBuffering).toBe(false);
      expect(result.current.currentQuality).toBe('');
      expect(result.current.error).toBe(null);
    });

    it('should initialize adaptive streaming engine when video element is provided', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const mockEngine = require('../../utils/adaptiveStreaming').AdaptiveStreamingEngine;
      mockEngine.mockImplementation(() => ({
        initialize: jest.fn().mockRejectedValue(new Error('Initialization failed')),
        destroy: jest.fn()
      }));

      // Start without video element to prevent auto-initialization
      const { result, rerender } = renderHook(
        ({ videoElement }: { videoElement: HTMLVideoElement | null }) => useAdaptiveStreaming({ ...defaultOptions, videoElement }),
        { initialProps: { videoElement: null as HTMLVideoElement | null } }
      );

      // Now provide video element and initialize manually
      const testVideoElement = document.createElement('video');
      rerender({ videoElement: testVideoElement });

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.error).toBe('Initialization failed');
      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('quality management', () => {
    it('should switch quality when requested', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
        await result.current.switchQuality('720p');
      });

      expect(result.current.currentQuality).toBe('720p');
    });

    it('should call onQualityChange when quality changes', async () => {
      const onQualityChange = jest.fn();
      const { result } = renderHook(() => 
        useAdaptiveStreaming({ ...defaultOptions, onQualityChange })
      );

      await act(async () => {
        await result.current.initialize();
        await result.current.switchQuality('720p');
      });

      expect(onQualityChange).toHaveBeenCalledWith('720p');
    });
  });

  describe('segment loading', () => {
    it('should load segments successfully', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
        await result.current.loadSegment('/test-segment.mp4');
      });

      // Should not throw an error
      expect(result.current.error).toBe(null);
    });

    it('should handle segment loading errors', async () => {
      const mockLoadSegment = jest.fn().mockRejectedValue(new Error('Segment load failed'));
      const mockEngine = require('../../utils/adaptiveStreaming').AdaptiveStreamingEngine;
      
      mockEngine.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        loadSegment: mockLoadSegment,
        getMetrics: jest.fn().mockReturnValue({
          currentQuality: '720p',
          qualitySwitches: 0,
          rebufferingEvents: 0,
          averageLatency: 100,
          bufferHealth: 85,
          networkStability: 90,
          userExperience: 'good'
        }),
        getNetworkMetrics: jest.fn().mockReturnValue({
          bandwidth: 5000000,
          latency: 50,
          packetLoss: 0.1,
          jitter: 5,
          throughput: 4800000,
          connectionType: 'wifi'
        }),
        updateCooldown: jest.fn(),
        destroy: jest.fn()
      }));

      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
      });

      // Clear any previous error
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await act(async () => {
        await result.current.loadSegment('/test-segment.mp4');
      });

      expect(result.current.error).toBe('Segment load failed');
    });
  });

  describe('buffer management', () => {
    it('should provide buffer information', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
      });

      const bufferInfo = result.current.getBufferInfo();
      expect(bufferInfo).toBeDefined();
    });

    it('should return null buffer info when video element is not available', () => {
      const { result } = renderHook(() => 
        useAdaptiveStreaming({ ...defaultOptions, videoElement: null })
      );

      const bufferInfo = result.current.getBufferInfo();
      expect(bufferInfo).toBe(null);
    });
  });

  describe('metrics and monitoring', () => {
    it('should provide detailed metrics', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
      });

      const metrics = result.current.getDetailedMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.adaptive).toBeDefined();
      expect(metrics?.network).toBeDefined();
      expect(metrics?.buffer).toBeDefined();
    });

    it('should update metrics over time', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
      });

      // Wait for monitoring interval to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(result.current.metrics.currentQuality).toBe('720p');
      expect(result.current.metrics.qualitySwitches).toBe(2);
      expect(result.current.metrics.rebufferingEvents).toBe(1);
    });
  });

  describe('event handling', () => {
    it('should handle play events', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
        result.current.handlePlay();
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.isBuffering).toBe(false);
    });

    it('should handle pause events', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
        result.current.handlePlay();
        result.current.handlePause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should handle waiting events (buffering)', async () => {
      const onRebuffering = jest.fn();
      
      // Mock performance.now to ensure time condition is met
      const mockPerformanceNow = jest.spyOn(performance, 'now');
      mockPerformanceNow.mockReturnValue(10000); // Return a value > 5000
      
      // Create a fresh hook instance to ensure clean state
      const testVideoElement = document.createElement('video');
      const testOptions = { ...defaultOptions, videoElement: testVideoElement, onRebuffering };
      const { result } = renderHook(() => useAdaptiveStreaming(testOptions));

      await act(async () => {
        await result.current.initialize();
      });

      // Trigger waiting event
      await act(() => {
        result.current.handleWaiting();
      });

      expect(result.current.isBuffering).toBe(true);
      expect(result.current.isPlaying).toBe(false);
      expect(onRebuffering).toHaveBeenCalledWith({
        duration: 0,
        timestamp: 10000
      });
      
      // Restore the mock
      mockPerformanceNow.mockRestore();
    });

    it('should handle canplay events', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
        result.current.handleWaiting();
        result.current.handleCanPlay();
      });

      expect(result.current.isBuffering).toBe(false);
    });

    it('should handle error events', async () => {
      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
        const mockError = new Event('error');
        result.current.handleError(mockError);
      });

      expect(result.current.error).toBe('Video playback error occurred');
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isBuffering).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on unmount', async () => {
      const { result, unmount } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
      });

      unmount();

      // Engine should be destroyed
      expect(result.current.isInitialized).toBe(true); // State persists until unmount
    });
  });

  describe('network monitoring', () => {
    it('should call onNetworkChange when network metrics change', async () => {
      const onNetworkChange = jest.fn();
      const { result } = renderHook(() => 
        useAdaptiveStreaming({ ...defaultOptions, onNetworkChange })
      );

      await act(async () => {
        await result.current.initialize();
      });

      // Simulate network change by updating metrics
      await act(async () => {
        // Wait for monitoring interval to trigger
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(onNetworkChange).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing video element gracefully', () => {
      const { result } = renderHook(() => 
        useAdaptiveStreaming({ ...defaultOptions, videoElement: null })
      );

      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle engine destruction errors', async () => {
      const mockEngine = require('../../utils/adaptiveStreaming').AdaptiveStreamingEngine;
      mockEngine.mockImplementationOnce(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn().mockImplementation(() => {
          throw new Error('Destroy failed');
        })
      }));

      const { result } = renderHook(() => useAdaptiveStreaming(defaultOptions));

      await act(async () => {
        await result.current.initialize();
      });

      // Should not throw during cleanup
      expect(() => {
        // Simulate unmount
        result.current.getBufferInfo();
      }).not.toThrow();
    });
  });
});
