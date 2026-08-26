export class OrbWrapper<T> {
    private instance: T | null;

    constructor(
        public name: string,
        public type: string,
        public value: T,
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
