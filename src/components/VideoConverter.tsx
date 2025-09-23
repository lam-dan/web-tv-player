'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { VideoConversionOptions } from '../types/player';
import { getQualityPresets, formatFileSize, formatDuration } from '../utils/ffmpeg';

interface VideoConverterProps {
  onConversionComplete?: (result: any) => void;
  className?: string;
}

export const VideoConverter: React.FC<VideoConverterProps> = ({
  onConversionComplete,
  className = '',
}) => {
  const {
    isLoaded,
    isProcessing,
    progress,
    error,
    result,
    loadFFmpeg,
    convertVideo,
    extractThumbnail,
    reset,
  } = useFFmpeg();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conversionOptions, setConversionOptions] = useState<VideoConversionOptions>({
    inputFormat: 'mp4',
    outputFormat: 'mp4',
    quality: 'medium',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [thumbnailTime, setThumbnailTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  const qualityPresets = getQualityPresets();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setConversionOptions(prev => ({
        ...prev,
        inputFormat: file.name.split('.').pop()?.toLowerCase() || 'mp4',
      }));
      reset();
    }
  }, [reset]);

  const handleConvert = useCallback(async () => {
    if (!selectedFile) return;

    try {
      const result = await convertVideo(selectedFile, conversionOptions);
      if (result.success && onConversionComplete) {
        onConversionComplete(result);
      }
    } catch (err) {
      console.error('Conversion failed:', err);
    }
  }, [selectedFile, conversionOptions, convertVideo, onConversionComplete]);

  const handleExtractThumbnail = useCallback(async () => {
    if (!selectedFile) return;

    try {
      const result = await extractThumbnail(selectedFile, thumbnailTime);
      if (result.success && result.outputFile) {
        const blob = new Blob([new Uint8Array(result.outputFile)], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        
        if (downloadLinkRef.current) {
          downloadLinkRef.current.href = url;
          downloadLinkRef.current.download = `thumbnail-${Date.now()}.jpg`;
          downloadLinkRef.current.click();
        }
        
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Thumbnail extraction failed:', err);
    }
  }, [selectedFile, thumbnailTime, extractThumbnail]);

  const handleDownload = useCallback(() => {
    if (result?.success && result.outputFile) {
      const blob = new Blob([new Uint8Array(result.outputFile)], { 
        type: `video/${conversionOptions.outputFormat}` 
      });
      const url = URL.createObjectURL(blob);
      
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = url;
        downloadLinkRef.current.download = `converted-${Date.now()}.${conversionOptions.outputFormat}`;
        downloadLinkRef.current.click();
      }
      
      URL.revokeObjectURL(url);
    }
  }, [result, conversionOptions.outputFormat]);

  const handleLoadFFmpeg = useCallback(async () => {
    try {
      await loadFFmpeg();
    } catch (err) {
      console.error('Failed to load FFmpeg:', err);
    }
  }, [loadFFmpeg]);

  return (
    <div className={`video-converter ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Video Converter</h2>
        
        {/* FFmpeg Status */}
        <div className="mb-6">
          {!isLoaded ? (
            <div className="flex items-center gap-4">
              <button
                onClick={handleLoadFFmpeg}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Load FFmpeg
              </button>
              <span className="text-gray-600">FFmpeg not loaded</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-600 font-medium">FFmpeg Ready</span>
            </div>
          )}
        </div>

        {/* File Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Video File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFile && (
            <div className="mt-2 text-sm text-gray-600">
              <p>File: {selectedFile.name}</p>
              <p>Size: {formatFileSize(selectedFile.size)}</p>
            </div>
          )}
        </div>

        {/* Conversion Options */}
        {selectedFile && (
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Output Format
                </label>
                <select
                  value={conversionOptions.outputFormat}
                  onChange={(e) => setConversionOptions(prev => ({
                    ...prev,
                    outputFormat: e.target.value,
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="avi">AVI</option>
                  <option value="mov">MOV</option>
                  <option value="mkv">MKV</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quality
                </label>
                <select
                  value={conversionOptions.quality}
                  onChange={(e) => setConversionOptions(prev => ({
                    ...prev,
                    quality: e.target.value as any,
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(qualityPresets).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution Width
                      </label>
                      <input
                        type="number"
                        value={conversionOptions.resolution?.width || ''}
                        onChange={(e) => setConversionOptions(prev => ({
                          ...prev,
                          resolution: {
                            width: parseInt(e.target.value) || 0,
                            height: prev.resolution?.height || 0,
                          },
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1920"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution Height
                      </label>
                      <input
                        type="number"
                        value={conversionOptions.resolution?.height || ''}
                        onChange={(e) => setConversionOptions(prev => ({
                          ...prev,
                          resolution: {
                            width: prev.resolution?.width || 0,
                            height: parseInt(e.target.value) || 0,
                          },
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1080"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bitrate (kbps)
                    </label>
                    <input
                      type="number"
                      value={conversionOptions.bitrate || ''}
                      onChange={(e) => setConversionOptions(prev => ({
                        ...prev,
                        bitrate: parseInt(e.target.value) || undefined,
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1000"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thumbnail Extraction */}
        {selectedFile && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Extract Thumbnail</h3>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={thumbnailTime}
                onChange={(e) => setThumbnailTime(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                step="0.1"
              />
              <span className="text-sm text-gray-600">seconds</span>
              <button
                onClick={handleExtractThumbnail}
                disabled={!isLoaded || isProcessing}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Extract Thumbnail
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        {isProcessing && progress && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Processing...</span>
              <span className="text-sm text-gray-600">{progress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Time: {formatDuration(progress.time / 1000)} | 
              ETA: {formatDuration(progress.eta / 1000)}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            {result.success ? (
              <div>
                <p className="text-green-800 font-medium mb-2">Conversion completed successfully!</p>
                {result.size && (
                  <p className="text-sm text-green-700">
                    Output size: {formatFileSize(result.size)}
                  </p>
                )}
                <button
                  onClick={handleDownload}
                  className="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Download Converted Video
                </button>
              </div>
            ) : (
              <p className="text-red-800">{result.error}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleConvert}
            disabled={!selectedFile || !isLoaded || isProcessing}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {isProcessing ? 'Converting...' : 'Convert Video'}
          </button>
          
          <button
            onClick={reset}
            disabled={isProcessing}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Hidden download link */}
        <a
          ref={downloadLinkRef}
          style={{ display: 'none' }}
          download
        />
      </div>
    </div>
  );
};
