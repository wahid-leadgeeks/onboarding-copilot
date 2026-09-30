module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': '<rootDir>/jest.transform.cjs' },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFiles: ['<rootDir>/jest.setup.cjs'],
};
