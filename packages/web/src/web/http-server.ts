import { serve, type BunRequest, type Server } from "bun";
import { zenithLogger } from "../../../core/src/logger";
import type { Route, RouteMethod } from "./route";
import type { RouteParamMetadata } from "../decorators/http/route-param";
import { ZENITH_CONTROLLER_PATH, ZENITH_CONTROLLER_ROUTE, ZENITH_CONTROLLER_ROUTE_ARGS } from "../decorators/metadata-keys";
import { InjectOrb, Orb, OrbContainer } from "@zenith/core";
import { ZenithWebConfig } from "../config/zenith-web.config";

@Orb()
export class HttpServer {
    private readonly logger = zenithLogger('HttpServer');
    private readonly routeHandlers: Record<string, Record<RouteMethod, (...args: any[]) => any>> = {};
    private server?: Server;

    constructor(
        private readonly container: OrbContainer,
        @InjectOrb('ZenithWebConfig', { allowAbsent: true }) private readonly config: ZenithWebConfig,
    ) {
    }

    async registerRoutes() {
        this.logger.info("Registering routes");
        const controllers = this.container.getOrbsByType<any>('CONTROLLER');
        for (const controller of controllers) {
            const controllerInstance = controller.getInstance();
            const controllerDefaultPath = Reflect.getMetadata(ZENITH_CONTROLLER_PATH, controller.type);
            const routes = Object.getOwnPropertyNames(Object.getPrototypeOf(controller.getInstance())).filter((key) => key !== 'constructor');

            for (const route of routes) {
                const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, controller.getInstance(), route) as Route;

                const fullPath = [controllerDefaultPath.startsWith('/') ? controllerDefaultPath : `/${controllerDefaultPath}`, routeMetadata.path].join('/');

                const existingHandlers = this.routeHandlers[fullPath] || {} as Record<RouteMethod, (...args: any[]) => any>;
                existingHandlers[routeMetadata.method] = (req: BunRequest) => this.handleRequest(req, controllerInstance, route);

                this.routeHandlers[fullPath] = existingHandlers;
                this.logger.info(`Registered route: ${routeMetadata.method} ${fullPath} (${controller.type.name}.${route})`);
            }
        }
    }

    async handleRequest(req: BunRequest, controller: any, handler: string) {
        const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, controller, handler) as Route;
        const routeArgsMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, controller, handler) as RouteParamMetadata[];

        const injectedArgs: any[] = [];
        for (const arg of routeArgsMetadata) {
            if (arg.type === 'route') {
                injectedArgs.push(req.params[arg.name as keyof typeof req.params]);
            } else if (arg.type === 'body') {
                if (!['POST', 'PUT', 'PATCH'].includes(routeMetadata.method)) {
                    return Response.json({ error: 'Route does not expect a body' }, { status: 405 });
                }
                // TODO: handle body parsing (json, form, etc.)
                injectedArgs.push(await req.json());
            }
        }

        if (injectedArgs.length !== routeArgsMetadata.length) {
            this.logger.warn(`Route ${routeMetadata.method} ${routeMetadata.path} expects ${routeArgsMetadata.length} arguments but only ${injectedArgs.length} could be provided`);
        }

        try {
            // TODO: add middleware support
            const result = await controller[handler].bind(controller)(...injectedArgs);

            // TODO: handle response encoding
            return Response.json(result);
        } catch (error) {
            return Response.json({ error: 'Internal server error' }, { status: 500 });
        }
    }

    async start() {
        if (Object.keys(this.routeHandlers).length === 0) {
            this.logger.warn("No routes registered");
            return;
        }

        this.server = serve({
            port: this.config.getPort(),
            routes: this.routeHandlers,
        });
        this.logger.info(`Server running on port ${this.server?.port}`);
    }

    stop() {
        this.server?.stop();
    }
}