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
