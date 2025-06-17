
export interface ZenithModule {
    name: string;
    path: string;
    module: {
        default: any;
        [key: string]: any;
    };
}