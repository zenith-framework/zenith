import { InjectOrb, Orb, OrbContainer, type OrbWrapper } from "@zenith-framework/core";
import { serve, type BunRequest, type Server } from "bun";
import { ZenithWebConfig } from "../config/zenith-web.config";
import type { ControllerMetadata } from "../decorators/controller.decorator";
import { ZENITH_CONTROLLER_METADATA, ZENITH_CONTROLLER_ROUTE, ZENITH_ORB_TYPE_CONTROLLER } from "../decorators/metadata-keys";
import { webSystemLogger } from "../logger";
import { sanitizePath } from "../utils/path.utils";
import { HttpRequestHandler } from "./http-request-handler";
import type { RequestDecoder } from "./request-decoder";
import type { ResponseEncoder } from "./response-encoder";
import type { Route, RouteMethod } from "./route";
import type { Validator } from "./validator";
import type { ZenithRequestRouting } from "./zenith-request-routing";

@Orb()
export class HttpServer {
    private readonly logger = webSystemLogger;
    private readonly routeHandlers: Record<string, Record<RouteMethod, (...args: any[]) => any>> = {};
    private readonly routingMap: Record<string, Record<RouteMethod, ZenithRequestRouting>> = {};
    private readonly httpRequestDecoders: Map<string, OrbWrapper<RequestDecoder>> = new Map();
    private readonly httpResponseEncoders: Map<string, OrbWrapper<ResponseEncoder>> = new Map();
    private readonly exceptionHandlers: Map<string, { orb: OrbWrapper<any>, handler: Function }> = new Map();
    private server?: Server;

    constructor(
        private readonly container: OrbContainer,
        private readonly httpRequestHandler: HttpRequestHandler,
        @InjectOrb('ZenithWebConfig') private readonly config: ZenithWebConfig,
        @InjectOrb('Validator') private readonly validator: Validator<any>,
    ) {
    }

    async scanAndRegisterRoutes() {
        this.logger.info("Registering routes");
        const controllers = this.container.getOrbsByType<any>(ZENITH_ORB_TYPE_CONTROLLER);
        for (const controller of controllers) {
            await this.registerController(controller);
        }
    }

    async registerController(controller: OrbWrapper<any>) {
        const globalRoutesPrefix = this.config.globalRoutesPrefix() ?? '';
        const controllerInstance = controller.getInstance();
        const controllerMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_METADATA, controller.value) || {} as ControllerMetadata;
        const controllerDefaultPath = sanitizePath(controllerMetadata.path);
        const routes = Object.getOwnPropertyNames(Object.getPrototypeOf(controller.getInstance())).filter((key) => key !== 'constructor');

        for (const route of routes) {
            const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, controller.getInstance(), route) as Route;
            if (controllerMetadata.validated && !routeMetadata.validated) {
                this.logger.error(`Route ${routeMetadata.method} ${routeMetadata.path} is not validated but the controller requires it (${controller.value.name}.${route}).`);
                continue;
            }

            let fullPath: string = globalRoutesPrefix + '/' + controllerDefaultPath;
            if (routeMetadata.path && routeMetadata.path !== '') {
                fullPath += '/' + routeMetadata.path;
            }

            const routing = {
                controller: controllerInstance,
                handler: controllerInstance[route],
            }

            this.registerRoute(fullPath, routeMetadata.method, routing);

        }
    }

    async registerRoute(fullPath: string, method: RouteMethod, routing: ZenithRequestRouting) {
        const sanitizedFullPath = '/' + sanitizePath(fullPath);
        const existingHandlers = this.routeHandlers[sanitizedFullPath] || {} as Record<RouteMethod, (...args: any[]) => any>;
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