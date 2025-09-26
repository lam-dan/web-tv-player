'use client';

import React, { useState, useCallback } from 'react';
import { useStressTesting, STRESS_TEST_SCENARIOS } from '../hooks/useStressTesting';

interface StressTestDashboardProps {
  className?: string;
}

export const StressTestDashboard: React.FC<StressTestDashboardProps> = ({
  className = '',
}) => {
  const [testConfig, setTestConfig] = useState({
    testId: 'stress_test_v1',
    duration: 300000, // 5 minutes
    requestRate: 10, // 10 requests per second
    concurrency: 50, // 50 concurrent users
    rampUpTime: 30000, // 30 seconds
    rampDownTime: 30000, // 30 seconds
    scenarios: Object.values(STRESS_TEST_SCENARIOS),
  });

  const {
    isRunning,
    metrics,
    activeUsers,
    runStressTest,
    stopStressTest,
  } = useStressTesting(testConfig);

  const handleStartTest = useCallback(async () => {
    await runStressTest();
  }, [runStressTest]);

  const handleStopTest = useCallback(() => {
    stopStressTest();
  }, [stopStressTest]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={`stress-test-dashboard ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Stress Testing Dashboard</h2>
        
        {/* Test Configuration */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Test Configuration</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{formatTime(testConfig.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span>Request Rate:</span>
                <span>{testConfig.requestRate}/sec</span>
              </div>
              <div className="flex justify-between">
                <span>Concurrency:</span>
                <span>{testConfig.concurrency} users</span>
              </div>
              <div className="flex justify-between">
                <span>Ramp Up:</span>
                <span>{formatTime(testConfig.rampUpTime)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ramp Down:</span>
                <span>{formatTime(testConfig.rampDownTime)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Test Scenarios</h3>
            <div className="space-y-2 text-sm">
              {testConfig.scenarios.map((scenario, index) => (
                <div key={index} className="flex justify-between">
                  <span>{scenario.name}:</span>
                  <span>{scenario.weight}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Current Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium ${isRunning ? 'text-green-600' : 'text-gray-600'}`}>
                  {isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Users:</span>
                <span className="font-medium">{activeUsers.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Metrics */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Real-time Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(metrics.totalRequests)}
              </div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(metrics.successfulRequests)}
              </div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(metrics.failedRequests)}
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {metrics.errorRate.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-600">Error Rate</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {formatTime(metrics.averageResponseTime)}
              </div>
              <div className="text-sm text-gray-600">Avg Response Time</div>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="text-xl font-bold text-indigo-600">
                {metrics.throughput.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Throughput (req/s)</div>
            </div>
            
            <div className="bg-pink-50 p-4 rounded-lg">
              <div className="text-xl font-bold text-pink-600">
                {metrics.peakConcurrency}
              </div>
              <div className="text-sm text-gray-600">Peak Concurrency</div>
            </div>
          </div>
        </div>

        {/* Latency Percentiles */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Latency Percentiles</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-700">
                {formatTime(metrics.latency.p50)}
              </div>
              <div className="text-sm text-gray-600">P50</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-700">
                {formatTime(metrics.latency.p95)}
              </div>
              <div className="text-sm text-gray-600">P95</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-lg font-bold text-gray-700">
                {formatTime(metrics.latency.p99)}
              </div>
              <div className="text-sm text-gray-600">P99</div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleStartTest}
            disabled={isRunning}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            {isRunning ? 'Test Running...' : 'Start Stress Test'}
          </button>
          
          <button
            onClick={handleStopTest}
            disabled={!isRunning}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            Stop Test
          </button>
        </div>

        {/* Active Users List */}
        {activeUsers.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Active Users</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeUsers.map((user, index) => (
                  <div key={user.id} className="bg-white p-3 rounded border">
                    <div className="text-sm font-medium">{user.id}</div>
                    <div className="text-xs text-gray-600">
                      Variant: {user.variant}
                    </div>
                    <div className="text-xs text-gray-600">
                      Requests: {user.metrics.requests}
                    </div>
                    <div className="text-xs text-gray-600">
                      Errors: {user.metrics.errors}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


