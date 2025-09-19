module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '<rootDir>/src/commands/test.ts',
    '<rootDir>/tests/__tests__/auth.test.ts',
    '<rootDir>/tests/__tests__/agents.test.ts',
    '<rootDir>/tests/__tests__/apiKey.test.ts',
    '<rootDir>/tests/__tests__/configure.test.ts',
    '<rootDir>/tests/__tests__/destroy.test.ts',
    '<rootDir>/tests/__tests__/files.test.ts',
    '<rootDir>/tests/__tests__/init.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Exclude main entry point
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  }
};
