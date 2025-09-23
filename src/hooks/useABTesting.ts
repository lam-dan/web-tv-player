'use client';

import { useState, useEffect, useCallback } from 'react';
import { ABTestConfig } from '@/types/player';

interface ABTest {
  testId: string;
  variants: {
    [key: string]: {
      weight: number;
      features: Record<string, boolean>;
      config: Record<string, unknown>;
    };
  };
  enabled: boolean;
}

const AB_TESTS: Record<string, ABTest> = {
  'player_ui_v2': {
    testId: 'player_ui_v2',
    variants: {
      'control': {
        weight: 50,
        features: {
          'modern_controls': false,
          'enhanced_progress_bar': false,
          'quality_auto_switch': true,
        },
        config: {
          'control_theme': 'dark',
          'show_quality_selector': true,
        }
      },
      'variant_a': {
        weight: 50,
        features: {
          'modern_controls': true,
          'enhanced_progress_bar': true,
          'quality_auto_switch': true,
        },
        config: {
          'control_theme': 'dark',
          'show_quality_selector': true,
          'enhanced_animations': true,
        }
      }
    },
    enabled: true,
  },
  'adaptive_bitrate_v2': {
    testId: 'adaptive_bitrate_v2',
    variants: {
      'control': {
        weight: 70,
        features: {
          'aggressive_abr': false,
          'buffer_optimization': false,
        },
        config: {
          'max_bitrate': 5000000,
          'min_bitrate': 500000,
          'buffer_size': 30,
        }
      },
      'variant_b': {
        weight: 30,
        features: {
          'aggressive_abr': true,
          'buffer_optimization': true,
        },
        config: {
          'max_bitrate': 8000000,
          'min_bitrate': 1000000,
          'buffer_size': 45,
        }
      }
    },
    enabled: true,
  }
};

export const useABTesting = (testId: string) => {
  const [variant, setVariant] = useState<string>('control');
  const [isLoading, setIsLoading] = useState(true);
  const [testConfig, setTestConfig] = useState<ABTestConfig | null>(null);

  const getStoredVariant = useCallback((testId: string): string | null => {
    try {
      const stored = localStorage.getItem(`ab_test_${testId}`);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if the stored variant is still valid (not expired)
        if (data.timestamp && Date.now() - data.timestamp < 30 * 24 * 60 * 60 * 1000) { // 30 days
          return data.variant;
        }
      }
    } catch (error) {
      console.warn('Error reading stored AB test variant:', error);
    }
    return null;
  }, []);

  const storeVariant = useCallback((testId: string, variant: string) => {
    try {
      localStorage.setItem(`ab_test_${testId}`, JSON.stringify({
        variant,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Error storing AB test variant:', error);
    }
  }, []);

  const selectVariant = useCallback((test: ABTest): string => {
    const variants = Object.keys(test.variants);
    const weights = variants.map(v => test.variants[v].weight);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    
    for (let i = 0; i < variants.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return variants[i];
      }
    }
    
    return variants[0]; // Fallback
  }, []);

  const initializeTest = useCallback(() => {
    const test = AB_TESTS[testId];
    if (!test || !test.enabled) {
      setVariant('control');
      setIsLoading(false);
      return;
    }

    // Check if user already has a stored variant
    const storedVariant = getStoredVariant(testId);
    if (storedVariant && test.variants[storedVariant]) {
      setVariant(storedVariant);
      setTestConfig({
        testId,
        variant: storedVariant,
        enabled: true,
        features: test.variants[storedVariant].features,
      });
      setIsLoading(false);
      return;
    }

    // Select new variant
    const selectedVariant = selectVariant(test);
    setVariant(selectedVariant);
    storeVariant(testId, selectedVariant);
    
    setTestConfig({
      testId,
      variant: selectedVariant,
      enabled: true,
      features: test.variants[selectedVariant].features,
    });
    setIsLoading(false);
  }, [testId, getStoredVariant, selectVariant, storeVariant]);

  useEffect(() => {
    initializeTest();
  }, [initializeTest]);

  const trackEvent = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (!testConfig) return;

    const event = {
      testId: testConfig.testId,
      variant: testConfig.variant,
      eventName,
      timestamp: Date.now(),
      properties: properties || {},
    };

    // In a real implementation, this would send to analytics service
    console.log('AB Test Event:', event);
    
    // Store locally for demo purposes
    try {
      const events = JSON.parse(localStorage.getItem('ab_test_events') || '[]');
      events.push(event);
      localStorage.setItem('ab_test_events', JSON.stringify(events));
    } catch (error) {
      console.warn('Error storing AB test event:', error);
    }
  }, [testConfig]);

  const getFeatureFlag = useCallback((featureName: string): boolean => {
    return testConfig?.features[featureName] || false;
  }, [testConfig]);

  const getConfigValue = useCallback((configKey: string, defaultValue?: unknown) => {
    const test = AB_TESTS[testId];
    if (!test || !test.variants[variant]) return defaultValue;
    return test.variants[variant].config[configKey] || defaultValue;
  }, [testId, variant]);

  return {
    variant,
    isLoading,
    testConfig,
    trackEvent,
    getFeatureFlag,
    getConfigValue,
  };
};
