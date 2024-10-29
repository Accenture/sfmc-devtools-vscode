//@ts-check

"use strict";

const path = require("path");

/**@type {import('webpack').Configuration}*/
const config = {
	target: "node",
	entry: "./src/extension.ts",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "extension.bundle.js",
		libraryTarget: "commonjs2"
	},
	devtool: "nosources-source-map",
	infrastructureLogging: {
		level: "log"
	},
	externals: {
		vscode: "commonjs vscode"
	},
	resolve: {
		extensions: [".ts", ".js",],
		alias: {
			"@enums": path.resolve(__dirname, "src/enums"),
			"@constants": path.resolve(__dirname, "src/constants"),
			"@config": path.resolve(__dirname, "src/config"),
			"@messages": path.resolve(__dirname, "src/messages"),
			"@types": path.resolve(__dirname, "src/types"),
			"utils": path.resolve(__dirname, "src/utils")
		}
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: "ts-loader",
						options: {
							compilerOptions: { module: "es6" }
						}
					}
				]
			}
		]
	}
};

module.exports = config;
