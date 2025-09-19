// Jest setup file for time package

// Extend Jest timeout for integration tests
jest.setTimeout(10000);

// Mock performance.now for consistent testing
global.performance = global.performance || {
  now: () => Date.now()
};

// Clean up timers after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});