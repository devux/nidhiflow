module.exports = {
  clearMocks: true,
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "\\.(gif|jpe?g|png|webp)$": "<rootDir>/src/test/fileMock.cjs",
    "\\.css$": "<rootDir>/src/test/styleMock.cjs",
  },
  setupFiles: ["<rootDir>/src/test/environment.cjs"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  transform: {
    "^.+\\.(ts|tsx)$": "babel-jest",
  },
};
