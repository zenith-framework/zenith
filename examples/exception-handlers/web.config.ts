import { Config } from "@zenith-framework/core";
import { ZenithWebConfig } from "@zenith-framework/web";

@Config('ZenithWebConfig')
export class WebConfig extends ZenithWebConfig {
    constructor() {
        super();
    }

    httpServerPort() {
        return 3005;
    }
}