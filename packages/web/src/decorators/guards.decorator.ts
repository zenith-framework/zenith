import { webSystemLogger } from "../logger";
import type { RequestGuard, RequestGuardOrbProvider } from "../web/request-guard";
import type { Route } from "../web/route";
import { ZENITH_CONTROLLER_METADATA, ZENITH_CONTROLLER_ROUTE } from "./metadata-keys";
import type { ControllerMetadata } from "./controller.decorator";
import { getInjectableOrbName } from "../../../core/src/ioc/utils";
import chalk from "chalk";

export const Guards = (guards: RequestGuardOrbProvider[]) => {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
        if (!propertyKey || !descriptor) {
            const controllerMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_METADATA, target) || {} as ControllerMetadata;
            controllerMetadata.guards = guards;
            Reflect.defineMetadata(ZENITH_CONTROLLER_METADATA, controllerMetadata, target);
        } else {
            const route = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, target, propertyKey) as Route;
            route.guards = guards;
            Reflect.defineMetadata(ZENITH_CONTROLLER_ROUTE, route, target, propertyKey);
            webSystemLogger.info(`Registering guards [${chalk.blue(guards.map((guard) => getInjectableOrbName(guard)).join(', '))}] for route ${target.constructor.name}.${propertyKey}`);
        };
    };
};