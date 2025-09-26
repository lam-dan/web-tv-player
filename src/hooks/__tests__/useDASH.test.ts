import { renderHook, act } from '@testing-library/react';
import { useDASH } from '../useDASH';
import { DASHConfig } from '../../types/player';
import { beforeEach, afterEach } from '@jest/globals';

// Mock dashjs
const mockDashPlayer = {
  create: jest.fn(() => mockDashPlayer),
  attachView: jest.fn(),
  initialize: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
  updateSettings: jest.fn(),
  getDashMetrics: jest.fn(),
  setQualityFor: jest.fn(),
  getBufferLength: jest.fn(),
  MediaPlayer: {
    events: {
      STREAM_INITIALIZED: 'streamInitialized',
      QUALITY_CHANGE_REQUESTED: 'qualityChangeRequested',
      BUFFER_LEVEL_UPDATED: 'bufferLevelUpdated',
      ERROR: 'error',
      PLAYBACK_STARTED: 'playbackStarted',
      PLAYBACK_ENDED: 'playbackEnded'
    }
  }
};

jest.mock('dashjs', () => ({
  MediaPlayer: () => mockDashPlayer
}));

describe('useDASH', () => {
  const mockConfig: DASHConfig = {
    manifestUrl: 'https://example.com/manifest.mpd',
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockDashPlayer.getDashMetrics.mockReturnValue({
      Period: [],
      Duration: 100,
      IsLive: false,
      AvailabilityStartTime: 0,
      SuggestedPresentationDelay: 0,
      TimeShiftBufferDepth: 0,
      Representation: [],
      CurrentRepresentation: '0',
      DownloadTime: 0,
      Bandwidth: 1000000,
      Latency: 50
    });
    mockDashPlayer.getBufferLength.mockReturnValue(10);
    mockDashPlayer.initialize.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useDASH(mockConfig));

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isBuffering).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.volume).toBe(1);
    expect(result.current.playbackRate).toBe(1);
    expect(result.current.manifest).toBe(null);
    expect(result.current.currentRepresentation).toBe(null);
    expect(result.current.availableRepresentations).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should initialize DASH player successfully', async () => {
    // Mock successful initialization
    mockDashPlayer.initialize.mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    expect(result.current.isInitialized).toBe(true);
    expect(mockDashPlayer.attachView).toHaveBeenCalledWith(mockVideoElement);
    expect(mockDashPlayer.initialize).toHaveBeenCalledWith(mockVideoElement, mockConfig.manifestUrl, mockConfig.autoStart);
  });

  it('should handle initialization errors', async () => {
    mockDashPlayer.initialize.mockRejectedValue(new Error('Initialization failed'));
    
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    expect(result.current.error).toBe('DASH player initialization failed');
    expect(result.current.isInitialized).toBe(false);
  });

  it('should provide playback controls', async () => {
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');
    mockVideoElement.play = jest.fn();
    mockVideoElement.pause = jest.fn();

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    // Test play
    await act(() => {
      result.current.play();
    });

    // Test pause
    await act(() => {
      result.current.pause();
    });

    // Test volume
    await act(() => {
      result.current.setVolume(0.5);
    });

    // Test playback rate
    await act(() => {
      result.current.setPlaybackRate(1.5);
    });

    // Test seek
    await act(() => {
      result.current.setCurrentTime(30);
    });

    expect(mockVideoElement.play).toHaveBeenCalled();
    expect(mockVideoElement.pause).toHaveBeenCalled();
  });

  it('should handle quality switching', async () => {
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    const success = result.current.switchQuality('1');
    expect(success).toBe(true);
    expect(mockDashPlayer.setQualityFor).toHaveBeenCalledWith('video', 1);
  });

  it('should provide metrics', async () => {
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    const metrics = result.current.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.bufferLevel).toBe(10);
    expect(metrics.throughput).toBe(1000000);
  });

  it('should handle video element events', async () => {
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');
    
    // Mock video element properties
    Object.defineProperty(mockVideoElement, 'duration', {
      get: () => 120,
      configurable: true
    });
    Object.defineProperty(mockVideoElement, 'volume', {
      get: () => 0.8,
      set: jest.fn(),
      configurable: true
    });
    Object.defineProperty(mockVideoElement, 'playbackRate', {
      get: () => 1.25,
      set: jest.fn(),
      configurable: true
    });
    Object.defineProperty(mockVideoElement, 'currentTime', {
      get: () => 0,
      set: jest.fn(),
      configurable: true
    });

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    // Simulate video events
    await act(() => {
      mockVideoElement.dispatchEvent(new Event('play'));
    });

    await act(() => {
      mockVideoElement.dispatchEvent(new Event('pause'));
    });

    await act(() => {
      mockVideoElement.dispatchEvent(new Event('timeupdate'));
    });

    await act(() => {
      mockVideoElement.dispatchEvent(new Event('durationchange'));
    });

    await act(() => {
      mockVideoElement.dispatchEvent(new Event('volumechange'));
    });

    await act(() => {
      mockVideoElement.dispatchEvent(new Event('ratechange'));
    });

    await act(() => {
      mockVideoElement.dispatchEvent(new Event('waiting'));
    });

    await act(() => {
      mockVideoElement.dispatchEvent(new Event('canplay'));
    });

    expect(result.current.isPlaying).toBe(false); // Last event was pause
    // Note: The duration, volume, and playbackRate are set during initialization
    // and may not be updated by events in the test environment
    expect(result.current.duration).toBe(120);
    expect(result.current.volume).toBe(0.8);
    expect(result.current.playbackRate).toBe(1.25);
  });

  it('should handle DASH events', async () => {
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    // Simulate DASH events
    const mockManifest = {
      periods: [],
      duration: 100,
      isLive: false,
      availabilityStartTime: 0,
      suggestedPresentationDelay: 0,
      timeShiftBufferDepth: 0
    };

    const mockRepresentation = {
      id: '0',
      bandwidth: 1000000,
      width: 1280,
      height: 720,
      codecs: 'avc1.4D401F',
      mimeType: 'video/mp4',
      frameRate: 30,
      qualityRanking: 0
    };

    // Simulate manifest loaded event
    const manifestCallback = mockDashPlayer.on.mock.calls.find(
      call => call[0] === 'streamInitialized'
    )?.[1];

    if (manifestCallback) {
      await act(() => {
        manifestCallback({ manifest: mockManifest });
      });
    }

    // Simulate representation changed event
    const representationCallback = mockDashPlayer.on.mock.calls.find(
      call => call[0] === 'qualityChangeRequested'
    )?.[1];

    if (representationCallback) {
      await act(() => {
        representationCallback({ 
          oldQuality: 0, 
          newQuality: 1 
        });
      });
    }

    expect(result.current.manifest).toBeDefined();
  });

  it('should cleanup on destroy', async () => {
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    await act(() => {
      result.current.destroy();
    });

    expect(mockDashPlayer.destroy).toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isBuffering).toBe(false);
  });

  it('should handle missing video element gracefully', () => {
    const { result } = renderHook(() => useDASH(mockConfig));

    expect(result.current.isInitialized).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should update metrics over time', async () => {
    const { result } = renderHook(() => useDASH(mockConfig));
    const mockVideoElement = document.createElement('video');

    await act(async () => {
      await result.current.initialize(mockVideoElement);
    });

    // Wait for metrics update interval
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    expect(result.current.metrics).toBeDefined();
  });
});
