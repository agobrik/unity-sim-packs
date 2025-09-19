// Jest setup file for procedural package

// Extend Jest timeout for long-running generation tests
jest.setTimeout(15000);

// Mock performance.now for consistent testing
global.performance = global.performance || {
  now: () => Date.now()
};

// Clean up after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});