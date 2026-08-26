
export interface ZenithModule {
    name: string;
    path: string;
    module: {
        default?: unknown;
        [key: string]: unknown;
    };
}