import { ZENITH_CONTROLLER_ROUTE_ARGS } from "../../decorators/metadata-keys";

export interface RouteParamMetadata {
    type: 'route' | 'body';
    name: string;
    index: number;
}

export const RouteParam = (name: string) => {
    return (target: any, propertyKey: string, index: number) => {
        const routeArgs = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, target, propertyKey) || [] as RouteParamMetadata[];
        routeArgs.push({ type: 'route', name, index } as RouteParamMetadata);
        Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, routeArgs, target, propertyKey);
    };
};

export const Body = () => {
    return (target: any, propertyKey: string, index: number) => {
        const routeArgs = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, target, propertyKey) || [];
        routeArgs.push({ type: 'body', name: propertyKey, index } as RouteParamMetadata);
        Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, routeArgs, target, propertyKey);
    };
};