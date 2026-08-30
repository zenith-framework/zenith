import { Middleware, type MiddlewareNext, type ZenithMiddleware } from "@zenith-framework/web";
import { zenithLogger } from "@zenith-framework/core";

const logger = zenithLogger('Timing');

/**
 * The onion shape in one place: everything before `next()` runs on the way in,
 * everything after it on the way out, with the response in hand.
 */
@Middleware({ order: 10 })
export class TimingMiddleware implements ZenithMiddleware {
    async handle(request: Request, next: MiddlewareNext): Promise<Response> {
        const startedAt = performance.now();
        const path = new URL(request.url).pathname;

        try {
            const response = await next();

            const duration = performance.now() - startedAt;
            // Unmatched routes reach middlewares too, so 404s get timed like anything else.
            logger.info(`${request.method} ${path} -> ${response.status} (${duration.toFixed(2)}ms)`);

            const headers = new Headers(response.headers);
            headers.set('X-Request-Duration', duration.toFixed(2));
            return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
        } catch (error) {
            // A middleware further in threw instead of returning. The pipeline maps it
            // to a response, but that happens outside this call: without catching here,
            // a rejected request would never be timed at all.
            const duration = performance.now() - startedAt;
            logger.warn(`${request.method} ${path} -> rejected (${duration.toFixed(2)}ms)`);
            throw error;
        }
    }
}
