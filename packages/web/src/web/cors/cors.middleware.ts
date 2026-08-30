import { InjectOrb } from "@zenith-framework/core";
import { Middleware } from "../../decorators/middleware.decorator";
import { ZenithWebConfig } from "../../config/zenith-web.config";
import { RouteMethods } from "../route";
import type { MiddlewareNext, ZenithMiddleware } from "../middleware";
import type { CorsOptions } from "./cors-options";

/**
 * Applies CORS headers, and answers preflights before they reach routing.
 *
 * Inert until {@link ZenithWebConfig.cors} returns options, so shipping it in the web
 * system does not silently open up an API that never asked for cross-origin access.
 * It runs early (negative order) so a preflight is answered even when a middleware
 * further down would have rejected the request.
 */
@Middleware({ order: -100 })
export class CorsMiddleware implements ZenithMiddleware {
    constructor(
        @InjectOrb('ZenithWebConfig') private readonly config: ZenithWebConfig,
    ) {
    }

    async handle(request: Request, next: MiddlewareNext): Promise<Response> {
        const options = this.config.cors();
        const origin = request.headers.get('Origin');
        if (!options || !origin) {
            return await next();
        }

        const allowedOrigin = this.resolveOrigin(options, origin);
        if (!allowedOrigin) {
            // Not an allowed origin: serve the request, just without CORS headers, and
            // let the browser be the one to block it. Failing here would also break
            // non-browser clients, which are not subject to the same-origin policy.
            return await next();
        }

        if (this.isPreflight(request)) {
            return new Response(null, { status: 204, headers: this.preflightHeaders(options, allowedOrigin, request) });
        }

        const response = await next();
        // The response may be immutable (Response.redirect, cached bodies), so copy it.
        const headers = new Headers(response.headers);
        this.applySharedHeaders(headers, options, allowedOrigin);
        if (options.exposedHeaders?.length) {
            headers.set('Access-Control-Expose-Headers', options.exposedHeaders.join(', '));
        }
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    private isPreflight(request: Request): boolean {
        return request.method === 'OPTIONS' && request.headers.has('Access-Control-Request-Method');
    }

    /** Returns the value for Access-Control-Allow-Origin, or undefined when disallowed. */
    private resolveOrigin(options: CorsOptions, origin: string): string | undefined {
        if (options.origins === '*') {
            // A wildcard is invalid on a credentialed response, so echo the origin.
            return options.credentials ? origin : '*';
        }
        return options.origins.includes(origin) ? origin : undefined;
    }

    private applySharedHeaders(headers: Headers, options: CorsOptions, allowedOrigin: string) {
        headers.set('Access-Control-Allow-Origin', allowedOrigin);
        if (options.credentials) {
            headers.set('Access-Control-Allow-Credentials', 'true');
        }
        if (allowedOrigin !== '*') {
            // The response varies by origin, so a shared cache must not reuse it.
            headers.append('Vary', 'Origin');
        }
    }

    private preflightHeaders(options: CorsOptions, allowedOrigin: string, request: Request): Headers {
        const headers = new Headers();
        this.applySharedHeaders(headers, options, allowedOrigin);
        headers.set('Access-Control-Allow-Methods', (options.methods ?? RouteMethods).join(', '));

        const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
        const allowedHeaders = options.allowedHeaders?.join(', ') ?? requestedHeaders;
        if (allowedHeaders) {
            headers.set('Access-Control-Allow-Headers', allowedHeaders);
        }
        if (!options.allowedHeaders && requestedHeaders) {
            headers.append('Vary', 'Access-Control-Request-Headers');
        }
        if (options.maxAgeSeconds !== undefined) {
            headers.set('Access-Control-Max-Age', String(options.maxAgeSeconds));
        }
        return headers;
    }
}
