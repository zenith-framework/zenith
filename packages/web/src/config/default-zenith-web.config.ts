import { ZenithConfig, Config } from "@zenith-framework/core";
import type { ZenithWebConfig } from "./zenith-web.config";
import { ZENITH_WEB_DEFAULT_GENERATE_OPEN_API_DOCS, ZENITH_WEB_DEFAULT_GLOBAL_ROUTES_PREFIX, ZENITH_WEB_DEFAULT_HTTP_SERVER_PORT, ZENITH_WEB_GENERATE_OPEN_API_DOCS, ZENITH_WEB_GLOBAL_ROUTES_PREFIX, ZENITH_WEB_HTTP_SERVER_PORT, ZENITH_WEB_DEFAULT_SHUTDOWN_TIMEOUT_MS, ZENITH_WEB_SHUTDOWN_TIMEOUT_MS } from "./config-keys";

@Config('ZenithWebConfig')
export class DefaultZenithWebConfig implements ZenithWebConfig {

    constructor(private readonly config: ZenithConfig) {
    }

    globalRoutesPrefix(): string {
        return this.config.getOrDefault(ZENITH_WEB_GLOBAL_ROUTES_PREFIX, ZENITH_WEB_DEFAULT_GLOBAL_ROUTES_PREFIX);
    }

    httpServerPort(): number {
        return this.config.getOrDefault(ZENITH_WEB_HTTP_SERVER_PORT, ZENITH_WEB_DEFAULT_HTTP_SERVER_PORT);
    }

    generateOpenApiDocs(): boolean {
        return this.config.getOrDefault(ZENITH_WEB_GENERATE_OPEN_API_DOCS, ZENITH_WEB_DEFAULT_GENERATE_OPEN_API_DOCS);
    }

    shutdownTimeoutMs(): number {
        return this.config.getOrDefault(ZENITH_WEB_SHUTDOWN_TIMEOUT_MS, ZENITH_WEB_DEFAULT_SHUTDOWN_TIMEOUT_MS);
    }
} 