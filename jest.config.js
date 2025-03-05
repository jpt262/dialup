module.exports = {
    // Test environment
    testEnvironment: "jsdom",

    // Coverage settings
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**/*.{js,jsx}",
        "!src/index.js",
        "!src/serviceWorker.js",
        "!**/node_modules/**",
        "!**/vendor/**"
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    // Test files pattern
    testMatch: ["**/__tests__/**/*.js?(x)", "**/?(*.)+(spec|test).js?(x)"],

    // Module transformations
    transform: {
        "^.+\\.(js|jsx)$": "babel-jest"
    },

    // Module file extensions
    moduleFileExtensions: ["js", "jsx", "json", "node"],

    // Setup files
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

    // Module name mapper for CSS and asset imports
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js",
        "\\.(gif|ttf|eot|svg|png)$": "<rootDir>/__mocks__/fileMock.js"
    }
}; 