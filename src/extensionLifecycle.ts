export interface ExtensionLifecycle {
	init(): Promise<void>;
	disposeTelemetry(): Promise<void>;
}

/** Coordinates activation and deactivation so initialization cannot outlive disposal. */
export class ExtensionLifecycleCoordinator {
	private instance: ExtensionLifecycle | undefined;
	private activationPromise: Promise<void> | undefined;

	/**
	 * Starts and awaits extension initialization.
	 * @param instance - Extension instance to initialize and later dispose.
	 */
	async activate(instance: ExtensionLifecycle): Promise<void> {
		this.instance = instance;
		this.activationPromise = instance.init();
		await this.activationPromise;
	}

	/** Waits for initialization to settle before awaiting the final telemetry drain. */
	async deactivate(): Promise<void> {
		const instance = this.instance;
		if (!instance) return;
		try {
			await this.activationPromise;
		} catch {
			// The activation caller receives the error; shutdown must still dispose telemetry.
		} finally {
			await instance.disposeTelemetry();
			if (this.instance === instance) this.instance = undefined;
			this.activationPromise = undefined;
		}
	}
}
