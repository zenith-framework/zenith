import { ZENITH_WEB_DEFAULT_GENERATE_OPEN_API_DOCS, ZENITH_WEB_DEFAULT_GLOBAL_ROUTES_PREFIX, ZENITH_WEB_DEFAULT_HTTP_SERVER_PORT } from "./config-keys";

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
}
