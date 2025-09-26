import { DASHPlayer, createDASHPlayer } from '../dash';
import { DASHConfig } from '../../types/player';

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

describe('DASHPlayer', () => {
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
    mockDashPlayer.initialize.mockResolvedValue(undefined);
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create DASH player instance', () => {
      const player = createDASHPlayer(mockConfig);
      expect(player).toBeInstanceOf(DASHPlayer);
    });

    it('should initialize successfully', async () => {
      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);

      expect(mockDashPlayer.attachView).toHaveBeenCalledWith(mockVideoElement);
      expect(mockDashPlayer.initialize).toHaveBeenCalledWith(mockVideoElement, mockConfig.manifestUrl, mockConfig.autoStart);
    });

    it('should handle initialization errors', async () => {
      mockDashPlayer.initialize.mockRejectedValue(new Error('Initialization failed'));
      
      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await expect(player.initialize(mockVideoElement)).rejects.toThrow('DASH player initialization failed');
    });
  });

  describe('manifest handling', () => {
    it('should get manifest when available', async () => {
      const mockManifest = {
        Period: [{
          id: 'period1',
          start: 0,
          duration: 100,
          AdaptationSet: [{
            id: 'adaptation1',
            type: 'video',
            RepresentationAsArray: [{
              id: '0',
              bandwidth: 1000000,
              width: 1280,
              height: 720,
              codecs: 'avc1.4D401F',
              mimeType: 'video/mp4',
              frameRate: 30,
              qualityRanking: 0
            }]
          }]
        }],
        Duration: 100,
        IsLive: false,
        AvailabilityStartTime: 0,
        SuggestedPresentationDelay: 0,
        TimeShiftBufferDepth: 0
      };

      mockDashPlayer.getDashMetrics.mockReturnValue(mockManifest);

      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);

      const manifest = player.getManifest();
      expect(manifest).toBeDefined();
      expect(manifest?.periods).toHaveLength(1);
      expect(manifest?.duration).toBe(100);
      expect(manifest?.isLive).toBe(false);
    });

    it('should return null manifest when not available', () => {
      const player = createDASHPlayer(mockConfig);
      const manifest = player.getManifest();
      expect(manifest).toBeNull();
    });
  });

  describe('representation management', () => {
    it('should get current representation', async () => {
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

      mockDashPlayer.getDashMetrics.mockReturnValue({
        Representation: [mockRepresentation],
        CurrentRepresentation: '0'
      });

      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);

      const representation = player.getCurrentRepresentation();
      expect(representation).toBeDefined();
      expect(representation?.id).toBe('0');
      expect(representation?.bandwidth).toBe(1000000);
    });

    it('should get available representations', async () => {
      const mockRepresentations = [
        {
          id: '0',
          bandwidth: 500000,
          width: 640,
          height: 360,
          codecs: 'avc1.4D401E',
          mimeType: 'video/mp4',
          frameRate: 30,
          qualityRanking: 0
        },
        {
          id: '1',
          bandwidth: 1000000,
          width: 1280,
          height: 720,
          codecs: 'avc1.4D401F',
          mimeType: 'video/mp4',
          frameRate: 30,
          qualityRanking: 1
        }
      ];

      mockDashPlayer.getDashMetrics.mockReturnValue({
        Representation: mockRepresentations
      });

      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);

      const representations = player.getAvailableRepresentations();
      expect(representations).toHaveLength(2);
      expect(representations[0].id).toBe('0');
      expect(representations[1].id).toBe('1');
    });

    it('should switch quality successfully', async () => {
      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);

      const success = player.switchQuality('1');
      expect(success).toBe(true);
      expect(mockDashPlayer.setQualityFor).toHaveBeenCalledWith('video', 1);
    });

    it('should handle quality switch errors', async () => {
      mockDashPlayer.setQualityFor.mockImplementation(() => {
        throw new Error('Quality switch failed');
      });

      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);

      const success = player.switchQuality('1');
      expect(success).toBe(false);
    });
  });

  describe('metrics', () => {
    it('should provide metrics', async () => {
      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);

      const metrics = player.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.bufferLevel).toBe(10);
      expect(metrics.throughput).toBe(1000000);
      expect(metrics.latency).toBe(50);
    });

    it('should calculate buffer health correctly', async () => {
      mockDashPlayer.getBufferLength.mockReturnValue(5); // 5 seconds buffer

      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);

      const metrics = player.getMetrics();
      expect(metrics.bufferHealth).toBe(50); // 5/10 * 100 = 50%
    });
  });

  describe('event handling', () => {
    it('should handle event listeners', async () => {
      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');
      const mockCallback = jest.fn();

      await player.initialize(mockVideoElement);

      player.on('testEvent', mockCallback);
      expect(mockDashPlayer.on).toHaveBeenCalled();

      player.off('testEvent', mockCallback);
    });

    it('should emit events', async () => {
      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');
      const mockCallback = jest.fn();

      await player.initialize(mockVideoElement);

      player.on('manifestLoaded', mockCallback);
      
      // Simulate event emission by calling the private emit method
      (player as any).emit('manifestLoaded', { manifest: {} });

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('playback controls', () => {
    it('should provide playback controls', async () => {
      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');
      mockVideoElement.play = jest.fn();
      mockVideoElement.pause = jest.fn();

      await player.initialize(mockVideoElement);

      player.play();
      expect(mockVideoElement.play).toHaveBeenCalled();

      player.pause();
      expect(mockVideoElement.pause).toHaveBeenCalled();

      player.setCurrentTime(30);
      expect(mockVideoElement.currentTime).toBe(30);

      player.setVolume(0.5);
      expect(mockVideoElement.volume).toBe(0.5);

      player.setPlaybackRate(1.5);
      expect(mockVideoElement.playbackRate).toBe(1.5);
    });
  });

  describe('cleanup', () => {
    it('should destroy player', async () => {
      const player = createDASHPlayer(mockConfig);
      const mockVideoElement = document.createElement('video');

      await player.initialize(mockVideoElement);
      player.destroy();

      expect(mockDashPlayer.destroy).toHaveBeenCalled();
    });

    it('should handle destroy when not initialized', () => {
      const player = createDASHPlayer(mockConfig);
      expect(() => player.destroy()).not.toThrow();
    });
  });
});
