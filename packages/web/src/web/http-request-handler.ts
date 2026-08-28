import { InjectOrb, Orb, OrbContainer, OrbWrapper } from "@zenith-framework/core";
import type { ZenithRequest } from "./zenith-request";
import { webSystemLogger } from "../logger";
import { ZENITH_CONTROLLER_METADATA, ZENITH_CONTROLLER_ROUTE, ZENITH_CONTROLLER_ROUTE_ARGS, ZENITH_EXCEPTION_HANDLER_EXCEPTIONS, ZENITH_MIME_TYPES, ZENITH_ORB_TYPE_EXCEPTION_HANDLER, ZENITH_ORB_TYPE_REQUEST_DECODER, ZENITH_ORB_TYPE_RESPONSE_ENCODER } from "../decorators/metadata-keys";
import type { ControllerMetadata } from "../decorators/controller.decorator";
import type { RouteParamMetadata } from "../decorators/route-param";
import type { Route, RouteMethod } from "./route";
import { BadRequestException, HttpException, InternalServerErrorException, UnauthorizedException, UnsupportedMediaTypeException } from "./http-exception";
import type { ResponseEncoder } from "./response-encoder";
import type { RequestDecoder } from "./request-decoder";
import chalk from "chalk";
import type { ZenithHttpResponse } from "./zenith-http-response";
import type { Constructor } from "@zenith-framework/core";
import { ZenithRequestContext } from "./context/zenith-request-context";
import type { Validator } from "./validator";
import type { RequestGuard } from "./request-guard";
import type { ZenithRequestRouting } from "./zenith-request-routing";

/** What `new Response(...)` accepts as a body. `BodyInit` is not global without the DOM lib. */
type ResponseBody = ConstructorParameters<typeof Response>[0];

interface ExceptionHandlerEntry {
    orb: OrbWrapper<unknown>;
    handler: (error: Error) => HttpException | Promise<HttpException>;
}

@Orb()
export class HttpRequestHandler {
    private readonly logger = webSystemLogger;
    private readonly httpRequestDecoders: Map<string, OrbWrapper<RequestDecoder>> = new Map();
    private readonly httpResponseEncoders: Map<string, OrbWrapper<ResponseEncoder>> = new Map();
    private readonly exceptionHandlers: Map<string, ExceptionHandlerEntry> = new Map();

    constructor(
        private readonly container: OrbContainer,
        // @InjectOrb('ZenithWebConfig') private readonly config: ZenithWebConfig,
        @InjectOrb('Validator') private readonly validator: Validator<unknown>,
    ) {
    }

    /** Indexes the request decoders and response encoders by the mime types they declare. */
    async registerCodecs() {
        const requestDecoders = this.container.getOrbsByType<RequestDecoder>(ZENITH_ORB_TYPE_REQUEST_DECODER);

        for (const requestDecoder of requestDecoders) {
            const mimeTypes = Reflect.getMetadata(ZENITH_MIME_TYPES, requestDecoder.value as object) as string[];
            for (const mimeType of mimeTypes) {
                this.httpRequestDecoders.set(mimeType, requestDecoder);
            }
            this.logger.info(`Registering request decoder '${chalk.bold(requestDecoder.name)}' with mime types [${chalk.blue(mimeTypes.join(', '))}]`);
        }

        const responseEncoders = this.container.getOrbsByType<ResponseEncoder>(ZENITH_ORB_TYPE_RESPONSE_ENCODER);
        for (const responseEncoder of responseEncoders) {
            const mimeTypes = Reflect.getMetadata(ZENITH_MIME_TYPES, responseEncoder.value as object) as string[];
            for (const mimeType of mimeTypes) {
                this.httpResponseEncoders.set(mimeType, responseEncoder);
            }
            this.logger.info(`Registering response encoder '${chalk.bold(responseEncoder.name)}' with mime types [${chalk.blue(mimeTypes.join(', '))}]`);
        }

        const exceptionHandlers = this.container.getOrbsByType<object>(ZENITH_ORB_TYPE_EXCEPTION_HANDLER);
        for (const exceptionHandler of exceptionHandlers) {
            this.logger.info(`Registering exception handler '${chalk.bold(exceptionHandler.name)}'`);
            const exceptionHandlerInstance = exceptionHandler.getInstance();
            if (!exceptionHandlerInstance) {
                this.logger.error(`Exception handler ${exceptionHandler.name} has no instance and cannot be registered.`);
                continue;
            }
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(exceptionHandlerInstance)).filter((key) => key !== 'constructor');

            for (const method of methods) {
                // Not every method on an exception handler carries @Catch.
                const exceptionsHandled = Reflect.getMetadata(ZENITH_EXCEPTION_HANDLER_EXCEPTIONS, exceptionHandlerInstance, method) as Constructor[] | undefined;
                const handler = (exceptionHandlerInstance as Record<string, ExceptionHandlerEntry['handler'] | undefined>)[method];
                if (!exceptionsHandled || !handler) {
                    continue;
                }

                this.logger.info(`Catch [${chalk.blue(exceptionsHandled.map((exception) => exception.name).join(', '))}] in '${chalk.bold(exceptionHandler.name + '.' + method)}'`);
                exceptionsHandled.forEach((exception) => {
                    this.exceptionHandlers.set(exception.name, { orb: exceptionHandler, handler: handler.bind(exceptionHandlerInstance) });
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
                const body = await this.decodeBody(request);
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
            const status = routeMetadata.statusCode ?? this.getDefaultStatusForMethod(routeMetadata.method);
            return new Response(encodedResponse, { status, headers: { 'Content-Type': mimeType } });
        } catch (error) {
            const httpResponse = await this.mapErrorToZenithHttpResponse(error);
            performance.mark('handle-request-end');
            const durationMeasure = performance.measure('handle-request-duration', 'handle-request-start', 'handle-request-end');
            this.logger.error(`${chalk.red(httpResponse.status)} - [${routeMetadata.method} ${chalk.bold.italic(routeMetadata.path)}]: ${httpResponse.body.message} (${durationMeasure.duration.toFixed(2)}ms)`);
            return new Response(JSON.stringify(httpResponse.body), { status: httpResponse.status });
        }
    }

    private getDefaultStatusForMethod(method: RouteMethod): number {
        return method === 'POST' ? 201 : 200;
    }

    private getMimeTypeForResponse(response: unknown) {
        if (typeof response === 'string') {
            return 'text/plain';
        } else {
            return 'application/json';
        }
    }

    private async encodeResponse(response: unknown, mimeType: string): Promise<ResponseBody> {
        if (mimeType === 'text/plain') {
            return String(response);
        }

        const responseEncoder = this.httpResponseEncoders.get(mimeType);
        if (!responseEncoder) {
            throw new UnsupportedMediaTypeException();
        }
        return await responseEncoder.getInstance()?.encode(response) as ResponseBody;
    }

    private async prepareHandlerArgsInjection(
        requestContext: ZenithRequestContext,
        routing: ZenithRequestRouting,
        controllerMetadata: ControllerMetadata,
        routeMetadata: Route,
        routeArgsMetadata: RouteParamMetadata[]
    ): Promise<unknown[]> {
        const numberOfArgs = routing.handler.length;
        const paramTypes = (Reflect.getMetadata('design:paramtypes', routing.controller, routing.handler.name) ?? []) as Constructor[];

        const injectedArgs: unknown[] = [];
        for (let i = 0; i < numberOfArgs; i++) {
            // routeArgsMetadata is keyed by parameter index, so this stays aligned with
            // the handler signature no matter what order the decorators were applied in.
            const arg = routeArgsMetadata[i];
            const paramType = paramTypes[i];

            if (!arg) {
                // Undecorated parameter. Warned about at boot; pass undefined through.
                injectedArgs.push(undefined);
                continue;
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
                await this.validateRequestParam(arg, paramType, controllerMetadata, routeMetadata, requestContext.body);
                injectedArgs.push(requestContext.body);
            }
        }

        return injectedArgs;

    }

    private async validateRequestParam(arg: RouteParamMetadata, paramType: unknown, controllerMetadata: ControllerMetadata, routeMetadata: Route, value: unknown): Promise<void> {
        if (!(arg.validated || routeMetadata.validated || controllerMetadata.validated)) {
            return;
        }

        const schema = arg.validationSchema ?? routeMetadata.validationSchema ?? paramType;
        if (!isUsableSchema(schema)) {
            // A parameter typed as a plain object/array erases to Object/Array, which is
            // not something a validator can check. Fail loudly instead of cryptically.
            this.logger.error(`No validation schema available for ${arg.type} parameter '${arg.name}' of ${routeMetadata.method} ${routeMetadata.path}. Pass one to @Validated() or type the parameter with a DTO.`);
            throw new InternalServerErrorException('MissingValidationSchema');
        }

        const result = await this.validator.validate(value, schema);
        if (!result) {
            throw new BadRequestException();
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

    /**
     * Resolves the closest registered handler for an error, walking up the prototype
     * chain so a handler for a base error also catches its subclasses.
     */
    private findExceptionHandler(error: Error): ExceptionHandlerEntry | undefined {
        let ctor = error.constructor as Constructor | null;
        while (ctor && ctor !== Object && ctor.name) {
            const handler = this.exceptionHandlers.get(ctor.name);
            if (handler) {
                return handler;
            }
            ctor = Object.getPrototypeOf(ctor) as Constructor | null;
        }
        return undefined;
    }

    /**
     * Maps a thrown value to a response, going through any registered exception
     * handler. Public so middleware failures land on the same handlers as route ones.
     */
    async mapErrorToZenithHttpResponse(error: unknown): Promise<ZenithHttpResponse> {
        if (error instanceof HttpException) {
            return {
                status: error.status,
                body: error,
            };
        } else if (error instanceof Error) {
            const exceptionHandler = this.findExceptionHandler(error);
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

const NON_SCHEMA_TYPES: unknown[] = [Object, Array, Function, String, Number, Boolean, Symbol];

function isUsableSchema(schema: unknown): boolean {
    return schema !== undefined && schema !== null && !NON_SCHEMA_TYPES.includes(schema);
}
