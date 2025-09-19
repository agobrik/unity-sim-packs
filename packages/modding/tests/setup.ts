// Jest setup file for modding framework tests

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeEach(() => {
  // Restore console for each test
  Object.assign(console, originalConsole);
});

// Global test utilities
global.createMockContext = () => ({
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  console: console
});

// Suppress specific warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings that are expected during testing
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('EventEmitter') ||
        message.includes('memory leak') ||
        message.includes('MaxListenersExceededWarning')) {
      return;
    }
  }
  originalWarn.apply(console, args);
};

// Clean up after tests
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();

  // Clear all mocks
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(10000);