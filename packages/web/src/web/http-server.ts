import { serve, type BunRequest, type Server } from "bun";
import type { Route, RouteMethod } from "./route";
import type { RouteParamMetadata } from "../decorators/route-param";
import { ZENITH_CONTROLLER_METADATA, ZENITH_CONTROLLER_ROUTE, ZENITH_CONTROLLER_ROUTE_ARGS, ZENITH_EXCEPTION_HANDLER_EXCEPTIONS, ZENITH_MIME_TYPES, ZENITH_ORB_TYPE_CONTROLLER, ZENITH_ORB_TYPE_EXCEPTION_HANDLER, ZENITH_ORB_TYPE_REQUEST_DECODER, ZENITH_ORB_TYPE_RESPONSE_ENCODER } from "../decorators/metadata-keys";
import { InjectOrb, Orb, OrbContainer, type OrbWrapper } from "@zenith-framework/core";
import { ZenithWebConfig } from "../config/zenith-web.config";
import { sanitizePath } from "../utils/path.utils";
import type { RequestDecoder } from "./request-decoder";
import type { ResponseEncoder } from "./response-encoder";
import { BadRequestException, HttpException, InternalServerErrorException, UnauthorizedException, UnsupportedMediaTypeException } from "./http-exception";
import type { ZenithHttpResponse } from "./zenith-http-response";
import chalk from "chalk";
import { webSystemLogger } from "../logger";
import type { ControllerMetadata } from "../decorators/controller.decorator";
import type { Validator } from "./validator";
import type { RequestGuard } from "./request-guard";
import { HttpRequestHandler } from "./http-request-handler";

@Orb()
export class HttpServer {
    private readonly logger = webSystemLogger;
    private readonly routeHandlers: Record<string, Record<RouteMethod, (...args: any[]) => any>> = {};
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

    async registerRoutes() {
        this.logger.info("Registering routes");
        const globalRoutesPrefix = this.config.globalRoutesPrefix() ?? '';
        const controllers = this.container.getOrbsByType<any>(ZENITH_ORB_TYPE_CONTROLLER);
        for (const controller of controllers) {
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

                const sanitizedFullPath = '/' + sanitizePath(fullPath);

                const existingHandlers = this.routeHandlers[sanitizedFullPath] || {} as Record<RouteMethod, (...args: any[]) => any>;
                existingHandlers[routeMetadata.method] = (req: BunRequest) => this.httpRequestHandler.handleRequest({
                    bunRequest: req,
                    fullPath: sanitizedFullPath,
                    routing: {
                        controller: controllerInstance,
                        method: controllerInstance[route],
                    },
                });

                this.routeHandlers[sanitizedFullPath] = existingHandlers;
                this.logger.info(`Registered route: ${routeMetadata.method} ${sanitizedFullPath} (${controller.value.name}.${route})`);
            }
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
}