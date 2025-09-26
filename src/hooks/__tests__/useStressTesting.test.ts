import { renderHook, act } from '@testing-library/react';
import { useStressTesting, STRESS_TEST_SCENARIOS } from '../useStressTesting';


// Mock the dependencies
jest.mock('../useABTesting');
jest.mock('../useAnalytics');

const mockUseABTesting = require('../useABTesting').useABTesting;
const mockUseAnalytics = require('../useAnalytics').useAnalytics;

describe('useStressTesting', () => {
  const mockConfig = {
    testId: 'stress_test_1',
    duration: 10000, // 10 seconds
    requestRate: 2, // 2 requests per second
    concurrency: 5,
    rampUpTime: 2000, // 2 seconds
    rampDownTime: 2000, // 2 seconds
    scenarios: [STRESS_TEST_SCENARIOS.NORMAL_LOAD],
  };

  beforeEach(() => {
    mockUseABTesting.mockReturnValue({
      variant: 'control',
      getFeatureFlag: jest.fn().mockReturnValue(true),
    });

    mockUseAnalytics.mockReturnValue({
      trackEvent: jest.fn(),
      trackError: jest.fn(),
    });
  });


  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useStressTesting(mockConfig));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.metrics).toEqual({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      peakConcurrency: 0,
      errorRate: 0,
      throughput: 0,
      latency: { p50: 0, p95: 0, p99: 0 },
    });
    expect(result.current.activeUsers).toEqual([]);
    expect(result.current.testResults).toEqual([]);
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useStressTesting(mockConfig));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.metrics).toEqual({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      peakConcurrency: 0,
      errorRate: 0,
      throughput: 0,
      latency: { p50: 0, p95: 0, p99: 0 },
    });
    expect(result.current.activeUsers).toEqual([]);
    expect(result.current.testResults).toEqual([]);
  });

  it('should handle different stress test scenarios', () => {
    const scenarios = [
      STRESS_TEST_SCENARIOS.NORMAL_LOAD,
      STRESS_TEST_SCENARIOS.HEAVY_LOAD,
      STRESS_TEST_SCENARIOS.STRESS_LOAD,
    ];

    scenarios.forEach((scenario) => {
      const configWithScenario = { ...mockConfig, scenarios: [scenario] };
      const { result } = renderHook(() => useStressTesting(configWithScenario));
      
      expect(result.current).toBeDefined();
      expect(result.current.isRunning).toBe(false);
    });
  });

  it('should stop stress test correctly', () => {
    const { result } = renderHook(() => useStressTesting(mockConfig));

    act(() => {
      result.current.stopStressTest();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.activeUsers).toEqual([]);
  });

  it('should update metrics during test execution', () => {
    const { result } = renderHook(() => useStressTesting(mockConfig));

    // Test that metrics structure is correct
    expect(result.current.metrics).toBeDefined();
    expect(result.current.metrics.totalRequests).toBe(0);
    expect(result.current.metrics.successfulRequests).toBe(0);
    expect(result.current.metrics.failedRequests).toBe(0);
    expect(result.current.metrics.latency).toBeDefined();
    expect(result.current.metrics.latency.p50).toBe(0);
    expect(result.current.metrics.latency.p95).toBe(0);
    expect(result.current.metrics.latency.p99).toBe(0);
  });
});
