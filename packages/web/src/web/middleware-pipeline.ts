import { Orb, OrbContainer, type OrbWrapper } from "@zenith-framework/core";
import chalk from "chalk";
import { ZENITH_MIDDLEWARE_METADATA, ZENITH_ORB_TYPE_MIDDLEWARE } from "../decorators/metadata-keys";
import { DEFAULT_MIDDLEWARE_ORDER, type MiddlewareMetadata } from "../decorators/middleware.decorator";
import { webSystemLogger } from "../logger";
import { HttpRequestHandler } from "./http-request-handler";
import type { MiddlewareNext, ZenithMiddleware } from "./middleware";

function orderOf(orb: OrbWrapper<ZenithMiddleware>): number {
    const metadata = Reflect.getMetadata(ZENITH_MIDDLEWARE_METADATA, orb.value as object) as MiddlewareMetadata | undefined;
    return metadata?.order ?? DEFAULT_MIDDLEWARE_ORDER;
}

/**
 * Wraps every request in the registered middlewares, innermost call last.
 *
 * The chain runs before routing, so it also covers requests that match no route.
 * That is deliberate: a CORS preflight arrives as an OPTIONS on a path that has no
 * OPTIONS handler, and a rate limiter that only saw matched routes would be trivial
 * to bypass.
 */
@Orb()
export class MiddlewarePipeline {
    private readonly logger = webSystemLogger;
    private middlewares: ZenithMiddleware[] = [];

    constructor(
        private readonly container: OrbContainer,
        private readonly httpRequestHandler: HttpRequestHandler,
    ) {
    }

    registerMiddlewares() {
        const orbs = this.container.getOrbsByType<ZenithMiddleware>(ZENITH_ORB_TYPE_MIDDLEWARE);
        const ordered = orbs
            .map(orb => ({ orb, order: orderOf(orb) }))
            // Equal orders are broken by name so the chain does not depend on scan order.
            .sort((a, b) => a.order - b.order || a.orb.name.localeCompare(b.orb.name));

        this.middlewares = [];
        for (const { orb, order } of ordered) {
            const instance = orb.getInstance();
            if (!instance) {
                this.logger.error(`Middleware ${orb.name} has no instance and cannot be registered.`);
                continue;
            }
            this.middlewares.push(instance);
            this.logger.info(`Registering middleware '${chalk.bold(orb.name)}' (order: ${chalk.blue(order)})`);
        }
    }

    /** The middlewares in the order they run, outermost first. */
    getMiddlewares(): readonly ZenithMiddleware[] {
        return this.middlewares;
    }

    /**
     * Runs `request` through the chain, with `terminal` as the innermost step.
     */
    async run(request: Request, terminal: MiddlewareNext): Promise<Response> {
        const middlewares = this.middlewares;

        const dispatch = async (index: number): Promise<Response> => {
            const middleware = middlewares[index];
            if (!middleware) {
                return await terminal();
            }

            let advanced = false;
            const next: MiddlewareNext = () => {
                // Calling next() twice would run the rest of the chain, and the route
                // handler with it, a second time. Fail loudly instead.
                if (advanced) {
                    throw new Error(`Middleware ${middleware.constructor.name} called next() more than once.`);
                }
                advanced = true;
                return dispatch(index + 1);
            };

            return await middleware.handle(request, next);
        };

        try {
            return await dispatch(0);
        } catch (error) {
            return await this.toErrorResponse(request, error);
        }
    }

    /** Middleware failures go through the same exception handlers as route failures. */
    private async toErrorResponse(request: Request, error: unknown): Promise<Response> {
        const httpResponse = await this.httpRequestHandler.mapErrorToZenithHttpResponse(error);
        const path = new URL(request.url).pathname;
        this.logger.error(`${chalk.red(httpResponse.status)} - [${request.method} ${chalk.bold.italic(path)}]: ${httpResponse.body.message}`);
        return new Response(JSON.stringify(httpResponse.body), {
            status: httpResponse.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
