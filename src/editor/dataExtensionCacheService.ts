import { VSCode } from "@types";

export interface DataExtensionEntry {
	name: string;
	key: string;
	filePath: string;
}

/**
 * Shared per-BU cache for dataExtension metadata (Name + CustomerKey).
 *
 * Singleton that can be consumed by link providers, diagnostic providers,
 * and any other component that needs to resolve DE names or keys without
 * each building its own independent cache.
 */
export class DataExtensionCacheService {
	private static instance: DataExtensionCacheService;
	private cache = new Map<string, DataExtensionEntry[]>();

	static getInstance(): DataExtensionCacheService {
		if (!DataExtensionCacheService.instance) {
			DataExtensionCacheService.instance = new DataExtensionCacheService();
		}
		return DataExtensionCacheService.instance;
	}

	async getEntriesForBU(buPath: string): Promise<DataExtensionEntry[]> {
		if (this.cache.has(buPath)) {
			return this.cache.get(buPath)!;
		}

		const entries = await this.buildCache(buPath);
		this.cache.set(buPath, entries);
		return entries;
	}

	clearCache(): void {
		this.cache.clear();
	}

	clearBU(buPath: string): void {
		this.cache.delete(buPath);
	}

	private async buildCache(buPath: string): Promise<DataExtensionEntry[]> {
		const files = await VSCode.workspace.findFiles(`${buPath}/dataExtension/*.dataExtension-meta.json`);
		const entries: DataExtensionEntry[] = [];

		for (const fileUri of files) {
			try {
				const raw = await VSCode.workspace.fs.readFile(fileUri);
				const content = Buffer.from(raw).toString("utf-8");
				const parsed = JSON.parse(content);
				const name = parsed.Name || parsed.name || "";
				const key = parsed.CustomerKey || parsed.customerKey || "";
				if (name || key) {
					entries.push({
						name,
						key,
						filePath: fileUri.fsPath
					});
				}
			} catch {
				// Skip files that can't be parsed
			}
		}

		return entries;
	}
}
