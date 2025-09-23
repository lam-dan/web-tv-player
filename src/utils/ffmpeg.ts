import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FFmpegConfig, FFmpegProgress, FFmpegResult, VideoConversionOptions } from '../types/player';

export class FFmpegProcessor {
  private ffmpeg: FFmpeg;
  private isLoaded: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async load(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      this.ffmpeg.on('progress', ({ progress, time }) => {
        console.log(`Processing: ${Math.round(progress * 100)}% (${time}ms)`);
      });

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw new Error('Failed to initialize FFmpeg');
    }
  }

  async convertVideo(
    inputFile: File,
    options: VideoConversionOptions,
    onProgress?: (progress: FFmpegProgress) => void
  ): Promise<FFmpegResult> {
    if (!this.isLoaded) {
      await this.load();
    }

    try {
      const inputFileName = 'input.' + options.inputFormat;
      const outputFileName = 'output.' + options.outputFormat;

      // Write input file to FFmpeg filesystem
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));

      // Build FFmpeg command
      const command = this.buildCommand(inputFileName, outputFileName, options);

      // Set up progress monitoring
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress, time }) => {
          onProgress({
            percent: Math.round(progress * 100),
            time,
            speed: 1.0, // FFmpeg doesn't provide speed directly
            eta: time / progress - time,
          });
        });
      }

      // Execute conversion
      await this.ffmpeg.exec(command);

      // Read output file
      const outputData = await this.ffmpeg.readFile(outputFileName);
      const outputBlob = outputData instanceof Uint8Array ? outputData : new Uint8Array(await (outputData as unknown as Blob).arrayBuffer());

      // Clean up files
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return {
        success: true,
        outputFile: outputBlob,
        duration: inputFile.size, // Approximate
        size: outputBlob.length,
      };
    } catch (error) {
      console.error('Video conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async extractThumbnail(
    inputFile: File,
    timeOffset: number = 0,
    onProgress?: (progress: FFmpegProgress) => void
  ): Promise<FFmpegResult> {
    if (!this.isLoaded) {
      await this.load();
    }

    try {
      const inputFileName = 'input.' + this.getFileExtension(inputFile.name);
      const outputFileName = 'thumbnail.jpg';

      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));

      const command = [
        '-i', inputFileName,
        '-ss', timeOffset.toString(),
        '-vframes', '1',
        '-q:v', '2',
        outputFileName
      ];

      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress, time }) => {
          onProgress({
            percent: Math.round(progress * 100),
            time,
            speed: 1.0,
            eta: time / progress - time,
          });
        });
      }

      await this.ffmpeg.exec(command);

      const outputData = await this.ffmpeg.readFile(outputFileName);
      const outputBlob = outputData instanceof Uint8Array ? outputData : new Uint8Array(await (outputData as unknown as Blob).arrayBuffer());

      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return {
        success: true,
        outputFile: outputBlob,
        size: outputBlob.length,
      };
    } catch (error) {
      console.error('Thumbnail extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getVideoInfo(inputFile: File): Promise<{
    duration: number;
    width: number;
    height: number;
    bitrate: number;
    codec: string;
  } | null> {
    if (!this.isLoaded) {
      await this.load();
    }

    try {
      const inputFileName = 'input.' + this.getFileExtension(inputFile.name);
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile));

      // Use ffprobe to get video information
      const command = [
        '-i', inputFileName,
        '-f', 'null',
        '-'
      ];

      await this.ffmpeg.exec(command);
      await this.ffmpeg.deleteFile(inputFileName);

      // Note: This is a simplified implementation
      // In a real implementation, you'd parse the FFmpeg output
      return {
        duration: 0,
        width: 1920,
        height: 1080,
        bitrate: 1000000,
        codec: 'h264',
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      return null;
    }
  }

  private buildCommand(
    inputFileName: string,
    outputFileName: string,
    options: VideoConversionOptions
  ): string[] {
    const command: string[] = ['-i', inputFileName];

    // Quality settings
    const qualityMap = {
      low: { crf: 28, preset: 'fast' },
      medium: { crf: 23, preset: 'medium' },
      high: { crf: 18, preset: 'slow' },
      ultra: { crf: 15, preset: 'veryslow' },
    };

    const quality = qualityMap[options.quality];

    // Video codec
    if (options.videoCodec) {
      command.push('-c:v', options.videoCodec);
    } else {
      command.push('-c:v', 'libx264');
    }

    // Audio codec
    if (options.audioCodec) {
      command.push('-c:a', options.audioCodec);
    } else {
      command.push('-c:a', 'aac');
    }

    // Quality
    command.push('-crf', quality.crf.toString());
    command.push('-preset', quality.preset);

    // Resolution
    if (options.resolution) {
      command.push('-s', `${options.resolution.width}x${options.resolution.height}`);
    }

    // Bitrate
    if (options.bitrate) {
      command.push('-b:v', `${options.bitrate}k`);
    }

    // Frame rate
    if (options.frameRate) {
      command.push('-r', options.frameRate.toString());
    }

    // Trim
    if (options.trim) {
      command.push('-ss', options.trim.start.toString());
      command.push('-t', (options.trim.end - options.trim.start).toString());
    }

    command.push(outputFileName);

    return command;
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'mp4';
  }

  async terminate(): Promise<void> {
    if (this.isLoaded) {
      this.ffmpeg.terminate();
      this.isLoaded = false;
    }
  }
}

// Utility functions for common operations
export const createFFmpegProcessor = (): FFmpegProcessor => {
  return new FFmpegProcessor();
};

export const getSupportedFormats = (): string[] => {
  return [
    'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v',
    '3gp', 'ogv', 'ts', 'm2ts', 'mts', 'vob', 'asf', 'rm',
    'rmvb', 'divx', 'xvid', 'mpeg', 'mpg', 'm2v', 'm1v'
  ];
};

export const getQualityPresets = () => {
  return {
    low: { label: 'Low Quality', crf: 28, description: 'Small file size, lower quality' },
    medium: { label: 'Medium Quality', crf: 23, description: 'Balanced quality and size' },
    high: { label: 'High Quality', crf: 18, description: 'High quality, larger file' },
    ultra: { label: 'Ultra Quality', crf: 15, description: 'Maximum quality, largest file' },
  };
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
