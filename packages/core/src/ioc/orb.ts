export class Orb<T> {
    private instance: T | null;

    constructor(public name: string, public type: T, public readonly dependencies: string[], instance: T | null) {
        this.name = name;
        this.type = type;
        this.dependencies = dependencies;
        this.instance = instance;
    }

    setInstance(instance: T) {
        this.instance = instance;
    }

    getInstance(): T | null {
        return this.instance;
    }
}