import type { CorsOptions } from "../web/cors/cors-options";
import { ZENITH_WEB_DEFAULT_GENERATE_OPEN_API_DOCS, ZENITH_WEB_DEFAULT_GLOBAL_ROUTES_PREFIX, ZENITH_WEB_DEFAULT_HTTP_SERVER_PORT, ZENITH_WEB_DEFAULT_SHUTDOWN_TIMEOUT_MS } from "./config-keys";

/**
 * Base class for the web system configuration.
 *
 * Every method has a default, so a project can extend this and override only the
 * settings it cares about. Implementing the type instead of extending it still
 * requires providing all of them.
 */
export abstract class ZenithWebConfig {
    globalRoutesPrefix(): string | undefined {
        return ZENITH_WEB_DEFAULT_GLOBAL_ROUTES_PREFIX;
    }

    httpServerPort(): number {
        return ZENITH_WEB_DEFAULT_HTTP_SERVER_PORT;
    }

    generateOpenApiDocs(): boolean {
        return ZENITH_WEB_DEFAULT_GENERATE_OPEN_API_DOCS;
    }

    /**
     * Cross-origin access rules, or undefined to send no CORS headers at all.
     */
    cors(): CorsOptions | undefined {
        return undefined;
    }

    /**
     * How long shutdown waits for in-flight requests before closing connections anyway.
     */
    shutdownTimeoutMs(): number {
        return ZENITH_WEB_DEFAULT_SHUTDOWN_TIMEOUT_MS;
    }
}
