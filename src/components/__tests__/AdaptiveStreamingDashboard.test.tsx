import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdaptiveStreamingDashboard from '../AdaptiveStreamingDashboard';

// Mock the useAdaptiveStreaming hook
jest.mock('../../hooks/useAdaptiveStreaming', () => ({
  useAdaptiveStreaming: jest.fn()
}));

const mockUseAdaptiveStreaming = require('../../hooks/useAdaptiveStreaming').useAdaptiveStreaming;

describe('AdaptiveStreamingDashboard', () => {
  const mockVideoElement = document.createElement('video');
  const mockOnQualityChange = jest.fn();
  const mockOnRebuffering = jest.fn();
  const mockOnNetworkChange = jest.fn();

  const defaultProps = {
    videoElement: mockVideoElement,
    onQualityChange: mockOnQualityChange,
    onRebuffering: mockOnRebuffering,
    onNetworkChange: mockOnNetworkChange
  };

  const mockAdaptiveStreamingState = {
    isInitialized: true,
    isPlaying: true,
    isBuffering: false,
    currentQuality: '720p',
    availableQualities: [
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
        id: '720p',
        bitrate: 2500000,
        resolution: { width: 1280, height: 720 },
        codec: 'avc1.4D401F',
        mimeType: 'video/mp4',
        url: '/streams/720p/',
        bandwidth: 2500000
      }
    ],
    metrics: {
      currentQuality: '720p',
      qualitySwitches: 3,
      rebufferingEvents: 1,
      averageLatency: 150,
      bufferHealth: 85,
      networkStability: 90,
      userExperience: 'good'
    },
    networkMetrics: {
      bandwidth: 5000000,
      latency: 50,
      packetLoss: 0.1,
      jitter: 5,
      throughput: 4800000,
      connectionType: 'wifi'
    },
    bufferHealth: 85,
    userExperience: 'good',
    error: null,
    loadSegment: jest.fn(),
    switchQuality: jest.fn(),
    getBufferInfo: jest.fn().mockReturnValue({
      currentTime: 10.5,
      bufferStart: 8.0,
      bufferEnd: 25.0,
      bufferAhead: 14.5,
      bufferLength: 17.0,
      bufferHealth: 85
    }),
    getDetailedMetrics: jest.fn().mockReturnValue({
      adaptive: {
        currentQuality: '720p',
        qualitySwitches: 3,
        rebufferingEvents: 1,
        averageLatency: 150,
        bufferHealth: 85,
        networkStability: 90,
        userExperience: 'good'
      },
      network: {
        bandwidth: 5000000,
        latency: 50,
        packetLoss: 0.1,
        jitter: 5,
        throughput: 4800000,
        connectionType: 'wifi'
      },
      buffer: {
        currentTime: 10.5,
        bufferStart: 8.0,
        bufferEnd: 25.0,
        bufferAhead: 14.5,
        bufferLength: 17.0,
        bufferHealth: 85
      },
      timestamp: Date.now()
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdaptiveStreaming.mockReturnValue(mockAdaptiveStreamingState);
  });

  describe('rendering', () => {
    it('should render the dashboard with all main sections', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('Adaptive Streaming Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Current Quality')).toBeInTheDocument();
      expect(screen.getByText('Buffer Health')).toBeInTheDocument();
      expect(screen.getByText('Bandwidth')).toBeInTheDocument();
      expect(screen.getByText('Experience')).toBeInTheDocument();
    });

    it('should display status indicators correctly', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('Initialized')).toBeInTheDocument();
      expect(screen.getByText('Playing')).toBeInTheDocument();
    });

    it('should display current quality and metrics', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('720p')).toBeInTheDocument();
      expect(screen.getAllByText('2.5 Mbps')).toHaveLength(2); // Appears in current quality and quality selection
      expect(screen.getByText('85.0%')).toBeInTheDocument();
      expect(screen.getByText('5.0 Mbps')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should display error message when there is an error', () => {
      const errorState = {
        ...mockAdaptiveStreamingState,
        error: 'Test error message'
      };
      mockUseAdaptiveStreaming.mockReturnValue(errorState);

      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('Error: Test error message')).toBeInTheDocument();
    });
  });

  describe('quality selection', () => {
    it('should render quality selection buttons', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('Quality Selection')).toBeInTheDocument();
      expect(screen.getByText('AUTO')).toBeInTheDocument();
      expect(screen.getByText('240P')).toBeInTheDocument();
      expect(screen.getByText('720P')).toBeInTheDocument();
    });

    it('should highlight current quality', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const currentQualityButton = screen.getByText('720P').closest('button');
      expect(currentQualityButton).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-800');
    });

    it('should call switchQuality when quality button is clicked', async () => {
      const mockSwitchQuality = jest.fn();
      const stateWithSwitch = {
        ...mockAdaptiveStreamingState,
        switchQuality: mockSwitchQuality
      };
      mockUseAdaptiveStreaming.mockReturnValue(stateWithSwitch);

      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const qualityButton = screen.getByText('240P');
      fireEvent.click(qualityButton);

      await waitFor(() => {
        expect(mockSwitchQuality).toHaveBeenCalledWith('240p');
      });
    });
  });

  describe('segment loading', () => {
    it('should render segment loading section', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('Segment Loading')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter segment URL')).toBeInTheDocument();
      expect(screen.getByText('Load Segment')).toBeInTheDocument();
    });

    it('should handle segment URL input', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter segment URL');
      fireEvent.change(input, { target: { value: '/test-segment.mp4' } });

      expect(input).toHaveValue('/test-segment.mp4');
    });

    it('should call loadSegment when load button is clicked', async () => {
      const mockLoadSegment = jest.fn();
      const stateWithLoad = {
        ...mockAdaptiveStreamingState,
        loadSegment: mockLoadSegment
      };
      mockUseAdaptiveStreaming.mockReturnValue(stateWithLoad);

      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter segment URL');
      fireEvent.change(input, { target: { value: '/test-segment.mp4' } });

      const loadButton = screen.getByText('Load Segment');
      fireEvent.click(loadButton);

      await waitFor(() => {
        expect(mockLoadSegment).toHaveBeenCalledWith('/test-segment.mp4');
      });
    });

    it('should disable load button when no segment URL is provided', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const loadButton = screen.getByText('Load Segment');
      expect(loadButton).toBeDisabled();
    });
  });

  describe('advanced metrics', () => {
    it('should show advanced metrics toggle', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('Show Advanced Metrics')).toBeInTheDocument();
    });

    it('should toggle advanced metrics visibility', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const toggleButton = screen.getByText('Show Advanced Metrics');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Hide Advanced Metrics')).toBeInTheDocument();
      expect(screen.getByText('Network Metrics')).toBeInTheDocument();
      expect(screen.getByText('Adaptive Metrics')).toBeInTheDocument();
    });

    it('should display network metrics when advanced is shown', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const toggleButton = screen.getByText('Show Advanced Metrics');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Latency')).toBeInTheDocument();
      expect(screen.getByText('Throughput')).toBeInTheDocument();
      expect(screen.getByText('Packet Loss')).toBeInTheDocument();
      expect(screen.getByText('Jitter')).toBeInTheDocument();
    });

    it('should display adaptive metrics when advanced is shown', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const toggleButton = screen.getByText('Show Advanced Metrics');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Quality Switches')).toBeInTheDocument();
      expect(screen.getByText('Rebuffering Events')).toBeInTheDocument();
      expect(screen.getByText('Avg Latency')).toBeInTheDocument();
      expect(screen.getByText('Network Stability')).toBeInTheDocument();
    });

    it('should display buffer information when available', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const toggleButton = screen.getByText('Show Advanced Metrics');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Buffer Information')).toBeInTheDocument();
      expect(screen.getByText('Current Time')).toBeInTheDocument();
      expect(screen.getByText('Buffer Start')).toBeInTheDocument();
      expect(screen.getByText('Buffer End')).toBeInTheDocument();
      expect(screen.getByText('Buffer Length')).toBeInTheDocument();
    });

    it('should display raw metrics when advanced is shown', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const toggleButton = screen.getByText('Show Advanced Metrics');
      fireEvent.click(toggleButton);

      expect(screen.getByText('Raw Metrics')).toBeInTheDocument();
      expect(screen.getByText(/currentQuality/)).toBeInTheDocument();
    });
  });

  describe('buffering state', () => {
    it('should display buffering indicator when buffering', () => {
      const bufferingState = {
        ...mockAdaptiveStreamingState,
        isBuffering: true
      };
      mockUseAdaptiveStreaming.mockReturnValue(bufferingState);

      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('Buffering')).toBeInTheDocument();
    });

    it('should not display buffering indicator when not buffering', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.queryByText('Buffering')).not.toBeInTheDocument();
    });
  });

  describe('uninitialized state', () => {
    it('should display not initialized state', () => {
      const uninitializedState = {
        ...mockAdaptiveStreamingState,
        isInitialized: false
      };
      mockUseAdaptiveStreaming.mockReturnValue(uninitializedState);

      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getByText('Not Initialized')).toBeInTheDocument();
    });

    it('should disable load segment button when not initialized', () => {
      const uninitializedState = {
        ...mockAdaptiveStreamingState,
        isInitialized: false
      };
      mockUseAdaptiveStreaming.mockReturnValue(uninitializedState);

      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const input = screen.getByPlaceholderText('Enter segment URL');
      fireEvent.change(input, { target: { value: '/test-segment.mp4' } });

      const loadButton = screen.getByText('Load Segment');
      expect(loadButton).toBeDisabled();
    });
  });

  describe('formatting', () => {
    it('should format bitrate correctly', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      expect(screen.getAllByText('2.5 Mbps')).toHaveLength(2); // Appears in current quality and quality selection
      expect(screen.getByText('5.0 Mbps')).toBeInTheDocument();
    });

    it('should format latency correctly', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const toggleButton = screen.getByText('Show Advanced Metrics');
      fireEvent.click(toggleButton);

      expect(screen.getByText('50ms')).toBeInTheDocument();
    });

    it('should format buffer health with correct color classes', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const bufferHealth = screen.getByText('85.0%');
      expect(bufferHealth).toHaveClass('text-green-600');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const dashboard = screen.getByRole('main', { hidden: true });
      expect(dashboard).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(<AdaptiveStreamingDashboard {...defaultProps} />);

      const qualityButtons = screen.getAllByRole('button');
      expect(qualityButtons.length).toBeGreaterThan(0);
    });
  });
});
