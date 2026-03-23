"use strict";

module.exports = {
	require: ["ts-node/register", "tsconfig-paths/register"],
	spec: "src/test/suite/**/*.test.ts",
	ui: "tdd",
	timeout: 20000
};
