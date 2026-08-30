import { Config } from "@zenith-framework/core";
import { ZenithWebConfig, type CorsOptions } from "@zenith-framework/web";

@Config('ZenithWebConfig')
export class WebConfig extends ZenithWebConfig {
    override httpServerPort(): number {
        return 3006;
    }

    // Returning undefined here (the default) sends no CORS headers at all.
    override cors(): CorsOptions | undefined {
        return {
            origins: ['https://app.example'],
            credentials: true,
            exposedHeaders: ['X-Request-Duration'],
            maxAgeSeconds: 600,
        };
    }
}
