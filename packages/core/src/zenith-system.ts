import type { OrbContainer } from "./ioc/container";

export abstract class ZenithSystem {
    constructor(
        public readonly container: OrbContainer,
    ) {
    }

    /**
     * Start the system, after all systems are registered
     */
    abstract onStart(): Promise<void>;

    /**
     * Stop the system
     */
    abstract onStop(): Promise<void>;

    abstract getRoot(): string;
}