import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
	files: "src/test/suite/**/*.test.ts",
	workspaceFolder: ".",
	extensionDevelopmentPath: ".",
	mocha: {
		ui: "tdd",
		timeout: 20000,
		require: ["ts-node/register", "tsconfig-paths/register"]
	},
	env: {
		TS_NODE_PROJECT: "tsconfig.test.json",
		TS_NODE_TRANSPILE_ONLY: "1"
	}
});
