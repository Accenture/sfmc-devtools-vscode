import * as assert from "node:assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { mcdevShellCommand } from "../../../devtools/mcdevInvocation";
import { McdevInvocation } from "../../../devtools/mcdevResolve";
import { executeTerminalCommand, executeTerminalCommandCapture } from "../../../utils/terminal";
import { TUtils } from "@types";

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
