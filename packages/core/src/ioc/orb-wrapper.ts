export class OrbWrapper<T> {
    private instance: T | null;

    constructor(public name: string, public type: string, public value: T, public readonly dependencies: string[], instance: T | null) {
        this.instance = instance;
    }

    setInstance(instance: T) {
        this.instance = instance;
    }

    getInstance(): T | null {
        return this.instance;
    }
}