import type { Route } from "../web/route";
import { ZENITH_CONTROLLER_ROUTE } from "./metadata-keys";

export const registerRoute = (target: any, propertyKey: string, route: Route) => {
    Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE, route, target, propertyKey);
};