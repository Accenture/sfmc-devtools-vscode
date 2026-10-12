import * as assert from "node:assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { mcdevEnvironment, mcdevShellCommand } from "../../../devtools/mcdevInvocation";
import { McdevInvocation } from "../../../devtools/mcdevResolve";
import { executeTerminalCommand, executeTerminalCommandCapture } from "../../../utils/terminal";
import { TUtils } from "@types";
import Mcdev from "../../../devtools/mcdev";

suite("selected mcdev transport", () => {
	const root = mkdtempSync(path.join(os.tmpdir(), "mcdev transport "));
	const cli = path.join(root, "selected cli.js");
	writeFileSync(
		cli,
		"console.log(JSON.stringify({argv:process.argv.slice(2),cwd:process.cwd()})); if(process.argv.includes('--fail')) process.exitCode=7; if(process.argv.includes('--wait')) setInterval(()=>{},1000);\n"
	);
	const invocation: McdevInvocation = {
		source: "bundled",
		executable: process.execPath,
		prefixArgs: [cli],
		cwd: root
	};
	test("bundled environment is isolated, inherited by children, and cleared for installed sources", async () => {
		const inherited = { ...process.env, MCDEV_RUNTIME_SOURCE: "bundled", mcdev_runtime_source: "stale" };
		const probe = path.join(root, "environment probe.js");
		writeFileSync(
			probe,
			"const {spawnSync}=require('node:child_process');console.log(spawnSync(process.execPath,['-e','console.log(process.env.MCDEV_RUNTIME_SOURCE || \"unset\")'],{encoding:'utf8'}).stdout.trim());\n"
		);
		for (const source of ["bundled", "local", "path", "custom"] as const) {
			const selected = { ...invocation, prefixArgs: [probe], source };
			const expected = source === "bundled" ? "bundled" : "unset";
			assert.strictEqual(mcdevEnvironment(selected, inherited).mcdev_runtime_source, undefined);
			const config = {
				command: "must-not-execute",
				commandArgs: [],
				invocation: selected,
				commandEnv: inherited
			};
			assert.strictEqual((await executeTerminalCommandCapture(config)).stdStreams.output, expected);
			assert.strictEqual(
				(executeTerminalCommand(config, true) as TUtils.ITerminalCommandResult).stdStreams.output,
				expected
			);
			let output = "";
			await executeTerminalCommand(
				{
					...config,
					commandHandler: streams => {
						output += streams.output;
					}
				},
				false
			);
			assert.strictEqual(output, expected);
		}
		assert.strictEqual(inherited.MCDEV_RUNTIME_SOURCE, "bundled");
	});
	test("POSIX and PowerShell quote spaced paths without changing fragments", () => {
		const input = { ...invocation, executable: "/node path/node", prefixArgs: ["/extension's path/cli.js"] };
		assert.strictEqual(
			mcdevShellCommand(input, ['deploy "cred/bu" --keys "a,b"'], "posix"),
			"'/node path/node' '/extension'\\''s path/cli.js' deploy \"cred/bu\" --keys \"a,b\""
		);
		assert.strictEqual(
			mcdevShellCommand(input, ["init"], "powershell"),
			"& '/node path/node' '/extension''s path/cli.js' init"
		);
	});
	test("Windows cmd quotes raw paths and preserves fragmented arguments", () => {
		assert.strictEqual(
			mcdevShellCommand(
				{ ...invocation, executable: "C:\\tools path\\mcdev.cmd", prefixArgs: [] },
				['retrieve "cred/bu" query --keys "some key"'],
				"cmd"
			),
			'"C:\\tools path\\mcdev.cmd" retrieve "cred/bu" query --keys "some key"'
		);
	});
	test("capture executes selected CLI in selected cwd and preserves legacy argument syntax", async () => {
		const result = await executeTerminalCommandCapture({
			command: "must-not-execute",
			commandArgs: ["retrieve", '"cred/bu" query --keys "some key"'],
			invocation
		});
		assert.strictEqual(result.success, true, result.stdStreams.error);
		assert.deepStrictEqual(JSON.parse(result.stdStreams.output), {
			argv: ["retrieve", "cred/bu", "query", "--keys", "some key"],
			cwd: root
		});
	});
	test("version, metadata and ordinary operations resolve the selected runtime each time", async () => {
		const paths: string[] = [];
		const mcdev = new Mcdev(projectPath => {
			paths.push(projectPath);
			return { ...invocation, cwd: projectPath };
		});
		assert.strictEqual((await mcdev.lookupVersion(root)).success, true);
		await mcdev.runExplainTypes(root);
		assert.strictEqual((await mcdev.execute("upgrade", () => {}, { projectPath: root })).success, true);
		assert.deepStrictEqual(paths, [root, root, root]);
	});
	test("source changes affect subsequent invocations and failures are not retried", async () => {
		let calls = 0;
		let selected = invocation;
		const mcdev = new Mcdev(() => {
			calls++;
			return selected;
		});
		assert.strictEqual((await mcdev.lookupVersion(root)).success, true);
		selected = { ...invocation, prefixArgs: [cli, "--fail"], source: "custom" };
		assert.strictEqual((await mcdev.execute("upgrade", () => {}, { projectPath: root })).success, false);
		assert.strictEqual(calls, 2);
	});
	test("Windows cmd launcher at a spaced path uses the selected runtime", async function () {
		if (process.platform !== "win32") this.skip();
		const launcher = path.join(root, "custom mcdev.cmd");
		writeFileSync(launcher, `@"${process.execPath}" "${cli}" %*\r\n`);
		const result = await executeTerminalCommandCapture({
			command: "must-not-execute",
			commandArgs: ["join"],
			invocation: { ...invocation, executable: launcher, prefixArgs: [], source: "custom" }
		});
		assert.strictEqual(result.success, true, result.stdStreams.error);
		assert.deepStrictEqual(JSON.parse(result.stdStreams.output).argv, ["join"]);
	});
	test("operation failure is returned without fallback or retry", async () => {
		const result = await executeTerminalCommandCapture({
			command: "must-not-execute",
			commandArgs: ["--fail"],
			invocation
		});
		assert.strictEqual(result.success, false);
	});
	test("spawn failure settles instead of hanging", async () => {
		const result = await executeTerminalCommand(
			{ command: "node", commandArgs: [], commandCwd: path.join(root, "missing") },
			false
		);
		assert.strictEqual(result.success, false);
		assert.ok(result.stdStreams.error);
	});
	test("cancellation terminates selected runtime and ignores late cancellation", async () => {
		let cancel = (): void => {};
		const token: TUtils.ICancellationToken = {
			isCancellationRequested: false,
			onCancellationRequested: listener => {
				cancel = listener;
			}
		};
		const result = await executeTerminalCommand(
			{
				command: "must-not-execute",
				commandArgs: ["--wait"],
				invocation,
				cancellationToken: token,
				commandHandler: () => {
					token.isCancellationRequested = true;
					cancel();
				}
			},
			false
		);
		assert.strictEqual(result.success, false);
		cancel();
	});
});
