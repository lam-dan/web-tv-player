import React, { useState, useEffect } from 'react';
import { useAdaptiveStreaming, UseAdaptiveStreamingOptions } from '../hooks/useAdaptiveStreaming';
import { AdaptiveStreamingConfig, QualityLevel } from '../utils/adaptiveStreaming';

interface AdaptiveStreamingDashboardProps {
  videoElement: HTMLVideoElement | null;
  onQualityChange?: (quality: string) => void;
  onRebuffering?: (event: { duration: number; timestamp: number }) => void;
  onNetworkChange?: (metrics: any) => void;
}

const AdaptiveStreamingDashboard: React.FC<AdaptiveStreamingDashboardProps> = ({
  videoElement,
  onQualityChange,
  onRebuffering,
  onNetworkChange
}) => {
  const [config, setConfig] = useState<AdaptiveStreamingConfig>({
    qualities: [
      {
        id: 'auto',
        bitrate: 0,
        resolution: { width: 0, height: 0 },
        codec: 'auto',
        mimeType: 'video/mp4',
        url: '',
        bandwidth: 0
      },
      {
        id: '240p',
        bitrate: 400000,
        resolution: { width: 426, height: 240 },
        codec: 'avc1.42E01E',
        mimeType: 'video/mp4',
        url: '/streams/240p/',
        bandwidth: 400000
      },
      {
        id: '360p',
        bitrate: 800000,
        resolution: { width: 640, height: 360 },
        codec: 'avc1.4D401F',
        mimeType: 'video/mp4',
        url: '/streams/360p/',
        bandwidth: 800000
      },
      {
        id: '480p',
        bitrate: 1200000,
        resolution: { width: 854, height: 480 },
        codec: 'avc1.4D401F',
        mimeType: 'video/mp4',
        url: '/streams/480p/',
        bandwidth: 1200000
      },
      {
        id: '720p',
        bitrate: 2500000,
        resolution: { width: 1280, height: 720 },
        codec: 'avc1.4D401F',
        mimeType: 'video/mp4',
        url: '/streams/720p/',
        bandwidth: 2500000
      },
      {
        id: '1080p',
        bitrate: 5000000,
        resolution: { width: 1920, height: 1080 },
        codec: 'avc1.4D4020',
        mimeType: 'video/mp4',
        url: '/streams/1080p/',
        bandwidth: 5000000
      }
    ],
    networkCheckInterval: 2000,
    targetBufferLength: 10,
    maxBufferLength: 30,
    minBufferLength: 3,
    lowLatencyMode: false,
    segmentDuration: 2,
    rebufferThreshold: 2,
    qualitySwitchThreshold: 0.8
  });

  const adaptiveStreamingOptions: UseAdaptiveStreamingOptions = {
    videoElement,
    config,
    onQualityChange,
    onRebuffering,
    onNetworkChange
  };

  const {
    isInitialized,
    isPlaying,
    isBuffering,
    currentQuality,
    availableQualities,
    metrics,
    networkMetrics,
    bufferHealth,
    userExperience,
    error,
    loadSegment,
    switchQuality,
    getBufferInfo,
    getDetailedMetrics
  } = useAdaptiveStreaming(adaptiveStreamingOptions);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('');

  // Format bitrate for display
  const formatBitrate = (bitrate: number): string => {
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(1)} Mbps`;
    }
    return `${(bitrate / 1000).toFixed(0)} Kbps`;
  };

  // Format latency for display
  const formatLatency = (latency: number): string => {
    if (latency >= 1000) {
      return `${(latency / 1000).toFixed(1)}s`;
    }
    return `${latency.toFixed(0)}ms`;
  };

  // Get user experience color
  const getExperienceColor = (experience: string): string => {
    switch (experience) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get buffer health color
  const getBufferHealthColor = (health: number): string => {
    if (health >= 80) return 'text-green-600';
    if (health >= 60) return 'text-yellow-600';
    if (health >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleLoadSegment = async () => {
    if (!selectedSegment) return;
    
    try {
      await loadSegment(selectedSegment);
    } catch (error) {
      console.error('Failed to load segment:', error);
    }
  };

  const handleQualityChange = async (qualityId: string) => {
    try {
      await switchQuality(qualityId);
    } catch (error) {
      console.error('Failed to switch quality:', error);
    }
  };

  const bufferInfo = getBufferInfo();
  const detailedMetrics = getDetailedMetrics();

  return (
    <div className="adaptive-streaming-dashboard bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto" role="main">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Adaptive Streaming Dashboard</h2>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isInitialized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isInitialized ? 'Initialized' : 'Not Initialized'}
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isPlaying ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isPlaying ? 'Playing' : 'Paused'}
          </div>
          {isBuffering && (
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Buffering
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div className="text-red-800 font-medium">Error: {error}</div>
          </div>
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Current Quality */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Current Quality</div>
          <div className="text-2xl font-bold text-gray-800">
            {currentQuality || 'Auto'}
          </div>
          <div className="text-sm text-gray-500">
            {availableQualities.find(q => q.id === currentQuality)?.bitrate 
              ? formatBitrate(availableQualities.find(q => q.id === currentQuality)!.bitrate)
              : 'Adaptive'
            }
          </div>
        </div>

        {/* Buffer Health */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Buffer Health</div>
          <div className={`text-2xl font-bold ${getBufferHealthColor(bufferHealth)}`}>
            {bufferHealth.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">
            {bufferInfo ? `${bufferInfo.bufferAhead.toFixed(1)}s ahead` : 'No buffer info'}
          </div>
        </div>

        {/* Network Bandwidth */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Bandwidth</div>
          <div className="text-2xl font-bold text-gray-800">
            {formatBitrate(networkMetrics.bandwidth)}
          </div>
          <div className="text-sm text-gray-500">
            {networkMetrics.connectionType.toUpperCase()}
          </div>
        </div>

        {/* User Experience */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Experience</div>
          <div className={`text-2xl font-bold ${getExperienceColor(userExperience)}`}>
            {userExperience.charAt(0).toUpperCase() + userExperience.slice(1)}
          </div>
          <div className="text-sm text-gray-500">
            {metrics.qualitySwitches} switches
          </div>
        </div>
      </div>

      {/* Quality Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Selection</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {availableQualities.map((quality) => (
            <button
              key={quality.id}
              onClick={() => handleQualityChange(quality.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                currentQuality === quality.id
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{quality.id.toUpperCase()}</div>
              {quality.bitrate > 0 && (
                <div className="text-sm text-gray-500">
                  {formatBitrate(quality.bitrate)}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Segment Loading */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Segment Loading</h3>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            placeholder="Enter segment URL"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLoadSegment}
            disabled={!selectedSegment || !isInitialized}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load Segment
          </button>
        </div>
      </div>

      {/* Advanced Metrics Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
        >
          <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Metrics</span>
          <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      </div>

      {/* Advanced Metrics */}
      {showAdvanced && (
        <div className="space-y-6">
          {/* Network Metrics */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Network Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Latency</div>
                <div className="text-lg font-bold text-gray-800">
                  {formatLatency(networkMetrics.latency)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Throughput</div>
                <div className="text-lg font-bold text-gray-800">
                  {formatBitrate(networkMetrics.throughput)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Packet Loss</div>
                <div className="text-lg font-bold text-gray-800">
                  {networkMetrics.packetLoss.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Jitter</div>
                <div className="text-lg font-bold text-gray-800">
                  {networkMetrics.jitter.toFixed(1)}ms
                </div>
              </div>
            </div>
          </div>

          {/* Adaptive Metrics */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Adaptive Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600">Quality Switches</div>
                <div className="text-lg font-bold text-gray-800">
                  {metrics.qualitySwitches}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Rebuffering Events</div>
                <div className="text-lg font-bold text-gray-800">
                  {metrics.rebufferingEvents}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Avg Latency</div>
                <div className="text-lg font-bold text-gray-800">
                  {formatLatency(metrics.averageLatency)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Network Stability</div>
                <div className="text-lg font-bold text-gray-800">
                  {metrics.networkStability.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Buffer Information */}
          {bufferInfo && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Buffer Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Current Time</div>
                  <div className="text-lg font-bold text-gray-800">
                    {bufferInfo.currentTime.toFixed(1)}s
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Buffer Start</div>
                  <div className="text-lg font-bold text-gray-800">
                    {bufferInfo.bufferStart.toFixed(1)}s
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Buffer End</div>
                  <div className="text-lg font-bold text-gray-800">
                    {bufferInfo.bufferEnd.toFixed(1)}s
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Buffer Length</div>
                  <div className="text-lg font-bold text-gray-800">
                    {bufferInfo.bufferLength.toFixed(1)}s
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Raw Metrics */}
          {detailedMetrics && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Raw Metrics</h4>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(detailedMetrics, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdaptiveStreamingDashboard;
