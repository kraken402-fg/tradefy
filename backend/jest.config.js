module.exports = {
    testEnvironment: 'node',
    collectCoverageFrom: [
        'controllers/**/*.js',
        'utils/**/*.js',
        'Routes/**/*.js',
        'models/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    verbose: true
};
