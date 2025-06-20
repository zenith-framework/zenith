import { serve, type BunRequest, type Server } from "bun";
import { zenithLogger } from "../../../core/src/logger";
import type { Route, RouteMethod } from "./route";
import type { RouteParamMetadata } from "../decorators/route-param";
import { ZENITH_CONTROLLER_PATH, ZENITH_CONTROLLER_ROUTE, ZENITH_CONTROLLER_ROUTE_ARGS, ZENITH_MIME_TYPES, ZENITH_ORB_TYPE_CONTROLLER, ZENITH_ORB_TYPE_REQUEST_DECODER, ZENITH_ORB_TYPE_RESPONSE_ENCODER } from "../decorators/metadata-keys";
import { InjectOrb, Orb, OrbContainer, type OrbWrapper } from "@zenith-framework/core";
import { ZenithWebConfig } from "../config/zenith-web.config";
import { sanitizePath } from "../utils/path.utils";
import type { RequestDecoder } from "./request-decoder";
import type { ResponseEncoder } from "./response-encoder";

@Orb()
export class HttpServer {
    private readonly logger = zenithLogger('HttpServer');
    private readonly routeHandlers: Record<string, Record<RouteMethod, (...args: any[]) => any>> = {};
    private readonly httpRequestDecoders: Map<string, OrbWrapper<RequestDecoder>> = new Map();
    private readonly httpResponseEncoders: Map<string, OrbWrapper<ResponseEncoder>> = new Map();
    private server?: Server;

    constructor(
        private readonly container: OrbContainer,
        @InjectOrb('ZenithWebConfig', { allowAbsent: true }) private readonly config: ZenithWebConfig,
    ) {
    }

    async registerMiddlewares() {
        const requestDecoders = this.container.getOrbsByType<RequestDecoder>(ZENITH_ORB_TYPE_REQUEST_DECODER);

        for (const requestDecoder of requestDecoders) {
            const mimeTypes = Reflect.getMetadata(ZENITH_MIME_TYPES, requestDecoder.value) as string[];
            for (const mimeType of mimeTypes) {
                this.httpRequestDecoders.set(mimeType, requestDecoder);
            }
            this.logger.info(`Registering request decoder \x1b[32m${requestDecoder.name}\x1b[0m with mime types [\x1b[34m${mimeTypes.join(', ')}\x1b[0m]`);
        }

        const responseEncoders = this.container.getOrbsByType<ResponseEncoder>(ZENITH_ORB_TYPE_RESPONSE_ENCODER);
        for (const responseEncoder of responseEncoders) {
            const mimeTypes = Reflect.getMetadata(ZENITH_MIME_TYPES, responseEncoder.value) as string[];
            for (const mimeType of mimeTypes) {
                this.httpResponseEncoders.set(mimeType, responseEncoder);
            }
            this.logger.info(`Registering response encoder \x1b[32m${responseEncoder.name}\x1b[0m with mime types [\x1b[34m${mimeTypes.join(', ')}\x1b[0m]`);
        }
    }

    async registerRoutes() {
        this.logger.info("Registering routes");
        const controllers = this.container.getOrbsByType<any>(ZENITH_ORB_TYPE_CONTROLLER);
        for (const controller of controllers) {
            const controllerInstance = controller.getInstance();
            const controllerDefaultPath = sanitizePath(Reflect.getMetadata(ZENITH_CONTROLLER_PATH, controller.value));
            const routes = Object.getOwnPropertyNames(Object.getPrototypeOf(controller.getInstance())).filter((key) => key !== 'constructor');

            for (const route of routes) {
                const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, controller.getInstance(), route) as Route;
                const routePath = sanitizePath(routeMetadata.path);

                const fullPath = [controllerDefaultPath.startsWith('/') ? controllerDefaultPath : `/${controllerDefaultPath}`, routePath].join('/');

                const existingHandlers = this.routeHandlers[fullPath] || {} as Record<RouteMethod, (...args: any[]) => any>;
                existingHandlers[routeMetadata.method] = (req: BunRequest) => this.handleRequest(req, fullPath, controllerInstance, route);

                this.routeHandlers[fullPath] = existingHandlers;
                this.logger.info(`Registered route: ${routeMetadata.method} ${fullPath} (${controller.value.name}.${route})`);
            }
        }
    }

    async handleRequest(req: BunRequest, path: string, controller: any, handler: string) {
        const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, controller, handler) as Route;
        const routeArgsMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, controller, handler) as RouteParamMetadata[];

        const injectedArgs: any[] = [];
        for (const arg of routeArgsMetadata) {
            if (arg.type === 'route') {
                injectedArgs.push(req.params[arg.name as keyof typeof req.params]);
            } else if (arg.type === 'body') {
                // TODO: should we fall back to json if no accept header is provided?
                const mimeType = req.headers.get('content-type') ?? 'application/json';
                const requestDecoder = this.httpRequestDecoders.get(mimeType);
                if (!requestDecoder) {
                    return Response.json({ error: 'Unsupported media type' }, { status: 415 });
                }
                const body = await requestDecoder.getInstance()?.decode(req);
                if (!['POST', 'PUT', 'PATCH'].includes(routeMetadata.method)) {
                    return Response.json({ error: 'Route does not expect a body' }, { status: 405 });
                }
                injectedArgs.push(body);
            }
        }

        if (injectedArgs.length !== routeArgsMetadata.length) {
            this.logger.warn(`Route ${routeMetadata.method} ${routeMetadata.path} expects ${routeArgsMetadata.length} arguments but only ${injectedArgs.length} could be provided`);
        }

        let payload: any;
        let status: number;
        try {
            payload = await controller[handler].bind(controller)(...injectedArgs);
            // TODO: handle specific status codes
            status = 200;
        } catch (error) {
            if (error instanceof Error) {
                this.logger.error(`${routeMetadata.method} \x1b[31m${path}\x1b[0m: ${error.constructor.name}`);
            } else {
                this.logger.error(`${routeMetadata.method} \x1b[31m${path}\x1b[0m: ${error}`);
            }
            payload = { error: 'Internal server error' };
            status = 500;
        }

        const mimeTypes = [req.headers.get('accept'), req.headers.get('content-type'), 'application/json'].filter((mime) => mime !== null) as string[];
        let responseEncoder: OrbWrapper<ResponseEncoder> | undefined;
        let responseMimeType: string | undefined;
        for (const mimeType of mimeTypes) {
            responseEncoder = this.httpResponseEncoders.get(mimeType);
            if (responseEncoder) {
                responseMimeType = mimeType;
                break;
            }
        }

        if (!responseEncoder) {
            return Response.json({ error: `Unsupported media type (${responseMimeType})` }, { status: 415 });
        }
        return new Response(await responseEncoder.getInstance()?.encode(payload), { status, headers: { 'Content-Type': responseMimeType } });
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