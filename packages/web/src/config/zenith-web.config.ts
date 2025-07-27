export abstract class ZenithWebConfig {
    abstract globalRoutesPrefix(): string | undefined;
    abstract httpServerPort(): number;
    abstract generateOpenApiDocs(): boolean;
}