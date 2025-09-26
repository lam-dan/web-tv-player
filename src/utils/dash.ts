import * as dashjs from 'dashjs';
import { DASHConfig, DASHManifest, DASHMetrics, DASHRepresentation, DASHEvent } from '../types/player';

export class DASHPlayer {
  private player: dashjs.MediaPlayerClass | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: DASHConfig;
  private metrics: DASHMetrics;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: DASHConfig) {
    this.config = config;
    this.metrics = {
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
    };
  }

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.videoElement = videoElement;
      this.player = dashjs.MediaPlayer().create();
      
      // Configure the player
      this.player.updateSettings({
        streaming: {
          delay: this.config.streaming.delay,
          abr: this.config.streaming.abr
        },
        debug: this.config.debug
      });

      // Attach video element
      this.player.attachView(videoElement);

      // Set up event listeners
      this.setupEventListeners();

      // Load the manifest
      await this.player.initialize(videoElement, this.config.manifestUrl, this.config.autoStart);

      console.log('DASH player initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DASH player:', error);
      throw new Error('DASH player initialization failed');
    }
  }

  private setupEventListeners(): void {
    if (!this.player) return;

    // Manifest loaded
    this.player.on('streamInitialized', () => {
      this.emit('manifestLoaded', { manifest: this.getManifest() });
    });

    // Representation changed (quality switch)
    this.player.on('qualityChangeRequested', (event) => {
      this.metrics.bitrateSwitches++;
      this.emit('representationChanged', { 
        representation: this.getCurrentRepresentation(),
        previousRepresentation: event.oldQuality,
        newRepresentation: event.newQuality
      });
    });

    // Buffer level changed
    this.player.on('bufferLevelUpdated', (event) => {
      this.metrics.bufferLevel = event.bufferLevel;
      this.metrics.bufferHealth = this.calculateBufferHealth(event.bufferLevel);
      this.emit('bufferLevelChanged', { bufferLevel: event.bufferLevel });
    });

    // Error handling
    this.player.on('error', (event) => {
      console.error('DASH player error:', event.error);
      this.emit('error', { error: event.error });
    });

    // Playback events
    this.player.on('playbackStarted', () => {
      console.log('DASH playback started');
    });

    this.player.on('playbackEnded', () => {
      console.log('DASH playback ended');
    });
  }

  private calculateBufferHealth(bufferLevel: number): number {
    const targetBuffer = 10; // seconds
    return Math.min((bufferLevel / targetBuffer) * 100, 100);
  }

  getManifest(): DASHManifest | null {
    if (!this.player) return null;

    try {
      const manifest = this.player.getDashMetrics();
      return {
        periods: manifest.Period?.map(period => ({
          id: period.id || '',
          start: period.start || 0,
          duration: period.duration || 0,
          adaptationSets: period.AdaptationSet?.map(adaptationSet => ({
            id: adaptationSet.id || '',
            type: adaptationSet.type as 'video' | 'audio' | 'text',
            representations: adaptationSet.RepresentationAsArray?.map(rep => ({
              id: rep.id || '',
              bandwidth: rep.bandwidth || 0,
              width: rep.width || 0,
              height: rep.height || 0,
              codecs: rep.codecs || '',
              mimeType: rep.mimeType || '',
              frameRate: rep.frameRate || 0,
              qualityRanking: rep.qualityRanking || 0
            })) || [],
            lang: adaptationSet.lang,
            roles: adaptationSet.roles
          })) || []
        })) || [],
        duration: manifest.Duration || 0,
        isLive: manifest.IsLive || false,
        availabilityStartTime: manifest.AvailabilityStartTime || 0,
        availabilityEndTime: manifest.AvailabilityEndTime,
        suggestedPresentationDelay: manifest.SuggestedPresentationDelay || 0,
        timeShiftBufferDepth: manifest.TimeShiftBufferDepth || 0
      };
    } catch (error) {
      console.error('Failed to get manifest:', error);
      return null;
    }
  }

  getCurrentRepresentation(): DASHRepresentation | null {
    if (!this.player) return null;

    try {
      const metrics = this.player.getDashMetrics();
      const currentRep = metrics.Representation?.find(rep => rep.id === metrics.CurrentRepresentation);
      
      if (!currentRep) return null;

      return {
        id: currentRep.id || '',
        bandwidth: currentRep.bandwidth || 0,
        width: currentRep.width || 0,
        height: currentRep.height || 0,
        codecs: currentRep.codecs || '',
        mimeType: currentRep.mimeType || '',
        frameRate: currentRep.frameRate || 0,
        qualityRanking: currentRep.qualityRanking || 0
      };
    } catch (error) {
      console.error('Failed to get current representation:', error);
      return null;
    }
  }

  getAvailableRepresentations(): DASHRepresentation[] {
    if (!this.player) return [];

    try {
      const metrics = this.player.getDashMetrics();
      return metrics.Representation?.map(rep => ({
        id: rep.id || '',
        bandwidth: rep.bandwidth || 0,
        width: rep.width || 0,
        height: rep.height || 0,
        codecs: rep.codecs || '',
        mimeType: rep.mimeType || '',
        frameRate: rep.frameRate || 0,
        qualityRanking: rep.qualityRanking || 0
      })) || [];
    } catch (error) {
      console.error('Failed to get available representations:', error);
      return [];
    }
  }

  switchQuality(representationId: string): boolean {
    if (!this.player) return false;

    try {
      this.player.setQualityFor('video', parseInt(representationId));
      return true;
    } catch (error) {
      console.error('Failed to switch quality:', error);
      return false;
    }
  }

  getMetrics(): DASHMetrics {
    if (!this.player) return this.metrics;

    try {
      const dashMetrics = this.player.getDashMetrics();
      const bufferMetrics = this.player.getBufferLength('video');

      this.metrics.currentRepresentation = this.getCurrentRepresentation();
      this.metrics.bufferLevel = bufferMetrics;
      this.metrics.bufferHealth = this.calculateBufferHealth(bufferMetrics);
      this.metrics.downloadTime = dashMetrics.DownloadTime || 0;
      this.metrics.throughput = dashMetrics.Bandwidth || 0;
      this.metrics.latency = dashMetrics.Latency || 0;

      return { ...this.metrics };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return this.metrics;
    }
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Playback controls
  play(): void {
    if (this.videoElement) {
      this.videoElement.play();
    }
  }

  pause(): void {
    if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  setCurrentTime(time: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = time;
    }
  }

  setVolume(volume: number): void {
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.videoElement) {
      this.videoElement.playbackRate = rate;
    }
  }

  destroy(): void {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    this.videoElement = null;
    this.eventListeners.clear();
  }
}

export const createDASHPlayer = (config: DASHConfig): DASHPlayer => {
  return new DASHPlayer(config);
};
