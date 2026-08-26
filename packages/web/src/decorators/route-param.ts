import { ZENITH_CONTROLLER_ROUTE_ARGS } from "./metadata-keys";

export interface RouteParamMetadata {
    type: 'route' | 'query' | 'body';
    name: string;
    index: number;
    validated?: boolean;
    validationSchema?: any;
}

/**
 * Stores route argument metadata keyed by parameter index.
 *
 * TypeScript applies parameter decorators right-to-left, so appending to an
 * array would record them in reverse. Indexing by `index` keeps the metadata
 * aligned with the handler signature regardless of application order.
 */
export function defineRouteArg(target: any, propertyKey: string, metadata: RouteParamMetadata) {
    const own = (Reflect.getOwnMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, target, propertyKey) ?? []) as RouteParamMetadata[];
    const routeArgs = [...own];
    routeArgs[metadata.index] = metadata;
    Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, routeArgs, target, propertyKey);
}

export const RouteParam = (name: string) => {
    return (target: any, propertyKey: string, index: number) => {
        defineRouteArg(target, propertyKey, { type: 'route', name, index });
    };
};

export const Query = (name?: string) => {
    return (target: any, propertyKey: string, index: number) => {
        defineRouteArg(target, propertyKey, { type: 'query', name: name ?? '', index });
    };
};

export const Body = () => {
    return (target: any, propertyKey: string, index: number) => {
        defineRouteArg(target, propertyKey, { type: 'body', name: propertyKey, index });
    };
};
