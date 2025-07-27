import { Orb, OrbContainer } from "@zenith-framework/core";
import { HttpServer } from "../http-server";
import type { OpenApiDocument, OpenApiParameter, OpenApiPath, OpenApiRequestBody, OpenApiResponse } from "./types/openapi-document";
import type { Route, RouteMethod } from "../route";
import type { ZenithRequestRouting } from "../zenith-request-routing";
import { Controller, Get, type RouteParamMetadata } from "../..";
import { webSystemLogger } from "../../logger";
import { ZENITH_CONTROLLER_ROUTE, ZENITH_CONTROLLER_ROUTE_ARGS } from "../../decorators/metadata-keys";
import { createSchema } from "zod-openapi";
import { LoginWithEmailPasswordRequest } from "../../../../../examples/auth-service/src/auth/infrastructure/controllers/request/login-with-email-password.request";

@Orb()
export class ZenithOpenApiGenerator {

    private readonly openApiSchemas: Record<string, any> = {};

    constructor(
        private readonly container: OrbContainer,
        private readonly httpServer: HttpServer,
    ) { }

    async generateOpenApiDocs() {
        webSystemLogger.info('Generating OpenAPI docs...');
        const routes = this.httpServer.getRoutes();

        const paths: Record<string, OpenApiPath> = {};


        for (const path in routes) {
            const route = routes[path] as Record<RouteMethod, ZenithRequestRouting>;
            for (const method in route) {
                const routing = route[method as RouteMethod];
                const routeMetadata = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE, routing.controller, routing.handler.name) as Route;
                const routeParameters = Reflect.getMetadata(ZENITH_CONTROLLER_ROUTE_ARGS, routing.controller, routing.handler.name) as RouteParamMetadata[];

                const openApiRouteResponses: Record<string, OpenApiResponse> = {};
                const openApiRouteParameters: OpenApiParameter[] = [];
                let openApiRequestBody: OpenApiRequestBody | undefined = undefined;

                if (routeMetadata.openApiResponses) {
                    for (const response of routeMetadata.openApiResponses) {
                        openApiRouteResponses[response.status ?? this.getDefaultStatusForRouteMethod(routeMetadata.method)] = {
                            description: response.description,
                            content: {
                                // TODO: add other content types
                                'application/json': { schema: this.openApiSchemaForType(response.type) }
                            },
                        };
                    }
                }

                const routeParameterTypes = Reflect.getMetadata('design:paramtypes', routing.controller, routing.handler.name);
                for (const parameter of routeParameters) {
                    const routeParameterType = routeParameterTypes[parameter.index];
                    if (parameter.type === 'body') {
                        openApiRequestBody = {
                            content: {
                                // TODO: add other content types
                                'application/json': { schema: this.openApiSchemaForType(routeParameterType) }
                            }
                        }
                    } else if (parameter.type === 'query') {
                        openApiRouteParameters.push({
                            name: parameter.name,
                            in: 'query',
                            // TODO: make required configurable
                            required: true,
                            schema: this.openApiSchemaForType(routeParameterType)
                        });
                    } else if (parameter.type === 'route') {
                        openApiRouteParameters.push({
                            name: parameter.name,
                            in: 'path',
                            // TODO: make required configurable
                            required: true,
                            schema: this.openApiSchemaForType(routeParameterType)
                        });
                    }
                }

                paths[path] = {
                    [method.toLowerCase()]: {
                        summary: routing.controller.constructor.name,
                        description: routing.handler.name,
                        responses: openApiRouteResponses,
                        parameters: openApiRouteParameters,
                        requestBody: openApiRequestBody,
                    },
                };
            }
        }

        const document: OpenApiDocument = {
            openapi: '3.1.0',
            info: {
                title: 'Zenith Framework - Dummy document name',
                version: '1.0.0',
            },
            components: {
                schemas: this.openApiSchemas,
            },
            paths,
        };

        const openApiController = new OpenApiController(document);
        Controller('/openapi')(openApiController);
        const openApiControllerOrb = this.container.registerOrb(openApiController);
        await this.httpServer.registerController(openApiControllerOrb);
    }

    private openApiSchemaForType(type: any) {
        // TODO: also support validation / constraints like minimum / maximum / enum / etc.
        if (type.name === 'String') {
            return { type: 'string' };
        } else if (type.name === 'Number') {
            return { type: 'number' };
        } else if (typeof type === 'boolean') {
            return { type: 'boolean' };
        }

        const { schema } = createSchema(type.schema, { io: 'input' });
        this.openApiSchemas[type.name] = schema;
        return { $ref: `#/components/schemas/${type.name}` };
    }

    private getDefaultStatusForRouteMethod(method: RouteMethod) {
        if (method === 'POST') {
            return '201';
        }
        return '200';
    }
}

class OpenApiController {
    constructor(
        private readonly document: OpenApiDocument,
    ) { }

    @Get('/json')
    getOpenApiDocsJSON() {
        return JSON.stringify(this.document, null, 2);
    }
}