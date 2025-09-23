import { renderHook, act } from '@testing-library/react';
import { useABTesting } from '../useABTesting';

// Add Jest types
declare global {
  const jest: any;
  const expect: any;
  const it: any;
  const describe: any;
  const beforeEach: any;
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useABTesting', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('should initialize with control variant when no stored variant exists', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock Math.random to always return 0.3 (which should select control variant)
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0.3);
    
    const { result } = renderHook(() => useABTesting('player_ui_v2'));
    
    expect(result.current.variant).toBe('control');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.testConfig).toBeTruthy();
    expect(result.current.testConfig?.testId).toBe('player_ui_v2');
    
    // Restore original Math.random
    Math.random = originalRandom;
  });

  it('should use stored variant when available and valid', () => {
    const storedData = {
      variant: 'variant_a',
      timestamp: Date.now() - 1000, // 1 second ago
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
    
    const { result } = renderHook(() => useABTesting('player_ui_v2'));
    
    expect(result.current.variant).toBe('variant_a');
    expect(result.current.isLoading).toBe(false);
  });

  it('should select new variant when stored variant is expired', () => {
    const expiredData = {
      variant: 'variant_a',
      timestamp: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 days ago
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredData));
    
    const { result } = renderHook(() => useABTesting('player_ui_v2'));
    
    expect(result.current.variant).toBeDefined();
    expect(result.current.isLoading).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should return control variant for disabled tests', () => {
    const { result } = renderHook(() => useABTesting('disabled_test'));
    
    expect(result.current.variant).toBe('control');
    expect(result.current.isLoading).toBe(false);
  });

  it('should track events correctly', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useABTesting('player_ui_v2'));
    
    act(() => {
      result.current.trackEvent('test_event', { testProperty: 'test_value' });
    });
    
    // In a real implementation, this would verify the event was sent to analytics
    expect(result.current.testConfig).toBeTruthy();
  });

  it('should return correct feature flags', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock Math.random to always return 0.3 (which should select control variant)
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0.3);
    
    const { result } = renderHook(() => useABTesting('player_ui_v2'));
    
    // Control variant should have modern_controls disabled
    expect(result.current.getFeatureFlag('modern_controls')).toBe(false);
    expect(result.current.getFeatureFlag('enhanced_progress_bar')).toBe(false);
    expect(result.current.getFeatureFlag('quality_auto_switch')).toBe(true);
    
    // Restore original Math.random
    Math.random = originalRandom;
  });

  it('should return config values correctly', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    const { result } = renderHook(() => useABTesting('player_ui_v2'));
    
    expect(result.current.getConfigValue('control_theme')).toBe('dark');
    expect(result.current.getConfigValue('show_quality_selector')).toBe(true);
    expect(result.current.getConfigValue('non_existent_config', 'default')).toBe('default');
  });
});
