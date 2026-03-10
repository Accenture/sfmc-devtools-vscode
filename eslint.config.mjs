import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";

export default defineConfig([
	js.configs.recommended,
	eslintPluginPrettierRecommended,
	tseslint.configs.recommended,
	globalIgnores(["**/dist", "src/**/*.d.ts", "**/webpack.config.js", "**/node_modules", "**/dist"]),
	{
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
