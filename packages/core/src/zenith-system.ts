import type { OrbContainer } from "./ioc/container";

export interface ZenithSystem {
    init(container: OrbContainer): void;

    /**
     * Register orbs when loading zenith, after modules are loaded but before the system is started
     */
    registerOrbs(): Promise<void>;

    /**
     * Start the system, after all systems are registered
     */
    onStart(): Promise<void>;

    /**
     * Stop the system
     */
    onStop(): Promise<void>;

    getPath(): string;
}