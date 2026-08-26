export class OrbWrapper<T = unknown> {
    private instance: T | null;

    constructor(
        public name: string,
        public type: string,
        /** The class to construct, or the value itself when registered as one. */
        public value: unknown,
        public readonly dependencies: string[],
        instance: T | null,
        /** File the orb was scanned from, when it came from a module scan. */
        public readonly source?: string,
    ) {
        this.instance = instance;
    }

    setInstance(instance: T) {
        this.instance = instance;
    }

    getInstance(): T | null {
        return this.instance;
    }
}
