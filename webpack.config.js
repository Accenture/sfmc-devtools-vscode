//@ts-check

"use strict";

const path = require("path");

/**@type {import('webpack').Configuration}*/
const config = {
	target: "node",
	entry: "./src_ref/extension.ts",
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
			"@enums": path.resolve(__dirname, "src_ref/enums"),
			"@constants": path.resolve(__dirname, "src_ref/constants"),
			"@config": path.resolve(__dirname, "src_ref/config"),
			"@messages": path.resolve(__dirname, "src_ref/messages"),
			"@types": path.resolve(__dirname, "src_ref/types"),
			"utils": path.resolve(__dirname, "src_ref/utils")
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
