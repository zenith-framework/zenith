export class ZenithConfig {
    constructor(private readonly values: Record<string, any>) {
    }

    get<T>(key: string): T {
        return this.values[key] as T;
    }

    getOrThrow<T>(key: string): T {
        const value = this.get<T>(key);
        if (!value) {
            // TODO: Change to a custom error
            throw new Error(`Config value ${key} is not set`);
        }
        return value;
    }

    getOrDefault<T>(key: string, defaultValue: T): T {
        return this.get<T>(key) ?? defaultValue;
    }
}