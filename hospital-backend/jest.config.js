module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: ['controllers/**/*.js', 'utils/**/*.js', 'services/**/*.js'],
    coveragePathIgnorePatterns: ['/node_modules/']
};
