export abstract class ZenithWebConfig {
    abstract globalRoutesPrefix(): string;
    abstract httpServerPort(): number;
}