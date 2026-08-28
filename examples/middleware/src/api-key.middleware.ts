import { Middleware, UnauthorizedException, type MiddlewareNext, type ZenithMiddleware } from "@zenith-framework/web";

/**
 * Short-circuiting: a middleware that does not call `next()` stops the request, and
 * one that throws is mapped through the same exception handlers as a route would be.
 *
 * Runs after CorsMiddleware (higher order) so a preflight is answered before any key
 * is demanded — a browser cannot attach one to a preflight.
 */
@Middleware({ order: 20 })
export class ApiKeyMiddleware implements ZenithMiddleware {
    async handle(request: Request, next: MiddlewareNext): Promise<Response> {
        const path = new URL(request.url).pathname;
        if (path.startsWith('/public')) {
            return await next();
        }

        if (request.headers.get('X-Api-Key') !== 'let-me-in') {
            throw new UnauthorizedException('Missing or invalid X-Api-Key header');
        }

        return await next();
    }
}
