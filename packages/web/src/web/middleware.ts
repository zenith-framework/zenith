/**
 * Runs the rest of the pipeline and returns its response.
 *
 * Calling it is what makes a middleware "pass through": everything before the call
 * happens on the way in, everything after it on the way out. Not calling it
 * short-circuits the request, which is how a middleware rejects or answers early.
 */
export type MiddlewareNext = () => Promise<Response>;

/**
 * A middleware wraps every request, including ones that match no route.
 *
 * It receives the raw request rather than a decoded one: middleware runs before
 * routing, so there is no controller, no route metadata and no request context yet.
 * That is what lets it answer a CORS preflight, rate-limit an unknown path, or time
 * a 404 the same way it times a 200.
 */
export interface ZenithMiddleware {
    handle(request: Request, next: MiddlewareNext): Promise<Response>;
}
