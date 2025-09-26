'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useABTesting } from './useABTesting';
import { useAnalytics } from './useAnalytics';

interface StressTestConfig {
  testId: string;
  duration: number; // in milliseconds
  requestRate: number; // requests per second
  concurrency: number; // concurrent users
  rampUpTime: number; // gradual ramp-up in milliseconds
  rampDownTime: number; // gradual ramp-down in milliseconds
  scenarios: StressTestScenario[];
}

interface StressTestScenario {
  name: string;
  weight: number; // percentage of traffic
  actions: StressTestAction[];
  userBehavior: {
    sessionDuration: number;
    interactionRate: number;
    errorRate: number;
  };
}

interface StressTestAction {
  type: 'video_load' | 'quality_change' | 'seek' | 'play_pause' | 'volume_change' | 'error_simulation' | 'manifest_generation' | 'mse_buffer_management' | 'eme_license_request' | 'eme_key_status_change' | 'mse_segment_append' | 'eme_session_creation';
  probability: number; // 0-1
  params?: Record<string, unknown>;
  delay?: number; // delay before action in ms
}

interface StressTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  peakConcurrency: number;
  errorRate: number;
  throughput: number; // requests per second
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
}

interface StressTestUser {
  id: string;
  sessionId: string;
  variant: string;
  startTime: number;
  actions: StressTestAction[];
  metrics: {
    requests: number;
    errors: number;
    totalTime: number;
  };
}

export const useStressTesting = (config: StressTestConfig) => {
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<StressTestMetrics>({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    peakConcurrency: 0,
    errorRate: 0,
    throughput: 0,
    latency: { p50: 0, p95: 0, p99: 0 },
  });
  
  const [activeUsers, setActiveUsers] = useState<StressTestUser[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const responseTimesRef = useRef<number[]>([]);
  
  const { variant, getFeatureFlag } = useABTesting(config.testId);
  const { trackEvent, trackError } = useAnalytics();

  // Generate random stress test users
  const generateUsers = useCallback((count: number): StressTestUser[] => {
    const users: StressTestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const userVariant = variant;
      const scenario = selectScenario(config.scenarios);
      
      users.push({
        id: `stress_user_${Date.now()}_${i}`,
        sessionId: `session_${Date.now()}_${i}`,
        variant: userVariant,
        startTime: Date.now(),
        actions: scenario.actions,
        metrics: {
          requests: 0,
          errors: 0,
          totalTime: 0,
        },
      });
    }
    
    return users;
  }, [config.scenarios, variant]);

  // Select scenario based on weights
  const selectScenario = useCallback((scenarios: StressTestScenario[]): StressTestScenario => {
    const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    
    for (const scenario of scenarios) {
      currentWeight += scenario.weight;
      if (random <= currentWeight) {
        return scenario;
      }
    }
    
    return scenarios[0];
  }, []);

  // Simulate user actions
  const simulateUserAction = useCallback(async (user: StressTestUser, action: StressTestAction) => {
    const startTime = performance.now();
    
    try {
      // Simulate the action based on type
      switch (action.type) {
        case 'video_load':
          await simulateVideoLoad(user, action.params);
          break;
        case 'quality_change':
          await simulateQualityChange(user, action.params);
          break;
        case 'seek':
          await simulateSeek(user, action.params);
          break;
        case 'play_pause':
          await simulatePlayPause(user, action.params);
          break;
        case 'volume_change':
          await simulateVolumeChange(user, action.params);
          break;
        case 'error_simulation':
          await simulateError(user, action.params);
          break;
        case 'manifest_generation':
          await simulateManifestGeneration(user, action.params);
          break;
        case 'mse_buffer_management':
          await simulateMSEBufferManagement(user, action.params);
          break;
        case 'eme_license_request':
          await simulateEMELicenseRequest(user, action.params);
          break;
        case 'eme_key_status_change':
          await simulateEMEKeyStatusChange(user, action.params);
          break;
        case 'mse_segment_append':
          await simulateMSESegmentAppend(user, action.params);
          break;
        case 'eme_session_creation':
          await simulateEMESessionCreation(user, action.params);
          break;
      }
      
      const responseTime = performance.now() - startTime;
      responseTimesRef.current.push(responseTime);
      
      // Update user metrics
      user.metrics.requests++;
      user.metrics.totalTime += responseTime;
      
      // Track analytics
      trackEvent('stress_test_action', user.sessionId, {
        eventType: action.type,
        currentTime: responseTime,
      });
      
    } catch (error) {
      user.metrics.errors++;
      trackError(user.sessionId, 'stress_test_error', error instanceof Error ? error.message : 'Unknown error', 0);
    }
  }, [trackEvent, trackError]);

  // Simulate video loading with real video element
  const simulateVideoLoad = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const videoElement = document.createElement('video');
    const testVideoUrl = params?.url as string || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video load timeout'));
      }, 10000); // 10 second timeout
      
      videoElement.onloadeddata = () => {
        clearTimeout(timeout);
        videoElement.remove();
        resolve();
      };
      
      videoElement.onerror = (error) => {
        clearTimeout(timeout);
        videoElement.remove();
        reject(new Error(`Video load failed: ${error}`));
      };
      
      // Simulate network delay before starting
      const networkDelay = Math.random() * 1000 + 200; // 200-1200ms
      setTimeout(() => {
        videoElement.src = testVideoUrl;
        videoElement.load();
      }, networkDelay);
    });
  }, []);

  // Simulate quality changes with real video element
  const simulateQualityChange = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const videoElement = document.createElement('video');
    const quality = params?.quality as string || '720p';
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Quality change timeout'));
      }, 5000);
      
      // Simulate quality change by changing video source
      const qualityUrls: Record<string, string> = {
        '360p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      };
      
      videoElement.oncanplay = () => {
        clearTimeout(timeout);
        videoElement.remove();
        resolve();
      };
      
      videoElement.onerror = () => {
        clearTimeout(timeout);
        videoElement.remove();
        reject(new Error('Quality change failed'));
      };
      
      const delay = Math.random() * 500 + 100; // 100-600ms
      setTimeout(() => {
        videoElement.src = qualityUrls[quality] || qualityUrls['720p'];
        videoElement.load();
      }, delay);
    });
  }, []);

  // Simulate seeking with real video element
  const simulateSeek = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const videoElement = document.createElement('video');
    const seekTime = params?.time as number || Math.random() * 100; // Random seek time
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Seek timeout'));
      }, 3000);
      
      videoElement.onseeked = () => {
        clearTimeout(timeout);
        videoElement.remove();
        resolve();
      };
      
      videoElement.onerror = () => {
        clearTimeout(timeout);
        videoElement.remove();
        reject(new Error('Seek failed'));
      };
      
      // Load a test video first
      videoElement.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      videoElement.load();
      
      videoElement.onloadeddata = () => {
        const delay = Math.random() * 200 + 50; // 50-250ms
        setTimeout(() => {
          videoElement.currentTime = seekTime;
        }, delay);
      };
    });
  }, []);

  // Simulate play/pause with real video element
  const simulatePlayPause = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const videoElement = document.createElement('video');
    const action = params?.action as string || (Math.random() > 0.5 ? 'play' : 'pause');
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Play/pause timeout'));
      }, 2000);
      
      const cleanup = () => {
        clearTimeout(timeout);
        videoElement.remove();
      };
      
      videoElement.onplay = () => {
        if (action === 'play') {
          cleanup();
          resolve();
        }
      };
      
      videoElement.onpause = () => {
        if (action === 'pause') {
          cleanup();
          resolve();
        }
      };
      
      videoElement.onerror = () => {
        cleanup();
        reject(new Error('Play/pause failed'));
      };
      
      // Load a test video first
      videoElement.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      videoElement.load();
      
      videoElement.onloadeddata = () => {
        const delay = Math.random() * 100 + 25; // 25-125ms
        setTimeout(() => {
          if (action === 'play') {
            videoElement.play().catch(() => {
              cleanup();
              reject(new Error('Play failed'));
            });
          } else {
            videoElement.pause();
            cleanup();
            resolve();
          }
        }, delay);
      };
    });
  }, []);

  // Simulate volume changes with real video element
  const simulateVolumeChange = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const videoElement = document.createElement('video');
    const volume = params?.volume as number || Math.random(); // Random volume 0-1
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Volume change timeout'));
      }, 1000);
      
      videoElement.onvolumechange = () => {
        clearTimeout(timeout);
        videoElement.remove();
        resolve();
      };
      
      videoElement.onerror = () => {
        clearTimeout(timeout);
        videoElement.remove();
        reject(new Error('Volume change failed'));
      };
      
      // Load a test video first
      videoElement.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      videoElement.load();
      
      videoElement.onloadeddata = () => {
        const delay = Math.random() * 50 + 10; // 10-60ms
        setTimeout(() => {
          videoElement.volume = volume;
        }, delay);
      };
    });
  }, []);

  // Simulate errors
  const simulateError = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));
    throw new Error('Simulated error for stress testing');
  }, []);

  // Simulate manifest generation with HLS.js
  const simulateManifestGeneration = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const manifestUrl = params?.url as string || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Manifest generation timeout'));
      }, 15000); // 15 second timeout
      
      // Simulate HLS manifest parsing
      const mockHLS = {
        loadSource: (url: string) => {
          console.log(`Simulating HLS manifest load for: ${url}`);
          
          // Simulate manifest parsing delay
          const parsingDelay = Math.random() * 2000 + 500; // 500-2500ms
          setTimeout(() => {
            // Simulate manifest parsed event
            const mockManifest = {
              levels: [
                { height: 360, bitrate: 500000, url: `${url}?quality=360p` },
                { height: 720, bitrate: 1500000, url: `${url}?quality=720p` },
                { height: 1080, bitrate: 3000000, url: `${url}?quality=1080p` }
              ],
              fragments: [],
              targetDuration: 10,
              mediaSequence: 0
            };
            
            console.log('Manifest parsed successfully:', mockManifest);
            clearTimeout(timeout);
            resolve();
          }, parsingDelay);
        },
        destroy: () => {
          console.log('HLS instance destroyed');
        }
      };
      
      // Simulate network delay before starting
      const networkDelay = Math.random() * 1000 + 200; // 200-1200ms
      setTimeout(() => {
        mockHLS.loadSource(manifestUrl);
      }, networkDelay);
    });
  }, []);

  // Simulate MSE buffer management
  const simulateMSEBufferManagement = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const videoElement = document.createElement('video');
    const bufferSize = params?.bufferSize as number || 10; // seconds
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MSE buffer management timeout'));
      }, 10000);
      
      // Simulate MSE buffer operations
      const mockMediaSource = {
        addSourceBuffer: (mimeType: string) => {
          console.log(`Adding source buffer for: ${mimeType}`);
          return {
            appendBuffer: (data: ArrayBuffer) => {
              console.log(`Appending buffer data: ${data.byteLength} bytes`);
              // Simulate buffer append delay
              const appendDelay = Math.random() * 500 + 100; // 100-600ms
              setTimeout(() => {
                console.log('Buffer appended successfully');
                clearTimeout(timeout);
                videoElement.remove();
                resolve();
              }, appendDelay);
            },
            remove: (start: number, end: number) => {
              console.log(`Removing buffer from ${start} to ${end}`);
            },
            buffered: {
              length: 1,
              start: (index: number) => 0,
              end: (index: number) => bufferSize
            }
          };
        },
        endOfStream: () => {
          console.log('Media source ended');
        }
      };
      
      // Simulate buffer management operations
      const operations = [
        () => mockMediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"'),
        () => mockMediaSource.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"')
      ];
      
      const operationDelay = Math.random() * 200 + 50; // 50-250ms
      setTimeout(() => {
        operations.forEach((operation, index) => {
          setTimeout(() => {
            const sourceBuffer = operation();
            // Simulate appending some data
            const mockData = new ArrayBuffer(1024 * 1024); // 1MB mock data
            sourceBuffer.appendBuffer(mockData);
          }, index * 100);
        });
      }, operationDelay);
    });
  }, []);

  // Simulate EME license request
  const simulateEMELicenseRequest = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const keySystem = params?.keySystem as string || 'com.widevine.alpha';
    const initData = params?.initData as ArrayBuffer || new ArrayBuffer(16);
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('EME license request timeout'));
      }, 15000);
      
      // Simulate EME license request
      const mockMediaKeys = {
        createSession: (sessionType: MediaKeySessionType) => {
          console.log(`Creating EME session: ${sessionType}`);
          return {
            generateRequest: (initDataType: string, initData: ArrayBuffer) => {
              console.log(`Generating license request for: ${initDataType}`);
              
              // Simulate license server request
              const licenseDelay = Math.random() * 2000 + 500; // 500-2500ms
              setTimeout(() => {
                console.log('License request generated successfully');
                
                // Simulate license response
                const responseDelay = Math.random() * 1000 + 200; // 200-1200ms
                setTimeout(() => {
                  console.log('License response received');
                  clearTimeout(timeout);
                  resolve();
                }, responseDelay);
              }, licenseDelay);
            },
            load: () => {
              console.log('Loading existing session');
            },
            update: (license: ArrayBuffer) => {
              console.log(`Updating session with license: ${license.byteLength} bytes`);
            },
            close: () => {
              console.log('Closing EME session');
            }
          };
        }
      };
      
      const sessionDelay = Math.random() * 300 + 100; // 100-400ms
      setTimeout(() => {
        const session = mockMediaKeys.createSession('temporary');
        session.generateRequest('cenc', initData);
      }, sessionDelay);
    });
  }, []);

  // Simulate EME key status change
  const simulateEMEKeyStatusChange = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const keyId = params?.keyId as string || 'test-key-id';
    const status = params?.status as string || 'usable';
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('EME key status change timeout'));
      }, 5000);
      
      // Simulate key status change
      const mockKeyStatusMap = {
        size: 1,
        has: (keyId: string) => true,
        get: (keyId: string) => status,
        keys: () => [keyId],
        forEach: (callback: (value: string, key: string) => void) => {
          callback(status, keyId);
        }
      };
      
      console.log(`EME key status changed: ${keyId} -> ${status}`);
      
      const changeDelay = Math.random() * 200 + 50; // 50-250ms
      setTimeout(() => {
        console.log('Key status change processed');
        clearTimeout(timeout);
        resolve();
      }, changeDelay);
    });
  }, []);

  // Simulate MSE segment append
  const simulateMSESegmentAppend = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const segmentUrl = params?.segmentUrl as string || 'https://example.com/segment.mp4';
    const segmentSize = params?.segmentSize as number || 1024 * 1024; // 1MB
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MSE segment append timeout'));
      }, 10000);
      
      // Simulate segment download and append
      const mockSegment = {
        url: segmentUrl,
        size: segmentSize,
        duration: 10, // 10 seconds
        timestamp: Date.now()
      };
      
      console.log(`Downloading MSE segment: ${segmentUrl}`);
      
      // Simulate segment download
      const downloadDelay = Math.random() * 1000 + 200; // 200-1200ms
      setTimeout(() => {
        console.log(`Segment downloaded: ${mockSegment.size} bytes`);
        
        // Simulate buffer append
        const appendDelay = Math.random() * 300 + 100; // 100-400ms
        setTimeout(() => {
          console.log('Segment appended to buffer');
          clearTimeout(timeout);
          resolve();
        }, appendDelay);
      }, downloadDelay);
    });
  }, []);

  // Simulate EME session creation
  const simulateEMESessionCreation = useCallback(async (user: StressTestUser, params?: Record<string, unknown>) => {
    const keySystem = params?.keySystem as string || 'com.widevine.alpha';
    const sessionType = params?.sessionType as string || 'temporary';
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('EME session creation timeout'));
      }, 8000);
      
      // Simulate EME session creation
      console.log(`Creating EME session: ${keySystem} (${sessionType})`);
      
      const sessionDelay = Math.random() * 500 + 200; // 200-700ms
      setTimeout(() => {
        console.log('EME session created successfully');
        clearTimeout(timeout);
        resolve();
      }, sessionDelay);
    });
  }, []);

  // Run stress test
  const runStressTest = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    startTimeRef.current = Date.now();
    responseTimesRef.current = [];
    
    const totalUsers = config.concurrency;
    const rampUpInterval = config.rampUpTime / totalUsers;
    const rampDownInterval = config.rampDownTime / totalUsers;
    
    // Ramp up phase
    for (let i = 0; i < totalUsers; i++) {
      const users = generateUsers(1);
      setActiveUsers(prev => [...prev, ...users]);
      
      if (i < totalUsers - 1) {
        await new Promise(resolve => setTimeout(resolve, rampUpInterval));
      }
    }
    
    // Steady state phase
    const steadyStateDuration = config.duration - config.rampUpTime - config.rampDownTime;
    await new Promise(resolve => setTimeout(resolve, steadyStateDuration));
    
    // Ramp down phase
    for (let i = totalUsers; i > 0; i--) {
      setActiveUsers(prev => prev.slice(0, -1));
      await new Promise(resolve => setTimeout(resolve, rampDownInterval));
    }
    
    setIsRunning(false);
  }, [isRunning, config, generateUsers]);

  // Process active users
  useEffect(() => {
    if (!isRunning || activeUsers.length === 0) return;
    
    const processUsers = async () => {
      const promises = activeUsers.map(async (user) => {
        const scenario = selectScenario(config.scenarios);
        
        for (const action of scenario.actions) {
          if (Math.random() < action.probability) {
            if (action.delay) {
              await new Promise(resolve => setTimeout(resolve, action.delay));
            }
            await simulateUserAction(user, action);
          }
        }
      });
      
      await Promise.all(promises);
    };
    
    const interval = setInterval(processUsers, 1000 / config.requestRate);
    intervalRef.current = interval;
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, activeUsers, config, selectScenario, simulateUserAction]);

  // Update metrics
  useEffect(() => {
    if (!isRunning) return;
    
    const updateMetrics = () => {
      const totalRequests = activeUsers.reduce((sum, user) => sum + user.metrics.requests, 0);
      const successfulRequests = activeUsers.reduce((sum, user) => sum + user.metrics.requests - user.metrics.errors, 0);
      const failedRequests = activeUsers.reduce((sum, user) => sum + user.metrics.errors, 0);
      const averageResponseTime = responseTimesRef.current.length > 0 
        ? responseTimesRef.current.reduce((sum, time) => sum + time, 0) / responseTimesRef.current.length 
        : 0;
      
      const sortedTimes = [...responseTimesRef.current].sort((a, b) => a - b);
      const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
      
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      const throughput = totalRequests / elapsedTime;
      
      setMetrics({
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        peakConcurrency: activeUsers.length,
        errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,
        throughput,
        latency: { p50, p95, p99 },
      });
    };
    
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [isRunning, activeUsers]);

  // Cleanup
  const stopStressTest = useCallback(() => {
    setIsRunning(false);
    setActiveUsers([]);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return {
    isRunning,
    metrics,
    activeUsers,
    testResults,
    runStressTest,
    stopStressTest,
  };
};

// Predefined stress test scenarios
export const STRESS_TEST_SCENARIOS = {
  NORMAL_LOAD: {
    name: 'Normal Load',
    weight: 70,
    actions: [
      { type: 'video_load' as const, probability: 0.8, delay: 1000 },
      { type: 'manifest_generation' as const, probability: 0.7, delay: 1500 },
      { type: 'play_pause' as const, probability: 0.6, delay: 2000 },
      { type: 'seek' as const, probability: 0.3, delay: 5000 },
      { type: 'quality_change' as const, probability: 0.2, delay: 10000 },
    ],
    userBehavior: {
      sessionDuration: 300000, // 5 minutes
      interactionRate: 0.1,
      errorRate: 0.01,
    },
  },
  
  HEAVY_LOAD: {
    name: 'Heavy Load',
    weight: 20,
    actions: [
      { type: 'video_load' as const, probability: 0.9, delay: 500 },
      { type: 'manifest_generation' as const, probability: 0.8, delay: 800 },
      { type: 'play_pause' as const, probability: 0.8, delay: 1000 },
      { type: 'seek' as const, probability: 0.6, delay: 2000 },
      { type: 'quality_change' as const, probability: 0.4, delay: 3000 },
      { type: 'volume_change' as const, probability: 0.3, delay: 1500 },
    ],
    userBehavior: {
      sessionDuration: 600000, // 10 minutes
      interactionRate: 0.3,
      errorRate: 0.05,
    },
  },
  
  STRESS_LOAD: {
    name: 'Stress Load',
    weight: 10,
    actions: [
      { type: 'video_load' as const, probability: 0.95, delay: 200 },
      { type: 'manifest_generation' as const, probability: 0.9, delay: 300 },
      { type: 'play_pause' as const, probability: 0.9, delay: 500 },
      { type: 'seek' as const, probability: 0.8, delay: 1000 },
      { type: 'quality_change' as const, probability: 0.7, delay: 1500 },
      { type: 'volume_change' as const, probability: 0.6, delay: 800 },
      { type: 'error_simulation' as const, probability: 0.1, delay: 5000 },
    ],
    userBehavior: {
      sessionDuration: 900000, // 15 minutes
      interactionRate: 0.5,
      errorRate: 0.1,
    },
  },
};
