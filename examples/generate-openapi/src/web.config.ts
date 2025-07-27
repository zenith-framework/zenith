import { Config } from "@zenith-framework/core";
import type { ZenithWebConfig } from "@zenith-framework/web";

@Config('ZenithWebConfig')
export class WebConfig implements ZenithWebConfig {
    globalRoutesPrefix(): string {
        return '/';
    }

    httpServerPort(): number {
        return 3001;
    }

    generateOpenApiDocs(): boolean {
        return true;
    }
}