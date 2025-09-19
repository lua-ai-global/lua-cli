// Test setup file

// Mock console methods to avoid cluttering test output
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
process.exit = jest.fn() as any;

// Restore console and process.exit after each test
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  process.exit = originalExit;
});
