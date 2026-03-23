import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
	files: "src/test/suite/**/*.test.ts",
	env: {
		TS_NODE_PROJECT: "tsconfig.test.json"
	},
	mocha: {
		ui: "tdd",
		timeout: 20000,
		require: ["ts-node/register", "tsconfig-paths/register"]
	}
});
