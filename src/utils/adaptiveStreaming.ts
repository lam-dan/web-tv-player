import { MSEConfig, MSEBuffer, MSEMetrics } from '../types/player';

export interface AdaptiveStreamingConfig {
  // Quality levels
  qualities: QualityLevel[];
  // Network monitoring
  networkCheckInterval: number;
  // Buffer management
  targetBufferLength: number;
  maxBufferLength: number;
  minBufferLength: number;
  // Latency optimization
  lowLatencyMode: boolean;
  segmentDuration: number;
  // Rebuffering prevention
  rebufferThreshold: number;
  qualitySwitchThreshold: number;
}

export interface QualityLevel {
  id: string;
  bitrate: number;
  resolution: { width: number; height: number };
  codec: string;
  mimeType: string;
  url: string;
  bandwidth: number;
}

export interface NetworkMetrics {
  bandwidth: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  throughput: number;
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'ethernet';
}

export interface AdaptiveMetrics {
  currentQuality: string;
  qualitySwitches: number;
  rebufferingEvents: number;
  averageLatency: number;
  bufferHealth: number;
  networkStability: number;
  userExperience: 'excellent' | 'good' | 'fair' | 'poor';
}

export class AdaptiveStreamingEngine {
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: AdaptiveStreamingConfig;
  private currentQuality: QualityLevel | null = null;
  private networkMetrics: NetworkMetrics;
  private adaptiveMetrics: AdaptiveMetrics;
  private bufferSegments: MSEBuffer[] = [];
  private qualityHistory: string[] = [];
  private rebufferingEvents: number[] = [];
  private networkMonitorInterval: NodeJS.Timeout | null = null;
  private bufferMonitorInterval: NodeJS.Timeout | null = null;
  private isPlaying: boolean = false;
  private isBuffering: boolean = false;
  private lastSegmentTime: number = 0;
  private segmentQueue: ArrayBuffer[] = [];
  private qualitySwitchCooldown: number = 0;

  constructor(config: AdaptiveStreamingConfig) {
    this.config = config;
    this.networkMetrics = this.initializeNetworkMetrics();
    this.adaptiveMetrics = this.initializeAdaptiveMetrics();
  }

  private initializeNetworkMetrics(): NetworkMetrics {
    return {
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      jitter: 0,
      throughput: 0,
      connectionType: 'wifi'
    };
  }

  private initializeAdaptiveMetrics(): AdaptiveMetrics {
    return {
      currentQuality: '',
      qualitySwitches: 0,
      rebufferingEvents: 0,
      averageLatency: 0,
      bufferHealth: 100,
      networkStability: 100,
      userExperience: 'good'
    };
  }

  /**
   * Initialize the adaptive streaming engine
   */
  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    this.videoElement = videoElement;
    
    // Create MediaSource
    this.mediaSource = new MediaSource();
    const url = URL.createObjectURL(this.mediaSource);
    videoElement.src = url;

    // Wait for MediaSource to be ready
    return new Promise((resolve, reject) => {
      if (!this.mediaSource) {
        reject(new Error('MediaSource not initialized'));
        return;
      }

      this.mediaSource.addEventListener('sourceopen', async () => {
        try {
          await this.setupSourceBuffer();
          this.startMonitoring();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      this.mediaSource.addEventListener('error', (event) => {
        reject(new Error(`MediaSource error: ${event}`));
      });
    });
  }

  /**
   * Setup source buffer with optimal configuration
   */
  private async setupSourceBuffer(): Promise<void> {
    if (!this.mediaSource) throw new Error('MediaSource not initialized');

    // Select initial quality based on network conditions
    this.currentQuality = this.selectInitialQuality();
    
    if (!this.currentQuality) {
      throw new Error('No suitable quality level found');
    }

    // Create source buffer with current quality codec
    this.sourceBuffer = this.mediaSource.addSourceBuffer(
      `${this.currentQuality.mimeType}; codecs="${this.currentQuality.codec}"`
    );

    // Configure source buffer for optimal performance
    this.configureSourceBuffer();
    
    this.adaptiveMetrics.currentQuality = this.currentQuality.id;
  }

  /**
   * Configure source buffer for low latency and smooth playback
   */
  private configureSourceBuffer(): void {
    if (!this.sourceBuffer) return;

    // Set up event listeners
    this.sourceBuffer.addEventListener('updateend', () => {
      this.handleBufferUpdate();
    });

    this.sourceBuffer.addEventListener('error', (event) => {
      console.error('SourceBuffer error:', event);
      this.handleBufferError();
    });

    // Configure buffer management
    this.sourceBuffer.mode = 'sequence';
  }

  /**
   * Select initial quality based on network conditions
   */
  private selectInitialQuality(): QualityLevel | null {
    const { qualities } = this.config;
    const { bandwidth } = this.networkMetrics;

    // Start with conservative quality
    let selectedQuality = qualities.find(q => q.bitrate <= 500000); // 500kbps

    // If we have good network, start higher
    if (bandwidth > 2000000) { // 2Mbps
      selectedQuality = qualities.find(q => q.bitrate <= 2000000);
    }

    // If we have excellent network, start with highest quality
    if (bandwidth > 5000000) { // 5Mbps
      selectedQuality = qualities[qualities.length - 1];
    }

    return selectedQuality || qualities[0];
  }

  /**
   * Start monitoring network and buffer conditions
   */
  private startMonitoring(): void {
    // Monitor network conditions
    this.networkMonitorInterval = setInterval(() => {
      this.updateNetworkMetrics();
      this.adaptQuality();
    }, this.config.networkCheckInterval);

    // Monitor buffer health
    this.bufferMonitorInterval = setInterval(() => {
      this.monitorBufferHealth();
      this.preventRebuffering();
    }, 1000); // Check every second
  }

  /**
   * Update network metrics using various methods
   */
  private async updateNetworkMetrics(): Promise<void> {
    try {
      // Use Network Information API if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        this.networkMetrics.connectionType = connection.effectiveType || 'wifi';
        this.networkMetrics.bandwidth = connection.downlink * 1000000; // Convert to bps
      }

      // Measure actual throughput
      await this.measureThroughput();
      
      // Calculate network stability
      this.calculateNetworkStability();
      
    } catch (error) {
      console.warn('Failed to update network metrics:', error);
    }
  }

  /**
   * Measure actual network throughput
   */
  private async measureThroughput(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Make a small request to measure throughput
      const response = await fetch('/api/network-test', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (response.ok && duration > 0) {
        // Estimate bandwidth based on response time
        const estimatedBandwidth = (response.headers.get('content-length') || '1000') as number;
        this.networkMetrics.throughput = (estimatedBandwidth * 8) / (duration / 1000);
      }
    } catch (error) {
      // Fallback to conservative estimate
      this.networkMetrics.throughput = 1000000; // 1Mbps
    }
  }

  /**
   * Calculate network stability based on recent measurements
   */
  private calculateNetworkStability(): void {
    // Simple stability calculation based on bandwidth variance
    const recentBandwidths = this.qualityHistory.slice(-10);
    if (recentBandwidths.length < 2) {
      this.adaptiveMetrics.networkStability = 100;
      return;
    }

    const avgBandwidth = recentBandwidths.reduce((sum, q) => {
      const quality = this.config.qualities.find(ql => ql.id === q);
      return sum + (quality?.bitrate || 0);
    }, 0) / recentBandwidths.length;

    const variance = recentBandwidths.reduce((sum, q) => {
      const quality = this.config.qualities.find(ql => ql.id === q);
      const diff = (quality?.bitrate || 0) - avgBandwidth;
      return sum + (diff * diff);
    }, 0) / recentBandwidths.length;

    // Convert variance to stability percentage (lower variance = higher stability)
    this.adaptiveMetrics.networkStability = Math.max(0, 100 - (variance / avgBandwidth) * 100);
  }

  /**
   * Adapt quality based on current conditions
   */
  private adaptQuality(): void {
    if (!this.currentQuality || this.qualitySwitchCooldown > 0) return;

    const { bandwidth, throughput } = this.networkMetrics;
    const { bufferHealth, networkStability } = this.adaptiveMetrics;
    
    // Calculate target bitrate based on available bandwidth
    const availableBandwidth = Math.min(bandwidth, throughput);
    const targetBitrate = availableBandwidth * 0.8; // Use 80% of available bandwidth

    // Find appropriate quality level
    const newQuality = this.selectQualityForBitrate(targetBitrate);
    
    if (newQuality && newQuality.id !== this.currentQuality.id) {
      this.switchQuality(newQuality);
    }
  }

  /**
   * Select quality level based on target bitrate
   */
  private selectQualityForBitrate(targetBitrate: number): QualityLevel | null {
    const { qualities } = this.config;
    
    // Find the highest quality that fits within the target bitrate
    let selectedQuality = qualities[0];
    
    for (const quality of qualities) {
      if (quality.bitrate <= targetBitrate) {
        selectedQuality = quality;
      } else {
        break;
      }
    }

    return selectedQuality;
  }

  /**
   * Switch to a new quality level
   */
  private async switchQuality(newQuality: QualityLevel): Promise<void> {
    if (!this.mediaSource || !this.sourceBuffer) return;

    try {
      // Add new source buffer for new quality
      const newSourceBuffer = this.mediaSource.addSourceBuffer(
        `${newQuality.mimeType}; codecs="${newQuality.codec}"`
      );

      // Copy current buffer to new source buffer
      if (this.sourceBuffer.buffered.length > 0) {
        const currentTime = this.videoElement?.currentTime || 0;
        const bufferStart = this.sourceBuffer.buffered.start(0);
        const bufferEnd = this.sourceBuffer.buffered.end(0);
        
        // Only copy relevant portion
        if (currentTime >= bufferStart && currentTime <= bufferEnd) {
          const segmentData = await this.extractBufferSegment(bufferStart, bufferEnd);
          if (segmentData) {
            newSourceBuffer.appendBuffer(segmentData);
          }
        }
      }

      // Remove old source buffer
      this.mediaSource.removeSourceBuffer(this.sourceBuffer);
      this.sourceBuffer = newSourceBuffer;
      this.configureSourceBuffer();

      // Update metrics
      this.currentQuality = newQuality;
      this.adaptiveMetrics.currentQuality = newQuality.id;
      this.adaptiveMetrics.qualitySwitches++;
      this.qualityHistory.push(newQuality.id);
      this.qualitySwitchCooldown = 2000; // 2 second cooldown

      console.log(`Quality switched to: ${newQuality.id} (${newQuality.bitrate}bps)`);

    } catch (error) {
      console.error('Failed to switch quality:', error);
    }
  }

  /**
   * Extract buffer segment for quality switching
   */
  private async extractBufferSegment(start: number, end: number): Promise<ArrayBuffer | null> {
    // This is a simplified implementation
    // In a real implementation, you'd need to properly extract segments
    return null;
  }

  /**
   * Monitor buffer health and predict rebuffering
   */
  private monitorBufferHealth(): void {
    if (!this.videoElement || !this.sourceBuffer) return;

    const currentTime = this.videoElement.currentTime;
    const buffered = this.sourceBuffer.buffered;
    
    if (buffered.length === 0) {
      this.adaptiveMetrics.bufferHealth = 0;
      return;
    }

    // Calculate buffer health
    const bufferEnd = buffered.end(buffered.length - 1);
    const bufferAhead = bufferEnd - currentTime;
    const bufferHealth = Math.min(100, (bufferAhead / this.config.targetBufferLength) * 100);
    
    this.adaptiveMetrics.bufferHealth = bufferHealth;

    // Predict rebuffering
    if (bufferAhead < this.config.rebufferThreshold) {
      this.handleRebufferingRisk();
    }
  }

  /**
   * Handle rebuffering risk by taking preventive measures
   */
  private handleRebufferingRisk(): void {
    if (this.isBuffering) return;

    console.log('Rebuffering risk detected, taking preventive measures');
    
    // Switch to lower quality to reduce bandwidth requirements
    const currentIndex = this.config.qualities.findIndex(q => q.id === this.currentQuality?.id);
    if (currentIndex > 0) {
      const lowerQuality = this.config.qualities[currentIndex - 1];
      this.switchQuality(lowerQuality);
    }

    // Preload more content
    this.preloadContent();
  }

  /**
   * Prevent rebuffering by preloading content
   */
  private async preloadContent(): Promise<void> {
    if (!this.currentQuality) return;

    try {
      // Fetch next segments
      const nextSegments = await this.fetchNextSegments(3); // Preload 3 segments
      
      for (const segment of nextSegments) {
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
          this.sourceBuffer.appendBuffer(segment);
        }
      }
    } catch (error) {
      console.error('Failed to preload content:', error);
    }
  }

  /**
   * Fetch next segments for preloading
   */
  private async fetchNextSegments(count: number): Promise<ArrayBuffer[]> {
    if (!this.currentQuality) return [];

    const segments: ArrayBuffer[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const segmentUrl = `${this.currentQuality.url}?segment=${i}`;
        const response = await fetch(segmentUrl);
        const segment = await response.arrayBuffer();
        segments.push(segment);
      } catch (error) {
        console.error(`Failed to fetch segment ${i}:`, error);
        break;
      }
    }

    return segments;
  }

  /**
   * Handle buffer update events
   */
  private handleBufferUpdate(): void {
    if (this.isBuffering) {
      this.isBuffering = false;
      this.adaptiveMetrics.rebufferingEvents++;
      this.rebufferingEvents.push(performance.now());
    }
  }

  /**
   * Handle buffer errors
   */
  private handleBufferError(): void {
    console.error('Buffer error occurred');
    this.isBuffering = true;
    
    // Try to recover by switching to a more stable quality
    if (this.currentQuality) {
      const stableQuality = this.config.qualities.find(q => q.bitrate < this.currentQuality!.bitrate);
      if (stableQuality) {
        this.switchQuality(stableQuality);
      }
    }
  }

  /**
   * Load a video segment
   */
  async loadSegment(segmentUrl: string): Promise<void> {
    if (!this.sourceBuffer || this.sourceBuffer.updating) {
      // Queue the segment if buffer is busy
      const response = await fetch(segmentUrl);
      const segment = await response.arrayBuffer();
      this.segmentQueue.push(segment);
      return;
    }

    try {
      const response = await fetch(segmentUrl);
      const segment = await response.arrayBuffer();
      
      this.sourceBuffer.appendBuffer(segment);
      this.lastSegmentTime = performance.now();
      
    } catch (error) {
      console.error('Failed to load segment:', error);
      this.handleBufferError();
    }
  }

  /**
   * Get current adaptive metrics
   */
  getMetrics(): AdaptiveMetrics {
    return { ...this.adaptiveMetrics };
  }

  /**
   * Get network metrics
   */
  getNetworkMetrics(): NetworkMetrics {
    return { ...this.networkMetrics };
  }

  /**
   * Update quality switch cooldown
   */
  updateCooldown(): void {
    if (this.qualitySwitchCooldown > 0) {
      this.qualitySwitchCooldown -= 1000;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
    }
    if (this.bufferMonitorInterval) {
      clearInterval(this.bufferMonitorInterval);
    }
    
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      this.mediaSource.endOfStream();
    }
  }
}
