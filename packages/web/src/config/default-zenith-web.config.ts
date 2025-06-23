import { ZenithConfig, Config } from "@zenith-framework/core";
import type { ZenithWebConfig } from "./zenith-web.config";
import { ZENITH_WEB_HTTP_SERVER_PORT } from "./config-keys";

@Config('ZenithWebConfig')
export class DefaultZenithWebConfig implements ZenithWebConfig {

    constructor(private readonly config: ZenithConfig) {
    }

    httpServerPort(): number {
        return this.config.getOrDefault(ZENITH_WEB_HTTP_SERVER_PORT, 3000);
    }
} 