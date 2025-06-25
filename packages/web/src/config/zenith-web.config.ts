export abstract class ZenithWebConfig {
    abstract globalRoutesPrefix(): string | undefined;
    abstract httpServerPort(): number;
}