import { Config } from "@zenith-framework/core";
import { ZenithWebConfig } from "@zenith-framework/web";

@Config(ZenithWebConfig)
export class AuthServiceWebConfig extends ZenithWebConfig {
    httpServerPort(): number {
        return 3001;
    }
}