import type { Route } from "../web/route";
import { ZENITH_CONTROLLER_ROUTE } from "./metadata-keys";

export const Get = (path: string = '/') => {
    return (target: any, propertyKey: string) => {
        registerRoute(target, propertyKey, {
            path, method: 'GET'
        });
    };
};

export const Post = (path: string = '/') => {
    return (target: any, propertyKey: string) => {
        registerRoute(target, propertyKey, {
            path, method: 'POST'
        });
    };
};

export const Put = (path: string = '/') => {
    return (target: any, propertyKey: string) => {
        registerRoute(target, propertyKey, {
            path, method: 'PUT'
        });
    };
};

export const Delete = (path: string = '/') => {
    return (target: any, propertyKey: string) => {
        registerRoute(target, propertyKey, {
            path, method: 'DELETE'
        });
    };
};

export const Patch = (path: string = '/') => {
    return (target: any, propertyKey: string) => {
        registerRoute(target, propertyKey, {
            path, method: 'PATCH'
        });
    };
};

export const Options = (path: string = '/') => {
    return (target: any, propertyKey: string) => {
        registerRoute(target, propertyKey, {
            path, method: 'OPTIONS'
        });
    };
};

export const Head = (path: string = '/') => {
    return (target: any, propertyKey: string) => {
        registerRoute(target, propertyKey, {
            path, method: 'HEAD'
        });
    };
};


export const registerRoute = (target: any, propertyKey: string, route: Route) => {
    const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, target, propertyKey) || {} as Route;
    Object.assign(routeMetadata, route);
    Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE, routeMetadata, target, propertyKey);
};