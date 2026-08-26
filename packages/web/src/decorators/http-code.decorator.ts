import type { Route } from "../web/route";
import { ZENITH_CONTROLLER_ROUTE } from "./metadata-keys";

/**
 * Overrides the HTTP status code of a successful response.
 *
 * Without it, routes answer 200, except POST routes which answer 201.
 */
export const HttpCode = (statusCode: number) => {
    return (target: any, propertyKey: string) => {
        const routeMetadata = (Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, target, propertyKey) ?? {}) as Route;
        routeMetadata.statusCode = statusCode;
        Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE, routeMetadata, target, propertyKey);
    };
};
