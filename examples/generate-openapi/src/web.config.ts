import { Config } from "@zenith-framework/core";
import { ZenithWebConfig } from "@zenith-framework/web";

@Config('ZenithWebConfig')
export class WebConfig extends ZenithWebConfig {
    override httpServerPort(): number {
        return 3001;
    }

    override generateOpenApiDocs(): boolean {
        return true;
    }
}
