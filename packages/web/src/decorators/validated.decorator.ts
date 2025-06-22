import { ZENITH_CONTROLLER_METADATA, ZENITH_CONTROLLER_ROUTE, ZENITH_CONTROLLER_ROUTE_ARGS, ZENITH_VALIDATED_SCHEMA } from "./metadata-keys";
import { webSystemLogger } from "../logger";
import type { ControllerMetadata } from "./controller.decorator";
import chalk from "chalk";
import type { Route } from "../web/route";
import type { RouteParamMetadata } from "./route-param";

/**
 * This decorator is used to validate the request body against a schema.
 * It can be used on a controller class, a method or a parameter.
 * 
 * If used on a controller class, It acts as a safeguard to make sure routes are validated, but it will not validate the request body against the schema directly.
 * If used on a method, it will validate the request body against the schema, expecting a schema to be passed as a parameter.
 * If used on a parameter, it will validate the request body against the schema, expecting a schema to be passed as a parameter.
 * 
 * @param schema The schema to validate the request body against
 * @returns A decorator that validates the request body against the schema
 */
export const Validated = (schema?: any) => (target: any, propertyKey?: string, descriptorOrIndex?: PropertyDescriptor | number) => {
    if (!propertyKey) {
        if (schema) {
            webSystemLogger.warn('Validated decorator used on a controller class with a schema. The schema will not be used.');
        }

        const controllerMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_METADATA, target) || {} as ControllerMetadata;
        controllerMetadata.validated = true;
        Reflect.defineMetadata(ZENITH_CONTROLLER_METADATA, controllerMetadata, target);
    } else if (typeof descriptorOrIndex !== 'number') {
        const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, target, propertyKey) || {} as Route;
        routeMetadata.validated = true;
        routeMetadata.validationSchema = schema;
        Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE, routeMetadata, target, propertyKey);
    } else {
        const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, target, propertyKey) || [] as RouteParamMetadata[];
        const paramMetadata = routeMetadata[descriptorOrIndex as number];
        if (paramMetadata) {
            paramMetadata.validated = true;
            paramMetadata.validationSchema = schema;
            Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, routeMetadata, target, propertyKey);
        }
    }
};