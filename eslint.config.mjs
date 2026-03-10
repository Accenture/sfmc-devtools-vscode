import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all
});

export default defineConfig([
	globalIgnores(["**/dist", "src/**/*.d.ts", "**/webpack.config.js", "**/node_modules", "**/dist"]),
	{
		extends: fixupConfigRules(
			compat.extends(
				"plugin:@typescript-eslint/recommended",
				"prettier",
				"plugin:prettier/recommended",
				"plugin:import/typescript"
			)
		),

		plugins: {
			"@typescript-eslint": fixupPluginRules(typescriptEslint),
			prettier: fixupPluginRules(prettier)
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: 6,
			sourceType: "module"
		},

		rules: {
			"no-use-before-define": "error",
			"import/prefer-default-export": "off",
			"react/prop-types": "off",
			"no-console": "off",
			"no-var": "error",
			"no-eval": "error",
			"prefer-const": "error",
			"comma-spacing": "error",
			"no-trailing-spaces": "error",
			"arrow-spacing": "error",
			"prefer-arrow-callback": "error",
			"no-path-concat": "error",
			"@typescript-eslint/typedef": "error",
			"@typescript-eslint/no-inferrable-types": "error"
		}
	}
]);
