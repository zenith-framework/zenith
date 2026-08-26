import type { Constructor } from "./types";

/**
 * A system is a unit of framework capability: a directory of orbs plus a lifecycle.
 *
 * Systems are ordinary orbs, so they declare what they need through their constructor
 * and are injected like anything else. The orbs a system provides come from scanning
 * its `root` directory, which is why `root` is static: it has to be readable before
 * the container can build the system itself.
 */
export abstract class ZenithSystem {
    /**
     * Start the system, once every orb has been constructed and initialised.
     */
    abstract onStart(): Promise<void>;

    /**
     * Stop the system, before orbs are destroyed.
     */
    abstract onStop(): Promise<void>;
}

export type ZenithSystemClass<T extends ZenithSystem = ZenithSystem> = Constructor<T> & {
    /** Directory scanned for the orbs this system provides. Usually `import.meta.dirname`. */
    readonly root: string;
};
