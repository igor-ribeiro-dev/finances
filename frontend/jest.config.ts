import type { Config } from 'jest';
import { resolve } from 'path';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          module: 'CommonJS',
          moduleResolution: 'node',
          esModuleInterop: true,
          strict: true,
          paths: { '@/*': ['./src/*'] },
        },
      },
    ],
  },
  testMatch: ['**/tests/**/*.test.tsx', '**/tests/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': resolve(__dirname, './src/$1'),
    '\\.(css)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
};

export default config;
