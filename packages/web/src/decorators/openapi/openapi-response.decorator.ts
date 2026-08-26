import type { DecoratorTarget } from "@zenith-framework/core";
import type { Route } from "../../web/route";
import { ZENITH_CONTROLLER_ROUTE } from "../metadata-keys";

export const OpenApiResponse = ({ status, description, type }: { status?: number, description?: string, type: unknown }) => {
    return (target: DecoratorTarget, propertyKey: string) => {
        const route = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, target, propertyKey) || {} as Route;
        route.openApiResponses = route.openApiResponses || [];
        route.openApiResponses.push({
            status,
            description,
            type
        });
        Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE, route, target, propertyKey);
    };
};