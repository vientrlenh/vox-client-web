/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts',
    '!src/test/**',
  ],
  moduleNameMapper: {
    '^@/shared/config/env$': '<rootDir>/src/test/mocks/env.ts',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg|webp|avif)$':
      '<rootDir>/src/test/mocks/fileMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          target: 'es2023',
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
}
