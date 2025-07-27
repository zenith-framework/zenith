import { InjectOrb, Orb, OrbContainer, OrbWrapper } from "@zenith-framework/core";
import type { ZenithRequest } from "./zenith-request";
import { webSystemLogger } from "../logger";
import { ZENITH_CONTROLLER_METADATA, ZENITH_CONTROLLER_ROUTE, ZENITH_CONTROLLER_ROUTE_ARGS, ZENITH_EXCEPTION_HANDLER_EXCEPTIONS, ZENITH_MIME_TYPES, ZENITH_ORB_TYPE_EXCEPTION_HANDLER, ZENITH_ORB_TYPE_REQUEST_DECODER, ZENITH_ORB_TYPE_RESPONSE_ENCODER } from "../decorators/metadata-keys";
import type { ControllerMetadata, RouteParamMetadata } from "../decorators";
import type { Route } from "./route";
import { BadRequestException, HttpException, InternalServerErrorException, UnauthorizedException, UnsupportedMediaTypeException } from "./http-exception";
import type { ResponseEncoder } from "./response-encoder";
import type { RequestDecoder } from "./request-decoder";
import chalk from "chalk";
import type { ZenithHttpResponse } from "./zenith-http-response";
import { ZenithRequestContext } from "./context/zenith-request-context";
import type { Validator } from "./validator";
import type { RequestGuard } from "./request-guard";
import type { ZenithRequestRouting } from "./zenith-request-routing";

@Orb()
export class HttpRequestHandler {
    private readonly logger = webSystemLogger;
    private readonly httpRequestDecoders: Map<string, OrbWrapper<RequestDecoder>> = new Map();
    private readonly httpResponseEncoders: Map<string, OrbWrapper<ResponseEncoder>> = new Map();
    private readonly exceptionHandlers: Map<string, { orb: OrbWrapper<any>, handler: Function }> = new Map();

    constructor(
        private readonly container: OrbContainer,
        // @InjectOrb('ZenithWebConfig') private readonly config: ZenithWebConfig,
        @InjectOrb('Validator') private readonly validator: Validator<any>,
    ) {
    }

    async registerMiddlewares() {
        const requestDecoders = this.container.getOrbsByType<RequestDecoder>(ZENITH_ORB_TYPE_REQUEST_DECODER);

        for (const requestDecoder of requestDecoders) {
            const mimeTypes = Reflect.getMetadata(ZENITH_MIME_TYPES, requestDecoder.value) as string[];
            for (const mimeType of mimeTypes) {
                this.httpRequestDecoders.set(mimeType, requestDecoder);
            }
            this.logger.info(`Registering request decoder '${chalk.bold(requestDecoder.name)}' with mime types [${chalk.blue(mimeTypes.join(', '))}]`);
        }

        const responseEncoders = this.container.getOrbsByType<ResponseEncoder>(ZENITH_ORB_TYPE_RESPONSE_ENCODER);
        for (const responseEncoder of responseEncoders) {
            const mimeTypes = Reflect.getMetadata(ZENITH_MIME_TYPES, responseEncoder.value) as string[];
            for (const mimeType of mimeTypes) {
                this.httpResponseEncoders.set(mimeType, responseEncoder);
            }
            this.logger.info(`Registering response encoder '${chalk.bold(responseEncoder.name)}' with mime types [${chalk.blue(mimeTypes.join(', '))}]`);
        }

        const exceptionHandlers = this.container.getOrbsByType<any>(ZENITH_ORB_TYPE_EXCEPTION_HANDLER);
        for (const exceptionHandler of exceptionHandlers) {
            this.logger.info(`Registering exception handler '${chalk.bold(exceptionHandler.name)}'`);
            const exceptionHandlerInstance = exceptionHandler.getInstance();
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(exceptionHandlerInstance)).filter((key) => key !== 'constructor');

            for (const method of methods) {
                const exceptionsHandled = Reflect.getMetadata(ZENITH_EXCEPTION_HANDLER_EXCEPTIONS, exceptionHandlerInstance, method) as Function[];
                this.logger.info(`Catch [${chalk.blue(exceptionsHandled.map((exception) => exception.name).join(', '))}] in '${chalk.bold(exceptionHandler.name + '.' + method)}'`);
                exceptionsHandled.forEach((exception) => {
                    this.exceptionHandlers.set(exception.name, { orb: exceptionHandler, handler: exceptionHandlerInstance[method].bind(exceptionHandlerInstance) as Function });
                });
            }
        }
    }

    async handleRequest(request: ZenithRequest) {
        return ZenithRequestContext.createForRequest(request, () => this.executeRequest(request));
    }

    private async executeRequest(request: ZenithRequest) {
        performance.mark('handle-request-start');
        const requestContext = ZenithRequestContext.current();
        if (!requestContext) {
            throw new InternalServerErrorException('No request context found');
        }

        const controllerMetadata = (Reflect.getMetadata(ZENITH_CONTROLLER_METADATA, request.routing.controller.constructor) ?? {}) as ControllerMetadata;
        const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, request.routing.controller, request.routing.handler.name) as Route;
        const routeArgsMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, request.routing.controller, request.routing.handler.name) ?? [] as RouteParamMetadata[];

        try {
            if (this.routeExpectsBody(routeMetadata)) {
                const body = await this.decodeBody(request, routeMetadata);
                requestContext.body = body;
            }

            if (controllerMetadata.guards || routeMetadata.guards) {
                const guards = [...(controllerMetadata.guards ?? []), ...(routeMetadata.guards ?? [])];
                for (const guardOrb of guards) {
                    const guard = this.container.get<RequestGuard>(guardOrb);
                    if (guard && !await guard.accepts(request.bunRequest)) {
                        throw new UnauthorizedException(`Guard ${guardOrb.name} rejected the request`);
                    }
                }
            }

            const args = await this.prepareHandlerArgsInjection(requestContext, request.routing, controllerMetadata, routeMetadata, routeArgsMetadata);
            const response = await request.routing.handler.bind(request.routing.controller)(...args);

            performance.mark('handle-request-end');
            performance.measure('handle-request-duration', 'handle-request-start', 'handle-request-end');

            const mimeType = routeMetadata.mimeType ?? this.getMimeTypeForResponse(response);
            const encodedResponse = await this.encodeResponse(response, mimeType);
            return new Response(encodedResponse, { status: 200, headers: { 'Content-Type': mimeType } });
        } catch (error) {
            const httpResponse = await this.mapErrorToZenithHttpResponse(error);
            performance.mark('handle-request-end');
            const durationMeasure = performance.measure('handle-request-duration', 'handle-request-start', 'handle-request-end');
            this.logger.error(`${chalk.red(httpResponse.status)} - [${routeMetadata.method} ${chalk.bold.italic(routeMetadata.path)}]: ${httpResponse.body.message} (${durationMeasure.duration.toFixed(2)}ms)`);
            return new Response(JSON.stringify(httpResponse.body), { status: httpResponse.status });
        }
    }

    private getMimeTypeForResponse(response: any) {
        if (typeof response === 'string') {
            return 'text/plain';
        } else {
            return 'application/json';
        }
    }

    private async encodeResponse(response: any, mimeType: string) {
        if (mimeType === 'text/plain') {
            return response;
        }

        const responseEncoder = this.httpResponseEncoders.get(mimeType);
        if (!responseEncoder) {
            throw new UnsupportedMediaTypeException();
        }
        return responseEncoder.getInstance()?.encode(response);
    }

    private async prepareHandlerArgsInjection(
        requestContext: ZenithRequestContext,
        routing: ZenithRequestRouting,
        controllerMetadata: ControllerMetadata,
        routeMetadata: Route,
        routeArgsMetadata: RouteParamMetadata[]
    ): Promise<any[]> {
        const numberOfArgs = routing.handler.length;
        const paramTypes = Reflect.getMetadata('design:paramtypes', routing.controller, routing.handler.name) as any[];

        const injectedArgs: any[] = [];
        for (let i = 0; i < numberOfArgs; i++) {
            const arg = routeArgsMetadata[i];
            const paramType = paramTypes[i];

            if (!arg || !paramType) {
                this.logger.warn(`Cannot process arg [${i}] of route handler ${routing.controller.constructor.name}.${routing.handler.name}`);
                throw new InternalServerErrorException('UnprocessableRouteHandlerArgument');
            }

            if (arg.type === 'route') {
                const routeParam = requestContext.request.bunRequest.params[arg.name as keyof typeof requestContext.request.bunRequest.params];
                await this.validateRequestParam(arg, paramType, controllerMetadata, routeMetadata, routeParam);
                injectedArgs.push(routeParam);
            } else if (arg.type === 'query') {
                const params = new URL(requestContext.request.bunRequest.url).searchParams;
                const queryParam = params.get(arg.name);
                await this.validateRequestParam(arg, paramType, controllerMetadata, routeMetadata, queryParam);
                injectedArgs.push(queryParam);
            } else if (arg.type === 'body') {
                injectedArgs.push(requestContext.body);
            }
        }
        if (injectedArgs.length !== routeArgsMetadata.length) {
            this.logger.warn(`Route ${routeMetadata.method} ${routeMetadata.path} expects ${routeArgsMetadata.length} arguments but only ${injectedArgs.length} could be provided`);
        }

        return injectedArgs;

    }

    private async validateRequestParam(arg: RouteParamMetadata, paramType: any, controllerMetadata: ControllerMetadata, routeMetadata: Route, value: any): Promise<void> {
        if (arg.validated || routeMetadata.validated || controllerMetadata.validated) {
            const schema = arg.validationSchema || routeMetadata.validationSchema || paramType;
            const result = await this.validator.validate(value, schema);
            if (!result) {
                throw new BadRequestException();
            }
        }
    }

    private async decodeBody(request: ZenithRequest) {
        // TODO: should we fall back to json if no accept header is provided?
        const mimeType = request.bunRequest.headers.get('content-type') ?? 'application/json';
        const requestDecoder = this.httpRequestDecoders.get(mimeType);
        if (!requestDecoder) {
            throw new UnsupportedMediaTypeException();
        }
        const body = await requestDecoder.getInstance()?.decode(request.bunRequest);
        return body;
    }

    private routeExpectsBody(routeMetadata: Route) {
        return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(routeMetadata.method);
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
                this.logger.warn(`No exception handler found for error ${chalk.red(error.constructor.name)} : ${error.message}`);
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

}