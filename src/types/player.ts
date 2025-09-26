export interface VideoMetadata {
  title: string;
  duration: number;
  currentTime: number;
  buffered: TimeRanges;
  volume: number;
  playbackRate: number;
  quality: VideoQuality;
  isLive: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface VideoQuality {
  level: number;
  width: number;
  height: number;
  bitrate: number;
  codecs: string;
  label: string;
}

export interface PlayerState {
  currentState: PlayerStates;
  metadata: VideoMetadata;
  availableQualities: VideoQuality[];
  currentQuality: VideoQuality | null;
  adaptiveBitrate: boolean;
  abTestVariant?: string;
}

export enum PlayerStates {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  PLAYING = 'playing',
  PAUSED = 'paused',
  BUFFERING = 'buffering',
  ERROR = 'error',
  ENDED = 'ended'
}

export interface StreamingConfig {
  enableAdaptiveBitrate: boolean;
  maxBitrate: number;
  minBitrate: number;
  bufferSize: number;
  qualityLevels: VideoQuality[];
  abTestEnabled: boolean;
  analyticsEnabled: boolean;
}

export interface AnalyticsEvent {
  eventType: string;
  timestamp: number;
  videoId: string;
  currentTime: number;
  quality: VideoQuality;
  bufferHealth: number;
  playbackRate: number;
  userAgent: string;
  sessionId: string;
  volume?: number;
  isMuted?: boolean;
  errorMessage?: string;
}

export interface ABTestConfig {
  testId: string;
  variant: string;
  enabled: boolean;
  features: Record<string, boolean>;
}

export interface FFmpegConfig {
  inputFile: File | string;
  outputFormat: string;
  quality: number;
  resolution?: string;
  bitrate?: number;
  codec?: string;
  audioCodec?: string;
  videoCodec?: string;
  frameRate?: number;
  startTime?: number;
  duration?: number;
}

export interface FFmpegProgress {
  percent: number;
  time: number;
  speed: number;
  eta: number;
}

export interface FFmpegResult {
  success: boolean;
  outputFile?: Uint8Array;
  error?: string;
  duration?: number;
  size?: number;
}

export interface VideoConversionOptions {
  inputFormat: string;
  outputFormat: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution?: {
    width: number;
    height: number;
  };
  bitrate?: number;
  codec?: string;
  audioCodec?: string;
  videoCodec?: string;
  frameRate?: number;
  trim?: {
    start: number;
    end: number;
  };
}

// MSE (Media Source Extensions) interfaces
export interface MSEConfig {
  mimeType: string;
  codecs: string;
  bufferSize: number;
  maxBufferLength: number;
  minBufferLength: number;
}

export interface MSEBuffer {
  start: number;
  end: number;
  data: ArrayBuffer;
  timestamp: number;
}

export interface MSEMetrics {
  bufferHealth: number;
  bufferLength: number;
  droppedFrames: number;
  totalFrames: number;
  bufferUnderruns: number;
  bufferOverruns: number;
}

// EME (Encrypted Media Extensions) interfaces
export interface EMEConfig {
  keySystem: string;
  initData: ArrayBuffer;
  sessionType: MediaKeySessionType;
  persistentState: 'required' | 'optional' | 'not-allowed';
}

export interface EMELicense {
  license: ArrayBuffer;
  sessionId: string;
  expirationTime: number;
  keyStatuses: MediaKeyStatusMap;
}

export interface EMEMetrics {
  licenseRequests: number;
  licenseResponses: number;
  keyStatusChanges: number;
  sessionErrors: number;
  decryptionErrors: number;
}

// DASH (Dynamic Adaptive Streaming over HTTP) interfaces
export interface DASHConfig {
  manifestUrl: string;
  autoStart: boolean;
  autoPlay: boolean;
  streaming: {
    delay: {
      liveDelay: number;
      liveDelayFragmentCount: number;
    };
    abr: {
      autoSwitchBitrate: boolean;
      initialBitrate: number;
      maxBitrate: number;
      minBitrate: number;
    };
  };
  debug: {
    logLevel: number;
  };
}

export interface DASHRepresentation {
  id: string;
  bandwidth: number;
  width: number;
  height: number;
  codecs: string;
  mimeType: string;
  frameRate: number;
  qualityRanking: number;
}

export interface DASHAdaptationSet {
  id: string;
  type: 'video' | 'audio' | 'text';
  representations: DASHRepresentation[];
  lang?: string;
  roles?: string[];
}

export interface DASHPeriod {
  id: string;
  start: number;
  duration: number;
  adaptationSets: DASHAdaptationSet[];
}

export interface DASHManifest {
  periods: DASHPeriod[];
  duration: number;
  isLive: boolean;
  availabilityStartTime: number;
  availabilityEndTime?: number;
  suggestedPresentationDelay: number;
  timeShiftBufferDepth: number;
}

export interface DASHMetrics {
  currentRepresentation: DASHRepresentation | null;
  bitrateSwitches: number;
  bufferLevel: number;
  bufferHealth: number;
  droppedFrames: number;
  totalFrames: number;
  downloadTime: number;
  throughput: number;
  latency: number;
  rebufferingEvents: number;
  rebufferingTime: number;
}

export interface DASHEvent {
  type: 'manifestLoaded' | 'representationChanged' | 'bufferLevelChanged' | 'error';
  timestamp: number;
  data: any;
}
