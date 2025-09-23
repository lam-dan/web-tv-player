'use client';

import React, { useState, useEffect } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { VideoConverter } from '@/components/VideoConverter';
import { useABTesting } from '@/hooks/useABTesting';
import { useAnalytics } from '@/hooks/useAnalytics';
import { StreamingConfig } from '@/types/player';

const SAMPLE_VIDEOS = [
  {
    id: 'sample-1',
    title: 'Sample Video 1 - MP4 (Reliable)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    isHLS: false,
  },
  {
    id: 'sample-2', 
    title: 'Sample Video 2 - HLS Stream',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    isHLS: true,
  },
  {
    id: 'sample-3',
    title: 'Sample Video 3 - MP4 (Elephants Dream)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    isHLS: false,
  },
];

export default function Home() {
  const [selectedVideo, setSelectedVideo] = useState(SAMPLE_VIDEOS[0]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  
  // A/B Testing
  const { variant, testConfig, getFeatureFlag, trackEvent } = useABTesting('player_ui_v2');
  const { getEvents } = useAnalytics();

  // Enhanced streaming config based on A/B test
  const streamingConfig: StreamingConfig = {
    enableAdaptiveBitrate: true,
    maxBitrate: getFeatureFlag('aggressive_abr') ? 8000000 : 5000000,
    minBitrate: getFeatureFlag('aggressive_abr') ? 1000000 : 500000,
    bufferSize: getFeatureFlag('buffer_optimization') ? 45 : 30,
    qualityLevels: [],
    abTestEnabled: true,
    analyticsEnabled: true,
  };

  useEffect(() => {
    if (testConfig) {
      trackEvent('player_loaded', {
        videoId: selectedVideo.id,
        variant: variant,
      });
    }
  }, [testConfig, selectedVideo.id, variant, trackEvent]);

  const handleVideoChange = (video: typeof SAMPLE_VIDEOS[0]) => {
    setSelectedVideo(video);
    trackEvent('video_changed', {
      videoId: video.id,
      videoTitle: video.title,
    });
  };

  const analyticsEvents = getEvents();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Web TV Player</h1>
              <p className="text-gray-400">Netflix-style streaming player with A/B testing</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                A/B Test: {variant} {testConfig && `(${testConfig.testId})`}
              </div>
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                {showAnalytics ? 'Hide' : 'Show'} Analytics
              </button>
              <button
                onClick={() => setShowConverter(!showConverter)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                {showConverter ? 'Hide' : 'Show'} Video Converter
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Player */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">{selectedVideo.title}</h2>
              
              <VideoPlayer
                src={selectedVideo.url}
                isHLS={selectedVideo.isHLS}
                config={streamingConfig}
                className="aspect-video"
              />
              
              {/* Video Selection */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Select Video</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SAMPLE_VIDEOS.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => handleVideoChange(video)}
                      className={`p-3 rounded border text-left transition-colors ${
                        selectedVideo.id === video.id
                          ? 'border-red-500 bg-red-500 bg-opacity-10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">{video.title}</div>
                      <div className="text-sm text-gray-400">
                        {video.isHLS ? 'HLS Stream' : 'MP4 Video'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* A/B Test Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">A/B Test Status</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Current Variant</div>
                  <div className="font-medium">{variant}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Test ID</div>
                  <div className="font-medium">{testConfig?.testId || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Features</div>
                  <div className="space-y-1">
                    {testConfig && Object.entries(testConfig.features).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Streaming Config */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Streaming Config</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Adaptive Bitrate:</span>
                  <span>{streamingConfig.enableAdaptiveBitrate ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Bitrate:</span>
                  <span>{Math.round(streamingConfig.maxBitrate / 1000)}k</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Min Bitrate:</span>
                  <span>{Math.round(streamingConfig.minBitrate / 1000)}k</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Buffer Size:</span>
                  <span>{streamingConfig.bufferSize}s</span>
                </div>
              </div>
            </div>

            {/* Analytics */}
            {showAnalytics && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Analytics Events</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analyticsEvents.length === 0 ? (
                    <div className="text-gray-400 text-sm">No events yet</div>
                  ) : (
                    analyticsEvents.slice(-10).map((event, index) => (
                      <div key={index} className="text-xs bg-gray-700 p-2 rounded">
                        <div className="font-medium">{event.eventType}</div>
                        <div className="text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                        {event.videoId && (
                          <div className="text-gray-400">Video: {event.videoId}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Converter Section */}
        {showConverter && (
          <div className="mt-8">
            <VideoConverter />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-gray-400">
            <p>Web TV Player - Demonstrating Netflix-style streaming with A/B testing</p>
            <p className="text-sm mt-2">
              Built with Next.js, React, TypeScript, HLS.js, and Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}