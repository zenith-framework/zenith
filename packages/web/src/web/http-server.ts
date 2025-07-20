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
                if (controllerMetadata.validated && !routeMetadata.validated && this.routeExpectsBody(routeMetadata)) {
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

    async handleRequest(req: BunRequest, path: string, controller: any, handler: string) {
        const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, controller, handler) as Route;
        const routeArgsMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, controller, handler) ?? [] as RouteParamMetadata[];

        const httpResponse = await this.executeRequest(req, routeMetadata, routeArgsMetadata, controller, handler);

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
        return new Response(await responseEncoder.getInstance()?.encode(httpResponse.body), { status: httpResponse.status, headers: { 'Content-Type': responseMimeType } });
    }

    private async prepareHandlerArgsInjection(req: BunRequest, routeMetadata: Route, routeArgsMetadata: RouteParamMetadata[]): Promise<any[]> {
        const injectedArgs: any[] = [];
        for (const arg of routeArgsMetadata) {
            if (arg.type === 'route') {
                const routeParam = req.params[arg.name as keyof typeof req.params];
                await this.validateRequestParam(arg, routeMetadata, routeParam);
                injectedArgs.push(routeParam);
            } else if (arg.type === 'query') {
                const params = new URL(req.url).searchParams;
                const queryParam = params.get(arg.name);
                await this.validateRequestParam(arg, routeMetadata, queryParam);
                injectedArgs.push(queryParam);
            } else if (arg.type === 'body') {
                // TODO: should we fall back to json if no accept header is provided?
                const mimeType = req.headers.get('content-type') ?? 'application/json';
                const requestDecoder = this.httpRequestDecoders.get(mimeType);
                if (!requestDecoder) {
                    throw new UnsupportedMediaTypeException();
                }
                if (!this.routeExpectsBody(routeMetadata)) {
                    // TODO: Maybe not throw in here
                    throw new BadRequestException('Route does not expect a body');
                }
                const body = await requestDecoder.getInstance()?.decode(req);

                await this.validateRequestParam(arg, routeMetadata, body);

                injectedArgs.push(body);
            }
        }
        if (injectedArgs.length !== routeArgsMetadata.length) {
            this.logger.warn(`Route ${routeMetadata.method} ${routeMetadata.path} expects ${routeArgsMetadata.length} arguments but only ${injectedArgs.length} could be provided`);
        }

        return injectedArgs;
    }

    private async validateRequestParam(arg: RouteParamMetadata, routeMetadata: Route, value: any): Promise<void> {
        if (arg.validated || routeMetadata.validated) {
            const schema = arg.validationSchema || routeMetadata.validationSchema;
            if (schema) {
                const result = await this.validator.validate(value, schema);
                if (!result) {
                    throw new BadRequestException();
                }
            }
        }
    }

    private routeExpectsBody(routeMetadata: Route) {
        return ['POST', 'PUT', 'PATCH'].includes(routeMetadata.method);
    }

    private async executeRequest(req: BunRequest, routeMetadata: Route, routeArgsMetadata: RouteParamMetadata[], controller: any, handler: string): Promise<ZenithHttpResponse> {
        try {
            const controllerMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_METADATA, controller.constructor) || {} as ControllerMetadata;

            if (controllerMetadata.guards || routeMetadata.guards) {
                const guards = [...(controllerMetadata.guards ?? []), ...(routeMetadata.guards ?? [])];
                for (const guardOrb of guards) {
                    const guard = this.container.get<RequestGuard>(guardOrb);
                    if (guard && !await guard.accepts(req)) {
                        throw new UnauthorizedException(`Guard ${guard.constructor.name} rejected request`);
                    }
                }
            }
            const injectedArgs = await this.prepareHandlerArgsInjection(req, routeMetadata, routeArgsMetadata);

            const body = await controller[handler].bind(controller)(...injectedArgs);
            return {
                // TODO: handle specific status codes
                status: 200,
                body: body,
            };
        } catch (error) {
            const httpResponse = await this.mapErrorToZenithHttpResponse(error);
            this.logger.error(`${chalk.red(httpResponse.status)} - [${routeMetadata.method} ${chalk.bold.italic(routeMetadata.path)}]: ${httpResponse.body.message}`);
            return httpResponse;
        }
    }

    private async mapErrorToZenithHttpResponse(error: unknown): Promise<ZenithHttpResponse> {
        if (error instanceof HttpException) {
            return {
                status: error.status,
                body: error,
            };
        } else if (error instanceof Error) {
            const exceptionHandler = this.exceptionHandlers.get(error.constructor.name);
            if (exceptionHandler) {
                const httpException = await exceptionHandler.handler(error) as HttpException;
                return {
                    status: httpException.status,
                    body: httpException,
                };
            } else {
                this.logger.debug(`No exception handler found for error ${chalk.red(error.constructor.name)}`);
                return {
                    status: 500,
                    body: new InternalServerErrorException('Internal server error'),
                }
            }
        } else {
            return {
                status: 500,
                body: new InternalServerErrorException('Internal server error'),
            };
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