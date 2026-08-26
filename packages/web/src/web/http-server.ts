import { InjectOrb, Orb, OrbContainer, type OrbWrapper } from "@zenith-framework/core";
import { serve, type BunRequest, type Server } from "bun";
import { ZenithWebConfig } from "../config/zenith-web.config";
import type { ControllerMetadata } from "../decorators/controller.decorator";
import type { RouteParamMetadata } from "../decorators/route-param";
import { ZENITH_CONTROLLER_METADATA, ZENITH_CONTROLLER_ROUTE, ZENITH_CONTROLLER_ROUTE_ARGS, ZENITH_ORB_TYPE_CONTROLLER } from "../decorators/metadata-keys";
import { webSystemLogger } from "../logger";
import { sanitizePath } from "../utils/path.utils";
import { HttpRequestHandler } from "./http-request-handler";
import type { Route, RouteMethod } from "./route";
import type { ControllerInstance, RouteHandler, ZenithRequestRouting } from "./zenith-request-routing";

/** What Bun's `serve({ routes })` expects for each method on a path. */
type BunRouteHandler = (req: BunRequest) => Response | Promise<Response>;

/** Reaches a controller method by name. Returns undefined when there is no such method. */
function methodOf(controllerInstance: ControllerInstance, name: string): RouteHandler | undefined {
    return (controllerInstance as Record<string, RouteHandler | undefined>)[name];
}

@Orb()
export class HttpServer {
    private readonly logger = webSystemLogger;
    private readonly routeHandlers: Record<string, Record<RouteMethod, BunRouteHandler>> = {};
    private readonly routingMap: Record<string, Record<RouteMethod, ZenithRequestRouting>> = {};
    private server?: Server;

    constructor(
        private readonly container: OrbContainer,
        private readonly httpRequestHandler: HttpRequestHandler,
        @InjectOrb('ZenithWebConfig') private readonly config: ZenithWebConfig,
    ) {
    }

    async scanAndRegisterRoutes() {
        this.logger.info("Registering routes");
        const controllers = this.container.getOrbsByType<ControllerInstance>(ZENITH_ORB_TYPE_CONTROLLER);
        for (const controller of controllers) {
            await this.registerController(controller);
        }
    }

    async registerController(controller: OrbWrapper<ControllerInstance>) {
        const globalRoutesPrefix = this.config.globalRoutesPrefix() ?? '';
        const controllerInstance = controller.getInstance();
        if (!controllerInstance) {
            this.logger.error(`Controller ${controller.name} has no instance and cannot be registered.`);
            return;
        }
        const controllerMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_METADATA, controller.value as object) || {} as ControllerMetadata;
        const controllerDefaultPath = sanitizePath(controllerMetadata.path);
        const routes = Object.getOwnPropertyNames(Object.getPrototypeOf(controllerInstance)).filter((key) => key !== 'constructor');

        for (const route of routes) {
            const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, controllerInstance, route) as Route | undefined;
            if (!routeMetadata) {
                // Not every public method on a controller is a route (helpers, etc.).
                continue;
            }
            if (controllerMetadata.validated && !routeMetadata.validated) {
                this.logger.error(`Route ${routeMetadata.method} ${routeMetadata.path} is not validated but the controller requires it (${controllerInstance.constructor.name}.${route}).`);
                continue;
            }

            let fullPath: string = globalRoutesPrefix + '/' + controllerDefaultPath;
            if (routeMetadata.path && routeMetadata.path !== '') {
                fullPath += '/' + routeMetadata.path;
            }

            const handler = methodOf(controllerInstance, route);
            if (!handler) {
                continue;
            }

            const routing: ZenithRequestRouting = {
                controller: controllerInstance,
                handler,
            }

            this.warnOnUndecoratedParams(controllerInstance, route);
            this.registerRoute(fullPath, routeMetadata.method, routing);
        }
    }

    async registerRoute(fullPath: string, method: RouteMethod, routing: ZenithRequestRouting) {
        const sanitizedFullPath = '/' + sanitizePath(fullPath);
        const existingHandlers = this.routeHandlers[sanitizedFullPath] || {} as Record<RouteMethod, BunRouteHandler>;
        existingHandlers[method] = (req: BunRequest) => this.httpRequestHandler.handleRequest({
            bunRequest: req,
            fullPath: sanitizedFullPath,
            routing,
        });

        this.routingMap[sanitizedFullPath] = this.routingMap[sanitizedFullPath] ?? {} as Record<RouteMethod, ZenithRequestRouting>;
        this.routingMap[sanitizedFullPath][method] = routing;

        this.routeHandlers[sanitizedFullPath] = existingHandlers;
        this.logger.info(`Registered route: ${method} ${sanitizedFullPath} (${routing.controller.constructor.name}.${routing.handler.name})`);

    }

    /**
     * Handler parameters without a @Body()/@Query()/@RouteParam() decorator receive
     * `undefined` at request time. Surface that at boot rather than at the first call.
     */
    private warnOnUndecoratedParams(controllerInstance: ControllerInstance, handlerName: string) {
        const handler = methodOf(controllerInstance, handlerName);
        if (!handler) {
            return;
        }
        const routeArgs = (Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, controllerInstance, handlerName) ?? []) as RouteParamMetadata[];
        const undecorated: number[] = [];
        for (let i = 0; i < handler.length; i++) {
            if (!routeArgs[i]) {
                undecorated.push(i);
            }
        }
        if (undecorated.length > 0) {
            this.logger.warn(`${controllerInstance.constructor.name}.${handlerName} has undecorated parameter(s) [${undecorated.join(', ')}] which will receive undefined.`);
        }
    }

    async start() {
        if (Object.keys(this.routeHandlers).length === 0) {
            this.logger.warn("No routes registered");
            return;
        }

        this.server = serve({
            port: this.config.httpServerPort(),
            routes: this.routeHandlers,
        });
        this.logger.info(`Server running on port ${this.server?.port}`);
    }

    stop() {
        this.server?.stop();
    }

    getRoutes(): Record<string, Record<RouteMethod, ZenithRequestRouting>> {
        return this.routingMap;
    }
}