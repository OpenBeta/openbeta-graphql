module.exports = {
  testTimeout: 2 * 60 * 1000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(mt|t|cj|j)s$': [
      'ts-jest',
      {
        useESM: true
      }
    ]
  },
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/**/__tests__/*.ts'
  ]
}
