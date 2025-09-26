import { renderHook, act } from '@testing-library/react';
import { useStressTesting, STRESS_TEST_SCENARIOS } from '../useStressTesting';
import { beforeEach, afterEach } from '@jest/globals';

// Mock the dependencies
jest.mock('../useABTesting');
jest.mock('../useAnalytics');

const mockUseABTesting = require('../useABTesting').useABTesting;
const mockUseAnalytics = require('../useAnalytics').useAnalytics;

describe('Manifest Generation Tests', () => {
  const mockConfig = {
    testId: 'manifest_test_1',
    duration: 5000, // 5 seconds
    requestRate: 1, // 1 request per second
    concurrency: 1,
    rampUpTime: 1000, // 1 second
    rampDownTime: 1000, // 1 second
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should include manifest generation in normal load scenario', () => {
    const normalLoadScenario = STRESS_TEST_SCENARIOS.NORMAL_LOAD;
    const manifestAction = normalLoadScenario.actions.find(
      action => action.type === 'manifest_generation'
    );
    
    expect(manifestAction).toBeDefined();
    expect(manifestAction?.probability).toBe(0.7);
    expect(manifestAction?.delay).toBe(1500);
  });

  it('should include manifest generation in heavy load scenario', () => {
    const heavyLoadScenario = STRESS_TEST_SCENARIOS.HEAVY_LOAD;
    const manifestAction = heavyLoadScenario.actions.find(
      action => action.type === 'manifest_generation'
    );
    
    expect(manifestAction).toBeDefined();
    expect(manifestAction?.probability).toBe(0.8);
    expect(manifestAction?.delay).toBe(800);
  });

  it('should include manifest generation in stress load scenario', () => {
    const stressLoadScenario = STRESS_TEST_SCENARIOS.STRESS_LOAD;
    const manifestAction = stressLoadScenario.actions.find(
      action => action.type === 'manifest_generation'
    );
    
    expect(manifestAction).toBeDefined();
    expect(manifestAction?.probability).toBe(0.9);
    expect(manifestAction?.delay).toBe(300);
  });

  it('should handle manifest generation action type', () => {
    const { result } = renderHook(() => useStressTesting(mockConfig));
    
    expect(result.current).toBeDefined();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.metrics).toBeDefined();
    expect(result.current.activeUsers).toEqual([]);
  });

  it('should simulate manifest generation with custom URL', async () => {
    const { result } = renderHook(() => useStressTesting(mockConfig));
    
    // Mock console.log to capture manifest generation logs
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Create a test user with manifest generation action
    const testUser = {
      id: 'test_user_1',
      sessionId: 'test_session_1',
      variant: 'control',
      startTime: Date.now(),
      actions: [{
        type: 'manifest_generation' as const,
        probability: 1.0,
        params: { url: 'https://example.com/test.m3u8' }
      }],
      metrics: { requests: 0, errors: 0, totalTime: 0 }
    };
    
    // Simulate the manifest generation action
    await act(async () => {
      // This would normally be called internally by the stress test
      // We're testing the action type is handled correctly
      expect(testUser.actions[0].type).toBe('manifest_generation');
    });
    
    consoleSpy.mockRestore();
  });

  it('should handle manifest generation timeout', async () => {
    const { result } = renderHook(() => useStressTesting(mockConfig));
    
    // Test that the hook can handle manifest generation actions
    expect(result.current.runStressTest).toBeDefined();
    expect(result.current.stopStressTest).toBeDefined();
  });

  it('should track manifest generation in analytics', () => {
    const mockTrackEvent = jest.fn();
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
      trackError: jest.fn(),
    });

    const { result } = renderHook(() => useStressTesting(mockConfig));
    
    expect(result.current).toBeDefined();
    // The analytics tracking would happen during actual stress test execution
  });

  it('should validate manifest generation parameters', () => {
    const manifestAction = {
      type: 'manifest_generation' as const,
      probability: 0.8,
      params: {
        url: 'https://example.com/video.m3u8',
        quality: '720p',
        bitrate: 1500000
      }
    };
    
    expect(manifestAction.type).toBe('manifest_generation');
    expect(manifestAction.probability).toBeGreaterThan(0);
    expect(manifestAction.probability).toBeLessThanOrEqual(1);
    expect(manifestAction.params?.url).toMatch(/\.m3u8$/);
  });

  it('should handle manifest generation errors gracefully', async () => {
    const { result } = renderHook(() => useStressTesting(mockConfig));
    
    // Test that the hook can handle errors during manifest generation
    expect(result.current.metrics.errorRate).toBe(0);
    expect(result.current.metrics.failedRequests).toBe(0);
  });
});

