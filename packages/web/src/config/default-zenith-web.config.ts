import { ZenithConfig, Config } from "@zenith-framework/core";
import type { CorsOptions } from "../web/cors/cors-options";
import type { ZenithWebConfig } from "./zenith-web.config";
import { ZENITH_WEB_DEFAULT_GENERATE_OPEN_API_DOCS, ZENITH_WEB_DEFAULT_GLOBAL_ROUTES_PREFIX, ZENITH_WEB_DEFAULT_HTTP_SERVER_PORT, ZENITH_WEB_GENERATE_OPEN_API_DOCS, ZENITH_WEB_GLOBAL_ROUTES_PREFIX, ZENITH_WEB_HTTP_SERVER_PORT, ZENITH_WEB_DEFAULT_SHUTDOWN_TIMEOUT_MS, ZENITH_WEB_SHUTDOWN_TIMEOUT_MS, ZENITH_WEB_CORS_ORIGINS } from "./config-keys";

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

    /**
     * Enabled by setting ZENITH_WEB_CORS_ORIGINS in .env to a comma-separated list of
     * origins, or to `*`. Note this reads the loaded config, which today means .env
     * files only and not process.env. Anything beyond origins needs a subclass.
     */
    cors(): CorsOptions | undefined {
        const origins = this.config.getOrDefault(ZENITH_WEB_CORS_ORIGINS, '').trim();
        if (origins === '') {
            return undefined;
        }
        return { origins: origins === '*' ? '*' : origins.split(',').map(origin => origin.trim()).filter(Boolean) };
    }

    shutdownTimeoutMs(): number {
        return this.config.getOrDefault(ZENITH_WEB_SHUTDOWN_TIMEOUT_MS, ZENITH_WEB_DEFAULT_SHUTDOWN_TIMEOUT_MS);
    }
} 