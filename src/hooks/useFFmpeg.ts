import { useState, useCallback, useRef, useEffect } from 'react';
import { FFmpegProcessor, createFFmpegProcessor } from '../utils/ffmpeg';
import { FFmpegProgress, FFmpegResult, VideoConversionOptions } from '../types/player';

export interface UseFFmpegReturn {
  isLoaded: boolean;
  isProcessing: boolean;
  progress: FFmpegProgress | null;
  error: string | null;
  result: FFmpegResult | null;
  loadFFmpeg: () => Promise<void>;
  convertVideo: (inputFile: File, options: VideoConversionOptions) => Promise<FFmpegResult>;
  extractThumbnail: (inputFile: File, timeOffset?: number) => Promise<FFmpegResult>;
  getVideoInfo: (inputFile: File) => Promise<any>;
  reset: () => void;
  terminate: () => Promise<void>;
}

export const useFFmpeg = (): UseFFmpegReturn => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<FFmpegProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FFmpegResult | null>(null);
  
  const processorRef = useRef<FFmpegProcessor | null>(null);

  const loadFFmpeg = useCallback(async () => {
    if (isLoaded) return;

    try {
      setError(null);
      const processor = createFFmpegProcessor();
      await processor.load();
      processorRef.current = processor;
      setIsLoaded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load FFmpeg';
      setError(errorMessage);
      console.error('Failed to load FFmpeg:', err);
    }
  }, [isLoaded]);

  const convertVideo = useCallback(async (
    inputFile: File,
    options: VideoConversionOptions
  ): Promise<FFmpegResult> => {
    if (!processorRef.current) {
      await loadFFmpeg();
    }

    if (!processorRef.current) {
      const errorResult: FFmpegResult = {
        success: false,
        error: 'FFmpeg not loaded',
      };
      setError('FFmpeg not loaded');
      return errorResult;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setResult(null);
      setProgress(null);

      const result = await processorRef.current.convertVideo(
        inputFile,
        options,
        (progress) => {
          setProgress(progress);
        }
      );

      setResult(result);
      setIsProcessing(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      setIsProcessing(false);
      
      const errorResult: FFmpegResult = {
        success: false,
        error: errorMessage,
      };
      setResult(errorResult);
      return errorResult;
    }
  }, [loadFFmpeg]);

  const extractThumbnail = useCallback(async (
    inputFile: File,
    timeOffset: number = 0
  ): Promise<FFmpegResult> => {
    if (!processorRef.current) {
      await loadFFmpeg();
    }

    if (!processorRef.current) {
      const errorResult: FFmpegResult = {
        success: false,
        error: 'FFmpeg not loaded',
      };
      setError('FFmpeg not loaded');
      return errorResult;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setResult(null);
      setProgress(null);

      const result = await processorRef.current.extractThumbnail(
        inputFile,
        timeOffset,
        (progress) => {
          setProgress(progress);
        }
      );

      setResult(result);
      setIsProcessing(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Thumbnail extraction failed';
      setError(errorMessage);
      setIsProcessing(false);
      
      const errorResult: FFmpegResult = {
        success: false,
        error: errorMessage,
      };
      setResult(errorResult);
      return errorResult;
    }
  }, [loadFFmpeg]);

  const getVideoInfo = useCallback(async (inputFile: File) => {
    if (!processorRef.current) {
      await loadFFmpeg();
    }

    if (!processorRef.current) {
      setError('FFmpeg not loaded');
      return null;
    }

    try {
      setError(null);
      const info = await processorRef.current.getVideoInfo(inputFile);
      return info;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get video info';
      setError(errorMessage);
      return null;
    }
  }, [loadFFmpeg]);

  const reset = useCallback(() => {
    setProgress(null);
    setError(null);
    setResult(null);
    setIsProcessing(false);
  }, []);

  const terminate = useCallback(async () => {
    if (processorRef.current) {
      await processorRef.current.terminate();
      processorRef.current = null;
      setIsLoaded(false);
    }
    reset();
  }, [reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processorRef.current) {
        processorRef.current.terminate();
      }
    };
  }, []);

  return {
    isLoaded,
    isProcessing,
    progress,
    error,
    result,
    loadFFmpeg,
    convertVideo,
    extractThumbnail,
    getVideoInfo,
    reset,
    terminate,
  };
};
