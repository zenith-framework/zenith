import { ZenithConfig, Config } from "@zenith-framework/core";
import type { ZenithWebConfig } from "./zenith-web.config";
import { ZENITH_WEB_GENERATE_OPEN_API_DOCS, ZENITH_WEB_GLOBAL_ROUTES_PREFIX, ZENITH_WEB_HTTP_SERVER_PORT } from "./config-keys";

@Config('ZenithWebConfig')
export class DefaultZenithWebConfig implements ZenithWebConfig {

    constructor(private readonly config: ZenithConfig) {
    }

    globalRoutesPrefix(): string {
        return this.config.getOrDefault(ZENITH_WEB_GLOBAL_ROUTES_PREFIX, '/');
    }

    httpServerPort(): number {
        return this.config.getOrDefault(ZENITH_WEB_HTTP_SERVER_PORT, 3000);
    }

    generateOpenApiDocs(): boolean {
        return this.config.getOrDefault(ZENITH_WEB_GENERATE_OPEN_API_DOCS, false);
    }
} 