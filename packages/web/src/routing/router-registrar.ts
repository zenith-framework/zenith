import { InjectOrb, Orb, OrbContainer } from "@zenith-framework/core";
import type { BunRequest } from "bun";
import chalk from "chalk";
import { ZenithWebConfig } from "../config/zenith-web.config";
import { webSystemLogger } from "../logger";
import { sanitizePath } from "../utils/path.utils";
import { BadRequestException, HttpException, InternalServerErrorException } from "../web/http-exception";
import { HttpServer } from "../web/http-server";
import { isRouter, type RouteContext, type RouteDefinition, type RouteSchemas, type Schema } from "./route";

/** Validates one part of the request, reporting which part failed rather than just 400. */
function parse<T>(schema: Schema<T>, data: unknown, part: string): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new BadRequestException(`Invalid ${part}: ${result.error?.message ?? 'does not match schema'}`);
    }
    return result.data as T;
}

function queryOf(request: BunRequest): Record<string, string> {
    return Object.fromEntries(new URL(request.url).searchParams);
}

/**
 * Mounts routers exported from scanned modules.
 *
 * Routes declared this way carry their own schemas, so this needs none of the
 * reflection the controller pipeline relies on: what to validate and what to return
 * are values on the route, not metadata hung off a class.
 */
@Orb()
export class RouterRegistrar {
    private readonly logger = webSystemLogger;

    constructor(
        private readonly container: OrbContainer,
        private readonly httpServer: HttpServer,
        @InjectOrb('ZenithWebConfig') private readonly config: ZenithWebConfig,
    ) {
    }

    registerRouters() {
        const globalPrefix = this.config.globalRoutesPrefix() ?? '';

        for (const module of this.container.getModules()) {
            for (const key in module.module) {
                const exported = module.module[key];
                if (!isRouter(exported)) {
                    continue;
                }
                for (const route of exported.routes) {
                    const fullPath = `${globalPrefix}/${sanitizePath(exported.prefix)}/${sanitizePath(route.path)}`;
                    this.httpServer.registerHandler(fullPath, route.method, request => this.handle(route, request));
                }
                this.logger.info(`Mounted router ${chalk.bold(exported.prefix)} (${chalk.blue(exported.routes.length)} routes)`);
            }
        }
    }

    private async handle(route: RouteDefinition, request: BunRequest): Promise<Response> {
        try {
            const context = {
                request,
                params: route.schemas.params ? parse(route.schemas.params, request.params, 'path parameters') : request.params,
                query: route.schemas.query ? parse(route.schemas.query, queryOf(request), 'query') : queryOf(request),
                body: route.schemas.body ? parse(route.schemas.body, await this.readBody(request), 'body') : undefined,
            } as RouteContext<string, RouteSchemas>;

            const result = await route.handler(context);
            return Response.json(result, { status: route.schemas.status ?? defaultStatus(route) });
        } catch (error) {
            return this.toErrorResponse(route, request, error);
        }
    }

    private async readBody(request: BunRequest): Promise<unknown> {
        try {
            return await request.json();
        } catch {
            throw new BadRequestException('Body is not valid JSON');
        }
    }

    private toErrorResponse(route: RouteDefinition, request: BunRequest, error: unknown): Response {
        const exception = error instanceof HttpException
            ? error
            : new InternalServerErrorException(error instanceof Error ? error.message : String(error));

        if (!(error instanceof HttpException)) {
            this.logger.error(`Unhandled error in ${route.method} ${request.url}: ${error instanceof Error ? error.stack : String(error)}`);
        }
        return Response.json(exception, { status: exception.status });
    }
}

function defaultStatus(route: RouteDefinition): number {
    return route.method === 'POST' ? 201 : 200;
}
