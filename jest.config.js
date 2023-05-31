module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    modulePathIgnorePatterns: ["<rootDir>/dist", "<rootDir>/test"],
    testMatch: ["<rootDir>/out/test/**/*.test.js"]
};