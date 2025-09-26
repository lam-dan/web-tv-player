import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StressTestDashboard } from '../StressTestDashboard';
import { beforeEach, afterEach } from '@jest/globals';

// Mock the stress testing hook
jest.mock('../../hooks/useStressTesting', () => ({
  useStressTesting: jest.fn(),
  STRESS_TEST_SCENARIOS: {
    NORMAL_LOAD: {
      name: 'Normal Load',
      weight: 70,
      actions: [],
      userBehavior: { sessionDuration: 300000, interactionRate: 0.1, errorRate: 0.01 },
    },
    HEAVY_LOAD: {
      name: 'Heavy Load',
      weight: 20,
      actions: [],
      userBehavior: { sessionDuration: 600000, interactionRate: 0.3, errorRate: 0.05 },
    },
    STRESS_LOAD: {
      name: 'Stress Load',
      weight: 10,
      actions: [],
      userBehavior: { sessionDuration: 900000, interactionRate: 0.5, errorRate: 0.1 },
    },
  },
}));

const mockUseStressTesting = require('../../hooks/useStressTesting').useStressTesting;

describe('StressTestDashboard', () => {
  const mockStressTestHook = {
    isRunning: false,
    metrics: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      peakConcurrency: 0,
      errorRate: 0,
      throughput: 0,
      latency: { p50: 0, p95: 0, p99: 0 },
    },
    activeUsers: [],
    testResults: [],
    runStressTest: jest.fn(),
    stopStressTest: jest.fn(),
  };

  beforeEach(() => {
    mockUseStressTesting.mockReturnValue(mockStressTestHook);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders stress test dashboard', () => {
    render(<StressTestDashboard />);
    
    expect(screen.getByText('Stress Testing Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Test Configuration')).toBeInTheDocument();
    expect(screen.getByText('Real-time Metrics')).toBeInTheDocument();
  });

  it('shows configuration display', () => {
    render(<StressTestDashboard />);
    
    expect(screen.getByText('Duration:')).toBeInTheDocument();
    expect(screen.getByText('Request Rate:')).toBeInTheDocument();
    expect(screen.getByText('Concurrency:')).toBeInTheDocument();
    expect(screen.getByText('Ramp Up:')).toBeInTheDocument();
    expect(screen.getByText('Ramp Down:')).toBeInTheDocument();
    expect(screen.getByText('300.00s')).toBeInTheDocument();
    expect(screen.getByText('10/sec')).toBeInTheDocument();
    expect(screen.getByText('50 users')).toBeInTheDocument();
  });

  it('displays metrics when test is not running', () => {
    render(<StressTestDashboard />);
    
    expect(screen.getByText('Total Requests')).toBeInTheDocument();
    expect(screen.getByText('Successful')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('Throughput (req/s)')).toBeInTheDocument();
    expect(screen.getByText('Peak Concurrency')).toBeInTheDocument();
  });

  it('shows start button when test is not running', () => {
    render(<StressTestDashboard />);
    
    const startButton = screen.getByRole('button', { name: /start stress test/i });
    expect(startButton).toBeInTheDocument();
    expect(startButton).not.toBeDisabled();
  });

  it('shows stop button when test is running', () => {
    mockUseStressTesting.mockReturnValue({
      ...mockStressTestHook,
      isRunning: true,
    });

    render(<StressTestDashboard />);
    
    const stopButton = screen.getByRole('button', { name: /stop test/i });
    expect(stopButton).toBeInTheDocument();
    expect(stopButton).not.toBeDisabled();
  });

  it('calls runStressTest when start button is clicked', () => {
    render(<StressTestDashboard />);
    
    const startButton = screen.getByRole('button', { name: /start stress test/i });
    fireEvent.click(startButton);
    
    expect(mockStressTestHook.runStressTest).toHaveBeenCalled();
  });

  it('calls stopStressTest when stop button is clicked', () => {
    mockUseStressTesting.mockReturnValue({
      ...mockStressTestHook,
      isRunning: true,
    });

    render(<StressTestDashboard />);
    
    const stopButton = screen.getByRole('button', { name: /stop test/i });
    fireEvent.click(stopButton);
    
    expect(mockStressTestHook.stopStressTest).toHaveBeenCalled();
  });

  it('displays configuration values correctly', () => {
    render(<StressTestDashboard />);
    
    // The component displays configuration values as read-only text
    expect(screen.getByText('300.00s')).toBeInTheDocument();
    expect(screen.getByText('10/sec')).toBeInTheDocument();
    expect(screen.getByText('50 users')).toBeInTheDocument();
    expect(screen.getAllByText('30.00s')).toHaveLength(2); // Ramp Up and Ramp Down
  });

  it('displays active users when test is running', () => {
    const activeUsers = [
      { id: 'user1', sessionId: 'session1', variant: 'control', startTime: Date.now(), actions: [], metrics: { requests: 5, errors: 0, totalTime: 1000 } },
      { id: 'user2', sessionId: 'session2', variant: 'variant_a', startTime: Date.now(), actions: [], metrics: { requests: 3, errors: 1, totalTime: 800 } },
    ];

    mockUseStressTesting.mockReturnValue({
      ...mockStressTestHook,
      isRunning: true,
      activeUsers,
    });

    render(<StressTestDashboard />);
    
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
  });

  it('displays updated metrics during test execution', () => {
    const updatedMetrics = {
      totalRequests: 150,
      successfulRequests: 140,
      failedRequests: 10,
      averageResponseTime: 250,
      peakConcurrency: 8,
      errorRate: 6.67,
      throughput: 15.5,
      latency: { p50: 200, p95: 500, p99: 800 },
    };

    mockUseStressTesting.mockReturnValue({
      ...mockStressTestHook,
      metrics: updatedMetrics,
    });

    render(<StressTestDashboard />);
    
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('6.67%')).toBeInTheDocument();
    expect(screen.getByText('15.50')).toBeInTheDocument();
  });

  it('shows latency metrics', () => {
    const metricsWithLatency = {
      ...mockStressTestHook.metrics,
      latency: { p50: 200, p95: 500, p99: 800 },
    };

    mockUseStressTesting.mockReturnValue({
      ...mockStressTestHook,
      metrics: metricsWithLatency,
    });

    render(<StressTestDashboard />);
    
    expect(screen.getByText('0.20s')).toBeInTheDocument();
    expect(screen.getByText('0.50s')).toBeInTheDocument();
    expect(screen.getByText('0.80s')).toBeInTheDocument();
    expect(screen.getByText('P50')).toBeInTheDocument();
    expect(screen.getByText('P95')).toBeInTheDocument();
    expect(screen.getByText('P99')).toBeInTheDocument();
  });

  it('displays active users when test is running', () => {
    const activeUsers = [
      { id: 'user1', sessionId: 'session1', variant: 'control', startTime: Date.now(), actions: [], metrics: { requests: 5, errors: 0, totalTime: 1000 } },
      { id: 'user2', sessionId: 'session2', variant: 'variant_a', startTime: Date.now(), actions: [], metrics: { requests: 3, errors: 1, totalTime: 800 } },
    ];

    mockUseStressTesting.mockReturnValue({
      ...mockStressTestHook,
      isRunning: true,
      activeUsers,
    });

    render(<StressTestDashboard />);
    
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
  });

  it('displays test scenarios', () => {
    render(<StressTestDashboard />);
    
    expect(screen.getByText('Test Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Normal Load:')).toBeInTheDocument();
    expect(screen.getByText('Heavy Load:')).toBeInTheDocument();
    expect(screen.getByText('Stress Load:')).toBeInTheDocument();
  });

  it('shows progress indicator when test is running', () => {
    mockUseStressTesting.mockReturnValue({
      ...mockStressTestHook,
      isRunning: true,
    });

    render(<StressTestDashboard />);
    
    expect(screen.getByText('Test Running...')).toBeInTheDocument();
  });

  it('disables start button when test is running', () => {
    mockUseStressTesting.mockReturnValue({
      ...mockStressTestHook,
      isRunning: true,
    });

    render(<StressTestDashboard />);
    
    const startButton = screen.queryByRole('button', { name: /start stress test/i });
    expect(startButton).not.toBeInTheDocument();
  });

  it('shows configuration details', () => {
    render(<StressTestDashboard />);
    
    expect(screen.getByText('Test Configuration')).toBeInTheDocument();
    expect(screen.getByText('Duration:')).toBeInTheDocument();
    expect(screen.getByText('Request Rate:')).toBeInTheDocument();
    expect(screen.getByText('Concurrency:')).toBeInTheDocument();
  });

  it('displays real-time updates during test', async () => {
    let metrics = mockStressTestHook.metrics;
    
    mockUseStressTesting.mockImplementation(() => ({
      ...mockStressTestHook,
      metrics,
    }));

    const { rerender } = render(<StressTestDashboard />);
    
    // Simulate metrics update
    metrics = {
      ...metrics,
      totalRequests: 50,
      successfulRequests: 45,
      failedRequests: 5,
    };

    rerender(<StressTestDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
